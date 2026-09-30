import crypto from 'crypto';
import { PoolClient } from 'pg';
import { RECALCULATE_PROPERTY_SPACE_SQL } from '../config/db.js';
import { recordStageChange } from './stageHistory.js';
import { LeaseCapacityError, DealError } from './dealErrors.js';
import { closeFollowUps } from './followUpLoop.js';
import { BUSINESS_TODAY_SQL } from './businessDate.js';

export { LeaseCapacityError, DealError };

export interface LeaseInput {
  propertyId: string;
  areaSqFt: number;
  startDate: string;
  inquiryId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  rentPerSqFtINR?: number | null;
  endDate?: string | null;
  tenureYears?: number | null;
  lockInMonths?: number | null;
  escalationPercent?: number | null;
  notes?: string | null;
  fromBaseline?: boolean;
}

const optNum = (v: any): number | null => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Inserts a lease inside the caller's transaction. Capacity: free space + space already held for
 * this inquiry at this warehouse (holds become "converted"); with fromBaseline the tenant is taken
 * out of the "occupied by existing tenants" figure instead. Recalculates the warehouse's free space.
 */
export const insertLease = async (client: PoolClient, input: LeaseInput, userId?: string | null): Promise<string> => {
  const area = Number(input.areaSqFt);
  if (!input.propertyId || !input.startDate || !Number.isFinite(area) || area <= 0) {
    throw new DealError('propertyId, startDate and a positive areaSqFt are required.');
  }

  const propRes = await client.query(
    'SELECT id, name, available_area_sq_ft, baseline_occupied_sq_ft FROM properties WHERE id = $1 FOR UPDATE;',
    [input.propertyId]
  );
  const property = propRes.rows[0];
  if (!property) throw new DealError('Warehouse not found.', 404);

  const convertibleHold = input.inquiryId
    ? parseFloat(
        (await client.query(
          `SELECT COALESCE(SUM(area_sq_ft), 0) AS held FROM space_holds WHERE inquiry_id = $1 AND property_id = $2 AND status = 'active';`,
          [input.inquiryId, input.propertyId]
        )).rows[0].held
      ) || 0
    : 0;
  const available = parseFloat(property.available_area_sq_ft) || 0;
  const baseline = parseFloat(property.baseline_occupied_sq_ft) || 0;

  if (input.fromBaseline) {
    if (area > baseline) {
      throw new LeaseCapacityError(
        `${property.name} only has ${baseline.toLocaleString('en-IN')} sq ft recorded as occupied by existing tenants.`
      );
    }
    await client.query('UPDATE properties SET baseline_occupied_sq_ft = baseline_occupied_sq_ft - $1 WHERE id = $2;', [area, input.propertyId]);
  } else if (area > available + convertibleHold) {
    throw new LeaseCapacityError(
      `${property.name} has only ${(available + convertibleHold).toLocaleString('en-IN')} sq ft free${convertibleHold ? ' (including space held for this deal)' : ''}. This lease needs ${area.toLocaleString('en-IN')} sq ft.`
    );
  }

  let companyName = input.companyName || null;
  if (input.companyId && !companyName) {
    companyName = (await client.query('SELECT name FROM companies WHERE id = $1;', [input.companyId])).rows[0]?.name || null;
  }
  const createdByName = userId ? (await client.query('SELECT name FROM users WHERE id = $1;', [userId])).rows[0]?.name || null : null;
  const rent = optNum(input.rentPerSqFtINR);
  const leaseId = `lease_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;

  await client.query(
    `INSERT INTO leases (
      id, inquiry_id, company_id, company_name, property_id, property_name, area_sq_ft,
      rent_per_sq_ft_inr, monthly_rent_inr, start_date, end_date, tenure_years, lock_in_months,
      escalation_percent, status, notes, from_baseline, created_by_user_id, created_by_user_name
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10::date,
      COALESCE($11::date, CASE WHEN $12::numeric IS NOT NULL
        THEN ($10::date + make_interval(months => round($12::numeric * 12)::int) - INTERVAL '1 day')::date END),
      $12, $13,
      $14, 'active', $15, $16, $17, $18
    );`,
    [
      leaseId, input.inquiryId || null, input.companyId || null, companyName, input.propertyId, property.name, area,
      rent, rent !== null ? rent * area : null, input.startDate, input.endDate || null,
      optNum(input.tenureYears), optNum(input.lockInMonths), optNum(input.escalationPercent),
      input.notes || null, !!input.fromBaseline, userId || null, createdByName,
    ]
  );

  if (input.inquiryId) {
    await client.query(
      `UPDATE space_holds SET status = 'converted', released_at = CURRENT_TIMESTAMP, reason = 'Lease signed'
       WHERE inquiry_id = $1 AND property_id = $2 AND status = 'active';`,
      [input.inquiryId, input.propertyId]
    );
  }
  await client.query(RECALCULATE_PROPERTY_SPACE_SQL, [input.propertyId]);
  return leaseId;
};

export interface WinTerms {
  propertyId: string;
  areaSqFt: number;
  startDate: string;
  rentPerSqFtINR?: number | null;
  tenureYears?: number | null;
  lockInMonths?: number | null;
  escalationPercent?: number | null;
  wonDate?: string | null;
  comments?: string | null;
}

/**
 * Marks an inquiry Won and records its lease in one transaction (caller owns BEGIN/COMMIT), so a
 * won deal can never exist without the space being taken out of the warehouse.
 */
export const winInquiryTx = async (
  client: PoolClient,
  inquiryIdOrNumber: string,
  terms: WinTerms,
  userId?: string | null
): Promise<{ inquiryId: string; leaseId: string }> => {
  const inqRes = await client.query(
    'SELECT id, stage, company_id, company_name FROM inquiries WHERE id = $1 OR LOWER(inquiry_number) = LOWER($1) FOR UPDATE;',
    [inquiryIdOrNumber]
  );
  const inquiry = inqRes.rows[0];
  if (!inquiry) throw new DealError('Inquiry not found.', 404);
  if (inquiry.stage === 'won') throw new DealError('This deal is already marked Won.', 409);

  const leaseId = await insertLease(
    client,
    {
      propertyId: terms.propertyId,
      areaSqFt: terms.areaSqFt,
      startDate: terms.startDate,
      inquiryId: inquiry.id,
      companyId: inquiry.company_id,
      companyName: inquiry.company_name,
      rentPerSqFtINR: terms.rentPerSqFtINR,
      tenureYears: terms.tenureYears,
      lockInMonths: terms.lockInMonths,
      escalationPercent: terms.escalationPercent,
      notes: terms.comments,
    },
    userId
  );

  const lease = (await client.query('SELECT property_name, monthly_rent_inr FROM leases WHERE id = $1;', [leaseId])).rows[0];
  await client.query(
    `UPDATE inquiries SET
       stage = 'won', status = 'Won',
       won_property_id = $2, won_property_name = $3,
       won_final_value_monthly_inr = COALESCE($4, won_final_value_monthly_inr),
       won_comments = COALESCE($5, won_comments),
       won_date = COALESCE($6, to_char(${BUSINESS_TODAY_SQL}, 'YYYY-MM-DD')),
       closed_by_user_id = COALESCE($7, closed_by_user_id),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1;`,
    [inquiry.id, terms.propertyId, lease.property_name, lease.monthly_rent_inr, terms.comments || null, terms.wonDate || null, userId || null]
  );
  await recordStageChange(inquiry.id, inquiry.stage, 'won', userId, `Lease ${leaseId} signed`, client);
  await closeFollowUps(client, inquiry.id, 'Deal won');
  return { inquiryId: inquiry.id, leaseId };
};
