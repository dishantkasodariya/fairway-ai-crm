import crypto from 'crypto';
import { PoolClient } from 'pg';
import { recordStageChange } from './stageHistory.js';
import { DealError } from './dealErrors.js';
import { BUSINESS_TODAY_SQL } from './businessDate.js';

type Db = Pick<PoolClient, 'query'>;

export const TOUCH_CHANNELS = ['Call', 'Email', 'LinkedIn', 'WhatsApp', 'Meeting'] as const;
export const TOUCH_OUTCOMES = ['reached_out', 'no_reply', 'interested', 'not_now', 'not_interested'] as const;
export type TouchOutcome = (typeof TOUCH_OUTCOMES)[number];

/** Business rules for the loop (confirmed with Bhavya): re-ask every 5 days, park after 3 unanswered, park 90 days. */
export const FOLLOW_UP_DAYS = 5;
export const INTERESTED_FOLLOW_UP_DAYS = 3;
export const MAX_NO_REPLY = 3;
export const PARK_DAYS = 90;

const OUTCOME_LABEL: Record<TouchOutcome, string> = {
  reached_out: 'Reached out',
  no_reply: 'No reply',
  interested: 'Interested',
  not_now: 'Not now',
  not_interested: 'Not interested',
};

export interface TouchResult {
  activityId: string;
  touchNumber: number;
  noReplyStreak: number;
  stage: string;
  status: string;
  nextFollowUp: { taskId: string; dueDate: string; description: string } | null;
  /** The person said no — the client should open the Lost flow to capture the reason. */
  suggestLost: boolean;
}

/**
 * Logs one touch on a deal and schedules the next step, in the caller's transaction:
 * completes the open follow-up, writes a Touch activity, creates the next follow-up task,
 * keeps inquiries.next_follow_up_date/next_action/status in sync, and moves New → Contacted.
 */
export const logTouch = async (
  client: PoolClient,
  inquiryIdOrNumber: string,
  input: { channel: string; outcome: TouchOutcome; note?: string | null },
  userId?: string | null
): Promise<TouchResult> => {
  if (!TOUCH_CHANNELS.includes(input.channel as any)) throw new DealError(`channel must be one of ${TOUCH_CHANNELS.join(', ')}.`);
  if (!TOUCH_OUTCOMES.includes(input.outcome)) throw new DealError(`outcome must be one of ${TOUCH_OUTCOMES.join(', ')}.`);

  const inquiry = (await client.query(
    `SELECT id, inquiry_number, company_id, company_name, stage, status, salesperson_id, salesperson_name
     FROM inquiries WHERE id = $1 OR LOWER(inquiry_number) = LOWER($1) FOR UPDATE;`,
    [inquiryIdOrNumber]
  )).rows[0];
  if (!inquiry) throw new DealError('Inquiry not found.', 404);
  if (inquiry.stage === 'won' || inquiry.stage === 'lost') throw new DealError('This deal is closed; reopen it before logging follow-ups.', 409);

  const user = userId ? (await client.query('SELECT id, name FROM users WHERE id = $1;', [userId])).rows[0] : null;

  const prev = (await client.query(
    `SELECT metadata FROM activities WHERE inquiry_id = $1 AND activity_type = 'Touch' ORDER BY created_at DESC LIMIT 1;`,
    [inquiry.id]
  )).rows[0];
  const touchCount = parseInt((await client.query(
    `SELECT count(*)::int AS n FROM activities WHERE inquiry_id = $1 AND activity_type = 'Touch';`,
    [inquiry.id]
  )).rows[0].n, 10);
  const prevStreak = Number(prev?.metadata?.noReplyStreak) || 0;
  // "Reached out" is a new attempt, not an answer, so it keeps the streak; any real answer resets it.
  const noReplyStreak =
    input.outcome === 'no_reply' ? prevStreak + 1 : input.outcome === 'reached_out' ? prevStreak : 0;
  const touchNumber = touchCount + 1;

  const note = (input.note || '').trim();
  const activityId = `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
  await client.query(
    `INSERT INTO activities (id, company_id, company_name, inquiry_id, inquiry_number, user_id, user_name,
       activity_type, title, description, metadata, activity_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Touch', $8, $9, $10, to_char(${BUSINESS_TODAY_SQL}, 'YYYY-MM-DD'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
    [
      activityId, inquiry.company_id, inquiry.company_name || '', inquiry.id, inquiry.inquiry_number || '',
      user?.id || '', user?.name || 'Unknown', `${input.channel} · ${OUTCOME_LABEL[input.outcome]}`, note,
      JSON.stringify({ channel: input.channel, outcome: input.outcome, touchNumber, noReplyStreak }),
    ]
  );

  await client.query(
    `UPDATE tasks SET status = 'Completed', completed_at = CURRENT_TIMESTAMP,
       completed_notes = COALESCE(NULLIF($2, ''), 'Followed up'), updated_at = CURRENT_TIMESTAMP
     WHERE inquiry_id = $1 AND status = 'Pending' AND task_type = 'Follow-up';`,
    [inquiry.id, note ? `${input.channel} · ${OUTCOME_LABEL[input.outcome]}: ${note}` : `${input.channel} · ${OUTCOME_LABEL[input.outcome]}`]
  );

  let next: { days: number; description: string; priority: string } | null = null;
  let status = inquiry.status === 'Parked' ? 'Active' : inquiry.status || 'Active';
  const company = inquiry.company_name || 'this lead';
  switch (input.outcome) {
    case 'reached_out':
      next = { days: FOLLOW_UP_DAYS, description: `What's the update from ${company}? You reached out via ${input.channel}.`, priority: 'High' };
      break;
    case 'no_reply':
      if (noReplyStreak >= MAX_NO_REPLY) {
        status = 'Parked';
        next = { days: PARK_DAYS, description: `Parked after ${MAX_NO_REPLY} unanswered follow-ups. Check ${company} for new signals and re-engage.`, priority: 'Low' };
      } else {
        next = { days: FOLLOW_UP_DAYS, description: `No reply from ${company} yet (${noReplyStreak} of ${MAX_NO_REPLY}). Try another channel.`, priority: 'High' };
      }
      break;
    case 'interested':
      next = { days: INTERESTED_FOLLOW_UP_DAYS, description: `${company} is interested. Confirm area, timeline and budget.`, priority: 'High' };
      break;
    case 'not_now':
      status = 'Parked';
      next = { days: PARK_DAYS, description: `${company} asked to reconnect later. Check in again.`, priority: 'Low' };
      break;
    case 'not_interested':
      next = null;
      break;
  }

  let nextFollowUp: TouchResult['nextFollowUp'] = null;
  if (next) {
    const taskId = `task_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const due = (await client.query(
      `SELECT to_char(${BUSINESS_TODAY_SQL} + $1::int, 'YYYY-MM-DD') AS d;`,
      [next.days]
    )).rows[0].d as string;
    const assigneeId = inquiry.salesperson_id || user?.id || null;
    const assigneeName = inquiry.salesperson_id ? inquiry.salesperson_name : user?.name || 'Unassigned';
    await client.query(
      `INSERT INTO tasks (id, company_id, company_name, inquiry_id, inquiry_number, assigned_user_id, assigned_user_name,
         task_type, description, due_date, due_time, priority, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Follow-up', $8, $9, '11:00 AM', $10, 'Pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      [taskId, inquiry.company_id, inquiry.company_name, inquiry.id, inquiry.inquiry_number, assigneeId, assigneeName, next.description, due, next.priority]
    );
    nextFollowUp = { taskId, dueDate: due, description: next.description };
  }

  const newStage = inquiry.stage === 'new' && input.outcome !== 'not_interested' ? 'contacted' : inquiry.stage;
  await client.query(
    `UPDATE inquiries SET stage = $2, status = $3, next_follow_up_date = $4, next_action = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
    [inquiry.id, newStage, status, nextFollowUp?.dueDate || null, nextFollowUp?.description || null]
  );
  await recordStageChange(inquiry.id, inquiry.stage, newStage, userId, `First touch via ${input.channel}`, client);

  return {
    activityId,
    touchNumber,
    noReplyStreak,
    stage: newStage,
    status,
    nextFollowUp,
    suggestLost: input.outcome === 'not_interested',
  };
};

/** Won or lost: nothing left to chase — cancel open follow-ups and clear the next follow-up date. */
export const closeFollowUps = async (db: Db, inquiryId: string, reason: string): Promise<void> => {
  await db.query(
    `UPDATE tasks SET status = 'Cancelled', completed_notes = $2, updated_at = CURRENT_TIMESTAMP
     WHERE inquiry_id = $1 AND status = 'Pending' AND task_type = 'Follow-up';`,
    [inquiryId, reason]
  );
  await db.query('UPDATE inquiries SET next_follow_up_date = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [inquiryId]);
};
