import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/calls/stats
 * Retrieve summary analytics for calls (Total, Scheduled, Completed, Inbound, Outbound)
 */
export const getCallStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalRes = await query('SELECT COUNT(*) as count FROM calls;');
    const scheduledRes = await query("SELECT COUNT(*) as count FROM calls WHERE call_status = 'Scheduled';");
    const completedRes = await query("SELECT COUNT(*) as count FROM calls WHERE call_status = 'Completed';");
    const inboundRes = await query("SELECT COUNT(*) as count FROM calls WHERE call_type = 'Inbound';");
    const outboundRes = await query("SELECT COUNT(*) as count FROM calls WHERE call_type = 'Outbound';");

    res.status(200).json({
      success: true,
      data: {
        total: parseInt(totalRes.rows[0]?.count || '0', 10),
        scheduled: parseInt(scheduledRes.rows[0]?.count || '0', 10),
        completed: parseInt(completedRes.rows[0]?.count || '0', 10),
        inbound: parseInt(inboundRes.rows[0]?.count || '0', 10),
        outbound: parseInt(outboundRes.rows[0]?.count || '0', 10),
      },
    });
  } catch (error: any) {
    console.error('Error in getCallStats:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve call statistics.' });
  }
};

/**
 * GET /api/calls
 * Retrieve calls list with filters and search
 */
export const getCalls = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      callType,
      callStatus,
      ownerId,
      callForType,
      search,
      sortBy = 'created_at',
      ascending = 'false',
    } = req.query;

    let sql = 'SELECT * FROM calls WHERE 1=1';
    const params: any[] = [];

    if (callType && callType !== 'all' && callType !== 'All') {
      params.push(callType);
      sql += ` AND call_type = $${params.length}`;
    }

    if (callStatus && callStatus !== 'all' && callStatus !== 'All') {
      params.push(callStatus);
      sql += ` AND call_status = $${params.length}`;
    }

    if (ownerId && ownerId !== 'all' && ownerId !== 'All') {
      params.push(ownerId);
      sql += ` AND call_owner_id = $${params.length}`;
    }

    if (callForType && callForType !== 'all' && callForType !== 'All') {
      params.push(callForType);
      sql += ` AND call_for_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (
        subject ILIKE $${params.length} OR
        call_for_name ILIKE $${params.length} OR
        related_to_name ILIKE $${params.length} OR
        call_owner_name ILIKE $${params.length} OR
        agenda ILIKE $${params.length}
      )`;
    }

    const sortOrder = ascending === 'true' ? 'ASC' : 'DESC';
    let safeSortColumn = 'created_at';
    if (sortBy === 'callStartDate' || sortBy === 'call_start_date') safeSortColumn = 'call_start_date';
    if (sortBy === 'subject') safeSortColumn = 'subject';
    if (sortBy === 'callDuration' || sortBy === 'call_duration') safeSortColumn = 'call_duration';
    if (sortBy === 'callStatus' || sortBy === 'call_status') safeSortColumn = 'call_status';

    sql += ` ORDER BY ${safeSortColumn} ${sortOrder}, call_start_time DESC;`;

    const result = await query(sql, params);

    const formatted = result.rows.map((r) => ({
      id: r.id,
      callForType: r.call_for_type,
      callForId: r.call_for_id,
      callForName: r.call_for_name,
      relatedToType: r.related_to_type,
      relatedToId: r.related_to_id,
      relatedToName: r.related_to_name,
      callType: r.call_type,
      callStatus: r.call_status,
      callStartDate: r.call_start_date,
      callStartTime: r.call_start_time,
      callDuration: r.call_duration,
      callOwnerId: r.call_owner_id,
      callOwnerName: r.call_owner_name,
      subject: r.subject,
      callPurpose: r.call_purpose,
      agenda: r.agenda,
      callResult: r.call_result,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      totalCount: formatted.length,
    });
  } catch (error: any) {
    console.error('Error in getCalls:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve calls.' });
  }
};

/**
 * GET /api/calls/:id
 */
export const getCallById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM calls WHERE id = $1;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Call record not found.' });
      return;
    }

    const r = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: r.id,
        callForType: r.call_for_type,
        callForId: r.call_for_id,
        callForName: r.call_for_name,
        relatedToType: r.related_to_type,
        relatedToId: r.related_to_id,
        relatedToName: r.related_to_name,
        callType: r.call_type,
        callStatus: r.call_status,
        callStartDate: r.call_start_date,
        callStartTime: r.call_start_time,
        callDuration: r.call_duration,
        callOwnerId: r.call_owner_id,
        callOwnerName: r.call_owner_name,
        subject: r.subject,
        callPurpose: r.call_purpose,
        agenda: r.agenda,
        callResult: r.call_result,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in getCallById:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve call.' });
  }
};

/**
 * POST /api/calls
 */
export const createCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      callForType = 'Contact',
      callForId = null,
      callForName = '',
      relatedToType = 'Account',
      relatedToId = null,
      relatedToName = '',
      callType = 'Outbound',
      callStatus = 'Scheduled',
      callStartDate = new Date().toISOString().split('T')[0],
      callStartTime = '06:00 PM',
      callDuration = '00:15',
      callOwnerId = '',
      callOwnerName = '',
      subject = '',
      callPurpose = 'Prospecting',
      agenda = '',
      callResult = '',
    } = req.body;

    if (!subject || !subject.trim()) {
      res.status(400).json({ success: false, error: 'Call subject is mandatory.' });
      return;
    }

    const id = `call_${crypto.randomBytes(6).toString('hex')}`;

    const insertSql = `
      INSERT INTO calls (
        id, call_for_type, call_for_id, call_for_name,
        related_to_type, related_to_id, related_to_name,
        call_type, call_status, call_start_date, call_start_time, call_duration,
        call_owner_id, call_owner_name, subject, call_purpose, agenda, call_result,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const result = await query(insertSql, [
      id,
      callForType,
      callForId,
      callForName,
      relatedToType,
      relatedToId,
      relatedToName,
      callType,
      callStatus,
      callStartDate,
      callStartTime,
      callDuration,
      callOwnerId,
      callOwnerName,
      subject.trim(),
      callPurpose,
      agenda,
      callResult,
    ]);

    const r = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: r.id,
        callForType: r.call_for_type,
        callForId: r.call_for_id,
        callForName: r.call_for_name,
        relatedToType: r.related_to_type,
        relatedToId: r.related_to_id,
        relatedToName: r.related_to_name,
        callType: r.call_type,
        callStatus: r.call_status,
        callStartDate: r.call_start_date,
        callStartTime: r.call_start_time,
        callDuration: r.call_duration,
        callOwnerId: r.call_owner_id,
        callOwnerName: r.call_owner_name,
        subject: r.subject,
        callPurpose: r.call_purpose,
        agenda: r.agenda,
        callResult: r.call_result,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in createCall:', error);
    res.status(500).json({ success: false, error: 'Failed to create call record.' });
  }
};

/**
 * PUT /api/calls/:id
 */
export const updateCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      callForType,
      callForId,
      callForName,
      relatedToType,
      relatedToId,
      relatedToName,
      callType,
      callStatus,
      callStartDate,
      callStartTime,
      callDuration,
      callOwnerId,
      callOwnerName,
      subject,
      callPurpose,
      agenda,
      callResult,
    } = req.body;

    const existing = await query('SELECT * FROM calls WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Call record not found.' });
      return;
    }

    const cur = existing.rows[0];

    const updateSql = `
      UPDATE calls SET
        call_for_type = COALESCE($1, call_for_type),
        call_for_id = COALESCE($2, call_for_id),
        call_for_name = COALESCE($3, call_for_name),
        related_to_type = COALESCE($4, related_to_type),
        related_to_id = COALESCE($5, related_to_id),
        related_to_name = COALESCE($6, related_to_name),
        call_type = COALESCE($7, call_type),
        call_status = COALESCE($8, call_status),
        call_start_date = COALESCE($9, call_start_date),
        call_start_time = COALESCE($10, call_start_time),
        call_duration = COALESCE($11, call_duration),
        call_owner_id = COALESCE($12, call_owner_id),
        call_owner_name = COALESCE($13, call_owner_name),
        subject = COALESCE($14, subject),
        call_purpose = COALESCE($15, call_purpose),
        agenda = COALESCE($16, agenda),
        call_result = COALESCE($17, call_result),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *;
    `;

    const result = await query(updateSql, [
      callForType !== undefined ? callForType : cur.call_for_type,
      callForId !== undefined ? callForId : cur.call_for_id,
      callForName !== undefined ? callForName : cur.call_for_name,
      relatedToType !== undefined ? relatedToType : cur.related_to_type,
      relatedToId !== undefined ? relatedToId : cur.related_to_id,
      relatedToName !== undefined ? relatedToName : cur.related_to_name,
      callType !== undefined ? callType : cur.call_type,
      callStatus !== undefined ? callStatus : cur.call_status,
      callStartDate !== undefined ? callStartDate : cur.call_start_date,
      callStartTime !== undefined ? callStartTime : cur.call_start_time,
      callDuration !== undefined ? callDuration : cur.call_duration,
      callOwnerId !== undefined ? callOwnerId : cur.call_owner_id,
      callOwnerName !== undefined ? callOwnerName : cur.call_owner_name,
      subject !== undefined ? subject : cur.subject,
      callPurpose !== undefined ? callPurpose : cur.call_purpose,
      agenda !== undefined ? agenda : cur.agenda,
      callResult !== undefined ? callResult : cur.call_result,
      id,
    ]);

    const r = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: r.id,
        callForType: r.call_for_type,
        callForId: r.call_for_id,
        callForName: r.call_for_name,
        relatedToType: r.related_to_type,
        relatedToId: r.related_to_id,
        relatedToName: r.related_to_name,
        callType: r.call_type,
        callStatus: r.call_status,
        callStartDate: r.call_start_date,
        callStartTime: r.call_start_time,
        callDuration: r.call_duration,
        callOwnerId: r.call_owner_id,
        callOwnerName: r.call_owner_name,
        subject: r.subject,
        callPurpose: r.call_purpose,
        agenda: r.agenda,
        callResult: r.call_result,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in updateCall:', error);
    res.status(500).json({ success: false, error: 'Failed to update call record.' });
  }
};

/**
 * DELETE /api/calls/:id
 */
export const deleteCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM calls WHERE id = $1 RETURNING id;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Call record not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Call deleted successfully.' });
  } catch (error: any) {
    console.error('Error in deleteCall:', error);
    res.status(500).json({ success: false, error: 'Failed to delete call record.' });
  }
};
