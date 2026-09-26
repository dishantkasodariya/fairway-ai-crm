import { Request, Response } from 'express';
import { config } from '../config/index.js';

/**
 * Server-to-server proxy to the Fairway Company Intelligence API (Python/
 * FastAPI service under /intelligence). Kept server-side so the intelligence
 * API's X-API-Key never reaches the browser.
 */

const snakeToCamel = (key: string): string => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const toCamelCaseDeep = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(toCamelCaseDeep);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [snakeToCamel(k), toCamelCaseDeep(v)])
    );
  }
  return value;
};

class IntelligenceApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function callIntelligenceApi(path: string, options: RequestInit = {}): Promise<any> {
  if (!config.intelligenceApiUrl) {
    throw new IntelligenceApiError(503, 'Intelligence API is not configured (set INTELLIGENCE_API_URL)');
  }

  const url = `${config.intelligenceApiUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.intelligenceApiKey,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new IntelligenceApiError(response.status, body?.detail || `Intelligence API error (${response.status})`);
  }
  return body;
}

const handleIntelligenceError = (res: Response, error: any, fallbackMessage: string) => {
  const status = error instanceof IntelligenceApiError ? error.status : 502;
  console.error(`[intelligence] ${fallbackMessage}:`, error.message);
  res.status(status).json({ success: false, error: error.message || fallbackMessage });
};

/**
 * POST /api/intelligence/discovery/runs
 * Body: { lat, lng, radiusKm }
 * Kicks off a tiled company search around a Fairway property's coordinates.
 */
export const startDiscoveryRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radiusKm } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof radiusKm !== 'number') {
      res.status(400).json({ success: false, error: 'lat, lng, and radiusKm (numbers) are required' });
      return;
    }

    const run = await callIntelligenceApi('/v1/discovery/runs', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, radius_km: radiusKm }),
    });

    res.status(202).json({ success: true, data: toCamelCaseDeep(run) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to start discovery run');
  }
};

/**
 * GET /api/intelligence/discovery/runs/:runId
 */
export const getDiscoveryRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await callIntelligenceApi(`/v1/discovery/runs/${req.params.runId}`);
    res.status(200).json({ success: true, data: toCamelCaseDeep(run) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to fetch discovery run');
  }
};

/**
 * POST /api/intelligence/discovery/runs/:runId/enrich-revenue
 * Kicks off revenue research for every company in the run without a
 * RevenueSnapshot yet. Poll GET .../discovery/runs/:runId for progress.
 */
export const enrichRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await callIntelligenceApi(`/v1/discovery/runs/${req.params.runId}/enrich-revenue`, {
      method: 'POST',
      body: '{}',
    });
    res.status(202).json({ success: true, data: toCamelCaseDeep(run) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to start revenue enrichment');
  }
};

/**
 * GET /api/intelligence/companies/business-types
 */
export const getBusinessTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await callIntelligenceApi('/v1/companies/business-types');
    res.status(200).json({ success: true, data: toCamelCaseDeep(result) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to fetch business types');
  }
};

/**
 * GET /api/intelligence/companies?discoveryRunId=&sortBy=&minScore=&search=&businessType=&minRevenueCr=&maxRevenueCr=&limit=&offset=
 */
export const listDiscoveredCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { discoveryRunId, sortBy, minScore, search, businessType, minRevenueCr, maxRevenueCr, limit, offset } = req.query;

    const params = new URLSearchParams();
    if (discoveryRunId) params.set('discovery_run_id', String(discoveryRunId));
    if (sortBy) params.set('sort_by', String(sortBy));
    if (minScore) params.set('min_score', String(minScore));
    if (search) params.set('search', String(search));
    if (businessType) params.set('business_type', String(businessType));
    if (minRevenueCr) params.set('min_revenue_cr', String(minRevenueCr));
    if (maxRevenueCr) params.set('max_revenue_cr', String(maxRevenueCr));
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));

    const result = await callIntelligenceApi(`/v1/companies?${params.toString()}`);
    res.status(200).json({ success: true, data: toCamelCaseDeep(result) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to fetch discovered companies');
  }
};

/**
 * GET /api/intelligence/companies/:id
 */
export const getDiscoveredCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await callIntelligenceApi(`/v1/companies/${req.params.id}`);
    res.status(200).json({ success: true, data: toCamelCaseDeep(company) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to fetch discovered company');
  }
};

/**
 * POST /api/intelligence/companies/:id/revenue-research
 */
export const researchRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await callIntelligenceApi(`/v1/companies/${req.params.id}/revenue:research`, { method: 'POST', body: '{}' });
    res.status(202).json({ success: true, data: toCamelCaseDeep(job) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to start revenue research');
  }
};

/**
 * POST /api/intelligence/companies/:id/signals-research
 */
export const researchSignals = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await callIntelligenceApi(`/v1/companies/${req.params.id}/signals:research`, { method: 'POST', body: '{}' });
    res.status(202).json({ success: true, data: toCamelCaseDeep(job) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to start signal research');
  }
};

/**
 * POST /api/intelligence/companies/:id/contacts-enrich
 */
export const enrichContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await callIntelligenceApi(`/v1/companies/${req.params.id}/contacts:enrich`, { method: 'POST', body: '{}' });
    res.status(202).json({ success: true, data: toCamelCaseDeep(job) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to start contact enrichment');
  }
};

/**
 * GET /api/intelligence/companies/:id/contacts
 */
export const getCompanyContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await callIntelligenceApi(`/v1/companies/${req.params.id}/contacts`);
    res.status(200).json({ success: true, data: toCamelCaseDeep(result) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to fetch company contacts');
  }
};

/**
 * GET /api/intelligence/contacts
 * Every enriched contact across every discovered company, for the AI
 * Connections page.
 */
export const listAllContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await callIntelligenceApi('/v1/contacts');
    res.status(200).json({ success: true, data: toCamelCaseDeep(result) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to fetch contacts');
  }
};

/**
 * POST /api/intelligence/contacts/:id/draft-message
 */
export const draftMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const draft = await callIntelligenceApi(`/v1/contacts/${req.params.id}/draft-message`, { method: 'POST', body: '{}' });
    res.status(200).json({ success: true, data: toCamelCaseDeep(draft) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to draft outreach message');
  }
};

/**
 * GET /api/intelligence/jobs/:jobId
 */
export const getResearchJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await callIntelligenceApi(`/v1/jobs/${req.params.jobId}`);
    res.status(200).json({ success: true, data: toCamelCaseDeep(job) });
  } catch (error: any) {
    handleIntelligenceError(res, error, 'Failed to fetch research job');
  }
};
