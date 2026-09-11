import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/audit-logs
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, limit = 50 } = req.query;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (entityType) {
      params.push(entityType);
      sql += ` AND entity_type = $${params.length}`;
    }

    if (entityId) {
      params.push(entityId);
      sql += ` AND entity_id = $${params.length}`;
    }

    params.push(parseInt(limit as string, 10) || 50);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length};`;

    const result = await query(sql, params);

    const logs = result.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.details,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    }));

    res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch audit logs' } });
  }
};

/**
 * Helper to log audit event
 */
export const logAuditEvent = async (
  userId: string,
  userName: string,
  action: string,
  entityType: string,
  entityId: string,
  details: any = {},
  ipAddress?: string
) => {
  try {
    const id = `aud_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await query(
      `INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP);`,
      [id, userId, userName, action, entityType, entityId, JSON.stringify(details), ipAddress || '']
    );
  } catch (err: any) {
    console.warn('Failed to write audit log:', err.message);
  }
};
