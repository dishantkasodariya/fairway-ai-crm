import React, { useEffect, useMemo, useState } from 'react';
import {
  ListTodo, AlarmClock, UserPlus, Hourglass, Warehouse, Sparkles, CalendarClock, MessageSquareReply,
  ArrowRight, Loader2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { cn } from '@/modules/core/lib/utils';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { formatDate, formatRelativeDate } from '@/modules/core/utils/formatters';
import { TodayService, TodayList, TodayItem, TodayItemType } from '@/modules/core/services/todayService';
import { LogTouchModal } from '@/modules/core/components/LogTouchModal';
import { LostReasonModal } from '@/modules/core/components/LostReasonModal';
import { InquiryService } from '@/modules/core/services/inquiryService';

export interface TodayPageProps {
  onOpenInquiry: (inquiryId: string) => void;
  onOpenProspect: (prospectId: number) => void;
  onOpenProperty: (propertyId: string) => void;
  onOpenTasks: () => void;
  onOpenPipeline: () => void;
}

const SECTION_META: Record<TodayItemType, { title: string; icon: React.ReactNode; tone: string; empty: (r: TodayList['rules']) => string; describe: (r: TodayList['rules']) => string }> = {
  follow_up: {
    title: 'Follow-ups due',
    icon: <AlarmClock className="w-4 h-4" />,
    tone: 'text-rose-600 dark:text-rose-400',
    describe: () => 'Promised check-ins that are due today or overdue.',
    empty: () => 'Nothing due. Nice.',
  },
  new_lead: {
    title: 'New leads to contact',
    icon: <UserPlus className="w-4 h-4" />,
    tone: 'text-fairway-600 dark:text-fairway-400',
    describe: (r) => `Leads nobody has reached out to yet, best score first (top ${r.TOP_N}).`,
    empty: () => 'Every new lead has been contacted.',
  },
  stuck_deal: {
    title: 'Stuck deals',
    icon: <Hourglass className="w-4 h-4" />,
    tone: 'text-amber-600 dark:text-amber-400',
    describe: (r) => `In progress, but nothing has happened for ${r.STUCK_AFTER_DAYS}+ days and nothing is scheduled.`,
    empty: () => 'No deal has gone quiet.',
  },
  hold: {
    title: 'Space on hold, going stale',
    icon: <Warehouse className="w-4 h-4" />,
    tone: 'text-amber-600 dark:text-amber-400',
    describe: (r) => `Space held for a proposal with no activity for ${r.HOLD_WARN_AFTER_DAYS}+ days. It's released automatically at ${r.HOLD_RELEASE_AFTER_DAYS} days.`,
    empty: () => 'No held space is at risk.',
  },
  prospect: {
    title: 'New AI prospects to add',
    icon: <Sparkles className="w-4 h-4" />,
    tone: 'text-fairway-600 dark:text-fairway-400',
    describe: (r) => `Best-scoring discovered companies (${r.PROSPECT_MIN_SCORE}+) that aren't in the CRM yet.`,
    empty: (r) => `No un-added prospects scoring ${r.PROSPECT_MIN_SCORE}+ right now. Scoring runs nightly, 30 companies a night.`,
  },
  renewal: {
    title: 'Lease renewals',
    icon: <CalendarClock className="w-4 h-4" />,
    tone: 'text-indigo-600 dark:text-indigo-400',
    describe: (r) => `Leases ending within ${r.RENEWAL_WINDOW_MONTHS} months.`,
    empty: () => 'No leases ending soon.',
  },
};

const scoreChip = (score?: number | null) =>
  score === null || score === undefined ? null : (
    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0',
      score >= 70 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
        : score >= 40 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
          : 'bg-surface-muted text-foreground-muted border-border')}>
      {Math.round(score)}
    </span>
  );

export const TodayPage: React.FC<TodayPageProps> = ({ onOpenInquiry, onOpenProspect, onOpenProperty, onOpenTasks, onOpenPipeline }) => {
  const { currentUser } = useAuth();
  const { success } = useToast();
  const [data, setData] = useState<TodayList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyMine, setOnlyMine] = useState(() => {
    try {
      return localStorage.getItem('today.onlyMine') === '1';
    } catch {
      return false;
    }
  });
  const [touchTarget, setTouchTarget] = useState<TodayItem | null>(null);
  const [lostTarget, setLostTarget] = useState<TodayItem | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError('');
    const res = await TodayService.getToday();
    if (res.success && res.data) setData(res.data);
    else setError(typeof res.error === 'string' ? res.error : res.error?.message || 'Could not load the Today list.');
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('today.onlyMine', onlyMine ? '1' : '0');
    } catch {
      /* per-viewer convenience only */
    }
  }, [onlyMine]);

  const sections = useMemo(() => {
    if (!data) return [];
    return data.sections.map((s) => ({
      ...s,
      items: onlyMine ? s.items.filter((i) => i.ownerId === currentUser?.id) : s.items,
    }));
  }, [data, onlyMine, currentUser?.id]);

  const totalShown = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-fairway-600" />
            Today
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {data ? formatDate(data.today) : '—'} · {totalShown} thing{totalShown === 1 ? '' : 's'} to do. Each item names who should act.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="today-only-mine" className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
            <input id="today-only-mine" type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Only mine
          </label>
          <Button type="button" size="sm" variant="outline" onClick={load} isLoading={isLoading} leftIcon={<RefreshCw className="w-3.5 h-3.5" />} className="rounded-lg text-xs">
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-fairway-600" /></div>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : (
        data && sections.map((s) => {
          const meta = SECTION_META[s.type];
          const hidden = s.total - (data.sections.find((x) => x.type === s.type)?.items.length || 0);
          return (
            <section key={s.type} className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden" aria-labelledby={`today-${s.type}`}>
              <header className="flex flex-wrap items-start justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border bg-surface-muted/30">
                <div>
                  <h2 id={`today-${s.type}`} className={cn('text-sm font-bold flex items-center gap-2', meta.tone)}>
                    {meta.icon}
                    <span className="text-foreground">{meta.title}</span>
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-border text-foreground-muted">
                      {s.items.length}{s.total > s.items.length && !onlyMine ? ` of ${s.total}` : ''}
                    </span>
                  </h2>
                  <p className="text-[11px] text-foreground-muted mt-0.5">{meta.describe(data.rules)}</p>
                </div>
                {s.type === 'new_lead' && hidden > 0 && (
                  <button type="button" onClick={onOpenPipeline} className="text-[11px] font-semibold text-fairway-600 hover:underline cursor-pointer">
                    +{hidden} more on the Pipeline →
                  </button>
                )}
              </header>

              {s.items.length === 0 ? (
                <p className="px-5 py-4 text-xs text-foreground-muted">{onlyMine ? 'Nothing here for you.' : meta.empty(data.rules)}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {s.items.map((item) => {
                    const mine = item.ownerId && item.ownerId === currentUser?.id;
                    const canLogTouch = !!item.inquiryId && (item.type === 'follow_up' || item.type === 'new_lead' || item.type === 'stuck_deal');
                    return (
                      <li key={item.key} className="px-4 sm:px-5 py-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 md:gap-4 items-start">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {scoreChip(item.score)}
                            <span className="text-sm font-bold text-foreground truncate">{item.title}</span>
                            {item.inquiryNumber && <span className="text-[10px] font-mono text-foreground-muted shrink-0">{item.inquiryNumber}</span>}
                          </div>
                          <p className="text-xs text-foreground-muted leading-snug">{item.detail}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold',
                              mine ? 'border-fairway-600/40 bg-fairway-600/10 text-fairway-700 dark:text-fairway-300'
                                : item.ownerIsSuggested ? 'border-dashed border-border text-foreground-muted'
                                  : 'border-border text-foreground')}>
                              {item.ownerName}{item.ownerIsSuggested ? ' · suggested' : ''}{mine ? ' (you)' : ''}
                            </span>
                            {item.dueDate && item.type === 'follow_up' && (
                              <span className={cn('font-semibold', (item.daysOverdue || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground-muted')}>
                                {(item.daysOverdue || 0) > 0 ? `${item.daysOverdue} day${item.daysOverdue === 1 ? '' : 's'} overdue` : 'Due today'}
                              </span>
                            )}
                            {item.dueDate && item.type === 'renewal' && <span className="text-foreground-muted">ends {formatRelativeDate(item.dueDate)}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                          {canLogTouch && (
                            <Button type="button" size="xs" onClick={() => setTouchTarget(item)} leftIcon={<MessageSquareReply className="w-3.5 h-3.5" />} className="rounded-lg text-xs">
                              I followed up
                            </Button>
                          )}
                          {item.inquiryId && (
                            <Button type="button" size="xs" variant="outline" onClick={() => onOpenInquiry(item.inquiryId!)} rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="rounded-lg text-xs">
                              Open deal
                            </Button>
                          )}
                          {!item.inquiryId && item.type === 'follow_up' && (
                            <Button type="button" size="xs" variant="outline" onClick={onOpenTasks} className="rounded-lg text-xs">Open tasks</Button>
                          )}
                          {item.prospectId && (
                            <Button type="button" size="xs" variant="outline" onClick={() => onOpenProspect(item.prospectId!)} rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="rounded-lg text-xs">
                              View & add
                            </Button>
                          )}
                          {item.type === 'renewal' && item.propertyId && (
                            <Button type="button" size="xs" variant="outline" onClick={() => onOpenProperty(item.propertyId!)} className="rounded-lg text-xs">Open warehouse</Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}

      {touchTarget?.inquiryId && (
        <LogTouchModal
          isOpen={!!touchTarget}
          onClose={() => setTouchTarget(null)}
          inquiryId={touchTarget.inquiryId}
          companyName={touchTarget.companyName || touchTarget.title}
          onLogged={async (result) => {
            const company = touchTarget.companyName || touchTarget.title;
            await load();
            if (result.suggestLost) {
              setLostTarget(touchTarget);
              return;
            }
            success(result.status === 'Parked' ? 'Lead parked' : 'Follow-up saved',
              result.nextFollowUp ? `${company}: next check-in ${formatRelativeDate(result.nextFollowUp.dueDate)}.` : company);
          }}
        />
      )}

      {lostTarget?.inquiryId && (
        <LostReasonModal
          isOpen={!!lostTarget}
          onClose={() => setLostTarget(null)}
          inquiryNumber={lostTarget.inquiryNumber || ''}
          companyName={lostTarget.companyName || lostTarget.title}
          onConfirm={async (d) => {
            const res = await InquiryService.updateInquiry(lostTarget.inquiryId!, {
              stage: 'lost', status: 'Lost', lostReason: d.lostReason, lostComments: d.lostComments,
              lostDate: d.lostDate, closedByUserId: d.closedByUserId,
            } as any);
            setLostTarget(null);
            await load();
            if (res.success) success('Marked Lost', `Reason recorded: ${d.lostReason}`);
          }}
        />
      )}
    </div>
  );
};

export default TodayPage;
