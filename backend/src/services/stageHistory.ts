import crypto from 'crypto';
import { PoolClient } from 'pg';
import { query } from '../config/db.js';

type Db = Pick<PoolClient, 'query'>;
const defaultDb: Db = { query: ((text: string, params?: any[]) => query(text, params)) as PoolClient['query'] };

/** Appends an inquiry_stage_history row when the stage actually changes. */
export const recordStageChange = async (
  inquiryId: string,
  fromStage: string | null | undefined,
  toStage: string | null | undefined,
  userId?: string | null,
  reason?: string | null,
  db: Db = defaultDb
): Promise<void> => {
  if (!toStage || fromStage === toStage) return;
  const user = userId ? (await db.query('SELECT name FROM users WHERE id = $1;', [userId])).rows[0] : null;
  await db.query(
    `INSERT INTO inquiry_stage_history (id, inquiry_id, from_stage, to_stage, changed_by_user_id, changed_by_user_name, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP);`,
    [`ish_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`, inquiryId, fromStage || null, toStage, userId || null, user?.name || null, reason || null]
  );
};
