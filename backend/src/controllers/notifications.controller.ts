import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

/**
 * GET /api/v1/notifications
 * Fetch notifications for current user (or all system notifications if user_id is null)
 */
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const sql = `
      SELECT 
        id,
        COALESCE(user_id, "userId") AS user_id,
        COALESCE(type, 'system') AS type,
        title,
        message,
        COALESCE(entity_type, link, 'inquiry') AS entity_type,
        entity_id,
        COALESCE(is_read, "isRead", false) AS is_read,
        COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP) AS created_at
      FROM notifications 
      WHERE (user_id IS NULL OR user_id = $1 OR "userId" IS NULL OR "userId" = $1)
      ORDER BY COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP) DESC 
      LIMIT 100;
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
    console.error('Error in getNotifications:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve notifications.' });
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
        "isRead" = true,
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
        "isRead" = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id IS NULL OR user_id = $1 OR "userId" IS NULL OR "userId" = $1;
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
        id, user_id, type, title, message, entity_type, entity_id, is_read,
        "userId", "isRead", created_at, "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, $2, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
        userId: r.user_id || r.userId,
        type: r.type,
        title: r.title,
        message: r.message,
        entityType: r.entity_type || r.link || 'inquiry',
        entityId: r.entity_id,
        isRead: Boolean(r.is_read ?? r.isRead ?? false),
        createdAt: r.created_at || r.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error in createNotification:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification.' });
  }
};
