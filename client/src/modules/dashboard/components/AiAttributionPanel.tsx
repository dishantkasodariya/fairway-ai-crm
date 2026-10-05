import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card } from '@/modules/core/components/ui/Card';
import { cn } from '@/modules/core/lib/utils';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';
import { ReportService, AiAttributionReport } from '@/modules/core/services/reportService';

type PeriodKey = 'all' | '90d' | 'month';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'month', label: 'This month' },
];

const localIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const periodRange = (key: PeriodKey): { from?: string; to?: string } => {
  const today = new Date();
  if (key === '90d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 89);
    return { from: localIsoDate(from), to: localIsoDate(today) };
  }
  if (key === 'month') {
    return { from: localIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: localIsoDate(today) };
  }
  return {};
};

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export interface AiAttributionPanelProps {
  onOpenInquiry: (inquiryId: string) => void;
}

/** What AI Discovery delivered: leads → contacted → proposal → won → sq ft leased, next to every other source. */
export const AiAttributionPanel: React.FC<AiAttributionPanelProps> = ({ onOpenInquiry }) => {
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [report, setReport] = useState<AiAttributionReport | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const latestRequest = useRef(0);

  useEffect(() => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    ReportService.getAiAttribution(periodRange(period)).then((res) => {
      if (requestId !== latestRequest.current) return;
      if (res.success && res.data) {
        setReport(res.data);
        setError('');
      } else {
        setError(typeof res.error === 'string' ? res.error : 'Could not load the report.');
      }
      setIsLoading(false);
    });
  }, [period]);

  const ai = report?.ai;
  const steps = ai
    ? [
        { label: 'AI leads', value: ai.leads },
        { label: 'Contacted', value: ai.contacted },
        { label: 'Req. confirmed', value: ai.requirementConfirmed },
        { label: 'Proposal', value: ai.proposal },
        { label: 'Won', value: ai.won },
      ]
    : [];

  return (
    <Card className="p-5 space-y-5 rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fairway-600" />
            What AI Discovery delivered
          </h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            Leads added from AI Discovery and how far each one got — counted once it reaches a step, even if lost later.
          </p>
        </div>
        <div className="flex rounded-lg border border-border bg-surface-muted/40 p-0.5" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                period === p.key ? 'bg-surface text-foreground shadow-2xs border border-border' : 'text-foreground-muted hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {!report && isLoading && (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-fairway-600" />
        </div>
      )}

      {ai && report && (
        <div className={cn('grid grid-cols-1 lg:grid-cols-5 gap-6 transition-opacity', isLoading && 'opacity-60')}>
          {/* Funnel */}
          <div className="lg:col-span-3 space-y-2.5">
            {steps.map((s) => (
              <div key={s.label} className="grid grid-cols-[110px_1fr_72px] items-center gap-3 text-xs">
                <span className="font-semibold text-foreground-muted">{s.label}</span>
                <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-fairway-600"
                    style={{ width: `${ai.leads ? Math.max(s.value ? 2 : 0, pct(s.value, ai.leads)) : 0}%` }}
                  />
                </div>
                <span className="text-right tabular-nums">
                  <span className="font-bold text-foreground">{s.value}</span>
                  <span className="text-foreground-muted"> · {pct(s.value, ai.leads)}%</span>
                </span>
              </div>
            ))}
            <p className="text-[11px] text-foreground-muted pt-1">
              Now: {ai.open} open · {ai.parked} parked · {ai.lost} lost
              {ai.openPipelineSqFt > 0 && ` · ${formatSqFt(ai.openPipelineSqFt)} still in play`}
            </p>
          </div>

          {/* Outcomes */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-x-4 gap-y-3 content-start">
            <div>
              <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Leased</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{formatSqFt(ai.sqFtLeased).replace(' sq.ft.', '')}</p>
              <p className="text-[11px] text-foreground-muted">sq.ft. · {ai.leaseCount} lease{ai.leaseCount === 1 ? '' : 's'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Rent</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{formatINR(ai.monthlyRentINR, true)}</p>
              <p className="text-[11px] text-foreground-muted">per month</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Follow-ups per win</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{ai.avgTouchesPerWin ?? '—'}</p>
              <p className="text-[11px] text-foreground-muted">average</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Days to close</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{ai.medianDaysToClose ?? '—'}</p>
              <p className="text-[11px] text-foreground-muted">median{ai.avgDaysToClose !== null ? ` · avg ${ai.avgDaysToClose}` : ''}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5 text-xs">
              <span className="font-semibold text-foreground">Win rate:</span>{' '}
              <span className="tabular-nums">
                AI {Math.round(ai.winRate * 1000) / 10}% ({ai.won}/{ai.leads})
              </span>
              <span className="text-foreground-muted"> vs other sources </span>
              <span className="tabular-nums">
                {Math.round(report.otherSources.winRate * 1000) / 10}% ({report.otherSources.won}/{report.otherSources.leads})
              </span>
            </div>
          </div>

          {report.wins.length > 0 && (
            <div className="lg:col-span-5 border-t border-border pt-4">
              <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider mb-2">AI-sourced wins</p>
              <div className="divide-y divide-border">
                {report.wins.slice(0, 5).map((w) => (
                  <button
                    key={w.inquiryId}
                    type="button"
                    onClick={() => onOpenInquiry(w.inquiryId)}
                    className="w-full flex flex-wrap items-center justify-between gap-2 py-2 text-left text-xs hover:bg-surface-muted/50 rounded-md px-1 cursor-pointer"
                  >
                    <span className="font-semibold text-foreground">
                      {w.companyName} <span className="text-foreground-muted font-normal">· {w.inquiryNumber}</span>
                    </span>
                    <span className="text-foreground-muted tabular-nums">
                      {formatSqFt(w.sqFt)} · {w.touches} follow-up{w.touches === 1 ? '' : 's'}
                      {w.daysToClose !== null && ` · ${w.daysToClose} day${w.daysToClose === 1 ? '' : 's'}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AiAttributionPanel;
