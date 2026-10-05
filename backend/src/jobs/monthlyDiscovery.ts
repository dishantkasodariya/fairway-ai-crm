import cron from 'node-cron';
import { query } from '../config/db.js';
import { callIntelligenceApi } from '../controllers/intelligence.controller.js';
import { BUSINESS_TZ } from '../services/businessDate.js';

/**
 * Monthly re-search around every real warehouse so new companies (and new gates of known
 * ones) keep arriving without anyone clicking "Find Prospects".
 *
 * OFF unless DISCOVERY_CRON_ENABLED=true: every run spends Google Places API credits
 * (an 8 km search took 19 calls; 50 km is roughly 40x the area).
 *
 * "Real warehouse" = has a manager and a map location — the same warehouses that own
 * AI leads. Demo parks without a manager are skipped.
 */
export const DISCOVERY_CRON = {
  SCHEDULE: '0 3 1 * *', // 03:00 IST on the 1st of each month
  RADIUS_KM: Number(process.env.DISCOVERY_CRON_RADIUS_KM) || 50,
  POLL_MS: 15_000,
  MAX_WAIT_MS: 2 * 60 * 60 * 1000,
};

interface Warehouse {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  manager_user_id: string;
}

export interface WarehouseDiscoveryResult {
  propertyId: string;
  propertyName: string;
  runId: number | null;
  status: string;
  newCompanies: number;
  linkedCompanies: number;
  apiCalls: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type IntelligenceApi = typeof callIntelligenceApi;

const waitForRun = async (api: IntelligenceApi, runId: number, pollMs: number, maxWaitMs: number) => {
  const started = Date.now();
  for (;;) {
    const run = await api(`/v1/discovery/runs/${runId}`);
    if (run.status === 'done' || run.status === 'failed') return run;
    if (Date.now() - started > maxWaitMs) return { ...run, status: 'timed_out' };
    await sleep(pollMs);
  }
};

/** Runs one search per real warehouse, one after another, and tells each manager what it found. */
export async function runMonthlyDiscovery(
  opts: {
    radiusKm?: number;
    pollMs?: number;
    maxWaitMs?: number;
    propertyIds?: string[];
    /** Swappable for tests, so the notification path can be checked without spending credits. */
    api?: IntelligenceApi;
  } = {}
): Promise<WarehouseDiscoveryResult[]> {
  const api = opts.api ?? callIntelligenceApi;
  const radiusKm = opts.radiusKm ?? DISCOVERY_CRON.RADIUS_KM;
  const warehouses = (await query(
    `SELECT p.id, p.name, p.latitude, p.longitude, p.manager_user_id FROM properties p
     JOIN users u ON u.id = p.manager_user_id
     WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       AND p.latitude <> 0 AND p.longitude <> 0
       ${opts.propertyIds ? 'AND p.id = ANY($1::text[])' : ''}
     ORDER BY p.name;`,
    opts.propertyIds ? [opts.propertyIds] : []
  )).rows as Warehouse[];

  const results: WarehouseDiscoveryResult[] = [];
  for (const w of warehouses) {
    const result: WarehouseDiscoveryResult = {
      propertyId: w.id, propertyName: w.name, runId: null, status: 'not_started',
      newCompanies: 0, linkedCompanies: 0, apiCalls: 0,
    };
    try {
      const started = await api('/v1/discovery/runs', {
        method: 'POST',
        body: JSON.stringify({
          lat: Number(w.latitude), lng: Number(w.longitude), radius_km: radiusKm, property_id: w.id,
        }),
      });
      result.runId = started.id;
      const run = await waitForRun(api, started.id, opts.pollMs ?? DISCOVERY_CRON.POLL_MS, opts.maxWaitMs ?? DISCOVERY_CRON.MAX_WAIT_MS);
      result.status = run.status;
      result.newCompanies = run.companies_found ?? 0;
      result.linkedCompanies = run.companies_linked ?? 0;
      result.apiCalls = run.api_calls_made ?? 0;
    } catch (err: any) {
      result.status = 'error';
      console.error(`[monthlyDiscovery] ${w.name} failed:`, err.message);
    }
    results.push(result);

    if (result.status === 'done' && result.linkedCompanies > 0) {
      const reFound = Math.max(0, result.linkedCompanies - result.newCompanies);
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, is_read, created_at)
         VALUES ($1, $2, 'ai_signal', $3, $4, 'property', $5, false, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING;`,
        [
          `discovery_${w.id}_${result.runId}`,
          w.manager_user_id,
          `${result.newCompanies} new compan${result.newCompanies === 1 ? 'y' : 'ies'} near ${w.name}`,
          `Monthly AI search (${radiusKm} km): ${result.newCompanies} new` +
            (reFound > 0 ? `, ${reFound} already known now linked here` : '') +
            '. Open the warehouse\'s AI Prospects to review them.',
          w.id,
        ]
      );
    }
  }
  return results;
}

export function startMonthlyDiscovery(): void {
  cron.schedule(
    DISCOVERY_CRON.SCHEDULE,
    () => {
      runMonthlyDiscovery()
        .then((rs) =>
          console.log(
            `[monthlyDiscovery] ${rs.map((r) => `${r.propertyName}: ${r.status}, ${r.newCompanies} new, ${r.apiCalls} calls`).join('; ') || 'no managed warehouses'}`
          )
        )
        .catch((err) => console.error('[monthlyDiscovery] run failed:', err.message));
    },
    { timezone: BUSINESS_TZ }
  );
  console.log(`🛰️  Monthly AI discovery scheduled (1st of month, 03:00 IST, ${DISCOVERY_CRON.RADIUS_KM} km)`);
}
