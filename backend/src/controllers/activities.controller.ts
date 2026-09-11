import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/activities?companyId=...&inquiryId=...
 */
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, inquiryId } = req.query;
    let sql = 'SELECT * FROM activities WHERE 1=1';
    const params: any[] = [];

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    if (inquiryId) {
      params.push(inquiryId);
      sql += ` AND inquiry_id = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC;';
    const result = await query(sql, params);

    const activities = result.rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      inquiryId: row.inquiry_id,
      inquiryNumber: row.inquiry_number,
      userId: row.user_id,
      userName: row.user_name,
      activityType: row.activity_type,
      title: row.title,
      description: row.description,
      metadata: row.metadata,
      activityDate: row.activity_date,
      createdAt: row.created_at,
    }));

    res.status(200).json({ success: true, data: activities });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch activities' } });
  }
};

/**
 * POST /api/activities
 */
export const createActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      companyName,
      inquiryId,
      inquiryNumber,
      userId,
      userName,
      activityType = 'Call',
      title,
      description = '',
      metadata = {},
      activityDate,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, error: { message: 'Title is required' } });
      return;
    }

    const id = `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const finalDate = activityDate || new Date().toISOString().split('T')[0];

    const sql = `
      INSERT INTO activities (
        id, company_id, company_name, inquiry_id, inquiry_number, user_id, user_name,
        activity_type, title, description, metadata, activity_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      id,
      companyId || null,
      companyName || '',
      inquiryId || null,
      inquiryNumber || '',
      userId || '',
      userName || 'Admin',
      activityType,
      title.trim(),
      description,
      JSON.stringify(metadata),
      finalDate,
    ];

    const result = await query(sql, values);
    const row = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        companyId: row.company_id,
        companyName: row.company_name,
        inquiryId: row.inquiry_id,
        inquiryNumber: row.inquiry_number,
        userId: row.user_id,
        userName: row.user_name,
        activityType: row.activity_type,
        title: row.title,
        description: row.description,
        metadata: row.metadata,
        activityDate: row.activity_date,
        createdAt: row.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create activity' } });
  }
};
