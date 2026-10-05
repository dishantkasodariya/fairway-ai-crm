import { pool } from '../config/db.js';

/**
 * AI attribution: what the AI-sourced leads turned into, next to every other source.
 *
 * A lead counts at a step if it ever got there — not only where it sits today — so a
 * deal lost after its proposal still counts as having reached "proposal":
 * - contacted: a follow-up was logged, or it ever reached stage "contacted" or later
 * - requirement confirmed: ever reached "requirement_confirmed" or later
 * - proposal: a proposal exists, or it ever reached "proposal" or later
 * - won: stage is won
 * "Ever reached" = highest pipeline stage_order across its current stage and stage
 * history, ignoring "lost".
 */

export const AI_SOURCE = 'AI Discovery';

export interface FunnelCounts {
  leads: number;
  contacted: number;
  requirementConfirmed: number;
  proposal: number;
  won: number;
  lost: number;
  open: number;
  parked: number;
  /** won / leads, 0..1 */
  winRate: number;
}

export interface AttributionReport {
  period: { from: string | null; to: string | null };
  ai: FunnelCounts & {
    sqFtLeased: number;
    monthlyRentINR: number;
    leaseCount: number;
    avgTouchesPerWin: number | null;
    avgDaysToClose: number | null;
    medianDaysToClose: number | null;
    /** Required area of open (not parked) AI leads. */
    openPipelineSqFt: number;
  };
  otherSources: FunnelCounts;
  leasedByWarehouse: { propertyId: string; propertyName: string; sqFt: number; leases: number }[];
  wins: {
    inquiryId: string;
    inquiryNumber: string;
    companyName: string;
    wonAt: string | null;
    daysToClose: number | null;
    touches: number;
    sqFt: number;
  }[];
}

// One row per lead with everything the report needs. $1/$2 = optional created_at window (IST dates).
const LEADS_SQL = `
WITH stage_rank AS (SELECT key, stage_order FROM pipeline_stages WHERE key <> 'lost'),
cohort AS (
  SELECT i.* FROM inquiries i
  WHERE ($1::date IS NULL OR (i.created_at AT TIME ZONE 'Asia/Kolkata')::date >= $1::date)
    AND ($2::date IS NULL OR (i.created_at AT TIME ZONE 'Asia/Kolkata')::date <= $2::date)
)
SELECT
  c.id, c.inquiry_number, c.company_name, c.source, c.stage, c.status, c.created_at,
  COALESCE(c.required_area_sq_ft, 0)::float AS required_area_sq_ft,
  GREATEST(
    COALESCE((SELECT sr.stage_order FROM stage_rank sr WHERE sr.key = c.stage), 0),
    COALESCE((SELECT max(sr.stage_order) FROM inquiry_stage_history h JOIN stage_rank sr ON sr.key = h.to_stage
              WHERE h.inquiry_id = c.id), 0)
  ) AS max_stage_order,
  (SELECT count(*) FROM activities a WHERE a.inquiry_id = c.id AND a.activity_type = 'Touch')::int AS touches,
  EXISTS (SELECT 1 FROM proposals p WHERE p.inquiry_id = c.id) AS has_proposal,
  COALESCE(
    (SELECT max(h.created_at) FROM inquiry_stage_history h WHERE h.inquiry_id = c.id AND h.to_stage = 'won'),
    CASE WHEN c.won_date ~ '^\\d{4}-\\d{2}-\\d{2}' THEN c.won_date::date::timestamptz END
  ) AS won_at
FROM cohort c;`;

const stageOrder = async () => {
  const rows = (await pool.query(`SELECT key, stage_order FROM pipeline_stages;`)).rows;
  return Object.fromEntries(rows.map((r: any) => [r.key, Number(r.stage_order)])) as Record<string, number>;
};

const funnel = (leads: any[], order: Record<string, number>): FunnelCounts => {
  const reached = (l: any, key: string) => Number(l.max_stage_order) >= (order[key] ?? Infinity);
  const won = leads.filter((l) => l.stage === 'won').length;
  return {
    leads: leads.length,
    contacted: leads.filter((l) => l.touches > 0 || reached(l, 'contacted')).length,
    requirementConfirmed: leads.filter((l) => reached(l, 'requirement_confirmed')).length,
    proposal: leads.filter((l) => l.has_proposal || reached(l, 'proposal')).length,
    won,
    lost: leads.filter((l) => l.stage === 'lost').length,
    open: leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost' && l.status !== 'Parked').length,
    parked: leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost' && l.status === 'Parked').length,
    winRate: leads.length ? won / leads.length : 0,
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export async function buildAttributionReport(period: { from?: string | null; to?: string | null } = {}): Promise<AttributionReport> {
  const from = period.from || null;
  const to = period.to || null;
  const [order, leads] = await Promise.all([stageOrder(), pool.query(LEADS_SQL, [from, to]).then((r) => r.rows)]);

  const aiLeads = leads.filter((l: any) => l.source === AI_SOURCE);
  // Comparison = other ways of winning new tenants; renewals of existing tenants aren't new business.
  const otherLeads = leads.filter((l: any) => l.source !== AI_SOURCE && l.source !== 'Renewal');
  const aiIds = aiLeads.map((l: any) => l.id);

  // Leases signed from AI-sourced deals (terminated ones excluded — that space came back).
  const leases = aiIds.length
    ? (await pool.query(
        `SELECT inquiry_id, property_id, COALESCE(property_name, property_id) AS property_name,
                area_sq_ft::float AS area_sq_ft, COALESCE(monthly_rent_inr, 0)::float AS monthly_rent_inr
         FROM leases WHERE inquiry_id = ANY($1::text[]) AND status <> 'terminated';`,
        [aiIds]
      )).rows
    : [];

  const sqFtByInquiry = new Map<string, number>();
  const byWarehouse = new Map<string, { propertyId: string; propertyName: string; sqFt: number; leases: number }>();
  for (const l of leases) {
    sqFtByInquiry.set(l.inquiry_id, (sqFtByInquiry.get(l.inquiry_id) || 0) + l.area_sq_ft);
    const w = byWarehouse.get(l.property_id) || { propertyId: l.property_id, propertyName: l.property_name, sqFt: 0, leases: 0 };
    w.sqFt += l.area_sq_ft;
    w.leases += 1;
    byWarehouse.set(l.property_id, w);
  }

  const wins = aiLeads
    .filter((l: any) => l.stage === 'won')
    .map((l: any) => {
      const wonAt = l.won_at ? new Date(l.won_at) : null;
      return {
        inquiryId: l.id,
        inquiryNumber: l.inquiry_number,
        companyName: l.company_name,
        wonAt: wonAt ? wonAt.toISOString() : null,
        daysToClose: wonAt ? Math.max(0, Math.round((wonAt.getTime() - new Date(l.created_at).getTime()) / DAY_MS)) : null,
        touches: l.touches,
        sqFt: sqFtByInquiry.get(l.id) || 0,
      };
    })
    .sort((a, b) => (b.wonAt || '').localeCompare(a.wonAt || ''));

  const closeDays = wins.map((w) => w.daysToClose).filter((d): d is number => d !== null).sort((a, b) => a - b);
  const median = closeDays.length
    ? closeDays.length % 2
      ? closeDays[(closeDays.length - 1) / 2]
      : (closeDays[closeDays.length / 2 - 1] + closeDays[closeDays.length / 2]) / 2
    : null;

  return {
    period: { from, to },
    ai: {
      ...funnel(aiLeads, order),
      sqFtLeased: leases.reduce((s: number, l: any) => s + l.area_sq_ft, 0),
      monthlyRentINR: leases.reduce((s: number, l: any) => s + l.monthly_rent_inr, 0),
      leaseCount: leases.length,
      avgTouchesPerWin: wins.length ? round1(wins.reduce((s, w) => s + w.touches, 0) / wins.length) : null,
      avgDaysToClose: closeDays.length ? round1(closeDays.reduce((s, d) => s + d, 0) / closeDays.length) : null,
      medianDaysToClose: median,
      openPipelineSqFt: aiLeads
        .filter((l: any) => l.stage !== 'won' && l.stage !== 'lost' && l.status !== 'Parked')
        .reduce((s: number, l: any) => s + l.required_area_sq_ft, 0),
    },
    otherSources: funnel(otherLeads, order),
    leasedByWarehouse: [...byWarehouse.values()].sort((a, b) => b.sqFt - a.sqFt),
    wins,
  };
}
