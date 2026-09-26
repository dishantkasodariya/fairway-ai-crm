import { API_BASE_URL, getAuthHeaders } from './api';

export interface DiscoveryRun {
  id: number;
  warehouseLat: number;
  warehouseLng: number;
  radiusKm: number;
  status: 'queued' | 'running' | 'done' | 'failed';
  companiesFound: number;
  apiCallsMade: number;
  revenueEnrichmentStatus: 'not_started' | 'running' | 'done';
  revenueEnrichedCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface BusinessTypeCount {
  businessType: string | null;
  count: number;
}

export interface Contact {
  id: number;
  companyId: number;
  name: string;
  title: string | null;
  email: string | null;
  emailStatus: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  source: string;
  confidence: string | null;
  createdAt: string;
}

export interface ContactWithCompany extends Contact {
  companyName: string;
  businessType: string | null;
}

export interface OutreachDraft {
  id: number;
  contactId: number;
  channel: 'linkedin' | 'email';
  subject: string | null;
  body: string;
  generatedAt: string;
}

export interface DraftMessage {
  linkedin: OutreachDraft;
  email: OutreachDraft;
}

export interface DiscoveredCompany {
  id: number;
  name: string;
  businessType: string | null;
  address: string | null;
  distanceKm: number | null;
  siteCount: number;
  latestRevenueCr: number | null;
  opportunityScore: number | null;
  latestSignalFreshness: string | null;
}

export interface DiscoveredCompanyDetail extends Omit<DiscoveredCompany, 'opportunityScore'> {
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  primaryType: string | null;
  businessTypeConfidence: string | null;
  businessTypeReason: string | null;
  locations: string[] | null;
  revenueSnapshots: Array<{
    id: number;
    revenue: string | null;
    revenueCr: number | null;
    fiscalYear: string | null;
    sourceName: string | null;
    sourceUrl: string | null;
    method: string;
    confidence: string | null;
  }>;
  signals: Array<{
    id: number;
    type: string;
    summary: string;
    date: string | null;
    sourceName: string | null;
    sourceUrl: string | null;
    confidence: string | null;
  }>;
  opportunityScore: {
    score: number;
    why: string | null;
    estimatedRequirement: string | null;
    requirementBasis: string | null;
    recommendedAction: string | null;
    confidence: string | null;
    latestSignalDate: string | null;
    latestSignalFreshness: string | null;
  } | null;
}

export interface ListDiscoveredCompaniesParams {
  discoveryRunId?: number;
  sortBy?: 'score' | 'recency' | 'revenue' | 'distance';
  minScore?: number;
  search?: string;
  businessType?: string;
  minRevenueCr?: number;
  maxRevenueCr?: number;
  limit?: number;
  offset?: number;
}

export class IntelligenceService {
  /** Kick off a tiled company search around a property's coordinates. */
  static async startDiscoveryRun(params: {
    lat: number;
    lng: number;
    radiusKm: number;
  }): Promise<{ success: boolean; data?: DiscoveryRun; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/discovery/runs`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('IntelligenceService.startDiscoveryRun failed:', err);
      return { success: false, error: err.message };
    }
  }

  /** Poll a discovery run's status. */
  static async getDiscoveryRun(runId: number): Promise<{ success: boolean; data?: DiscoveryRun; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/discovery/runs/${runId}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('IntelligenceService.getDiscoveryRun failed:', err);
      return { success: false, error: err.message };
    }
  }

  /** Kick off revenue research for every company in a run without a RevenueSnapshot yet. */
  static async enrichRevenue(runId: number): Promise<{ success: boolean; data?: DiscoveryRun; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/discovery/runs/${runId}/enrich-revenue`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('IntelligenceService.enrichRevenue failed:', err);
      return { success: false, error: err.message };
    }
  }

  /** Distinct business types across all discovered companies, with counts. */
  static async getBusinessTypes(): Promise<{ success: boolean; data?: { items: BusinessTypeCount[] }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/companies/business-types`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('IntelligenceService.getBusinessTypes failed:', err);
      return { success: false, error: err.message };
    }
  }

  /** List companies a discovery run found (or filter across all discovered companies). */
  static async listDiscoveredCompanies(params: ListDiscoveredCompaniesParams = {}): Promise<{
    success: boolean;
    data?: { total: number; items: DiscoveredCompany[] };
    error?: string;
  }> {
    try {
      const q = new URLSearchParams();
      if (params.discoveryRunId !== undefined) q.set('discoveryRunId', String(params.discoveryRunId));
      if (params.sortBy) q.set('sortBy', params.sortBy);
      if (params.minScore !== undefined) q.set('minScore', String(params.minScore));
      if (params.search) q.set('search', params.search);
      if (params.businessType) q.set('businessType', params.businessType);
      if (params.minRevenueCr !== undefined) q.set('minRevenueCr', String(params.minRevenueCr));
      if (params.maxRevenueCr !== undefined) q.set('maxRevenueCr', String(params.maxRevenueCr));
      if (params.limit !== undefined) q.set('limit', String(params.limit));
      if (params.offset !== undefined) q.set('offset', String(params.offset));

      const res = await fetch(`${API_BASE_URL}/intelligence/companies?${q.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('IntelligenceService.listDiscoveredCompanies failed:', err);
      return { success: false, error: err.message };
    }
  }

  static async getDiscoveredCompany(id: number): Promise<{ success: boolean; data?: DiscoveredCompanyDetail; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/companies/${id}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('IntelligenceService.getDiscoveredCompany failed:', err);
      return { success: false, error: err.message };
    }
  }

  static async researchRevenue(id: number): Promise<{ success: boolean; data?: { id: number; status: string }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/companies/${id}/revenue-research`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async researchSignals(id: number): Promise<{ success: boolean; data?: { id: number; status: string }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/companies/${id}/signals-research`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getResearchJob(jobId: number): Promise<{ success: boolean; data?: { id: number; status: string; result?: any }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/jobs/${jobId}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Kick off Apollo contact enrichment for a company (requires a paid Apollo plan). */
  static async enrichContacts(companyId: number): Promise<{ success: boolean; data?: { id: number; status: string }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/companies/${companyId}/contacts-enrich`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getCompanyContacts(companyId: number): Promise<{ success: boolean; data?: { items: Contact[] }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/companies/${companyId}/contacts`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Every enriched contact across every discovered company. */
  static async listAllContacts(): Promise<{ success: boolean; data?: { items: ContactWithCompany[] }; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/contacts`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** One AgentRunner call producing a LinkedIn note + email, stored as two OutreachDraft rows. */
  static async draftMessage(contactId: number): Promise<{ success: boolean; data?: DraftMessage; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/intelligence/contacts/${contactId}/draft-message`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default IntelligenceService;
