import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

let lastSyncTimestamp = 0;
let isSyncing = false;

/**
 * Synchronize notifications table with real-time CRM events:
 * - Active upcoming site visits from tasks
 * - Pending/overdue follow-up tasks
 * - Recent inquiries
 * - Active commercial proposals
 */
const syncRealTimeNotifications = async (): Promise<void> => {
  const now = Date.now();
  if (isSyncing || now - lastSyncTimestamp < 30000) {
    return;
  }

  isSyncing = true;
  lastSyncTimestamp = now;

  try {
    // 1. Delete legacy hardcoded seed notifications that point to dummy IDs
    await query(`
      DELETE FROM notifications 
      WHERE id IN ('notif_1', 'notif_2', 'notif_3', 'notif_4') 
         OR entity_id IN ('inq_62cd9514', 'sv_1', 'prop_1', 'usr_amit_1');
    `);

    // 2. Sync upcoming/active site visits from tasks
    const siteVisits = await query(`
      SELECT id, company_name, description, due_date, due_time, priority, created_at
      FROM tasks
      WHERE LOWER(COALESCE(task_type, '')) = 'site visit' AND LOWER(COALESCE(status, '')) != 'completed'
      ORDER BY due_date ASC
      LIMIT 8;
    `);

    for (const sv of siteVisits.rows) {
      const notifId = `notif_sv_${sv.id}`;
      const title = `Site Visit: ${sv.company_name || 'Client Inspection'}`;
      const dateStr = sv.due_date ? String(sv.due_date).split('T')[0] : 'Upcoming';
      const timeStr = sv.due_time ? ` at ${sv.due_time}` : '';
      const message = `${sv.description || 'Site inspection'} scheduled for ${dateStr}${timeStr}.`;
      await query(`
        INSERT INTO notifications (
          id, type, title, message, entity_type, entity_id, is_read, created_at
        )
        VALUES ($1, 'site_visit_upcoming', $2, $3, 'site_visit', $4, false, $5)
        ON CONFLICT (id) DO NOTHING;
      `, [notifId, title, message, sv.id, sv.created_at || new Date()]);
    }

    // 3. Sync pending/overdue follow-up tasks
    const pendingTasks = await query(`
      SELECT id, company_name, task_type, description, due_date, priority, status, created_at
      FROM tasks
      WHERE LOWER(COALESCE(task_type, '')) != 'site visit' AND LOWER(COALESCE(status, '')) != 'completed'
      ORDER BY due_date ASC
      LIMIT 8;
    `);

    for (const tsk of pendingTasks.rows) {
      const notifId = `notif_tsk_${tsk.id}`;
      const isOverdue = tsk.due_date && new Date(tsk.due_date) < new Date();
      const notifType = isOverdue ? 'followup_overdue' : 'followup_due';
      const title = `${isOverdue ? 'Overdue Follow-up' : 'Action Due'}: ${tsk.company_name || tsk.task_type || 'Client'}`;
      const dateStr = tsk.due_date ? String(tsk.due_date).split('T')[0] : 'Today';
      const message = `${tsk.description || tsk.task_type || 'Follow-up task'} due on ${dateStr}. Priority: ${tsk.priority || 'Normal'}.`;
      await query(`
        INSERT INTO notifications (
          id, type, title, message, entity_type, entity_id, is_read, created_at
        )
        VALUES ($1, $2, $3, $4, 'task', $5, false, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [notifId, notifType, title, message, tsk.id, tsk.created_at || new Date()]);
    }

    // 4. Sync latest inquiries
    const recentInquiries = await query(`
      SELECT id, inquiry_number, company_name, industry, location, required_area_sq_ft, stage, priority, created_at
      FROM inquiries
      ORDER BY created_at DESC
      LIMIT 8;
    `);

    for (const inq of recentInquiries.rows) {
      const notifId = `notif_inq_${inq.id}`;
      const title = `Inquiry ${inq.inquiry_number || ''}: ${inq.company_name || 'Client Lead'}`;
      const area = inq.required_area_sq_ft ? `${Number(inq.required_area_sq_ft).toLocaleString('en-IN')} sq.ft.` : '';
      const ind = inq.industry || 'Industrial Warehousing';
      const loc = inq.location || 'Active Corridor';
      const stage = (inq.stage || 'new').replace(/_/g, ' ');
      const message = `${area ? area + ' • ' : ''}${ind} requirement in ${loc} (${stage}).`;
      await query(`
        INSERT INTO notifications (
          id, type, title, message, entity_type, entity_id, is_read, created_at
        )
        VALUES ($1, 'inquiry_assigned', $2, $3, 'inquiry', $4, false, $5)
        ON CONFLICT (id) DO NOTHING;
      `, [notifId, title, message, inq.id, inq.created_at || new Date()]);
    }

    // 5. Sync latest proposals
    const recentProposals = await query(`
      SELECT id, proposal_number, company_name, property_name, proposed_area_sq_ft, status, created_at
      FROM proposals
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    for (const prp of recentProposals.rows) {
      const notifId = `notif_prp_${prp.id}`;
      const title = `Proposal ${prp.proposal_number || ''}: ${prp.company_name || 'Commercial Terms'}`;
      const area = prp.proposed_area_sq_ft ? `${Number(prp.proposed_area_sq_ft).toLocaleString('en-IN')} sq.ft. at ` : '';
      const prop = prp.property_name || 'Industrial Park';
      const status = prp.status || 'Draft';
      const message = `${area}${prop} is currently in "${status}" status.`;
      await query(`
        INSERT INTO notifications (
          id, type, title, message, entity_type, entity_id, is_read, created_at
        )
        VALUES ($1, 'proposal_updated', $2, $3, 'proposal', $4, false, $5)
        ON CONFLICT (id) DO NOTHING;
      `, [notifId, title, message, prp.id, prp.created_at || new Date()]);
    }
  } catch (err: any) {
    console.warn('Real-time notifications sync note:', err.message);
  } finally {
    isSyncing = false;
  }
};

/**
 * GET /api/v1/notifications
 * Fetch real-time live notifications for current user
 */
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.json({
        success: true,
        data: [],
        unreadCount: 0,
      });
      return;
    }

    const userId = req.user?.userId;

    // Trigger CRM real-time events synchronization in background (non-blocking)
    syncRealTimeNotifications().catch(() => {});

    const sql = `
      SELECT
        id,
        user_id,
        COALESCE(type, 'system') AS type,
        title,
        message,
        COALESCE(entity_type, 'inquiry') AS entity_type,
        entity_id,
        is_read,
        created_at
      FROM notifications
      WHERE (user_id IS NULL OR user_id = $1)
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    const result = await query(sql, [userId || '']);

    const formatted = result.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      entityType: r.entity_type,
      entityId: r.entity_id,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
    }));

    res.json({
      success: true,
      data: formatted,
      unreadCount: formatted.filter((n) => !n.isRead).length,
    });
  } catch (error: any) {
    console.warn('Notice in getNotifications (database offline or reconnecting):', error.message);
    res.status(200).json({
      success: true,
      data: [],
      unreadCount: 0,
      warning: 'Notifications temporarily unavailable.',
    });
  }
};

/**
 * PUT /api/v1/notifications/:id/read
 * Mark single notification as read
 */
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query(`
      UPDATE notifications
      SET
        is_read = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [id]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error: any) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
};

/**
 * PUT /api/v1/notifications/mark-all-read
 * Mark all notifications for current user as read
 */
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await query(`
      UPDATE notifications
      SET
        is_read = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id IS NULL OR user_id = $1;
    `, [userId || '']);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Error in markAllAsRead:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications read.' });
  }
};

/**
 * POST /api/v1/notifications
 * Create a notification
 */
export const createNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, type, title, message, entityType, entityId } = req.body;

    if (!title || !message) {
      res.status(400).json({ success: false, error: 'Title and message are required.' });
      return;
    }

    const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const targetUserId = userId || req.user?.userId || null;
    const notifType = type || 'inquiry_assigned';

    const insertSql = `
      INSERT INTO notifications (
        id, user_id, type, title, message, entity_type, entity_id, is_read, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      id,
      targetUserId,
      notifType,
      title,
      message,
      entityType || 'inquiry',
      entityId || null,
    ]);

    const r = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: r.id,
        userId: r.user_id,
        type: r.type,
        title: r.title,
        message: r.message,
        entityType: r.entity_type || 'inquiry',
        entityId: r.entity_id,
        isRead: Boolean(r.is_read),
        createdAt: r.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error in createNotification:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification.' });
  }
};
