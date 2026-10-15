import { query } from '../config/db.js';
import crypto from 'crypto';

export interface CampaignData {
  id?: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  followUpDelayDays?: number;
  followUpSubjectTemplate?: string;
  followUpBodyTemplate?: string;
  followUp2DelayDays?: number;
  followUp2SubjectTemplate?: string;
  followUp2BodyTemplate?: string;
  status?: 'active' | 'paused' | 'completed';
  createdBy?: string;
}

export interface EnrollLeadPayload {
  contactId?: string | number;
  companyId?: string | number;
  email: string;
  name?: string;
  companyName?: string;
}

export class OutreachService {
  /**
   * List all campaigns with aggregated performance stats.
   */
  static async listCampaigns() {
    const sql = `
      SELECT 
        c.id, c.name, c.subject_template, c.body_template,
        c.follow_up_delay_days, c.follow_up_subject_template, c.follow_up_body_template,
        c.follow_up_2_delay_days, c.follow_up_2_subject_template, c.follow_up_2_body_template,
        c.status, c.created_by, c.created_at, c.updated_at,
        COUNT(e.id)::int AS total_enrolled,
        COUNT(CASE WHEN e.status = 'pending' THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN e.status = 'sent' THEN 1 END)::int AS sent_count,
        COUNT(CASE WHEN e.status = 'replied' THEN 1 END)::int AS replied_count,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END)::int AS completed_count,
        COUNT(CASE WHEN e.status = 'bounced' THEN 1 END)::int AS bounced_count,
        COUNT(CASE WHEN e.status = 'failed' THEN 1 END)::int AS failed_count
      FROM outreach_campaigns c
      LEFT JOIN outreach_enrollments e ON e.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC;
    `;
    const res = await query(sql);
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      subjectTemplate: row.subject_template,
      bodyTemplate: row.body_template,
      followUpDelayDays: row.follow_up_delay_days,
      followUpSubjectTemplate: row.follow_up_subject_template,
      followUpBodyTemplate: row.follow_up_body_template,
      followUp2DelayDays: row.follow_up_2_delay_days,
      followUp2SubjectTemplate: row.follow_up_2_subject_template,
      followUp2BodyTemplate: row.follow_up_2_body_template,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stats: {
        total: row.total_enrolled,
        pending: row.pending_count,
        sent: row.sent_count,
        replied: row.replied_count,
        completed: row.completed_count,
        bounced: row.bounced_count,
        failed: row.failed_count,
      },
    }));
  }

  /**
   * Get single campaign details + enrollments list.
   */
  static async getCampaignById(id: string) {
    const campaignRes = await query('SELECT * FROM outreach_campaigns WHERE id = $1', [id]);
    if (campaignRes.rows.length === 0) return null;
    const c = campaignRes.rows[0];

    const enrollmentsRes = await query(
      `SELECT * FROM outreach_enrollments WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 500`,
      [id]
    );

    return {
      campaign: {
        id: c.id,
        name: c.name,
        subjectTemplate: c.subject_template,
        bodyTemplate: c.body_template,
        followUpDelayDays: c.follow_up_delay_days,
        followUpSubjectTemplate: c.follow_up_subject_template,
        followUpBodyTemplate: c.follow_up_body_template,
        followUp2DelayDays: c.follow_up_2_delay_days,
        followUp2SubjectTemplate: c.follow_up_2_subject_template,
        followUp2BodyTemplate: c.follow_up_2_body_template,
        status: c.status,
        createdBy: c.created_by,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
      enrollments: enrollmentsRes.rows.map((e) => ({
        id: e.id,
        campaignId: e.campaign_id,
        contactId: e.contact_id,
        companyId: e.company_id,
        recipientEmail: e.recipient_email,
        recipientName: e.recipient_name,
        companyName: e.company_name,
        currentStep: e.current_step,
        status: e.status,
        lastMessageId: e.last_message_id,
        lastSentAt: e.last_sent_at,
        nextSendAt: e.next_send_at,
        errorMessage: e.error_message,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
    };
  }

  /**
   * Create a new campaign.
   */
  static async createCampaign(data: CampaignData) {
    const id = data.id || `camp_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const sql = `
      INSERT INTO outreach_campaigns (
        id, name, subject_template, body_template,
        follow_up_delay_days, follow_up_subject_template, follow_up_body_template,
        follow_up_2_delay_days, follow_up_2_subject_template, follow_up_2_body_template,
        status, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;
    const res = await query(sql, [
      id,
      data.name,
      data.subjectTemplate,
      data.bodyTemplate,
      data.followUpDelayDays ?? 3,
      data.followUpSubjectTemplate || null,
      data.followUpBodyTemplate || null,
      data.followUp2DelayDays ?? 4,
      data.followUp2SubjectTemplate || null,
      data.followUp2BodyTemplate || null,
      data.status || 'active',
      data.createdBy || null,
    ]);
    return res.rows[0];
  }

  /**
   * Update campaign parameters or status.
   */
  static async updateCampaign(id: string, updates: Partial<CampaignData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }
    if (updates.subjectTemplate !== undefined) {
      fields.push(`subject_template = $${idx++}`);
      values.push(updates.subjectTemplate);
    }
    if (updates.bodyTemplate !== undefined) {
      fields.push(`body_template = $${idx++}`);
      values.push(updates.bodyTemplate);
    }
    if (updates.followUpDelayDays !== undefined) {
      fields.push(`follow_up_delay_days = $${idx++}`);
      values.push(updates.followUpDelayDays);
    }
    if (updates.followUpSubjectTemplate !== undefined) {
      fields.push(`follow_up_subject_template = $${idx++}`);
      values.push(updates.followUpSubjectTemplate);
    }
    if (updates.followUpBodyTemplate !== undefined) {
      fields.push(`follow_up_body_template = $${idx++}`);
      values.push(updates.followUpBodyTemplate);
    }
    if (updates.followUp2DelayDays !== undefined) {
      fields.push(`follow_up_2_delay_days = $${idx++}`);
      values.push(updates.followUp2DelayDays);
    }
    if (updates.followUp2SubjectTemplate !== undefined) {
      fields.push(`follow_up_2_subject_template = $${idx++}`);
      values.push(updates.followUp2SubjectTemplate);
    }
    if (updates.followUp2BodyTemplate !== undefined) {
      fields.push(`follow_up_2_body_template = $${idx++}`);
      values.push(updates.followUp2BodyTemplate);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const sql = `UPDATE outreach_campaigns SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const res = await query(sql, values);
    return res.rows[0] || null;
  }

  /**
   * Bulk enroll contacts into a campaign.
   */
  static async enrollContacts(campaignId: string, leads: EnrollLeadPayload[]) {
    const campaignCheck = await query('SELECT id FROM outreach_campaigns WHERE id = $1', [campaignId]);
    if (campaignCheck.rows.length === 0) {
      throw new Error('Campaign not found.');
    }

    let enrolledCount = 0;
    let skippedCount = 0;

    for (const lead of leads) {
      const email = String(lead.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        skippedCount++;
        continue;
      }

      // Check if already enrolled in this campaign
      const existing = await query(
        'SELECT id, status FROM outreach_enrollments WHERE campaign_id = $1 AND recipient_email = $2',
        [campaignId, email]
      );

      if (existing.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const enrollmentId = `enr_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
      await query(
        `INSERT INTO outreach_enrollments (
          id, campaign_id, contact_id, company_id,
          recipient_email, recipient_name, company_name,
          current_step, status, next_send_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          1, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );`,
        [
          enrollmentId,
          campaignId,
          lead.contactId ? String(lead.contactId) : null,
          lead.companyId ? String(lead.companyId) : null,
          email,
          lead.name?.trim() || null,
          lead.companyName?.trim() || null,
        ]
      );
      enrolledCount++;
    }

    return { enrolledCount, skippedCount };
  }

  /**
   * Mark a lead as replied — halts future follow-ups for this enrollment.
   */
  static async markAsReplied(enrollmentId: string) {
    const res = await query(
      `UPDATE outreach_enrollments 
       SET status = 'replied', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *;`,
      [enrollmentId]
    );
    return res.rows[0] || null;
  }

  /**
   * Mark all active enrollments for an email as replied (e.g. from inbound webhook or CRM activity).
   */
  static async markRepliedByEmail(email: string) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return { updated: 0 };
    const res = await query(
      `UPDATE outreach_enrollments 
       SET status = 'replied', updated_at = CURRENT_TIMESTAMP 
       WHERE LOWER(recipient_email) = $1 AND status IN ('pending', 'sent')
       RETURNING id;`,
      [normalized]
    );
    return { updated: res.rowCount || 0 };
  }

  /**
   * Unsubscribe a contact.
   */
  static async unsubscribeLead(enrollmentId: string) {
    const res = await query(
      `UPDATE outreach_enrollments 
       SET status = 'unsubscribed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *;`,
      [enrollmentId]
    );
    return res.rows[0] || null;
  }

  /**
   * Delete an enrollment.
   */
  static async deleteEnrollment(enrollmentId: string) {
    const res = await query('DELETE FROM outreach_enrollments WHERE id = $1 RETURNING id;', [enrollmentId]);
    return res.rows.length > 0;
  }

  /**
   * Delete campaign.
   */
  static async deleteCampaign(campaignId: string) {
    const res = await query('DELETE FROM outreach_campaigns WHERE id = $1 RETURNING id;', [campaignId]);
    return res.rows.length > 0;
  }
}
