import { Response } from 'express';
import crypto from 'crypto';
import { pool, query, RECALCULATE_PROPERTY_SPACE_SQL } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const LEASE_SELECT = `
  SELECT l.*,
    to_char(l.start_date, 'YYYY-MM-DD') AS start_date_str,
    to_char(l.end_date, 'YYYY-MM-DD') AS end_date_str
  FROM leases l`;

const num = (v: any) => (v === null || v === undefined ? null : parseFloat(v));

const mapLeaseRow = (row: any) => ({
  id: row.id,
  inquiryId: row.inquiry_id,
  companyId: row.company_id,
  companyName: row.company_name,
  propertyId: row.property_id,
  propertyName: row.property_name,
  areaSqFt: num(row.area_sq_ft),
  rentPerSqFtINR: num(row.rent_per_sq_ft_inr),
  monthlyRentINR: num(row.monthly_rent_inr),
  startDate: row.start_date_str,
  endDate: row.end_date_str,
  tenureYears: num(row.tenure_years),
  lockInMonths: row.lock_in_months,
  escalationPercent: num(row.escalation_percent),
  status: row.status,
  fromBaseline: row.from_baseline,
  notes: row.notes || '',
  createdByUserId: row.created_by_user_id,
  createdByUserName: row.created_by_user_name,
  createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
});

const userName = async (userId?: string) => {
  if (!userId) return null;
  const r = await query('SELECT name FROM users WHERE id = $1;', [userId]);
  return r.rows[0]?.name || null;
};

/** GET /api/leases?propertyId=&companyId=&inquiryId=&status= */
export const getLeases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { propertyId, companyId, inquiryId, status } = req.query;
    const params: any[] = [];
    let sql = `${LEASE_SELECT} WHERE 1=1`;
    for (const [col, val] of [['l.property_id', propertyId], ['l.company_id', companyId], ['l.inquiry_id', inquiryId], ['l.status', status]] as const) {
      if (val && val !== 'all') {
        params.push(val);
        sql += ` AND ${col} = $${params.length}`;
      }
    }
    sql += ' ORDER BY l.status = \'active\' DESC, l.end_date ASC NULLS LAST, l.created_at DESC;';
    const result = await query(sql, params);
    res.status(200).json({ success: true, data: result.rows.map(mapLeaseRow) });
  } catch (error: any) {
    console.error('Error fetching leases:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch leases.' });
  }
};

/** GET /api/leases/:id */
export const getLeaseById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`${LEASE_SELECT} WHERE l.id = $1;`, [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ success: false, error: 'Lease not found.' });
      return;
    }
    res.status(200).json({ success: true, data: mapLeaseRow(result.rows[0]) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch lease.' });
  }
};

/**
 * POST /api/leases
 * Creates a lease and takes the space out of the warehouse. The lease may use space that is free
 * plus any space already on hold for the same inquiry at that warehouse (those holds become
 * "converted"). With fromBaseline=true it records a tenant already counted in the warehouse's
 * "occupied by existing tenants" figure, so the baseline shrinks instead of free space.
 */
export const createLease = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    inquiryId, companyId, companyName, propertyId, areaSqFt, rentPerSqFtINR,
    startDate, endDate, tenureYears, lockInMonths, escalationPercent, notes, fromBaseline,
  } = req.body;

  const area = Number(areaSqFt);
  if (!propertyId || !startDate || !Number.isFinite(area) || area <= 0) {
    res.status(400).json({ success: false, error: 'propertyId, startDate and a positive areaSqFt are required.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const propRes = await client.query(
      'SELECT id, name, available_area_sq_ft, baseline_occupied_sq_ft FROM properties WHERE id = $1 FOR UPDATE;',
      [propertyId]
    );
    const property = propRes.rows[0];
    if (!property) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Warehouse not found.' });
      return;
    }

    const holdsRes = inquiryId
      ? await client.query(
          `SELECT COALESCE(SUM(area_sq_ft), 0) AS held FROM space_holds WHERE inquiry_id = $1 AND property_id = $2 AND status = 'active';`,
          [inquiryId, propertyId]
        )
      : { rows: [{ held: 0 }] };
    const convertibleHold = parseFloat(holdsRes.rows[0].held) || 0;
    const available = parseFloat(property.available_area_sq_ft) || 0;
    const baseline = parseFloat(property.baseline_occupied_sq_ft) || 0;

    if (fromBaseline) {
      if (area > baseline) {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          error: `${property.name} only has ${baseline.toLocaleString('en-IN')} sq ft recorded as occupied by existing tenants.`,
        });
        return;
      }
      await client.query(
        'UPDATE properties SET baseline_occupied_sq_ft = baseline_occupied_sq_ft - $1 WHERE id = $2;',
        [area, propertyId]
      );
    } else if (area > available + convertibleHold) {
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        error: `${property.name} has only ${(available + convertibleHold).toLocaleString('en-IN')} sq ft free${convertibleHold ? ' (including space held for this deal)' : ''}. This lease needs ${area.toLocaleString('en-IN')} sq ft.`,
      });
      return;
    }

    let resolvedCompanyName = companyName || null;
    if (companyId && !resolvedCompanyName) {
      const c = await client.query('SELECT name FROM companies WHERE id = $1;', [companyId]);
      resolvedCompanyName = c.rows[0]?.name || null;
    }

    const rent = rentPerSqFtINR === undefined || rentPerSqFtINR === null || rentPerSqFtINR === '' ? null : Number(rentPerSqFtINR);
    const leaseId = `lease_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const createdByName = await userName(req.user?.userId);

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
        leaseId, inquiryId || null, companyId || null, resolvedCompanyName, propertyId, property.name, area,
        rent, rent !== null ? rent * area : null, startDate, endDate || null,
        tenureYears === undefined || tenureYears === null || tenureYears === '' ? null : Number(tenureYears),
        lockInMonths === undefined || lockInMonths === null || lockInMonths === '' ? null : Number(lockInMonths),
        escalationPercent === undefined || escalationPercent === null || escalationPercent === '' ? null : Number(escalationPercent),
        notes || null, !!fromBaseline, req.user?.userId || null, createdByName,
      ]
    );

    if (inquiryId) {
      await client.query(
        `UPDATE space_holds SET status = 'converted', released_at = CURRENT_TIMESTAMP, reason = 'Lease signed'
         WHERE inquiry_id = $1 AND property_id = $2 AND status = 'active';`,
        [inquiryId, propertyId]
      );
    }

    await client.query(RECALCULATE_PROPERTY_SPACE_SQL, [propertyId]);
    await client.query('COMMIT');

    const created = await query(`${LEASE_SELECT} WHERE l.id = $1;`, [leaseId]);
    res.status(201).json({ success: true, data: mapLeaseRow(created.rows[0]) });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating lease:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create lease.' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/leases/:id
 * Edit terms, or end / terminate a lease (status ended|terminated) which frees its space.
 */
export const updateLease = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { areaSqFt, rentPerSqFtINR, startDate, endDate, tenureYears, lockInMonths, escalationPercent, status, notes } = req.body;

  if (status && !['active', 'ended', 'terminated'].includes(status)) {
    res.status(400).json({ success: false, error: 'status must be active, ended or terminated.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query('SELECT * FROM leases WHERE id = $1 FOR UPDATE;', [req.params.id]);
    const existing = existingRes.rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Lease not found.' });
      return;
    }

    const newStatus = status || existing.status;
    const oldArea = parseFloat(existing.area_sq_ft);
    const newArea = areaSqFt === undefined || areaSqFt === null || areaSqFt === '' ? oldArea : Number(areaSqFt);
    if (!Number.isFinite(newArea) || newArea <= 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'areaSqFt must be positive.' });
      return;
    }

    // Space this change newly takes out of the warehouse (re-activating counts the full area).
    const extra = newStatus === 'active' ? (existing.status === 'active' ? newArea - oldArea : newArea) : 0;
    if (extra > 0) {
      const p = await client.query('SELECT name, available_area_sq_ft FROM properties WHERE id = $1 FOR UPDATE;', [existing.property_id]);
      const available = parseFloat(p.rows[0].available_area_sq_ft) || 0;
      if (extra > available) {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          error: `${p.rows[0].name} has only ${available.toLocaleString('en-IN')} sq ft free; this change needs ${extra.toLocaleString('en-IN')} more.`,
        });
        return;
      }
    }

    const rent = rentPerSqFtINR === undefined ? parseFloat(existing.rent_per_sq_ft_inr) : rentPerSqFtINR === null || rentPerSqFtINR === '' ? null : Number(rentPerSqFtINR);
    await client.query(
      `UPDATE leases SET
        area_sq_ft = $1,
        rent_per_sq_ft_inr = $2,
        monthly_rent_inr = CASE WHEN $2::numeric IS NULL THEN NULL ELSE $2::numeric * $1::numeric END,
        start_date = COALESCE($3::date, start_date),
        end_date = COALESCE($4::date, end_date),
        tenure_years = COALESCE($5::numeric, tenure_years),
        lock_in_months = COALESCE($6::int, lock_in_months),
        escalation_percent = COALESCE($7::numeric, escalation_percent),
        status = $8,
        notes = COALESCE($9, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10;`,
      [
        newArea, Number.isFinite(rent as number) ? rent : null, startDate || null, endDate || null,
        tenureYears ?? null, lockInMonths ?? null, escalationPercent ?? null, newStatus, notes ?? null, req.params.id,
      ]
    );
    await client.query(RECALCULATE_PROPERTY_SPACE_SQL, [existing.property_id]);
    await client.query('COMMIT');

    const updated = await query(`${LEASE_SELECT} WHERE l.id = $1;`, [req.params.id]);
    res.status(200).json({ success: true, data: mapLeaseRow(updated.rows[0]) });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating lease:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update lease.' });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/leases/:id — for entries made by mistake. An active lease recorded from the
 * baseline hands its area back to the baseline, so deleting never invents free space.
 */
export const deleteLease = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query('DELETE FROM leases WHERE id = $1 RETURNING *;', [req.params.id]);
    const existing = existingRes.rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Lease not found.' });
      return;
    }
    if (existing.from_baseline && existing.status === 'active') {
      await client.query(
        'UPDATE properties SET baseline_occupied_sq_ft = COALESCE(baseline_occupied_sq_ft, 0) + $1 WHERE id = $2;',
        [existing.area_sq_ft, existing.property_id]
      );
    }
    await client.query(RECALCULATE_PROPERTY_SPACE_SQL, [existing.property_id]);
    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Lease deleted.' });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ success: false, error: error.message || 'Failed to delete lease.' });
  } finally {
    client.release();
  }
};
