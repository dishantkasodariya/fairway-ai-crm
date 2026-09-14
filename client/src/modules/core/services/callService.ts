import { Call, CallStats } from '@/modules/core/types';
import { API_BASE_URL, getAuthHeaders } from './api';

export interface GetCallsParams {
  search?: string;
  callType?: string;
  callStatus?: string;
  ownerId?: string;
  callForType?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  ascending?: boolean;
}

export interface CreateCallPayload {
  callForType: 'Contact' | 'Lead';
  callForId?: string;
  callForName?: string;
  relatedToType: 'Account' | 'Deal' | 'Campaign';
  relatedToId?: string;
  relatedToName?: string;
  callType: 'Inbound' | 'Outbound';
  callStatus: 'Scheduled' | 'Completed' | 'Cancelled' | 'Overdue';
  callStartDate: string;
  callStartTime: string;
  callDuration: string;
  callOwnerId: string;
  callOwnerName: string;
  subject: string;
  callPurpose: string;
  agenda?: string;
  callResult?: string;
}

export class CallService {
  /**
   * Fetch calls with optional query filters
   */
  static async getCalls(params: GetCallsParams = {}): Promise<{
    success: boolean;
    data: Call[];
    totalCount?: number;
    error?: string;
  }> {
    try {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.callType && params.callType !== 'all') q.append('callType', params.callType);
      if (params.callStatus && params.callStatus !== 'all') q.append('callStatus', params.callStatus);
      if (params.ownerId && params.ownerId !== 'all') q.append('ownerId', params.ownerId);
      if (params.callForType && params.callForType !== 'all') q.append('callForType', params.callForType);
      if (params.sortBy) q.append('sortBy', params.sortBy);
      if (params.ascending !== undefined) q.append('ascending', String(params.ascending));

      const res = await fetch(`${API_BASE_URL}/calls?${q.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      console.error('CallService.getCalls error:', err);
      return { success: false, data: [], totalCount: 0, error: err.message };
    }
  }

  /**
   * Fetch call summary statistics
   */
  static async getCallStats(): Promise<{
    success: boolean;
    data?: CallStats;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/calls/stats`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('CallService.getCallStats error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch single call by id
   */
  static async getCallById(id: string): Promise<{
    success: boolean;
    data?: Call;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/calls/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('CallService.getCallById error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a new call
   */
  static async createCall(payload: CreateCallPayload): Promise<{
    success: boolean;
    data?: Call;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/calls`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('CallService.createCall error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update an existing call
   */
  static async updateCall(
    id: string,
    payload: Partial<CreateCallPayload>
  ): Promise<{
    success: boolean;
    data?: Call;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/calls/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('CallService.updateCall error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a call
   */
  static async deleteCall(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/calls/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('CallService.deleteCall error:', err);
      return { success: false, error: err.message };
    }
  }
}
