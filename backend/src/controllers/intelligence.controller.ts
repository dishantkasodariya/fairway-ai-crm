import { Request, Response } from 'express';
import { config } from '../config/index.js';
import { pool } from '../config/db.js';

/**
 * Server-to-server proxy to the Fairway Company Intelligence API (Python/
 * FastAPI service under /intelligence). Kept server-side so the intelligence
 * API's X-API-Key never reaches the browser.
 */

const snakeToCamel = (key: string): string => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

export const toCamelCaseDeep = (value: any): any => {
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

export class IntelligenceApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'INTELLIGENCE_API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function callIntelligenceApi(
  path: string,
  options: RequestInit = {},
  retries = 2,
  timeoutMs = 15000
): Promise<any> {
  if (!config.intelligenceApiUrl) {
    throw new IntelligenceApiError(503, 'Intelligence API is not configured (set INTELLIGENCE_API_URL)', 'INTELLIGENCE_NOT_CONFIGURED');
  }

  const url = `${config.intelligenceApiUrl}${path}`;
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.intelligenceApiKey,
          ...(options.headers as Record<string, string> | undefined),
        },
      });

      clearTimeout(timer);

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        // If 502/503/504 and we have retries remaining, wait and retry
        if ([502, 503, 504].includes(response.status) && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
          continue;
        }
        throw new IntelligenceApiError(
          response.status,
          body?.detail || `Intelligence API error (${response.status})`,
          `HTTP_${response.status}`
        );
      }
      return body;
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new IntelligenceApiError(504, `Intelligence API timed out after ${timeoutMs}ms`, 'TIMEOUT');
      }
      if (attempt < retries && !(err instanceof IntelligenceApiError && err.status < 500)) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

const handleIntelligenceError = (res: Response, error: any, fallbackMessage: string) => {
  const status = error instanceof IntelligenceApiError ? error.status : 502;
  const code = error instanceof IntelligenceApiError ? error.code : 'INTELLIGENCE_GATEWAY_ERROR';
  const message = error.message || fallbackMessage;
  console.error(`[intelligence] ${fallbackMessage}:`, message);
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

/**
 * POST /api/intelligence/discovery/runs
 * Body: { lat, lng, radiusKm }
 * Kicks off a tiled company search around a Fairway property's coordinates.
 */
export const startDiscoveryRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId, radiusKm } = req.body;
    let { lat, lng } = req.body;
    if (typeof radiusKm !== 'number') {
      res.status(400).json({ success: false, error: 'radiusKm (number) is required' });
      return;
    }

    // Searching for a warehouse: always use its saved coordinates, so a run
    // can't be filed under one warehouse while centred somewhere else.
    if (propertyId !== undefined && propertyId !== null && propertyId !== '') {
      const { rows } = await pool.query('SELECT latitude, longitude FROM properties WHERE id = $1', [String(propertyId)]);
      const property = rows[0];
      if (!property) {
        res.status(404).json({ success: false, error: 'Warehouse not found' });
        return;
      }
      lat = property.latitude === null ? null : Number(property.latitude);
      lng = property.longitude === null ? null : Number(property.longitude);
      if (!lat || !lng) {
        res.status(400).json({ success: false, error: 'This warehouse has no map location yet. Add its latitude and longitude first.' });
        return;
      }
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      res.status(400).json({ success: false, error: 'Pick a warehouse, or give lat and lng (numbers)' });
      return;
    }

    const run = await callIntelligenceApi('/v1/discovery/runs', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, radius_km: radiusKm, property_id: propertyId ? String(propertyId) : null }),
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
    const { discoveryRunId, propertyId, sortBy, minScore, search, businessType, minRevenueCr, maxRevenueCr, limit, offset } = req.query;

    const params = new URLSearchParams();
    if (discoveryRunId) params.set('discovery_run_id', String(discoveryRunId));
    if (propertyId) params.set('property_id', String(propertyId));
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
