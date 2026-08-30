import { Company, Contact, Facility, Inquiry } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export interface CreateCompanyPayload {
  name: string;
  legalName?: string;
  website?: string;
  industry?: string;
  status?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  assignedOwnerId?: string;
  assignedOwnerName?: string;
  prospectStage?: string;
  priority?: string;
  annualTurnover?: string;
  employeeCount?: string;
  gujaratPresence?: boolean;
}

export interface GetCompaniesParams {
  search?: string;
  industry?: string;
  status?: string;
  priority?: string;
  city?: string;
  assignedOwnerId?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  ascending?: boolean;
}

export class CompanyService {
  /**
   * Fetch paginated companies from backend API
   * Format: /api/companies?pageNumber=1&pageSize=10&sortBy=createdAt&ascending=false
   */
  static async getCompanies(params?: GetCompaniesParams): Promise<{
    success: boolean;
    data?: Company[];
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.pageNumber !== undefined) queryParams.set('pageNumber', params.pageNumber.toString());
      if (params?.pageSize !== undefined) queryParams.set('pageSize', params.pageSize.toString());
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params?.ascending !== undefined) queryParams.set('ascending', params.ascending.toString());
      if (params?.search) queryParams.set('search', params.search);
      if (params?.industry && params.industry !== 'all') queryParams.set('industry', params.industry);
      if (params?.status && params.status !== 'all') queryParams.set('status', params.status);
      if (params?.priority && params.priority !== 'all') queryParams.set('priority', params.priority);
      if (params?.city && params.city !== 'all') queryParams.set('city', params.city);
      if (params?.assignedOwnerId && params.assignedOwnerId !== 'all') queryParams.set('assignedOwnerId', params.assignedOwnerId);

      const res = await fetch(`${API_BASE_URL}/companies?${queryParams.toString()}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CompanyService.getCompanies failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch single company by ID with its related contacts, facilities, and inquiries
   */
  static async getCompanyById(id: string): Promise<{
    success: boolean;
    data?: Company & {
      contacts?: Contact[];
      facilities?: Facility[];
      inquiries?: Inquiry[];
    };
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/companies/${id}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CompanyService.getCompanyById failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Check for duplicate companies by name
   */
  static async checkDuplicates(name: string): Promise<{
    success: boolean;
    duplicates?: Array<{ id: string; name: string; legal_name: string; city: string; industry: string }>;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/companies/check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a new company via backend API
   */
  static async createCompany(payload: CreateCompanyPayload): Promise<{
    success: boolean;
    data?: Company;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CompanyService.createCompany failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update existing company
   */
  static async updateCompany(id: string, payload: Partial<CreateCompanyPayload>): Promise<{
    success: boolean;
    data?: Company;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
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
   * Delete company
   */
  static async deleteCompany(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default CompanyService;
