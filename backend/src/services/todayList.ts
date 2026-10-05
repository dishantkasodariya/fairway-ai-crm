import { pool } from '../config/db.js';
import { callIntelligenceApi } from '../controllers/intelligence.controller.js';
import { nearestManagedWarehouse, normalizeCompanyName, websiteDomain, WarehouseOwner } from './aiProspects.js';
import { BUSINESS_TODAY_SQL } from './businessDate.js';

/** Business rules for the daily list (see PLAN.md B4). */
export const TODAY_RULES = {
  STUCK_AFTER_DAYS: 14,
  HOLD_WARN_AFTER_DAYS: 25,
  HOLD_RELEASE_AFTER_DAYS: 30,
  PROSPECT_MIN_SCORE: 50,
  RENEWAL_WINDOW_MONTHS: 12,
  TOP_N: 5,
};

export type TodayItemType = 'follow_up' | 'new_lead' | 'stuck_deal' | 'hold' | 'prospect' | 'renewal';

export interface TodayItem {
  type: TodayItemType;
  key: string;
  title: string;
  detail: string;
  /** Who should act: the assigned owner, else the suggested one (nearest warehouse manager). */
  ownerId: string | null;
  ownerName: string;
  ownerIsSuggested: boolean;
  dueDate?: string | null;
  daysOverdue?: number;
  score?: number | null;
  inquiryId?: string;
  inquiryNumber?: string;
  companyName?: string;
  prospectId?: number;
  propertyId?: string;
  taskId?: string;
}

export interface TodaySection {
  type: TodayItemType;
  items: TodayItem[];
  /** Total matching, before trimming to TOP_N (follow-ups are never trimmed). */
  total: number;
}

const suggestFor = async (companyId: string | null): Promise<WarehouseOwner | null> => {
  if (!companyId) return null;
  const f = (await pool.query(
    'SELECT latitude, longitude FROM facilities WHERE company_id = $1 AND latitude IS NOT NULL LIMIT 1;',
    [companyId]
  )).rows[0];
  return f ? nearestManagedWarehouse(pool, parseFloat(f.latitude), parseFloat(f.longitude)) : null;
};

const ownerOf = async (row: { salesperson_id?: string | null; salesperson_name?: string | null; company_id?: string | null }) => {
  if (row.salesperson_id) return { ownerId: row.salesperson_id, ownerName: row.salesperson_name || 'Owner', ownerIsSuggested: false };
  const s = await suggestFor(row.company_id || null);
  return s
    ? { ownerId: s.managerUserId, ownerName: s.managerName, ownerIsSuggested: true }
    : { ownerId: null, ownerName: 'Unassigned', ownerIsSuggested: false };
};

/** Last time anyone did something on a deal: a logged touch, a stage change, or its creation. */
const LAST_ACTIVITY_SQL = `GREATEST(
  i.created_at,
  COALESCE((SELECT max(a.created_at) FROM activities a WHERE a.inquiry_id = i.id AND a.activity_type = 'Touch'), i.created_at),
  COALESCE((SELECT max(h.created_at) FROM inquiry_stage_history h WHERE h.inquiry_id = i.id), i.created_at)
)`;

const ACTIVE_STAGES_AFTER_NEW = ['contacted', 'requirement_confirmed', 'property_matched', 'property_shared', 'proposal', 'site_visit', 'negotiation'];

export const buildTodayList = async (): Promise<{ today: string; sections: TodaySection[] }> => {
  const today = (await pool.query(`SELECT to_char(${BUSINESS_TODAY_SQL}, 'YYYY-MM-DD') AS d;`)).rows[0].d as string;
  const { TOP_N } = TODAY_RULES;

  // 1. Follow-ups due: pending tasks due today or earlier, plus deals whose next follow-up date has
  //    passed with nothing scheduled (older records set the date without creating a task).
  const taskRows = (await pool.query(
    `SELECT t.id, t.task_type, t.description, t.due_date, t.assigned_user_id, t.assigned_user_name, t.company_id, t.company_name,
            i.id AS inquiry_id, i.inquiry_number, i.opportunity_score, i.salesperson_id, i.salesperson_name,
            (${BUSINESS_TODAY_SQL} - t.due_date::date) AS days_overdue
     FROM tasks t LEFT JOIN inquiries i ON i.id = t.inquiry_id
     WHERE t.status = 'Pending' AND t.due_date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND t.due_date::date <= ${BUSINESS_TODAY_SQL}
       AND (i.id IS NULL OR i.stage NOT IN ('won', 'lost'))
     ORDER BY t.due_date ASC, t.created_at ASC;`
  )).rows;
  const followUps: TodayItem[] = [];
  for (const r of taskRows) {
    const owner = r.assigned_user_id
      ? { ownerId: r.assigned_user_id, ownerName: r.assigned_user_name || 'Owner', ownerIsSuggested: false }
      : await ownerOf(r);
    followUps.push({
      type: 'follow_up', key: `task:${r.id}`, taskId: r.id,
      title: `${r.task_type}: ${r.company_name || 'No company'}`,
      detail: r.description,
      dueDate: r.due_date, daysOverdue: Number(r.days_overdue) || 0,
      inquiryId: r.inquiry_id || undefined, inquiryNumber: r.inquiry_number || undefined, companyName: r.company_name || undefined,
      score: r.opportunity_score !== null ? Number(r.opportunity_score) : null,
      ...owner,
    });
  }
  const dealDueRows = (await pool.query(
    `SELECT i.id, i.inquiry_number, i.company_id, i.company_name, i.next_follow_up_date, i.next_action, i.opportunity_score,
            i.salesperson_id, i.salesperson_name, (${BUSINESS_TODAY_SQL} - i.next_follow_up_date::date) AS days_overdue
     FROM inquiries i
     WHERE i.stage NOT IN ('won', 'lost') AND i.next_follow_up_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
       AND i.next_follow_up_date::date <= ${BUSINESS_TODAY_SQL}
       AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.inquiry_id = i.id AND t.status = 'Pending')
     ORDER BY i.next_follow_up_date ASC;`
  )).rows;
  for (const r of dealDueRows) {
    followUps.push({
      type: 'follow_up', key: `deal:${r.id}`,
      title: `Follow up: ${r.company_name}`,
      detail: r.next_action || 'Follow-up date has passed.',
      dueDate: r.next_follow_up_date, daysOverdue: Number(r.days_overdue) || 0,
      inquiryId: r.id, inquiryNumber: r.inquiry_number, companyName: r.company_name,
      score: r.opportunity_score !== null ? Number(r.opportunity_score) : null,
      ...(await ownerOf(r)),
    });
  }
  followUps.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));

  // 2. New leads nobody has contacted yet (no touch, nothing scheduled), best score first.
  const newRows = (await pool.query(
    `SELECT i.id, i.inquiry_number, i.company_id, i.company_name, i.opportunity_score, i.source, i.salesperson_id, i.salesperson_name,
            (${BUSINESS_TODAY_SQL} - i.created_at::date) AS age_days, count(*) OVER () AS total
     FROM inquiries i
     WHERE i.stage = 'new' AND COALESCE(i.status, 'Active') = 'Active'
       AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.inquiry_id = i.id AND a.activity_type = 'Touch')
       AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.inquiry_id = i.id AND t.status = 'Pending')
       AND NOT (i.next_follow_up_date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND i.next_follow_up_date::date <= ${BUSINESS_TODAY_SQL})
     ORDER BY i.opportunity_score DESC NULLS LAST, i.created_at ASC
     LIMIT ${TOP_N};`
  )).rows;
  const newLeads: TodayItem[] = [];
  for (const r of newRows) {
    newLeads.push({
      type: 'new_lead', key: `new:${r.id}`,
      title: r.company_name,
      detail: `${r.source === 'AI Discovery' ? 'AI-discovered lead' : 'New lead'} added ${Number(r.age_days)} day(s) ago — nobody has reached out yet.`,
      inquiryId: r.id, inquiryNumber: r.inquiry_number, companyName: r.company_name,
      score: r.opportunity_score !== null ? Number(r.opportunity_score) : null,
      ...(await ownerOf(r)),
    });
  }
  const newTotal = newRows[0] ? Number(newRows[0].total) : 0;

  // 3. Stuck deals: past New, still active, nothing done for STUCK_AFTER_DAYS and nothing scheduled.
  const stuckRows = (await pool.query(
    `SELECT * FROM (
       SELECT i.id, i.inquiry_number, i.company_id, i.company_name, i.stage, i.opportunity_score, i.salesperson_id, i.salesperson_name,
              (${BUSINESS_TODAY_SQL} - (${LAST_ACTIVITY_SQL})::date) AS idle_days
       FROM inquiries i
       WHERE i.stage = ANY($1) AND COALESCE(i.status, 'Active') = 'Active'
         AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.inquiry_id = i.id AND t.status = 'Pending')
     ) x WHERE idle_days >= $2
     ORDER BY idle_days DESC;`,
    [ACTIVE_STAGES_AFTER_NEW, TODAY_RULES.STUCK_AFTER_DAYS]
  )).rows;
  const stuck: TodayItem[] = [];
  for (const r of stuckRows.slice(0, TOP_N)) {
    stuck.push({
      type: 'stuck_deal', key: `stuck:${r.id}`,
      title: r.company_name,
      detail: `${r.stage.replace(/_/g, ' ')} · no activity for ${r.idle_days} days and nothing scheduled.`,
      inquiryId: r.id, inquiryNumber: r.inquiry_number, companyName: r.company_name,
      score: r.opportunity_score !== null ? Number(r.opportunity_score) : null,
      ...(await ownerOf(r)),
    });
  }

  // 4. Space on hold for a deal that has gone quiet — auto-released at HOLD_RELEASE_AFTER_DAYS.
  const holdRows = (await pool.query(
    `SELECT * FROM (
       SELECT h.id, h.area_sq_ft, h.property_id, p.name AS property_name, i.id AS inquiry_id, i.inquiry_number, i.company_id,
              i.company_name, i.salesperson_id, i.salesperson_name,
              (${BUSINESS_TODAY_SQL} - GREATEST(h.created_at, ${LAST_ACTIVITY_SQL})::date) AS idle_days
       FROM space_holds h JOIN inquiries i ON i.id = h.inquiry_id JOIN properties p ON p.id = h.property_id
       WHERE h.status = 'active'
     ) x WHERE idle_days >= $1 ORDER BY idle_days DESC;`,
    [TODAY_RULES.HOLD_WARN_AFTER_DAYS]
  )).rows;
  const holds: TodayItem[] = [];
  for (const r of holdRows) {
    const left = Math.max(0, TODAY_RULES.HOLD_RELEASE_AFTER_DAYS - Number(r.idle_days));
    holds.push({
      type: 'hold', key: `hold:${r.id}`,
      title: `${r.company_name} · ${Number(r.area_sq_ft).toLocaleString('en-IN')} sq ft on hold`,
      detail: `At ${r.property_name}. No activity for ${r.idle_days} days — released automatically in ${left} day(s) unless the deal moves.`,
      inquiryId: r.inquiry_id, inquiryNumber: r.inquiry_number, companyName: r.company_name, propertyId: r.property_id,
      ...(await ownerOf(r)),
    });
  }

  // 5. Best AI prospects not in the CRM yet.
  const prospects: TodayItem[] = [];
  let prospectTotal = 0;
  try {
    const page = await callIntelligenceApi(`/v1/companies?min_score=${TODAY_RULES.PROSPECT_MIN_SCORE}&sort_by=score&limit=100`);
    const crm = (await pool.query('SELECT name, website, intelligence_company_id FROM companies;')).rows;
    const linked = new Set(crm.map((c) => c.intelligence_company_id).filter((v) => v !== null));
    const names = new Set(crm.map((c) => normalizeCompanyName(c.name)).filter(Boolean));
    const domains = new Set(crm.map((c) => websiteDomain(c.website)).filter(Boolean));
    const fresh = (page.items || []).filter(
      (c: any) => !linked.has(c.id) && !names.has(normalizeCompanyName(c.name))
    );
    prospectTotal = fresh.length;
    for (const c of fresh.slice(0, TOP_N)) {
      const detail = await callIntelligenceApi(`/v1/companies/${c.id}`);
      if (domains.has(websiteDomain(detail.website))) {
        prospectTotal -= 1;
        continue;
      }
      const owner = await nearestManagedWarehouse(pool, detail.lat, detail.lng);
      prospects.push({
        type: 'prospect', key: `prospect:${c.id}`, prospectId: c.id,
        title: c.name,
        detail: detail.opportunity_score?.why || `${c.business_type || 'Company'} ${c.distance_km ? `${c.distance_km.toFixed(1)} km away` : ''}`.trim(),
        score: c.opportunity_score,
        ownerId: owner?.managerUserId || null,
        ownerName: owner?.managerName || 'Unassigned',
        ownerIsSuggested: !!owner,
      });
    }
  } catch (err: any) {
    console.warn('[today] prospects unavailable:', err.message);
  }

  // 6. Leases ending within the renewal window.
  const renewalRows = (await pool.query(
    `SELECT l.id, l.company_id, l.company_name, l.property_id, l.property_name, l.area_sq_ft, l.inquiry_id,
            to_char(l.end_date, 'YYYY-MM-DD') AS end_date, (l.end_date - ${BUSINESS_TODAY_SQL}) AS days_left,
            p.manager_user_id, p.manager_name
     FROM leases l JOIN properties p ON p.id = l.property_id
     WHERE l.status = 'active' AND l.end_date IS NOT NULL
       AND l.end_date <= ${BUSINESS_TODAY_SQL} + make_interval(months => $1)
     ORDER BY l.end_date ASC;`,
    [TODAY_RULES.RENEWAL_WINDOW_MONTHS]
  )).rows;
  const renewals: TodayItem[] = renewalRows.map((r) => ({
    type: 'renewal' as const, key: `lease:${r.id}`,
    title: `${r.company_name || 'Tenant'} · lease ends ${r.end_date}`,
    detail: `${Number(r.area_sq_ft).toLocaleString('en-IN')} sq ft at ${r.property_name} — ${Math.max(0, Math.round(Number(r.days_left) / 30))} month(s) left. Start the renewal conversation.`,
    dueDate: r.end_date, propertyId: r.property_id, inquiryId: r.inquiry_id || undefined, companyName: r.company_name || undefined,
    ownerId: r.manager_user_id || null, ownerName: r.manager_name || 'Unassigned', ownerIsSuggested: false,
  }));

  return {
    today,
    sections: [
      { type: 'follow_up', items: followUps, total: followUps.length },
      { type: 'new_lead', items: newLeads, total: newTotal },
      { type: 'stuck_deal', items: stuck, total: stuckRows.length },
      { type: 'hold', items: holds, total: holds.length },
      { type: 'prospect', items: prospects, total: Math.max(prospectTotal, prospects.length) },
      { type: 'renewal', items: renewals, total: renewals.length },
    ],
  };
};
