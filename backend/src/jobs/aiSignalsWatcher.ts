import cron from 'node-cron';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { config } from '../config/index.js';

const HOT_SCORE_THRESHOLD = 70;
const WATERMARK_KEY = 'ai_signals_last_notified_at';

interface DiscoveredCompany {
  id: number;
  name: string;
  business_type: string | null;
  opportunity_score: number | null;
}

async function fetchDiscoveredCompanies(): Promise<DiscoveredCompany[]> {
  const url = `${config.intelligenceApiUrl}/v1/companies?sort_by=recency&limit=50`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': config.intelligenceApiKey },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Intelligence API error (${response.status})`);
  }
  const body = await response.json();
  return body.items || [];
}

/**
 * The list endpoint doesn't expose a per-company computed_at timestamp (only
 * a human string like "2 months ago"), so a precise time-based watermark
 * diff isn't possible - instead, dedup against the notifications table
 * itself (entity_type='company', type='ai_signal'), which already exists
 * for exactly this purpose. ai_signals_last_notified_at in system_metadata
 * is kept as a simple "last successful run" timestamp for observability.
 */
async function alreadyNotifiedCompanyIds(): Promise<Set<string>> {
  const res = await query(
    `SELECT entity_id FROM notifications WHERE type = 'ai_signal' AND entity_type IN ('company', 'ai_prospect');`
  );
  return new Set(res.rows.map((r: any) => r.entity_id));
}

async function insertHotCompanyNotification(company: DiscoveredCompany): Promise<void> {
  const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  await query(
    `INSERT INTO notifications (id, type, title, message, entity_type, entity_id, is_read, created_at)
     VALUES ($1, 'ai_signal', $2, $3, 'ai_prospect', $4, false, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO NOTHING;`,
    [
      id,
      `Hot AI Prospect: ${company.name}`,
      `${company.name} (${company.business_type || 'Unclassified'}) crossed an opportunity score of ${Math.round(company.opportunity_score ?? 0)}.`,
      String(company.id),
    ]
  );
}

async function setWatermark(): Promise<void> {
  await query(
    `INSERT INTO system_metadata (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
    [WATERMARK_KEY, new Date().toISOString()]
  );
}

const NEW_SIGNALS_WATERMARK_KEY = 'ai_signals_new_since';

const SIGNAL_LABELS: Record<string, string> = {
  expansion: 'expansion', funding: 'funding', tender: 'tender', hiring: 'hiring', regulatory: 'regulatory',
  import_export: 'import/export', distribution: 'distribution', filings: 'filings', lease_expiry: 'lease expiry',
  distress: 'distress',
};

/**
 * New signals the scheduled hunt found on watched companies since the last run:
 * one notification per company ("2 new signals for X: expansion, lease expiry").
 */
async function notifyNewSignals(): Promise<number> {
  const mark = await query('SELECT value FROM system_metadata WHERE key = $1', [NEW_SIGNALS_WATERMARK_KEY]);
  const startedAt = new Date().toISOString();
  // First run: start from now instead of announcing every signal ever found.
  const since = mark.rows[0]?.value || startedAt;
  const response = await fetch(
    `${config.intelligenceApiUrl}/v1/signals/recent?since=${encodeURIComponent(since.replace('Z', ''))}`,
    { headers: { 'X-API-Key': config.intelligenceApiKey }, signal: AbortSignal.timeout(15000) }
  );
  if (!response.ok) throw new Error(`Intelligence API error (${response.status})`);
  const items: { company_id: number; company_name: string; type: string; summary: string }[] = (await response.json()).items || [];

  const byCompany = new Map<number, typeof items>();
  for (const s of items) byCompany.set(s.company_id, [...(byCompany.get(s.company_id) || []), s]);
  for (const [companyId, sigs] of byCompany) {
    const kinds = [...new Set(sigs.map((s) => SIGNAL_LABELS[s.type] || s.type))].join(', ');
    await query(
      `INSERT INTO notifications (id, type, title, message, entity_type, entity_id, is_read, created_at)
       VALUES ($1, 'ai_signal', $2, $3, 'ai_prospect', $4, false, CURRENT_TIMESTAMP)`,
      [
        `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        `${sigs.length} new signal${sigs.length === 1 ? '' : 's'}: ${sigs[0].company_name}`,
        `${kinds}. Latest: ${sigs[0].summary}`.slice(0, 480),
        String(companyId),
      ]
    );
  }
  await query(
    `INSERT INTO system_metadata (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
    [NEW_SIGNALS_WATERMARK_KEY, startedAt]
  );
  return byCompany.size;
}

export async function runAiSignalsWatch(): Promise<void> {
  try {
    const companies = await fetchDiscoveredCompanies();
    const alreadyNotified = await alreadyNotifiedCompanyIds();

    const newlyHot = companies.filter(
      (c) => (c.opportunity_score ?? 0) >= HOT_SCORE_THRESHOLD && !alreadyNotified.has(String(c.id))
    );

    for (const company of newlyHot) {
      await insertHotCompanyNotification(company);
    }

    await setWatermark();

    if (newlyHot.length > 0) {
      console.log(`[aiSignalsWatcher] ${newlyHot.length} newly-hot compan${newlyHot.length === 1 ? 'y' : 'ies'} notified`);
    }
    const withNewSignals = await notifyNewSignals();
    if (withNewSignals > 0) {
      console.log(`[aiSignalsWatcher] new signals notified for ${withNewSignals} watched compan${withNewSignals === 1 ? 'y' : 'ies'}`);
    }
  } catch (error: any) {
    console.error('[aiSignalsWatcher] run failed:', error.message);
  }
}

export function startAiSignalsWatcher(): void {
  cron.schedule('0 * * * *', () => {
    runAiSignalsWatch();
  });
  console.log('🔔 AI signals watcher scheduled (hourly)');
}
