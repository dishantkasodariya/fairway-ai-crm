import cron from 'node-cron';
import { query } from '../config/db.js';
import { buildTodayList, TODAY_RULES } from '../services/todayList.js';
import { releaseHolds } from '../services/spaceHolds.js';
import { BUSINESS_TZ, BUSINESS_TODAY_SQL } from '../services/businessDate.js';

/**
 * Releases space held for deals that went quiet for HOLD_RELEASE_AFTER_DAYS, and for proposals whose
 * expiry date has passed (the proposal's own status is left alone — only the space is freed).
 */
export async function releaseStaleHolds(): Promise<number> {
  const stale = (await query(
    `SELECT DISTINCT h.inquiry_id, h.proposal_id, p.proposal_number,
            CASE WHEN p.expiry_date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND p.expiry_date::date < ${BUSINESS_TODAY_SQL} THEN 'expired' ELSE 'idle' END AS why
     FROM space_holds h
     JOIN inquiries i ON i.id = h.inquiry_id
     LEFT JOIN proposals p ON p.id = h.proposal_id
     WHERE h.status = 'active' AND (
       (p.expiry_date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND p.expiry_date::date < ${BUSINESS_TODAY_SQL})
       OR (${BUSINESS_TODAY_SQL} - GREATEST(h.created_at,
             COALESCE((SELECT max(a.created_at) FROM activities a WHERE a.inquiry_id = i.id AND a.activity_type = 'Touch'), h.created_at),
             COALESCE((SELECT max(s.created_at) FROM inquiry_stage_history s WHERE s.inquiry_id = i.id), h.created_at))::date) >= $1
     );`,
    [TODAY_RULES.HOLD_RELEASE_AFTER_DAYS]
  )).rows;

  let released = 0;
  for (const r of stale) {
    released += r.why === 'expired' && r.proposal_id
      ? await releaseHolds({ proposalId: r.proposal_id }, `Proposal ${r.proposal_number} passed its expiry date`)
      : await releaseHolds({ inquiryId: r.inquiry_id }, `No activity for ${TODAY_RULES.HOLD_RELEASE_AFTER_DAYS} days`);
  }
  return released;
}

/** One morning notification per person who has something on the Today list. Idempotent per day. */
export async function runTodayDigest(): Promise<{ notified: number; released: number }> {
  const released = await releaseStaleHolds();
  const { today, sections } = await buildTodayList();

  const perOwner = new Map<string, number>();
  for (const s of sections) {
    for (const item of s.items) {
      if (item.ownerId) perOwner.set(item.ownerId, (perOwner.get(item.ownerId) || 0) + 1);
    }
  }

  // Some seeded tasks point at user ids that don't exist; only notify real accounts.
  const realUsers = new Set((await query('SELECT id FROM users;')).rows.map((r: any) => r.id));
  let notified = 0;
  for (const [userId, count] of perOwner) {
    if (!realUsers.has(userId)) continue;
    const result = await query(
      `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, is_read, created_at)
       VALUES ($1, $2, 'today_digest', $3, $4, 'today', $5, false, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING;`,
      [
        `today_${userId}_${today}`,
        userId,
        `Today: ${count} thing${count === 1 ? '' : 's'} to do`,
        'Follow-ups due, leads to contact and deals that need a nudge are on your Today list.',
        today,
      ]
    );
    notified += result.rowCount || 0;
  }
  return { notified, released };
}

export function startTodayDigest(): void {
  cron.schedule(
    '0 8 * * *',
    () => {
      runTodayDigest()
        .then((r) => console.log(`[todayDigest] ${r.notified} notification(s), ${r.released} hold(s) released`))
        .catch((err) => console.error('[todayDigest] run failed:', err.message));
    },
    { timezone: BUSINESS_TZ }
  );
  console.log('📋 Today digest scheduled (08:00 IST daily)');
}
