import { API_BASE_URL } from './api';

export interface FollowUpItem {
  id: string;
  inquiryId?: string;
  inquiryNumber?: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  followUpDate: string;
  followUpTime?: string;
  channel?: string;
  status: string;
  priority: string;
  summary?: string;
  outcomeNotes?: string;
  pdfGeneratedAt?: string;
  createdAt: string;
}

export class FollowUpService {
  /**
   * Fetch follow-ups
   */
  static async getFollowUps(params?: {
    companyId?: string;
    inquiryId?: string;
    status?: string;
    assignedUserId?: string;
  }): Promise<{ success: boolean; data: FollowUpItem[]; error?: string }> {
    try {
      const q = new URLSearchParams();
      if (params?.companyId) q.append('companyId', params.companyId);
      if (params?.inquiryId) q.append('inquiryId', params.inquiryId);
      if (params?.status && params.status !== 'all') q.append('status', params.status);
      if (params?.assignedUserId && params.assignedUserId !== 'all') q.append('assignedUserId', params.assignedUserId);

      const res = await fetch(`${API_BASE_URL}/follow-ups?${q.toString()}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('FollowUpService.getFollowUps failed:', err);
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Create a follow-up
   */
  static async createFollowUp(payload: {
    inquiryId?: string;
    inquiryNumber?: string;
    companyId?: string;
    companyName?: string;
    contactId?: string;
    contactName?: string;
    assignedUserId?: string;
    assignedUserName?: string;
    followUpDate: string;
    followUpTime?: string;
    channel?: string;
    status?: string;
    priority?: string;
    summary?: string;
  }): Promise<{ success: boolean; data?: FollowUpItem; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('FollowUpService.createFollowUp failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update follow-up
   */
  static async updateFollowUp(
    id: string,
    payload: {
      status?: string;
      outcomeNotes?: string;
      followUpDate?: string;
      followUpTime?: string;
      priority?: string;
    }
  ): Promise<{ success: boolean; data?: FollowUpItem; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/follow-ups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('FollowUpService.updateFollowUp failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Trigger PDF download directly in browser
   */
  static downloadPdf(id: string) {
    window.open(`${API_BASE_URL}/follow-ups/${id}/download-pdf`, '_blank');
  }
}

export default FollowUpService;
