import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/facilities?companyId=...
 */
export const getFacilities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.query;
    let sql = 'SELECT * FROM facilities WHERE 1=1';
    const params: any[] = [];

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    sql += ' ORDER BY created_at ASC;';
    const result = await query(sql, params);

    const facilities = result.rows.map((f) => ({
      id: f.id,
      companyId: f.company_id,
      companyName: f.company_name,
      name: f.name,
      type: f.type,
      address: f.address,
      city: f.city,
      state: f.state,
      pincode: f.pincode,
      latitude: f.latitude ? parseFloat(f.latitude) : null,
      longitude: f.longitude ? parseFloat(f.longitude) : null,
      status: f.status,
      builtUpAreaSqFt: f.built_up_area_sq_ft ? parseFloat(f.built_up_area_sq_ft) : 0,
      createdAt: f.created_at,
    }));

    res.status(200).json({ success: true, data: facilities });
  } catch (error: any) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch facilities' } });
  }
};

/**
 * POST /api/facilities
 */
export const createFacility = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      companyName,
      name,
      type = 'Warehouse',
      address,
      city = 'Dahej',
      state = 'Gujarat',
      pincode = '392130',
      latitude,
      longitude,
      status = 'Active',
      builtUpAreaSqFt = 0,
    } = req.body;

    if (!companyId || !name) {
      res.status(400).json({ success: false, error: { message: 'companyId and facility name are required' } });
      return;
    }

    const id = `fac_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

    const sql = `
      INSERT INTO facilities (
        id, company_id, company_name, name, type, address, city, state, pincode,
        latitude, longitude, status, built_up_area_sq_ft, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      id,
      companyId,
      companyName || '',
      name.trim(),
      type,
      address || '',
      city,
      state,
      pincode,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      status,
      builtUpAreaSqFt ? parseFloat(builtUpAreaSqFt) : 0,
    ];

    const result = await query(sql, values);
    const f = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: f.id,
        companyId: f.company_id,
        companyName: f.company_name,
        name: f.name,
        type: f.type,
        address: f.address,
        city: f.city,
        state: f.state,
        pincode: f.pincode,
        latitude: f.latitude ? parseFloat(f.latitude) : null,
        longitude: f.longitude ? parseFloat(f.longitude) : null,
        status: f.status,
        builtUpAreaSqFt: f.built_up_area_sq_ft ? parseFloat(f.built_up_area_sq_ft) : 0,
        createdAt: f.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating facility:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create facility' } });
  }
};

/**
 * DELETE /api/facilities/:id
 */
export const deleteFacility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM facilities WHERE id = $1 RETURNING id;', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Facility not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Facility deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting facility:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete facility' } });
  }
};
