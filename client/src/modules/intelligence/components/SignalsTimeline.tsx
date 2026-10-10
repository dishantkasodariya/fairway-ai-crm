import React, { useMemo, useState } from 'react';
import { BellRing, BellOff, ChevronDown, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/modules/core/components/ui/Card';
import { Badge } from '@/modules/core/components/ui/Badge';
import { useToast } from '@/modules/core/providers/ToastContext';
import { IntelligenceService, DiscoveredCompanyDetail, errorText } from '@/modules/core/services/intelligenceService';

type Signal = DiscoveredCompanyDetail['signals'][number];

// The intelligence API sends naive UTC timestamps; read them as UTC, not local time.
const parseUtc = (s: string | null) => (s ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`) : null);

const dayLabel = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const relative = (d: Date | null) => {
  if (!d) return 'never';
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 0) return `in ${-days} days`;
  return `${days} days ago`;
};

const untilLabel = (d: Date | null) => {
  if (!d) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'due at the next daily run';
  return days === 1 ? 'in 1 day' : `in ${days} days`;
};

const TRIGGER_LABEL: Record<string, string> = { scheduled: 'Scheduled', manual: 'Manual', pipeline: 'Pipeline' };

const sourceHost = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

interface SignalsTimelineProps {
  prospectId: number;
  detail: DiscoveredCompanyDetail;
  onRefresh: () => Promise<void>;
}

/**
 * A prospect's signals, grouped by the day we found them (newest first), with what the
 * scheduled hunt is doing for this company and every past check, including the ones that
 * found nothing new.
 */
export const SignalsTimeline: React.FC<SignalsTimelineProps> = ({ prospectId, detail, onRefresh }) => {
  const { success, error: toastError } = useToast();
  const [checking, setChecking] = useState(false);
  const [savingWatch, setSavingWatch] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const watch = detail.signalWatch;

  const groups = useMemo(() => {
    const byDay = new Map<string, { date: Date; items: Signal[] }>();
    for (const s of detail.signals) {
      const found = parseUtc(s.createdAt);
      const key = found ? dayLabel(found) : 'Earlier';
      if (!byDay.has(key)) byDay.set(key, { date: found || new Date(0), items: [] });
      byDay.get(key)!.items.push(s);
    }
    return [...byDay.entries()].sort((a, b) => b[1].date.getTime() - a[1].date.getTime());
  }, [detail.signals]);

  const toggleWatch = async () => {
    if (!watch) return;
    setSavingWatch(true);
    const res = await IntelligenceService.setSignalWatch(prospectId, !watch.watching);
    setSavingWatch(false);
    if (!res.success) {
      toastError('Could not update tracking', errorText(res.error, 'Try again.'));
      return;
    }
    await onRefresh();
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      const res = await IntelligenceService.researchSignals(prospectId);
      if (!res.success || !res.data) {
        toastError('Could not start the check', errorText(res.error, 'Try again.'));
        return;
      }
      const jobId = res.data.id;
      // Research takes a minute or two; poll the job, then reload the timeline.
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const job = await IntelligenceService.getResearchJob(jobId);
        const status = job.data?.status;
        if (status === 'done' || status === 'failed') {
          await onRefresh();
          if (status === 'done') {
            const found = job.data?.result?.new_signals_found ?? 0;
            success('Signals checked', found ? `${found} new signal${found === 1 ? '' : 's'} found.` : 'No new signals since the last check.');
          } else {
            toastError('Check failed', 'The signals research did not finish. Try again later.');
          }
          return;
        }
      }
    } finally {
      setChecking(false);
    }
  };

  const lastChecked = parseUtc(watch?.lastCheckedAt ?? null);
  const nextCheck = parseUtc(watch?.nextCheckAt ?? null);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Signals Timeline</h2>
          {watch && (
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Last checked {relative(lastChecked)}
              {watch.watching
                ? ` · re-checked every ${watch.recheckDays} days${nextCheck ? `, next ${untilLabel(nextCheck)}` : ', at the next daily run'}`
                : ' · not on the scheduled re-check list'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {watch && (
            <button
              type="button"
              onClick={toggleWatch}
              disabled={savingWatch}
              className={`h-8 px-3 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                watch.watching
                  ? 'border-fairway-600/40 bg-fairway-600/10 text-fairway-700 dark:text-fairway-300'
                  : 'border-border text-foreground-muted hover:text-foreground'
              }`}
              title={watch.watching ? 'Stop the scheduled re-checks for this company' : 'Re-check this company on the schedule'}
            >
              {watch.watching ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              {watch.watching ? 'Tracking' : 'Track signals'}
            </button>
          )}
          <button
            type="button"
            onClick={checkNow}
            disabled={checking}
            className="h-8 px-3 rounded-lg border border-border text-[11px] font-semibold text-foreground flex items-center gap-1.5 hover:bg-surface-muted cursor-pointer disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {checking ? 'Checking…' : 'Check now'}
          </button>
        </div>
      </div>

      {detail.signals.length === 0 ? (
        <p className="text-xs text-foreground-muted">No signals found yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([label, group], gi) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">Found {label}</span>
                {gi === 0 && <Badge size="sm" className="bg-fairway-600 text-white border-transparent">Latest</Badge>}
                <span className="flex-1 border-t border-border" />
              </div>
              <div className="space-y-2.5">
                {group.items.map((s) => {
                  const host = sourceHost(s.sourceUrl);
                  return (
                    <div key={s.id} className="text-xs pl-3 border-l-2 border-border">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" size="sm">{s.type.replace('_', ' ')}</Badge>
                        {s.date && <span className="text-foreground-muted">reported {s.date}</span>}
                        {s.confidence && <span className="text-foreground-muted">· {s.confidence} confidence</span>}
                      </div>
                      <p className="text-foreground mt-1">{s.summary}</p>
                      {s.sourceUrl && (
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-0.5 text-[11px] text-fairway-600 hover:underline"
                        >
                          {s.sourceName || host || 'Source'} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {watch && watch.checks.length > 0 && (
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setShowChecks((v) => !v)}
            className="text-[11px] font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showChecks ? 'rotate-180' : ''}`} />
            Check history ({watch.checks.length})
          </button>
          {showChecks && (
            <ul className="mt-2 space-y-1.5 text-[11px]">
              {watch.checks.map((c) => {
                const at = parseUtc(c.checkedAt);
                const outcome =
                  c.status === 'failed'
                    ? `Failed${c.error ? `: ${c.error.slice(0, 90)}` : ''}`
                    : c.status !== 'done'
                    ? 'Running…'
                    : c.newSignals
                    ? `${c.newSignals} new${c.alreadyKnown ? `, ${c.alreadyKnown} already known` : ''}`
                    : c.alreadyKnown
                    ? `Nothing new (${c.alreadyKnown} already known)`
                    : 'Nothing new';
                return (
                  <li key={c.jobId} className="flex flex-wrap items-center gap-x-2 text-foreground-muted">
                    <span className="text-foreground font-medium w-28 shrink-0">{at ? dayLabel(at) : '—'}</span>
                    <span className="px-1.5 py-0.5 rounded border border-border">{TRIGGER_LABEL[c.trigger || ''] || 'Earlier'}</span>
                    <span className={c.status === 'failed' ? 'text-rose-600' : c.newSignals ? 'text-emerald-600 font-semibold' : ''}>{outcome}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
};

export default SignalsTimeline;
