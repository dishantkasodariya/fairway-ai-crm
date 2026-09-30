import { Response } from 'express';
import { pool, query, RECALCULATE_PROPERTY_SPACE_SQL } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { insertLease, LeaseInput, LeaseCapacityError, DealError } from '../services/leaseRecords.js';

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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const leaseId = await insertLease(client, req.body as LeaseInput, req.user?.userId);
    await client.query('COMMIT');

    const created = await query(`${LEASE_SELECT} WHERE l.id = $1;`, [leaseId]);
    res.status(201).json({ success: true, data: mapLeaseRow(created.rows[0]) });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof LeaseCapacityError || error instanceof DealError) {
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }
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
