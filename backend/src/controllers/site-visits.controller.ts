import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

/**
 * GET /api/v1/site-visits
 * Fetch list of site visits with optional filters for inquiryId, companyId, status, hostUserId
 */
export const getSiteVisits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inquiryId, companyId, status, hostUserId, search } = req.query;

    let sql = 'SELECT * FROM site_visits WHERE 1=1';
    const params: any[] = [];

    if (inquiryId) {
      params.push(inquiryId);
      sql += ` AND inquiry_id = $${params.length}`;
    }

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (hostUserId && hostUserId !== 'all') {
      params.push(hostUserId);
      sql += ` AND host_user_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (company_name ILIKE $${params.length} OR property_name ILIKE $${params.length} OR visitor_name ILIKE $${params.length})`;
    }

    sql += ' ORDER BY scheduled_date DESC, created_at DESC;';

    const result = await query(sql, params);

    const formatted = result.rows.map((r) => ({
      id: r.id,
      inquiryId: r.inquiry_id,
      inquiryNumber: r.inquiry_number,
      companyId: r.company_id,
      companyName: r.company_name,
      propertyId: r.property_id,
      propertyName: r.property_name,
      scheduledDate: r.scheduled_date,
      scheduledTime: r.scheduled_time,
      hostUserId: r.host_user_id,
      hostUserName: r.host_user_name,
      visitorName: r.visitor_name,
      visitorPhone: r.visitor_phone,
      status: r.status,
      clientFeedback: r.client_feedback,
      followUpAction: r.follow_up_action,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json({
      success: true,
      data: formatted,
      totalCount: formatted.length,
    });
  } catch (error: any) {
    console.error('Error in getSiteVisits:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve site visits.' });
  }
};

/**
 * GET /api/v1/site-visits/:id
 */
export const getSiteVisitById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM site_visits WHERE id = $1;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Site visit not found.' });
      return;
    }

    const r = result.rows[0];
    res.json({
      success: true,
      data: {
        id: r.id,
        inquiryId: r.inquiry_id,
        inquiryNumber: r.inquiry_number,
        companyId: r.company_id,
        companyName: r.company_name,
        propertyId: r.property_id,
        propertyName: r.property_name,
        scheduledDate: r.scheduled_date,
        scheduledTime: r.scheduled_time,
        hostUserId: r.host_user_id,
        hostUserName: r.host_user_name,
        visitorName: r.visitor_name,
        visitorPhone: r.visitor_phone,
        status: r.status,
        clientFeedback: r.client_feedback,
        followUpAction: r.follow_up_action,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in getSiteVisitById:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve site visit.' });
  }
};

/**
 * POST /api/v1/site-visits
 */
export const createSiteVisit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      inquiryId,
      inquiryNumber,
      companyId,
      companyName,
      propertyId,
      propertyName,
      scheduledDate,
      scheduledTime,
      hostUserId,
      hostUserName,
      visitorName,
      visitorPhone,
      status,
      clientFeedback,
      followUpAction,
    } = req.body;

    if (!companyName || !propertyName || !scheduledDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: companyName, propertyName, and scheduledDate are required.',
      });
      return;
    }

    const id = `sv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const visitStatus = status || 'Scheduled';

    const insertSql = `
      INSERT INTO site_visits (
        id, inquiry_id, inquiry_number, company_id, company_name, property_id, property_name,
        scheduled_date, scheduled_time, host_user_id, host_user_name, visitor_name, visitor_phone,
        status, client_feedback, follow_up_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      id,
      inquiryId || null,
      inquiryNumber || null,
      companyId || null,
      companyName,
      propertyId || null,
      propertyName,
      scheduledDate,
      scheduledTime || '11:00 AM',
      hostUserId || req.user?.userId || null,
      hostUserName || req.user?.email || 'Fairway Team',
      visitorName || null,
      visitorPhone || null,
      visitStatus,
      clientFeedback || null,
      followUpAction || null,
    ]);

    const r = result.rows[0];

    // Log Activity
    try {
      if (companyId) {
        await query(
          `INSERT INTO activities (id, company_id, company_name, inquiry_id, inquiry_number, user_id, user_name, activity_type, title, description, activity_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE::text);`,
          [
            `act_${Date.now()}`,
            companyId,
            companyName,
            inquiryId || null,
            inquiryNumber || null,
            req.user?.userId || null,
            req.user?.email || 'System',
            'Site Visit',
            `Site Visit Scheduled at ${propertyName}`,
            `Scheduled for ${scheduledDate} at ${scheduledTime || '11:00 AM'}. Host: ${hostUserName || 'Team'}.`,
          ]
        );
      }
    } catch (e) {
      console.warn('Failed to record site visit activity:', e);
    }

    res.status(201).json({
      success: true,
      data: {
        id: r.id,
        inquiryId: r.inquiry_id,
        inquiryNumber: r.inquiry_number,
        companyId: r.company_id,
        companyName: r.company_name,
        propertyId: r.property_id,
        propertyName: r.property_name,
        scheduledDate: r.scheduled_date,
        scheduledTime: r.scheduled_time,
        hostUserId: r.host_user_id,
        hostUserName: r.host_user_name,
        visitorName: r.visitor_name,
        visitorPhone: r.visitor_phone,
        status: r.status,
        clientFeedback: r.client_feedback,
        followUpAction: r.follow_up_action,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in createSiteVisit:', error);
    res.status(500).json({ success: false, error: 'Failed to create site visit.' });
  }
};

/**
 * PUT /api/v1/site-visits/:id
 */
export const updateSiteVisit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      status,
      scheduledDate,
      scheduledTime,
      clientFeedback,
      followUpAction,
      hostUserId,
      hostUserName,
      visitorName,
      visitorPhone,
    } = req.body;

    const fields: string[] = [];
    const params: any[] = [id];

    if (status !== undefined) {
      params.push(status);
      fields.push(`status = $${params.length}`);
    }
    if (scheduledDate !== undefined) {
      params.push(scheduledDate);
      fields.push(`scheduled_date = $${params.length}`);
    }
    if (scheduledTime !== undefined) {
      params.push(scheduledTime);
      fields.push(`scheduled_time = $${params.length}`);
    }
    if (clientFeedback !== undefined) {
      params.push(clientFeedback);
      fields.push(`client_feedback = $${params.length}`);
    }
    if (followUpAction !== undefined) {
      params.push(followUpAction);
      fields.push(`follow_up_action = $${params.length}`);
    }
    if (hostUserId !== undefined) {
      params.push(hostUserId);
      fields.push(`host_user_id = $${params.length}`);
    }
    if (hostUserName !== undefined) {
      params.push(hostUserName);
      fields.push(`host_user_name = $${params.length}`);
    }
    if (visitorName !== undefined) {
      params.push(visitorName);
      fields.push(`visitor_name = $${params.length}`);
    }
    if (visitorPhone !== undefined) {
      params.push(visitorPhone);
      fields.push(`visitor_phone = $${params.length}`);
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No fields provided for update.' });
      return;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE site_visits 
      SET ${fields.join(', ')} 
      WHERE id = $1 
      RETURNING *;
    `;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Site visit not found.' });
      return;
    }

    const r = result.rows[0];
    res.json({
      success: true,
      data: {
        id: r.id,
        inquiryId: r.inquiry_id,
        inquiryNumber: r.inquiry_number,
        companyId: r.company_id,
        companyName: r.company_name,
        propertyId: r.property_id,
        propertyName: r.property_name,
        scheduledDate: r.scheduled_date,
        scheduledTime: r.scheduled_time,
        hostUserId: r.host_user_id,
        hostUserName: r.host_user_name,
        visitorName: r.visitor_name,
        visitorPhone: r.visitor_phone,
        status: r.status,
        clientFeedback: r.client_feedback,
        followUpAction: r.follow_up_action,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in updateSiteVisit:', error);
    res.status(500).json({ success: false, error: 'Failed to update site visit.' });
  }
};

/**
 * DELETE /api/v1/site-visits/:id
 */
export const deleteSiteVisit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM site_visits WHERE id = $1 RETURNING id;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Site visit not found.' });
      return;
    }

    res.json({ success: true, message: 'Site visit deleted successfully.' });
  } catch (error: any) {
    console.error('Error in deleteSiteVisit:', error);
    res.status(500).json({ success: false, error: 'Failed to delete site visit.' });
  }
};
