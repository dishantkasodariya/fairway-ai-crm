import { Inquiry } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export interface CreateInquiryStepperPayload {
  inquiryData: {
    requirement?: string;
    requiredAreaSqFt: number;
    location: string;
    targetCorridor: string;
    industry: string;
    possessionDate: string;
    leaseDurationMonths: number;
    budgetMonthlyINR: number;
    dockRequirements: number;
    clearHeightFt?: number;
    floorLoadCapacity?: string;
    powerKVA?: number;
    fireSystemsRequired: boolean;
    specialRequirements?: string;
    source: string;
    priority: string;
    nextAction?: string;
    nextFollowUpDate?: string;
  };
  companyMode: 'existing' | 'new';
  selectedCompanyId?: string;
  newCompanyData?: {
    name: string;
    legalName?: string;
    website?: string;
    industry?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    priority?: string;
    annualTurnover?: string;
    employeeCount?: string;
  };
  contactMode: 'existing' | 'new';
  selectedContactId?: string;
  contactData?: {
    name: string;
    designation?: string;
    department?: string;
    phone?: string;
    email?: string;
    linkedinUrl?: string;
    isPrimary?: boolean;
  };
  createFacility: boolean;
  facilityData?: {
    name: string;
    type?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number | null;
    longitude?: number | null;
    builtUpAreaSqFt?: number;
  };
  assignedSalespersonId: string;
  assignedSalespersonName: string;
}

export class InquiryService {
  /**
   * Fetch inquiries from backend API with search, sorting, and pagination
   */
  static async getInquiries(params?: {
    search?: string;
    stage?: string;
    status?: string;
    corridor?: string;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    ascending?: boolean;
  }): Promise<{
    success: boolean;
    data?: Inquiry[];
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.stage && params.stage !== 'all') queryParams.set('stage', params.stage);
      if (params?.status && params.status !== 'all') queryParams.set('status', params.status);
      if (params?.corridor && params.corridor !== 'all') queryParams.set('corridor', params.corridor);
      if (params?.pageNumber !== undefined) queryParams.set('pageNumber', String(params.pageNumber));
      if (params?.pageSize !== undefined) queryParams.set('pageSize', String(params.pageSize));
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params?.ascending !== undefined) queryParams.set('ascending', String(params.ascending));

      const res = await fetch(`${API_BASE_URL}/inquiries?${queryParams.toString()}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('InquiryService.getInquiries failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get single inquiry by ID
   */
  static async getInquiryById(id: string): Promise<{
    success: boolean;
    data?: Inquiry;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/inquiries/${id}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute atomic 5-step inquiry stepper on backend
   */
  static async createInquiryStepper(payload: CreateInquiryStepperPayload): Promise<{
    success: boolean;
    data?: Inquiry;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/inquiries/stepper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('InquiryService.createInquiryStepper failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update inquiry
   */
  static async updateInquiry(id: string, payload: Partial<Inquiry>): Promise<{
    success: boolean;
    data?: Inquiry;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete inquiry
   */
  static async deleteInquiry(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default InquiryService;
