import { SiteVisit, SiteVisitStatus } from '@/modules/core/types';
import { api, ApiResponse } from './api';

export interface CreateSiteVisitPayload {
  inquiryId?: string;
  inquiryNumber?: string;
  companyId?: string;
  companyName: string;
  propertyId?: string;
  propertyName: string;
  scheduledDate: string;
  scheduledTime?: string;
  hostUserId?: string;
  hostUserName?: string;
  visitorName?: string;
  visitorPhone?: string;
  status?: SiteVisitStatus;
  clientFeedback?: string;
  followUpAction?: string;
}

export interface GetSiteVisitsParams {
  inquiryId?: string;
  companyId?: string;
  status?: string;
  hostUserId?: string;
  search?: string;
}

export class SiteVisitsService {
  /**
   * Fetch site visits from backend API
   */
  static async getSiteVisits(params?: GetSiteVisitsParams): Promise<{
    success: boolean;
    data?: SiteVisit[];
    totalCount?: number;
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.inquiryId) queryParams.set('inquiryId', params.inquiryId);
      if (params?.companyId) queryParams.set('companyId', params.companyId);
      if (params?.status && params.status !== 'all') queryParams.set('status', params.status);
      if (params?.hostUserId && params.hostUserId !== 'all') queryParams.set('hostUserId', params.hostUserId);
      if (params?.search) queryParams.set('search', params.search);

      const qs = queryParams.toString();
      const endpoint = `/site-visits${qs ? `?${qs}` : ''}`;
      const res = await api.get<any[]>(endpoint);

      if (res.success && res.data) {
        // Map backend response fields to SiteVisit interface
        const mapped: SiteVisit[] = res.data.map((r) => ({
          id: r.id,
          inquiryId: r.inquiryId || '',
          inquiryNumber: r.inquiryNumber || '',
          companyId: r.companyId || '',
          companyName: r.companyName || '',
          contactName: r.visitorName,
          contactPhone: r.visitorPhone,
          propertyId: r.propertyId || '',
          propertyName: r.propertyName || '',
          propertyLocation: r.propertyLocation || r.location || '',
          visitDate: r.scheduledDate,
          visitTime: r.scheduledTime || '11:00 AM',
          assignedSalespersonId: r.hostUserId || '',
          assignedSalespersonName: r.hostUserName || '',
          status: r.status,
          clientFeedback: r.clientFeedback,
          notes: r.followUpAction,
          createdAt: r.createdAt || new Date().toISOString(),
        }));

        return { success: true, data: mapped, totalCount: mapped.length };
      }

      return { success: false, error: res.error?.message || 'Failed to fetch site visits' };
    } catch (err: any) {
      console.warn('SiteVisitsService.getSiteVisits failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a new site visit
   */
  static async createSiteVisit(payload: CreateSiteVisitPayload): Promise<{
    success: boolean;
    data?: SiteVisit;
    error?: string;
  }> {
    try {
      const res = await api.post<any>('/site-visits', payload);
      if (res.success && res.data) {
        const r = res.data;
        const mapped: SiteVisit = {
          id: r.id,
          inquiryId: r.inquiryId || '',
          inquiryNumber: r.inquiryNumber || '',
          companyId: r.companyId || '',
          companyName: r.companyName || '',
          contactName: r.visitorName,
          contactPhone: r.visitorPhone,
          propertyId: r.propertyId || '',
          propertyName: r.propertyName || '',
          propertyLocation: r.propertyLocation || r.location || '',
          visitDate: r.scheduledDate,
          visitTime: r.scheduledTime || '11:00 AM',
          assignedSalespersonId: r.hostUserId || '',
          assignedSalespersonName: r.hostUserName || '',
          status: r.status,
          clientFeedback: r.clientFeedback,
          notes: r.followUpAction,
          createdAt: r.createdAt || new Date().toISOString(),
        };
        return { success: true, data: mapped };
      }
      return { success: false, error: res.error?.message || 'Failed to create site visit' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update site visit status or details
   */
  static async updateSiteVisit(
    id: string,
    updates: Partial<CreateSiteVisitPayload>
  ): Promise<{ success: boolean; data?: SiteVisit; error?: string }> {
    try {
      const res = await api.put<any>(`/site-visits/${id}`, updates);
      if (res.success && res.data) {
        const r = res.data;
        const mapped: SiteVisit = {
          id: r.id,
          inquiryId: r.inquiryId || '',
          inquiryNumber: r.inquiryNumber || '',
          companyId: r.companyId || '',
          companyName: r.companyName || '',
          contactName: r.visitorName,
          contactPhone: r.visitorPhone,
          propertyId: r.propertyId || '',
          propertyName: r.propertyName || '',
          propertyLocation: r.propertyLocation || r.location || '',
          visitDate: r.scheduledDate,
          visitTime: r.scheduledTime || '11:00 AM',
          assignedSalespersonId: r.hostUserId || '',
          assignedSalespersonName: r.hostUserName || '',
          status: r.status,
          clientFeedback: r.clientFeedback,
          notes: r.followUpAction,
          createdAt: r.createdAt || new Date().toISOString(),
        };
        return { success: true, data: mapped };
      }
      return { success: false, error: res.error?.message || 'Failed to update site visit' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete site visit
   */
  static async deleteSiteVisit(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.delete(`/site-visits/${id}`);
      return { success: res.success, error: res.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default SiteVisitsService;
