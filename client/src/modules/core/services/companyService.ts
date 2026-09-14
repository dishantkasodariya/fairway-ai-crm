import { Company, Contact, Facility, Inquiry } from '@/modules/core/types';
import { API_BASE_URL, getAuthHeaders } from './api';

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
  contactName?: string;
  contactDesignation?: string;
  contactPhone?: string;
  contactEmail?: string;
  initialNotes?: string;
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

      const res = await fetch(`${API_BASE_URL}/companies?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
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
      const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('CompanyService.getCompanyById failed:', err);
      return { success: false, error: err.message };
    }
  }

  private static duplicateAbortController: AbortController | null = null;
  private static duplicateCache: Map<string, Array<{ id: string; name: string; legal_name: string; city: string; industry: string }>> = new Map();

  /**
   * Check for duplicate companies by name with debounced abort controller and query cache
   */
  static async checkDuplicates(name: string): Promise<{
    success: boolean;
    duplicates?: Array<{ id: string; name: string; legal_name: string; city: string; industry: string }>;
    error?: string;
  }> {
    const trimmed = (name || '').trim();
    if (trimmed.length < 3) {
      return { success: true, duplicates: [] };
    }

    const cacheKey = trimmed.toLowerCase();
    if (this.duplicateCache.has(cacheKey)) {
      return { success: true, duplicates: this.duplicateCache.get(cacheKey) };
    }

    // Abort any existing in-flight duplicate check
    if (this.duplicateAbortController) {
      this.duplicateAbortController.abort();
      this.duplicateAbortController = null;
    }

    const controller = new AbortController();
    this.duplicateAbortController = controller;

    try {
      const res = await fetch(`${API_BASE_URL}/companies/check-duplicate`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: trimmed }),
        signal: controller.signal,
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.duplicates)) {
        if (this.duplicateCache.size > 100) {
          const firstKey = this.duplicateCache.keys().next().value;
          if (firstKey) this.duplicateCache.delete(firstKey);
        }
        this.duplicateCache.set(cacheKey, json.duplicates);
      }
      return json;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Silently swallowed for superseded keystroke requests
        return { success: true, duplicates: [] };
      }
      return { success: false, error: err.message };
    } finally {
      if (this.duplicateAbortController === controller) {
        this.duplicateAbortController = null;
      }
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default CompanyService;
