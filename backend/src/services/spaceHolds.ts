import crypto from 'crypto';
import { PoolClient } from 'pg';
import { query, RECALCULATE_PROPERTY_SPACE_SQL } from '../config/db.js';

type Db = Pick<PoolClient, 'query'>;
const defaultDb: Db = { query: ((text: string, params?: any[]) => query(text, params)) as PoolClient['query'] };

export interface HoldResult {
  held: boolean;
  areaSqFt: number;
  message?: string;
}

/**
 * Puts a proposal's space on hold so nobody else can offer it. One active hold per deal per
 * warehouse: a revised proposal resizes the existing hold instead of stacking a second one.
 * If the warehouse can't cover it, nothing is held and the caller gets a message to surface.
 */
export const placeHold = async (
  input: { inquiryId: string; proposalId: string | null; propertyId: string; areaSqFt: number },
  db: Db = defaultDb
): Promise<HoldResult> => {
  const area = Number(input.areaSqFt);
  if (!input.inquiryId || !input.propertyId || !(area > 0)) return { held: false, areaSqFt: 0 };

  const prop = (await db.query('SELECT name, available_area_sq_ft, total_area_sq_ft FROM properties WHERE id = $1;', [input.propertyId])).rows[0];
  if (!prop) return { held: false, areaSqFt: 0, message: 'Warehouse not found; no space was held.' };

  const existing = (await db.query(
    `SELECT id, area_sq_ft FROM space_holds WHERE inquiry_id = $1 AND property_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1;`,
    [input.inquiryId, input.propertyId]
  )).rows[0];
  const alreadyHeld = existing ? parseFloat(existing.area_sq_ft) : 0;
  const free = parseFloat(prop.available_area_sq_ft) || 0;

  if (area > free + alreadyHeld) {
    return {
      held: false,
      areaSqFt: alreadyHeld,
      message: `${prop.name} has only ${(free + alreadyHeld).toLocaleString('en-IN')} sq ft free, so this proposal's ${area.toLocaleString('en-IN')} sq ft is not on hold.`,
    };
  }

  if (existing) {
    await db.query('UPDATE space_holds SET area_sq_ft = $1, proposal_id = COALESCE($2, proposal_id) WHERE id = $3;', [area, input.proposalId, existing.id]);
  } else {
    await db.query(
      `INSERT INTO space_holds (id, inquiry_id, proposal_id, property_id, area_sq_ft, status, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', 'Proposal sent', CURRENT_TIMESTAMP);`,
      [`hold_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`, input.inquiryId, input.proposalId, input.propertyId, area]
    );
  }
  await db.query(RECALCULATE_PROPERTY_SPACE_SQL, [input.propertyId]);
  return { held: true, areaSqFt: area };
};

/** Releases active holds for a deal or a single proposal and gives the space back. Returns the count. */
export const releaseHolds = async (
  scope: { inquiryId?: string; proposalId?: string },
  reason: string,
  db: Db = defaultDb
): Promise<number> => {
  const [col, val] = scope.proposalId ? ['proposal_id', scope.proposalId] : ['inquiry_id', scope.inquiryId];
  if (!val) return 0;
  const released = await db.query(
    `UPDATE space_holds SET status = 'released', released_at = CURRENT_TIMESTAMP, reason = $2
     WHERE ${col} = $1 AND status = 'active' RETURNING property_id;`,
    [val, reason]
  );
  const propertyIds = [...new Set(released.rows.map((r: any) => r.property_id))];
  for (const id of propertyIds) await db.query(RECALCULATE_PROPERTY_SPACE_SQL, [id]);
  return released.rows.length;
};
