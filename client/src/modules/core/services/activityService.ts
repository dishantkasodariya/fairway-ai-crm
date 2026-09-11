import { Activity } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export class ActivityService {
  /**
   * Fetch activities for a company or inquiry
   */
  static async getActivities(params?: { companyId?: string; inquiryId?: string }): Promise<{
    success: boolean;
    data: Activity[];
    error?: string;
  }> {
    try {
      const q = new URLSearchParams();
      if (params?.companyId) q.append('companyId', params.companyId);
      if (params?.inquiryId) q.append('inquiryId', params.inquiryId);

      const res = await fetch(`${API_BASE_URL}/activities?${q.toString()}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ActivityService.getActivities failed:', err);
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Create an activity
   */
  static async createActivity(payload: {
    companyId?: string;
    companyName?: string;
    inquiryId?: string;
    inquiryNumber?: string;
    userId?: string;
    userName?: string;
    activityType?: string;
    title: string;
    description?: string;
    metadata?: any;
    activityDate?: string;
  }): Promise<{ success: boolean; data?: Activity; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ActivityService.createActivity failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export default ActivityService;
