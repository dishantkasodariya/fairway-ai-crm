import { API_BASE_URL, getAuthHeaders } from './api';

export interface CommunicationItem {
  id: string;
  channel: 'Email' | 'WhatsApp' | 'LinkedIn' | 'Call' | 'Note';
  direction: 'Inbound' | 'Outbound';
  subject?: string;
  message: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  userId?: string;
  userName?: string;
  status: 'Delivered' | 'Sent' | 'Received' | 'Draft' | 'Failed';
  attachments?: Array<{ name: string; size: string; downloadUrl?: string }>;
  durationMinutes?: number;
  outcome?: string;
  createdAt: string;
}

export interface CommunicationStats {
  total: number;
  emails: number;
  whatsApp: number;
  linkedIn: number;
  calls: number;
  notes: number;
}

export class CommunicationService {
  /**
   * Fetch communication statistics
   */
  static async getStats(): Promise<{ success: boolean; data: CommunicationStats; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/communications/stats`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CommunicationService.getStats failed:', err);
      return {
        success: false,
        data: { total: 0, emails: 0, whatsApp: 0, linkedIn: 0, calls: 0, notes: 0 },
        error: err.message,
      };
    }
  }

  /**
   * Fetch communications with filters
   */
  static async getCommunications(params?: {
    channel?: string;
    companyId?: string;
    contactId?: string;
    direction?: string;
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; data: CommunicationItem[]; error?: string }> {
    try {
      const q = new URLSearchParams();
      if (params?.channel && params.channel !== 'all' && params.channel !== 'All') q.append('channel', params.channel);
      if (params?.companyId) q.append('companyId', params.companyId);
      if (params?.contactId) q.append('contactId', params.contactId);
      if (params?.direction && params.direction !== 'all') q.append('direction', params.direction);
      if (params?.status && params.status !== 'all') q.append('status', params.status);
      if (params?.search) q.append('search', params.search);

      const res = await fetch(`${API_BASE_URL}/communications?${q.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CommunicationService.getCommunications failed:', err);
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Create new communication record
   */
  static async createCommunication(payload: {
    channel: string;
    direction?: string;
    subject?: string;
    message: string;
    companyId?: string;
    companyName?: string;
    contactId?: string;
    contactName?: string;
    userId?: string;
    userName?: string;
    status?: string;
    attachments?: any[];
    durationMinutes?: number;
    outcome?: string;
  }): Promise<{ success: boolean; data?: CommunicationItem; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/communications`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CommunicationService.createCommunication failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send formal follow-up email with attached PDF
   */
  static async sendFollowUpEmail(payload: {
    followUpId?: string;
    companyId?: string;
    companyName?: string;
    contactId?: string;
    contactName?: string;
    recipientEmail: string;
    subject?: string;
    message: string;
    userId?: string;
    userName?: string;
  }): Promise<{ success: boolean; message?: string; data?: any; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/communications/send-followup-email`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CommunicationService.sendFollowUpEmail failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export default CommunicationService;
