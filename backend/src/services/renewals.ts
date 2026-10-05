import crypto from 'crypto';
import { pool } from '../config/db.js';
import { insertInquiryRecord } from '../controllers/inquiries.controller.js';
import { recordStageChange } from './stageHistory.js';
import { BUSINESS_TODAY_SQL } from './businessDate.js';

/** Renewal rules (PLAN.md D2). */
export const RENEWAL_RULES = {
  /** A renewal lead is created this many months before a lease ends. */
  LEAD_MONTHS_BEFORE_END: 12,
  /** A follow-up task is added when this many months are left and the renewal is still open. */
  REMINDER_MONTHS_BEFORE_END: 6,
};

export const RENEWAL_SOURCE = 'Renewal';

const newId = (prefix: string, len = 8) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, len)}`;

/**
 * Creates one renewal lead per active lease ending within LEAD_MONTHS_BEFORE_END, and a follow-up
 * task at REMINDER_MONTHS_BEFORE_END if that renewal is still open. Idempotent: the lease remembers
 * its renewal lead and reminder task. Owner = the original deal's salesperson, else the warehouse manager.
 * Leases without a CRM company (typed-in tenants) are skipped — Today's Renewals section still lists them.
 */
export async function runRenewals(): Promise<{ leadsCreated: number; remindersCreated: number; skippedNoCompany: number }> {
  let leadsCreated = 0;
  let remindersCreated = 0;

  const due = (await pool.query(
    `SELECT l.id FROM leases l
     WHERE l.status = 'active' AND l.end_date IS NOT NULL AND l.renewal_inquiry_id IS NULL
       AND l.company_id IS NOT NULL
       AND l.end_date <= ${BUSINESS_TODAY_SQL} + make_interval(months => $1);`,
    [RENEWAL_RULES.LEAD_MONTHS_BEFORE_END]
  )).rows;
  const skippedNoCompany = Number((await pool.query(
    `SELECT count(*) FROM leases l
     WHERE l.status = 'active' AND l.end_date IS NOT NULL AND l.renewal_inquiry_id IS NULL AND l.company_id IS NULL
       AND l.end_date <= ${BUSINESS_TODAY_SQL} + make_interval(months => $1);`,
    [RENEWAL_RULES.LEAD_MONTHS_BEFORE_END]
  )).rows[0].count);

  for (const { id } of due) {
    if (await createRenewalLead(id)) leadsCreated += 1;
  }

  const reminders = (await pool.query(
    `SELECT l.id FROM leases l
     JOIN inquiries r ON r.id = l.renewal_inquiry_id
     WHERE l.status = 'active' AND l.renewal_reminder_task_id IS NULL
       AND l.end_date <= ${BUSINESS_TODAY_SQL} + make_interval(months => $1)
       AND r.stage NOT IN ('won', 'lost')
       -- only when the lead was raised before the 6-month mark; a lead created inside it is its own prompt
       AND (r.created_at AT TIME ZONE 'Asia/Kolkata')::date < l.end_date - make_interval(months => $1);`,
    [RENEWAL_RULES.REMINDER_MONTHS_BEFORE_END]
  )).rows;
  for (const { id } of reminders) {
    if (await createRenewalReminder(id)) remindersCreated += 1;
  }

  return { leadsCreated, remindersCreated, skippedNoCompany };
}

const createRenewalLead = async (leaseId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the lease and re-check, so two overlapping runs can't both create a lead.
    const lease = (await client.query(
      `SELECT l.*, to_char(l.end_date, 'YYYY-MM-DD') AS end_iso, to_char(l.end_date + 1, 'YYYY-MM-DD') AS next_start,
              p.name AS warehouse_name, p.corridor, p.city, p.manager_user_id, p.manager_name,
              o.salesperson_id AS orig_sp_id, o.salesperson_name AS orig_sp_name, o.contact_id, o.contact_name,
              o.contact_phone, o.contact_email, o.industry
       FROM leases l
       JOIN properties p ON p.id = l.property_id
       LEFT JOIN inquiries o ON o.id = l.inquiry_id
       WHERE l.id = $1 FOR UPDATE OF l;`,
      [leaseId]
    )).rows[0];
    if (!lease || lease.renewal_inquiry_id || lease.status !== 'active') {
      await client.query('ROLLBACK');
      return false;
    }

    const ownerId = lease.orig_sp_id || lease.manager_user_id || null;
    const ownerName = lease.orig_sp_id ? lease.orig_sp_name : lease.manager_name || 'Unassigned';
    const area = Number(lease.area_sq_ft);
    const tenureMonths = lease.tenure_years ? Math.round(Number(lease.tenure_years) * 12) : 0;

    const inquiry = await insertInquiryRecord(
      {
        companyId: lease.company_id,
        companyName: lease.company_name,
        contactId: lease.contact_id || null,
        contactName: lease.contact_name || '',
        contactPhone: lease.contact_phone || '',
        contactEmail: lease.contact_email || '',
        source: RENEWAL_SOURCE,
        salespersonId: ownerId,
        salespersonName: ownerName,
        requirement: `Renewal: ${area.toLocaleString('en-IN')} sq ft at ${lease.warehouse_name}, lease ends ${lease.end_iso}`,
        requiredAreaSqFt: area,
        location: lease.city || lease.warehouse_name,
        targetCorridor: lease.corridor || lease.city || '',
        industry: lease.industry || 'Industrial',
        possessionDate: lease.next_start,
        leaseDurationMonths: tenureMonths,
        budgetMonthlyINR: lease.monthly_rent_inr ? Number(lease.monthly_rent_inr) : 0,
        priority: 'High',
        leadScore: 0,
        opportunityScore: 0,
        stage: 'new',
        status: 'Active',
        nextAction: 'Ask the tenant whether they will renew, and on what terms.',
        nextFollowUpDate: null,
      },
      client
    );

    await client.query('UPDATE leases SET renewal_inquiry_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [inquiry.id, leaseId]);
    await client.query(
      `INSERT INTO activities (id, company_id, company_name, inquiry_id, inquiry_number, user_id, user_name, activity_type, title, description, metadata, activity_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, '', 'System', 'System', $6, $7, $8,
         to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      [
        newId('act'), lease.company_id, lease.company_name, inquiry.id, inquiry.inquiry_number,
        `Renewal lead: lease ends ${lease.end_iso}`,
        `${area.toLocaleString('en-IN')} sq ft at ${lease.warehouse_name}. Created automatically ${RENEWAL_RULES.LEAD_MONTHS_BEFORE_END} months before the lease ends.`,
        JSON.stringify({ leaseId, originalInquiryId: lease.inquiry_id || null, endDate: lease.end_iso }),
      ]
    );
    await recordStageChange(inquiry.id, null, 'new', null, `Renewal of lease ending ${lease.end_iso}`, client);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const createRenewalReminder = async (leaseId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query(
      `SELECT l.id, l.renewal_reminder_task_id, l.area_sq_ft, to_char(l.end_date, 'YYYY-MM-DD') AS end_iso, l.property_name,
              r.id AS inquiry_id, r.inquiry_number, r.company_id, r.company_name, r.salesperson_id, r.salesperson_name
       FROM leases l JOIN inquiries r ON r.id = l.renewal_inquiry_id
       WHERE l.id = $1 FOR UPDATE OF l;`,
      [leaseId]
    )).rows[0];
    if (!row || row.renewal_reminder_task_id) {
      await client.query('ROLLBACK');
      return false;
    }
    const taskId = newId('task');
    await client.query(
      `INSERT INTO tasks (id, company_id, company_name, inquiry_id, inquiry_number, assigned_user_id, assigned_user_name,
         task_type, description, due_date, due_time, priority, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Follow-up', $8,
         to_char(${BUSINESS_TODAY_SQL}, 'YYYY-MM-DD'), '11:00 AM', 'High', 'Pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      [
        taskId, row.company_id, row.company_name, row.inquiry_id, row.inquiry_number,
        row.salesperson_id || '', row.salesperson_name || 'Unassigned',
        `6 months left on ${row.company_name}'s lease at ${row.property_name} (ends ${row.end_iso}). Renewal still open — get a decision.`,
      ]
    );
    await client.query('UPDATE leases SET renewal_reminder_task_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [taskId, leaseId]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};
