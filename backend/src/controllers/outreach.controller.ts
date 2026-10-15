import { Request, Response } from 'express';
import { OutreachService } from '../services/outreachService.js';
import { runOutreachBatchNow } from '../jobs/outreachCronRunner.js';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const listCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaigns = await OutreachService.listCampaigns();
    res.status(200).json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to list campaigns' } });
  }
};

export const getCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaign = await OutreachService.getCampaignById(String(req.params.id));
    if (!campaign) {
      res.status(404).json({ success: false, error: { message: 'Campaign not found' } });
      return;
    }
    res.status(200).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch campaign' } });
  }
};

export const createCampaign = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      subjectTemplate,
      bodyTemplate,
      followUpDelayDays,
      followUpSubjectTemplate,
      followUpBodyTemplate,
      followUp2DelayDays,
      followUp2SubjectTemplate,
      followUp2BodyTemplate,
    } = req.body || {};

    if (!name?.trim() || !subjectTemplate?.trim() || !bodyTemplate?.trim()) {
      res.status(422).json({
        success: false,
        error: { message: 'name, subjectTemplate, and bodyTemplate are required.' },
      });
      return;
    }

    const campaign = await OutreachService.createCampaign({
      name: name.trim(),
      subjectTemplate: subjectTemplate.trim(),
      bodyTemplate: bodyTemplate.trim(),
      followUpDelayDays: Number(followUpDelayDays) || 3,
      followUpSubjectTemplate: followUpSubjectTemplate?.trim() || undefined,
      followUpBodyTemplate: followUpBodyTemplate?.trim() || undefined,
      followUp2DelayDays: Number(followUp2DelayDays) || 4,
      followUp2SubjectTemplate: followUp2SubjectTemplate?.trim() || undefined,
      followUp2BodyTemplate: followUp2BodyTemplate?.trim() || undefined,
      createdBy: req.user?.email || 'System',
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create campaign' } });
  }
};

export const updateCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await OutreachService.updateCampaign(String(req.params.id), req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: { message: 'Campaign not found or no changes made' } });
      return;
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to update campaign' } });
  }
};

export const deleteCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await OutreachService.deleteCampaign(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ success: false, error: { message: 'Campaign not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete campaign' } });
  }
};

export const enrollContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { leads } = req.body || {};
    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(422).json({ success: false, error: { message: 'leads array is required and must not be empty.' } });
      return;
    }

    const result = await OutreachService.enrollContacts(String(req.params.id), leads);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to enroll contacts' } });
  }
};

export const runBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { maxBatch, delayBetweenSendsMs, campaignId } = req.body || {};
    const stats = await runOutreachBatchNow({
      maxBatch: maxBatch ? Number(maxBatch) : undefined,
      delayBetweenSendsMs: delayBetweenSendsMs !== undefined ? Number(delayBetweenSendsMs) : undefined,
      campaignId: campaignId || (req.query.campaignId as string) || undefined,
    });
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to run outreach batch' } });
  }
};

export const markEnrollmentReplied = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await OutreachService.markAsReplied(String(req.params.id));
    if (!updated) {
      res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
      return;
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to mark as replied' } });
  }
};

export const unsubscribeEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await OutreachService.unsubscribeLead(String(req.params.id));
    if (!updated) {
      res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
      return;
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to unsubscribe lead' } });
  }
};

export const deleteEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await OutreachService.deleteEnrollment(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Enrollment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete enrollment' } });
  }
};


/**
 * Inbound webhook for replies (e.g. Resend, Sendgrid, or custom email forwarders).
 * When a reply is received, marks all active sequence enrollments for that email as 'replied'.
 */
export const handleInboundReplyWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    // Extract sender email from various webhook payloads
    let senderEmail =
      body.from ||
      body.sender ||
      body.data?.from ||
      (typeof body.from === 'object' ? body.from?.email : '');

    if (typeof senderEmail === 'string' && senderEmail.includes('<')) {
      const match = senderEmail.match(/<([^>]+)>/);
      if (match) senderEmail = match[1];
    }

    if (!senderEmail) {
      res.status(400).json({ success: false, message: 'No sender email found in payload' });
      return;
    }

    const { updated } = await OutreachService.markRepliedByEmail(senderEmail);
    console.info(`[outreach-webhook] Inbound reply from ${senderEmail}: ${updated} sequence enrollments marked as replied.`);

    res.status(200).json({ success: true, data: { senderEmail, updated } });
  } catch (error: any) {
    console.error('[outreach-webhook] Error processing reply webhook:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
