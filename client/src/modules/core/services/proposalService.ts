import { Proposal, ProposalStatus } from '@/modules/core/types';
import { API_BASE_URL, getAuthHeaders } from './api';

export class ProposalService {
  /**
   * Fetch all proposals with optional filters
   */
  static async getProposals(filters?: {
    status?: string;
    search?: string;
    inquiryId?: string;
    companyId?: string;
  }): Promise<{ success: boolean; data: Proposal[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.inquiryId) {
        params.append('inquiryId', filters.inquiryId);
      }
      if (filters?.companyId) {
        params.append('companyId', filters.companyId);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE_URL}/proposals${queryString}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ProposalService.getProposals failed:', err);
      return { success: false, data: [], error: err.message || 'Network error' };
    }
  }

  /**
   * Fetch single proposal by ID
   */
  static async getProposalById(id: string): Promise<{ success: boolean; data?: Proposal; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/proposals/${id}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`ProposalService.getProposalById(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Create a new commercial proposal
   */
  static async createProposal(proposalData: Partial<Proposal>): Promise<{ success: boolean; data?: Proposal; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/proposals`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(proposalData),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ProposalService.createProposal failed:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Update proposal status
   */
  static async updateProposalStatus(id: string, status: ProposalStatus): Promise<{ success: boolean; data?: Proposal; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/proposals/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`ProposalService.updateProposalStatus(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Update proposal details
   */
  static async updateProposal(id: string, proposalData: Partial<Proposal>): Promise<{ success: boolean; data?: Proposal; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/proposals/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(proposalData),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`ProposalService.updateProposal(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Delete a proposal
   */
  static async deleteProposal(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/proposals/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`ProposalService.deleteProposal(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }
}

export default ProposalService;
