import { API_BASE_URL, getAuthHeaders } from './api';

export interface CampaignStats {
  total: number;
  pending: number;
  sent: number;
  replied: number;
  completed: number;
  bounced: number;
  failed: number;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  followUpDelayDays: number;
  followUpSubjectTemplate: string | null;
  followUpBodyTemplate: string | null;
  followUp2DelayDays: number;
  followUp2SubjectTemplate: string | null;
  followUp2BodyTemplate: string | null;
  status: 'active' | 'paused' | 'completed';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: CampaignStats;
}

export interface OutreachEnrollment {
  id: string;
  campaignId: string;
  contactId: string | null;
  companyId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  companyName: string | null;
  currentStep: number;
  status: 'pending' | 'sent' | 'replied' | 'bounced' | 'unsubscribed' | 'completed' | 'failed' | 'paused';
  lastMessageId: string | null;
  lastSentAt: string | null;
  nextSendAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  followUpDelayDays?: number;
  followUpSubjectTemplate?: string;
  followUpBodyTemplate?: string;
  followUp2DelayDays?: number;
  followUp2SubjectTemplate?: string;
  followUp2BodyTemplate?: string;
}

export interface LeadPayload {
  contactId?: number | string;
  companyId?: number | string;
  email: string;
  name?: string;
  companyName?: string;
}

export class OutreachService {
  static async listCampaigns(): Promise<{ success: boolean; data?: OutreachCampaign[]; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/campaigns`, { headers: getAuthHeaders() });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getCampaign(
    id: string
  ): Promise<{ success: boolean; data?: { campaign: OutreachCampaign; enrollments: OutreachEnrollment[] }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/campaigns/${id}`, { headers: getAuthHeaders() });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async createCampaign(
    payload: CreateCampaignPayload
  ): Promise<{ success: boolean; data?: OutreachCampaign; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/campaigns`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async updateCampaign(
    id: string,
    payload: Partial<CreateCampaignPayload & { status: string }>
  ): Promise<{ success: boolean; data?: OutreachCampaign; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/campaigns/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async deleteCampaign(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/campaigns/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async enrollContacts(
    campaignId: string,
    leads: LeadPayload[]
  ): Promise<{ success: boolean; data?: { enrolledCount: number; skippedCount: number }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/campaigns/${campaignId}/enroll`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ leads }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async runBatchNow(campaignId?: string): Promise<{
    success: boolean;
    data?: { processed: number; sent: number; completed: number; failed: number; dailyLimitReached: boolean };
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/run-now`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ campaignId }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async markReplied(enrollmentId: string): Promise<{ success: boolean; data?: OutreachEnrollment; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/enrollments/${enrollmentId}/mark-replied`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async unsubscribeLead(enrollmentId: string): Promise<{ success: boolean; data?: OutreachEnrollment; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/enrollments/${enrollmentId}/unsubscribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async deleteEnrollment(enrollmentId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/outreach/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default OutreachService;
