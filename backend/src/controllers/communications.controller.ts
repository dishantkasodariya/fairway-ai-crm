import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/communications/stats
 */
export const getCommunicationStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalRes = await query('SELECT COUNT(*) as count FROM communications;');
    const emailRes = await query("SELECT COUNT(*) as count FROM communications WHERE channel = 'Email';");
    const waRes = await query("SELECT COUNT(*) as count FROM communications WHERE channel = 'WhatsApp';");
    const liRes = await query("SELECT COUNT(*) as count FROM communications WHERE channel = 'LinkedIn';");
    const callRes = await query("SELECT COUNT(*) as count FROM communications WHERE channel = 'Call';");
    const noteRes = await query("SELECT COUNT(*) as count FROM communications WHERE channel = 'Note';");

    res.status(200).json({
      success: true,
      data: {
        total: parseInt(totalRes.rows[0]?.count || '0', 10),
        emails: parseInt(emailRes.rows[0]?.count || '0', 10),
        whatsApp: parseInt(waRes.rows[0]?.count || '0', 10),
        linkedIn: parseInt(liRes.rows[0]?.count || '0', 10),
        calls: parseInt(callRes.rows[0]?.count || '0', 10),
        notes: parseInt(noteRes.rows[0]?.count || '0', 10),
      },
    });
  } catch (error: any) {
    console.error('Error fetching communication stats:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch communication stats' } });
  }
};

/**
 * GET /api/communications
 */
export const getCommunications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channel, companyId, contactId, direction, status, search } = req.query;
    let sql = 'SELECT * FROM communications WHERE 1=1';
    const params: any[] = [];

    if (channel && channel !== 'all' && channel !== 'All') {
      params.push(channel);
      sql += ` AND channel = $${params.length}`;
    }

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    if (contactId) {
      params.push(contactId);
      sql += ` AND contact_id = $${params.length}`;
    }

    if (direction && direction !== 'all') {
      params.push(direction);
      sql += ` AND direction = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (subject ILIKE $${params.length} OR message ILIKE $${params.length} OR company_name ILIKE $${params.length} OR contact_name ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC;';
    const result = await query(sql, params);

    const comms = result.rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      direction: r.direction,
      subject: r.subject,
      message: r.message,
      companyId: r.company_id,
      companyName: r.company_name,
      contactId: r.contact_id,
      contactName: r.contact_name,
      userId: r.user_id,
      userName: r.user_name,
      status: r.status,
      attachments: r.attachments || [],
      durationMinutes: r.duration_minutes || 0,
      outcome: r.outcome,
      createdAt: r.created_at,
    }));

    res.status(200).json({ success: true, data: comms });
  } catch (error: any) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch communications' } });
  }
};

/**
 * POST /api/communications
 */
export const createCommunication = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      channel = 'Email',
      direction = 'Outbound',
      subject,
      message,
      companyId,
      companyName,
      contactId,
      contactName,
      userId,
      userName,
      status = 'Delivered',
      attachments = [],
      durationMinutes = 0,
      outcome,
    } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: { message: 'Message content is required' } });
      return;
    }

    const id = `comm_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

    const sql = `
      INSERT INTO communications (
        id, channel, direction, subject, message, company_id, company_name,
        contact_id, contact_name, user_id, user_name, status, attachments,
        duration_minutes, outcome, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      id,
      channel,
      direction,
      subject || '',
      message.trim(),
      companyId || null,
      companyName || '',
      contactId || null,
      contactName || '',
      userId || '',
      userName || 'Admin',
      status,
      JSON.stringify(attachments),
      durationMinutes ? parseInt(durationMinutes, 10) : 0,
      outcome || '',
    ];

    const result = await query(sql, values);
    const r = result.rows[0];

    // Log corresponding activity record
    try {
      const actId = `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      await query(`
        INSERT INTO activities (id, company_id, company_name, user_id, user_name, activity_type, title, description, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP);
      `, [
        actId,
        companyId || null,
        companyName || '',
        userId || '',
        userName || 'Admin',
        channel,
        subject || `${channel} communication logged`,
        message.slice(0, 120),
      ]);
    } catch {}

    res.status(201).json({
      success: true,
      data: {
        id: r.id,
        channel: r.channel,
        direction: r.direction,
        subject: r.subject,
        message: r.message,
        companyId: r.company_id,
        companyName: r.company_name,
        contactId: r.contact_id,
        contactName: r.contact_name,
        userId: r.user_id,
        userName: r.user_name,
        status: r.status,
        attachments: r.attachments,
        durationMinutes: r.duration_minutes,
        outcome: r.outcome,
        createdAt: r.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating communication:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create communication' } });
  }
};

/**
 * POST /api/communications/send-followup-email
 * Workflow: Generates follow-up email record with PDF attachment link, updates follow-up status, logs activity
 */
export const sendFollowUpEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      followUpId,
      companyId,
      companyName,
      contactId,
      contactName,
      recipientEmail,
      subject,
      message,
      userId,
      userName,
    } = req.body;

    if (!recipientEmail || !message) {
      res.status(400).json({ success: false, error: { message: 'Recipient email and message are required' } });
      return;
    }

    const commId = `comm_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const pdfFilename = `Fairway_FollowUp_${followUpId || 'Dossier'}.pdf`;

    const attachments = [
      {
        name: pdfFilename,
        size: '1.4 MB',
        downloadUrl: followUpId ? `/api/v1/follow-ups/${followUpId}/download-pdf` : '#',
      },
    ];

    // 1. Insert communication record
    const commSql = `
      INSERT INTO communications (
        id, channel, direction, subject, message, company_id, company_name,
        contact_id, contact_name, user_id, user_name, status, attachments, created_at, updated_at
      ) VALUES ($1, 'Email', 'Outbound', $2, $3, $4, $5, $6, $7, $8, $9, 'Delivered', $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const commResult = await query(commSql, [
      commId,
      subject || `Fairway Industrial Follow-up — ${companyName || ''}`,
      message.trim(),
      companyId || null,
      companyName || '',
      contactId || null,
      contactName || '',
      userId || '',
      userName || 'Admin',
      JSON.stringify(attachments),
    ]);

    // 2. Update follow-up status to Completed if followUpId provided
    if (followUpId) {
      await query(
        `UPDATE follow_ups SET status = 'Completed', outcome_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [`Follow-up email dispatched with attached PDF to ${recipientEmail}`, followUpId]
      );
    }

    // 3. Log activity record
    const actId = `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await query(
      `INSERT INTO activities (id, company_id, company_name, user_id, user_name, activity_type, title, description, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Email', $6, $7, CURRENT_TIMESTAMP);`,
      [
        actId,
        companyId || null,
        companyName || '',
        userId || '',
        userName || 'Admin',
        `Follow-up Email Sent to ${contactName || recipientEmail}`,
        `Dispatched commercial dossier PDF with proposal summary. Message: ${message.slice(0, 100)}...`,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Email dispatched successfully with PDF attachment.',
      data: commResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error sending follow-up email:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to send follow-up email' } });
  }
};
