import crypto from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../config/db.js';
import { callIntelligenceApi } from '../controllers/intelligence.controller.js';
import { insertInquiryRecord } from '../controllers/inquiries.controller.js';
import { recordStageChange } from './stageHistory.js';
import { DealError } from './dealErrors.js';

type Db = Pick<PoolClient, 'query'>;

const LEGAL_OR_SITE_WORDS =
  /\b(pvt|private|ltd|limited|llp|inc|co|company|corp|corporation|india|the|unit|plant|site|gate|factory|division|works|phase|main|backside|no|[ivx]+|\d+)\b/g;

/** "JK Lakshmi Cement Ltd. - Ridham Cement Article" and "JK Lakshmi Cement Ltd." both → "jk lakshmi cement". */
export const normalizeCompanyName = (name: string): string =>
  (name || '')
    .toLowerCase()
    .split(/\s[-–|(]\s?|,|\(/)[0]
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(LEGAL_OR_SITE_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const websiteDomain = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
};

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

export interface IntelCompany {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  business_type: string | null;
  opportunity_score: { score: number; why: string | null; estimated_requirement: string | null } | null;
  /** Multi-site accounts (intelligence groups a company's gates/plants): set on a site. */
  parent_company_id?: number | null;
  /** Set on an account's main row: its other sites. */
  sites?: { id: number }[];
}

/**
 * Every intelligence id in this prospect's account (the main row and all its sites),
 * so a deal opened from one gate counts for the whole company.
 */
export const accountMemberIds = async (intel: IntelCompany): Promise<number[]> => {
  const main: IntelCompany = intel.parent_company_id
    ? await callIntelligenceApi(`/v1/companies/${intel.parent_company_id}`)
    : intel;
  return [...new Set([intel.id, main.id, ...(main.sites || []).map((s) => s.id)])];
};

export type CrmMatch = { id: string; name: string; matchedBy: 'link' | 'website' | 'name' } | null;

/**
 * Finds the CRM company for a prospect: explicit link first (to this exact row, else to any
 * other site of the same account), then website domain, then cleaned-up name.
 */
export const findCrmCompany = async (
  db: Db,
  intel: Pick<IntelCompany, 'id' | 'name' | 'website'>,
  memberIds: number[] = [intel.id]
): Promise<CrmMatch> => {
  const linked = (await db.query(
    `SELECT id, name FROM companies WHERE intelligence_company_id = ANY($1::int[])
     ORDER BY (intelligence_company_id = $2) DESC, created_at ASC LIMIT 1;`,
    [memberIds, intel.id]
  )).rows[0];
  if (linked) return { id: linked.id, name: linked.name, matchedBy: 'link' };

  const rows = (await db.query('SELECT id, name, website FROM companies;')).rows as { id: string; name: string; website: string | null }[];
  const domain = websiteDomain(intel.website);
  if (domain) {
    const byDomain = rows.find((r) => websiteDomain(r.website) === domain);
    if (byDomain) return { id: byDomain.id, name: byDomain.name, matchedBy: 'website' };
  }
  const key = normalizeCompanyName(intel.name);
  if (key) {
    const byName = rows.find((r) => normalizeCompanyName(r.name) === key);
    if (byName) return { id: byName.id, name: byName.name, matchedBy: 'name' };
  }
  return null;
};

export interface WarehouseOwner {
  propertyId: string;
  propertyName: string;
  corridor: string | null;
  city: string | null;
  distanceKm: number;
  managerUserId: string;
  managerName: string;
}

/** Owner rule (confirmed with Bhavya): the manager of the nearest warehouse that has one. */
export const nearestManagedWarehouse = async (db: Db, lat: number | null, lng: number | null): Promise<WarehouseOwner | null> => {
  if (lat === null || lng === null || lat === undefined || lng === undefined) return null;
  const rows = (await db.query(
    `SELECT id, name, corridor, city, latitude, longitude, manager_user_id, manager_name FROM properties
     WHERE manager_user_id IS NOT NULL AND manager_user_id <> '' AND latitude IS NOT NULL AND longitude IS NOT NULL;`
  )).rows;
  let best: WarehouseOwner | null = null;
  for (const p of rows) {
    const d = haversineKm(lat, lng, parseFloat(p.latitude), parseFloat(p.longitude));
    if (!best || d < best.distanceKm) {
      best = {
        propertyId: p.id, propertyName: p.name, corridor: p.corridor, city: p.city,
        distanceKm: Math.round(d * 10) / 10, managerUserId: p.manager_user_id, managerName: p.manager_name,
      };
    }
  }
  return best;
};

/** The newest open deal on this CRM company or on any CRM company linked to another site of the account. */
const openInquiryFor = async (db: Db, companyId: string, memberIds: number[] = []) =>
  (await db.query(
    `SELECT i.id, i.inquiry_number, i.stage, i.salesperson_name, c.name AS company_name FROM inquiries i
     JOIN companies c ON c.id = i.company_id
     WHERE (i.company_id = $1 OR c.intelligence_company_id = ANY($2::int[]))
       AND i.stage NOT IN ('won', 'lost')
     ORDER BY (i.company_id = $1) DESC, i.created_at DESC LIMIT 1;`,
    [companyId, memberIds]
  )).rows[0] || null;

export const getCrmStatus = async (intelId: number) => {
  const intel: IntelCompany = await callIntelligenceApi(`/v1/companies/${intelId}`);
  const memberIds = await accountMemberIds(intel);
  const match = await findCrmCompany(pool, intel, memberIds);
  const openInquiry = match ? await openInquiryFor(pool, match.id, memberIds) : null;
  const owner = await nearestManagedWarehouse(pool, intel.lat, intel.lng);
  return {
    inCrm: !!match,
    company: match,
    openInquiry: openInquiry
      ? {
          id: openInquiry.id,
          inquiryNumber: openInquiry.inquiry_number,
          stage: openInquiry.stage,
          ownerName: openInquiry.salesperson_name,
          companyName: openInquiry.company_name,
        }
      : null,
    suggestedOwner: owner,
  };
};

const priorityFromScore = (score?: number | null) => ((score ?? 0) >= 70 ? 'High' : (score ?? 0) >= 40 ? 'Medium' : 'Low');

const cityFromAddress = (address: string | null): string | null => {
  // Google formats Indian addresses as "..., City, Gujarat 394540, India".
  const parts = (address || '').split(',').map((p) => p.trim()).filter(Boolean);
  const stateIdx = parts.findIndex((p) => /gujarat/i.test(p));
  return stateIdx > 0 ? parts[stateIdx - 1] : null;
};

export interface AddToCrmResult {
  companyId: string;
  companyName: string;
  companyCreated: boolean;
  matchedBy: 'link' | 'website' | 'name' | null;
  inquiryId: string;
  inquiryNumber: string;
  owner: WarehouseOwner | null;
  contactName: string | null;
}

/**
 * Adds an AI prospect to the CRM without duplicating anything: reuses an existing CRM company
 * (and links it), refuses a second open deal unless allowSecondInquiry, assigns the nearest
 * warehouse's manager, and carries the chosen key person onto the deal. One transaction.
 */
export const addProspectToCrm = async (
  intelId: number,
  opts: { contactId?: number | null; allowSecondInquiry?: boolean },
  userId?: string | null
): Promise<AddToCrmResult> => {
  const intel: IntelCompany = await callIntelligenceApi(`/v1/companies/${intelId}`);
  const memberIds = await accountMemberIds(intel);
  let contact: { name: string; title: string | null; email: string | null; phone: string | null; linkedin_url: string | null } | null = null;
  if (opts.contactId) {
    const list = await callIntelligenceApi(`/v1/companies/${intelId}/contacts`);
    contact = (list.items || []).find((c: any) => c.id === Number(opts.contactId)) || null;
    if (!contact) throw new DealError('That contact does not belong to this company.', 404);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const score = intel.opportunity_score?.score ?? null;
    const priority = priorityFromScore(score);
    const city = cityFromAddress(intel.address);
    const owner = await nearestManagedWarehouse(client, intel.lat, intel.lng);

    const match = await findCrmCompany(client, intel, memberIds);
    let companyId: string;
    let companyName: string;
    if (match) {
      companyId = match.id;
      companyName = match.name;
      await client.query(
        'UPDATE companies SET intelligence_company_id = COALESCE(intelligence_company_id, $2), updated_at = CURRENT_TIMESTAMP WHERE id = $1;',
        [companyId, intel.id]
      );
      const open = await openInquiryFor(client, companyId, memberIds);
      if (open && !opts.allowSecondInquiry) {
        throw new DealError(`${open.company_name} already has an open deal (${open.inquiry_number}, ${open.stage}).`, 409);
      }
    } else {
      companyId = `comp_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      companyName = intel.name;
      await client.query(
        `INSERT INTO companies (id, name, legal_name, website, industry, status, address, city, state, pincode, phone, email,
           assigned_owner_id, assigned_owner_name, prospect_stage, priority, annual_turnover, employee_count, gujarat_presence,
           source, intelligence_company_id, created_at, updated_at)
         VALUES ($1, $2, $2, $3, $4, 'Active', $5, $6, 'Gujarat', '', $7, '', $8, $9, 'New', $10, '', '', true,
           'AI Discovery', $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        [companyId, intel.name, intel.website || '', intel.business_type || '', intel.address || '', city || '', intel.phone || '',
          owner?.managerUserId || null, owner?.managerName || 'Unassigned', priority, intel.id]
      );
      if (intel.lat !== null && intel.lng !== null) {
        await client.query(
          `INSERT INTO facilities (id, company_id, company_name, name, type, address, city, state, pincode, latitude, longitude, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Manufacturing Plant', $5, $6, 'Gujarat', '', $7, $8, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          [`fac_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`, companyId, intel.name, `${intel.name} — Facility`,
            intel.address || '', city || '', intel.lat, intel.lng]
        );
      }
    }

    let crmContactId: string | null = null;
    if (contact) {
      const existing = (await client.query(
        `SELECT id FROM contacts WHERE company_id = $1 AND (LOWER(name) = LOWER($2) OR (email <> '' AND LOWER(email) = LOWER($3))) LIMIT 1;`,
        [companyId, contact.name, contact.email || '']
      )).rows[0];
      crmContactId = existing?.id || `cnt_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      if (!existing) {
        await client.query(
          `INSERT INTO contacts (id, company_id, company_name, name, designation, department, phone, email, linkedin_url, is_primary, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, '', $6, $7, $8, true, 'Key person from AI Discovery', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          [crmContactId, companyId, companyName, contact.name, contact.title || '', contact.phone || '', contact.email || '', contact.linkedin_url || '']
        );
      }
    }

    const inquiry = await insertInquiryRecord(
      {
        companyId,
        companyName,
        contactId: crmContactId,
        contactName: contact?.name,
        contactPhone: contact?.phone || intel.phone || '',
        contactEmail: contact?.email || '',
        linkedin: contact?.linkedin_url || '',
        source: 'AI Discovery',
        salespersonId: owner?.managerUserId || null,
        salespersonName: owner?.managerName || 'Unassigned',
        requirement: intel.opportunity_score?.estimated_requirement || 'Warehouse requirement to be confirmed',
        location: city || owner?.city || 'Gujarat',
        targetCorridor: owner?.corridor || city || 'Gujarat',
        industry: intel.business_type || 'Industrial',
        priority,
        leadScore: score ?? 0,
        opportunityScore: score ?? 0,
        stage: 'new',
        status: 'Active',
        nextAction: 'Reach out to the key person and log it with "I followed up".',
      },
      client
    );

    await client.query(
      `INSERT INTO activities (id, company_id, company_name, inquiry_id, inquiry_number, user_id, user_name, activity_type, title, description, metadata, activity_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::varchar, COALESCE((SELECT name FROM users WHERE id = $6::varchar), 'System'), 'AI Discovery', $7, $8, $9,
         to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      [
        `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`, companyId, companyName, inquiry.id, inquiry.inquiry_number,
        userId || '', `Added from AI Discovery (score ${score ?? 'n/a'})`, intel.opportunity_score?.why || '',
        JSON.stringify({ intelligenceCompanyId: intel.id, score, owner: owner?.managerName || null, nearestWarehouse: owner?.propertyName || null }),
      ]
    );
    await recordStageChange(inquiry.id, null, 'new', userId, 'Added from AI Discovery', client);

    await client.query('COMMIT');
    return {
      companyId,
      companyName,
      companyCreated: !match,
      matchedBy: match?.matchedBy || null,
      inquiryId: inquiry.id,
      inquiryNumber: inquiry.inquiry_number,
      owner,
      contactName: contact?.name || null,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};
