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
    `SELECT entity_id FROM notifications WHERE type = 'ai_signal' AND entity_type = 'company';`
  );
  return new Set(res.rows.map((r: any) => r.entity_id));
}

async function insertHotCompanyNotification(company: DiscoveredCompany): Promise<void> {
  const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  await query(
    `INSERT INTO notifications (id, type, title, message, entity_type, entity_id, is_read, created_at)
     VALUES ($1, 'ai_signal', $2, $3, 'company', $4, false, CURRENT_TIMESTAMP)
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
