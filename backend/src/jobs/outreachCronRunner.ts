import cron from 'node-cron';
import crypto from 'crypto';
import { query, pool } from '../config/db.js';
import { config } from '../config/index.js';
import { sendOutreachEmail } from '../services/emailSender.js';

let isRunning = false;

function interpolate(template: string, lead: any): string {
  if (!template) return '';
  const fullName = lead.recipient_name || '';
  const firstName = fullName.split(' ')[0] || 'there';
  const company = lead.company_name || 'your company';

  return template
    .replace(/\{\{\s*name\s*\}\}/gi, fullName || 'there')
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*company\s*\}\}/gi, company)
    .replace(/\{\{\s*companyName\s*\}\}/gi, company)
    .replace(/\{\{\s*email\s*\}\}/gi, lead.recipient_email || '');
}

/**
 * Runs a batch of outreach emails for due enrollments.
 */
export async function runOutreachBatchNow(options?: {
  maxBatch?: number;
  delayBetweenSendsMs?: number;
  campaignId?: string;
}): Promise<{
  processed: number;
  sent: number;
  completed: number;
  failed: number;
  dailyLimitReached: boolean;
}> {
  if (isRunning) {
    console.info('[outreach-runner] Previous batch is still running, skipping tick.');
    return { processed: 0, sent: 0, completed: 0, failed: 0, dailyLimitReached: false };
  }

  isRunning = true;
  let processed = 0;
  let sent = 0;
  let completed = 0;
  let failed = 0;
  let dailyLimitReached = false;

  try {
    // 1. Check daily sending cap
    const todaySentRes = await query(
      `SELECT COUNT(*)::int AS count FROM outreach_enrollments WHERE last_sent_at >= CURRENT_DATE;`
    );
    const sentToday = todaySentRes.rows[0]?.count || 0;
    const remainingQuota = Math.max(0, config.outreachDailyLimit - sentToday);

    if (remainingQuota <= 0) {
      console.warn(`[outreach-runner] Daily limit of ${config.outreachDailyLimit} emails reached. Pausing until tomorrow.`);
      dailyLimitReached = true;
      return { processed: 0, sent: 0, completed: 0, failed: 0, dailyLimitReached: true };
    }

    const batchLimit = Math.min(options?.maxBatch ?? 20, remainingQuota);

    // 2. Query due enrollments
    let sql = `
      SELECT e.*, 
             c.name as campaign_name,
             c.subject_template, c.body_template,
             c.follow_up_delay_days, c.follow_up_subject_template, c.follow_up_body_template,
             c.follow_up_2_delay_days, c.follow_up_2_subject_template, c.follow_up_2_body_template
      FROM outreach_enrollments e
      JOIN outreach_campaigns c ON c.id = e.campaign_id
      WHERE c.status = 'active'
        AND e.status IN ('pending', 'sent')
        AND e.next_send_at <= CURRENT_TIMESTAMP
    `;
    const params: any[] = [];
    if (options?.campaignId) {
      params.push(options.campaignId);
      sql += ` AND e.campaign_id = $${params.length}`;
    }
    params.push(batchLimit);
    sql += ` ORDER BY e.next_send_at ASC LIMIT $${params.length};`;

    const { rows: dueLeads } = await query(sql, params);

    const delayMs = options?.delayBetweenSendsMs ?? config.outreachDelayMs;

    for (const lead of dueLeads) {
      processed++;
      const currentStep = lead.current_step || 1;
      let subject = '';
      let body = '';
      let inReplyTo: string | undefined = undefined;
      let references: string | undefined = undefined;
      let nextStep = currentStep;
      let willComplete = false;
      let nextDelayDays = 7;

      if (lead.status === 'pending' || currentStep === 1) {
        // Step 1: Initial Pitch
        subject = interpolate(lead.subject_template, lead);
        body = interpolate(lead.body_template, lead);

        if (lead.follow_up_body_template && lead.follow_up_body_template.trim()) {
          nextStep = 2;
          nextDelayDays = lead.follow_up_delay_days || 7;
        } else {
          willComplete = true;
        }
      } else if (lead.status === 'sent' && currentStep === 2) {
        // Step 2: Follow-up 1
        const fallbackSubj = lead.subject_template?.startsWith('Re:')
          ? lead.subject_template
          : `Re: ${interpolate(lead.subject_template, lead)}`;
        subject = lead.follow_up_subject_template
          ? interpolate(lead.follow_up_subject_template, lead)
          : fallbackSubj;
        body = interpolate(lead.follow_up_body_template, lead);

        inReplyTo = lead.last_message_id || undefined;
        references = lead.last_message_id || undefined;

        if (lead.follow_up_2_body_template && lead.follow_up_2_body_template.trim()) {
          nextStep = 3;
          nextDelayDays = lead.follow_up_2_delay_days || 4;
        } else {
          willComplete = true;
        }
      } else if (lead.status === 'sent' && currentStep === 3) {
        // Step 3: Follow-up 2
        const fallbackSubj = lead.subject_template?.startsWith('Re:')
          ? lead.subject_template
          : `Re: ${interpolate(lead.subject_template, lead)}`;
        subject = lead.follow_up_2_subject_template
          ? interpolate(lead.follow_up_2_subject_template, lead)
          : fallbackSubj;
        body = interpolate(lead.follow_up_2_body_template, lead);

        inReplyTo = lead.last_message_id || undefined;
        references = lead.last_message_id || undefined;
        willComplete = true;
      } else {
        // Already past all steps
        await query(
          `UPDATE outreach_enrollments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
          [lead.id]
        );
        completed++;
        continue;
      }

      if (!subject || !body) {
        console.warn(`[outreach-runner] Missing subject or body for lead ${lead.id}, skipping.`);
        continue;
      }

      try {
        console.info(`[outreach-runner] Sending Step ${currentStep} to ${lead.recipient_email} (${lead.campaign_name})`);

        const sentResult = await sendOutreachEmail({
          to: lead.recipient_email,
          subject,
          text: body,
          inReplyTo,
          references,
        });

        sent++;

        // Update enrollment
        if (willComplete) {
          await query(
            `UPDATE outreach_enrollments 
             SET status = 'completed', 
                 last_message_id = $2, 
                 last_sent_at = CURRENT_TIMESTAMP, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1;`,
            [lead.id, sentResult.id]
          );
          completed++;
        } else {
          await query(
            `UPDATE outreach_enrollments 
             SET status = 'sent', 
                 current_step = $2, 
                 last_message_id = $3, 
                 last_sent_at = CURRENT_TIMESTAMP, 
                 next_send_at = CURRENT_TIMESTAMP + ($4 || ' days')::INTERVAL, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1;`,
            [lead.id, nextStep, sentResult.id, nextDelayDays]
          );
        }

        // Best effort: Log activity in CRM
        try {
          if (lead.company_id) {
            const compRes = await query('SELECT id, name FROM companies WHERE id = $1 LIMIT 1', [lead.company_id]);
            const comp = compRes.rows[0];
            if (comp) {
              await query(
                `INSERT INTO activities
                   (id, company_id, company_name, user_id, user_name, activity_type, title, description,
                    activity_date, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'Email', $6, $7,
                   to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
                [
                  `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
                  comp.id,
                  comp.name,
                  'system_cron',
                  'Fairway Outreach AI',
                  `Outreach (Step ${currentStep}): ${subject}`,
                  body,
                ]
              );
            }
          }
        } catch (logErr: any) {
          console.warn('[outreach-runner] Activity logging warning:', logErr.message);
        }

        // Throttle interval between sends to protect deliverability
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      } catch (err: any) {
        console.error(`[outreach-runner] Error sending to ${lead.recipient_email}:`, err.message);
        failed++;
        await query(
          `UPDATE outreach_enrollments 
           SET status = 'failed', 
               error_message = $2, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1;`,
          [lead.id, err.message || 'Send error']
        );
      }
    }
  } catch (err: any) {
    console.error('[outreach-runner] Fatal error processing outreach batch:', err);
  } finally {
    isRunning = false;
  }

  return { processed, sent, completed, failed, dailyLimitReached };
}

/**
 * Initializes the background cron job for outreach sequences.
 * Default: Every 30 minutes between 9 AM and 6 PM (business hours), Monday through Friday.
 */
export function startOutreachCronRunner() {
  if (!config.outreachCronEnabled) {
    console.info('[outreach-cron] Outreach cron is disabled via config.');
    return;
  }

  console.info('🚀 [outreach-cron] Automated Outreach sequence runner started (Mon-Fri 09:00-18:00 IST).');

  // Business hours: every 30 minutes, 9 AM to 6 PM, Mon-Fri
  cron.schedule(
    '*/30 9-18 * * 1-5',
    async () => {
      console.info('[outreach-cron] Cron triggered. Processing due outreach sequences...');
      const stats = await runOutreachBatchNow();
      console.info('[outreach-cron] Batch completed:', stats);
    },
    { timezone: 'Asia/Kolkata' }
  );
}
