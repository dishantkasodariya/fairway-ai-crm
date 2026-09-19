import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  FileText,
  TrendingUp,
  Trophy,
  Warehouse,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  ChevronRight,
  Clock,
  MapPin,
  Check,
} from 'lucide-react';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { PropertyService } from '@/modules/core/services/propertyService';
import { TaskService } from '@/modules/core/services/taskService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Task, Inquiry, Property } from '@/modules/core/types';

export interface DashboardViewProps {
  onNavigate: (view: any, entityId?: string) => void;
  onOpenNewInquiry: () => void;
}

const STAGE_BADGE_STYLES: Record<string, string> = {
  new: 'bg-surface-muted text-foreground border-border',
  requirement_confirmed: 'bg-surface-muted text-foreground border-border',
  property_matched: 'bg-surface-muted text-foreground border-border',
  site_visit: 'bg-surface-muted text-foreground border-border',
  proposal: 'bg-surface-muted text-foreground border-border',
  negotiation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  won: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold',
  lost: 'bg-surface-muted text-foreground-muted border-border',
};

export const DashboardPage: React.FC<DashboardViewProps> = ({ onNavigate, onOpenNewInquiry }) => {
  const { currentUser, isSales, users, canCreate } = useAuth();
  const { success } = useToast();
  const ownerFilter = isSales ? currentUser.id : 'all';
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch live PostgreSQL data
  const loadBackendData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inqRes, propRes, taskRes] = await Promise.allSettled([
        InquiryService.getInquiries({ pageSize: 500 }),
        PropertyService.getProperties(),
        TaskService.getTasks(),
      ]);

      if (inqRes.status === 'fulfilled' && inqRes.value.success && inqRes.value.data) {
        setAllInquiries(inqRes.value.data);
      }
      if (propRes.status === 'fulfilled' && propRes.value.success && propRes.value.data) {
        setProperties(propRes.value.data);
      }
      if (taskRes.status === 'fulfilled' && taskRes.value.success && taskRes.value.data) {
        setTasksList(taskRes.value.data);
      }
    } catch (e) {
      console.warn('Dashboard data fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Filtered dataset
  const inquiries = useMemo(() => {
    return ownerFilter === 'all'
      ? allInquiries
      : allInquiries.filter((i) => i.salespersonId === ownerFilter);
  }, [ownerFilter, allInquiries]);

  const tasks = useMemo(() => {
    return ownerFilter === 'all'
      ? tasksList
      : tasksList.filter((t) => t.assignedUserId === ownerFilter);
  }, [ownerFilter, tasksList]);

  // Key KPI calculations
  const activeInquiries = useMemo(() => inquiries.filter((i) => i.status === 'Active'), [inquiries]);
  const activeCount = activeInquiries.length;
  const totalPipelineValue = useMemo(
    () => activeInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0),
    [activeInquiries]
  );
  const wonInquiries = useMemo(
    () => inquiries.filter((i) => i.stage === 'won' || i.status === 'Won'),
    [inquiries]
  );
  const wonCount = wonInquiries.length;
  const totalWonValue = useMemo(
    () =>
      wonInquiries.reduce(
        (acc, curr) => acc + (curr.wonFinalValueMonthlyINR || curr.budgetMonthlyINR || 0),
        0
      ),
    [wonInquiries]
  );
  const totalAvailableSqFt = useMemo(
    () => properties.reduce((acc, p) => acc + p.availableAreaSqFt, 0),
    [properties]
  );

  // Today's Action Desk: Overdue & Today's tasks combined & sorted
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const actionableTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'Pending' && t.dueDate <= todayStr)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks, todayStr]);

  // Recent high-priority inquiries (top 5)
  const recentInquiries = useMemo(() => {
    return [...activeInquiries]
      .sort((a, b) => (b.budgetMonthlyINR || 0) - (a.budgetMonthlyINR || 0))
      .slice(0, 5);
  }, [activeInquiries]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await TaskService.toggleTask(taskId, { completedNotes: 'Completed from Dashboard' });
      if (res.success && res.data) {
        setTasksList((prev) => prev.map((t) => (t.id === taskId ? res.data! : t)));
      } else {
        setTasksList((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'Completed' } : t))
        );
      }
      success('Task Completed', 'Follow-up marked done.');
    } catch {
      setTasksList((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'Completed' } : t))
      );
      success('Task Completed', 'Follow-up marked done.');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-8xl mx-auto text-left py-2">
      {/* 1. Header: Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Overview
            </span>
            <span className="text-xs text-foreground-muted">·</span>
            <span className="text-xs text-foreground-muted">{formattedDate}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-1">
            {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'Member'}
          </h1>
        </div>

        {canCreate('inquiries') && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenNewInquiry}
              leftIcon={<Plus className="w-4 h-4" />}
              className="h-9 text-xs font-bold rounded-xl shadow-xs whitespace-nowrap"
            >
              New Inquiry
            </Button>
          </div>
        )}
      </div>

      {/* 2. 4 Core Hero KPI Cards - Unified Executive Minimal Tone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Inquiries */}
        <div
          onClick={() => onNavigate('inquiries')}
          className="group p-4 sm:p-5 bg-surface border border-border hover:border-foreground/40 rounded-2xl transition-all cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Active Inquiries
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center transition-colors">
              <FileText className="w-4 h-4 text-foreground" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums truncate">{activeCount}</div>
            <p className="text-xs text-foreground-muted mt-1 flex items-center justify-between gap-1">
              <span className="truncate">Live Leasing Demands</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-foreground-muted group-hover:text-foreground transition-colors" />
            </p>
          </div>
        </div>

        {/* Card 2: Pipeline Value */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="group p-4 sm:p-5 bg-surface border border-border hover:border-foreground/40 rounded-2xl transition-all cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Pipeline Demand
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center transition-colors">
              <TrendingUp className="w-4 h-4 text-foreground" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums truncate">
              {formatINR(totalPipelineValue, true)}
            </div>
            <p className="text-xs text-foreground-muted mt-1 flex items-center justify-between gap-1">
              <span className="truncate">Monthly Rent in Play</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-foreground-muted group-hover:text-foreground transition-colors" />
            </p>
          </div>
        </div>

        {/* Card 3: Closed Won */}
        <div
          onClick={() => onNavigate('inquiries')}
          className="group p-4 sm:p-5 bg-surface border border-border hover:border-foreground/40 rounded-2xl transition-all cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Closed Won
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center transition-colors">
              <Trophy className="w-4 h-4 text-foreground" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums truncate">{wonCount}</div>
            <p className="text-xs text-foreground-muted mt-1 flex items-center justify-between gap-1">
              <span className="truncate">{formatINR(totalWonValue, true)}/mo Closed</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-foreground-muted group-hover:text-foreground transition-colors" />
            </p>
          </div>
        </div>

        {/* Card 4: Available Stock */}
        <div
          onClick={() => onNavigate('properties')}
          className="group p-4 sm:p-5 bg-surface border border-border hover:border-foreground/40 rounded-2xl transition-all cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Available Stock
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center transition-colors">
              <Warehouse className="w-4 h-4 text-foreground" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums truncate">
              {formatSqFt(totalAvailableSqFt).replace(' sq.ft.', '')}
            </div>
            <p className="text-xs text-foreground-muted mt-1 flex items-center justify-between gap-1">
              <span className="truncate">sq.ft. Ready to Lease</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-foreground-muted group-hover:text-foreground transition-colors" />
            </p>
          </div>
        </div>
      </div>

      {/* 3. Balanced 2-Column Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Today's Action Desk */}
        <Card className="rounded-2xl bg-surface border border-border shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border bg-surface-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-foreground">
                  <Clock className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Today&apos;s Follow-ups</span>
                    {actionableTasks.length > 0 && (
                      <span className="text-[10px] font-medium bg-surface-muted text-foreground border border-border px-2 py-0.5 rounded-full">
                        {actionableTasks.length} Pending
                      </span>
                    )}
                  </CardTitle>
                </div>
              </div>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onNavigate('tasks')}
                rightIcon={<ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />}
                className="text-xs font-semibold text-foreground-muted hover:text-foreground p-0 h-auto cursor-pointer"
              >
                View All
              </Button>
            </div>
          </CardHeader>

          <div className="p-2 flex-1 divide-y divide-border/60">
            {actionableTasks.length === 0 ? (
              <div className="py-14 text-center text-xs text-foreground-muted flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-surface-muted text-foreground flex items-center justify-center border border-border">
                  <CheckCircle2 className="w-5 h-5 text-foreground" />
                </div>
                <span className="font-bold text-foreground text-sm">All caught up!</span>
                <span className="text-xs text-foreground-muted max-w-xs">
                  No urgent or scheduled calls due today for this desk.
                </span>
              </div>
            ) : (
              actionableTasks.map((t) => {
                const isOverdue = t.dueDate < todayStr;
                return (
                  <div
                    key={t.id}
                    className="p-3.5 flex items-start justify-between gap-3 hover:bg-surface-muted/40 rounded-xl transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => t.companyId && onNavigate('company_detail', t.companyId)}
                          className="text-xs font-bold text-foreground hover:underline cursor-pointer truncate max-w-[150px] sm:max-w-[220px]"
                        >
                          {t.companyName || 'Corporate Account'}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-semibold bg-surface-muted text-rose-600 dark:text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded">
                            Overdue
                          </span>
                        )}
                        {t.dueTime && (
                          <span className="text-[10px] font-mono text-foreground-muted bg-surface-muted px-1.5 py-0.2 rounded border border-border">
                            {t.dueTime}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-muted mt-1 leading-snug line-clamp-1">
                        {t.description}
                      </p>
                    </div>

                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleCompleteTask(t.id)}
                      leftIcon={<Check className="w-3 h-3 text-foreground" />}
                      className="shrink-0 h-7 text-xs font-semibold rounded-lg hover:bg-surface-muted"
                    >
                      Done
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Column: Top Active Opportunities */}
        <Card className="rounded-2xl bg-surface border border-border shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border bg-surface-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-foreground">
                  <TrendingUp className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Recent Opportunities</span>
                  </CardTitle>
                </div>
              </div>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onNavigate('inquiries')}
                rightIcon={<ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />}
                className="text-xs font-semibold text-foreground-muted hover:text-foreground p-0 h-auto cursor-pointer"
              >
                View All
              </Button>
            </div>
          </CardHeader>

          <div className="p-2 flex-1 divide-y divide-border/60">
            {recentInquiries.length === 0 ? (
              <div className="py-14 text-center text-xs text-foreground-muted flex flex-col items-center justify-center gap-2">
                <FileText className="w-8 h-8 text-foreground-muted" />
                <span className="font-bold text-foreground text-sm">No active inquiries</span>
                <span className="text-xs text-foreground-muted">
                  Create a new inquiry to get started.
                </span>
              </div>
            ) : (
              recentInquiries.map((inq) => {
                const badgeStyle =
                  STAGE_BADGE_STYLES[inq.stage] || 'bg-surface-muted text-foreground border-border';
                return (
                  <div
                    key={inq.id}
                    onClick={() => onNavigate('inquiry_detail', inq.id)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-surface-muted/40 rounded-xl transition-colors cursor-pointer group select-none"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-medium text-foreground-muted bg-surface-muted px-1.5 py-0.2 rounded border border-border shrink-0">
                          {inq.inquiryNumber}
                        </span>
                        <span className="text-xs font-bold text-foreground group-hover:underline transition-colors truncate">
                          {inq.companyName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-muted mt-1">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Warehouse className="w-3 h-3 text-foreground-muted shrink-0" />
                          {formatSqFt(inq.requiredAreaSqFt)}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-foreground-muted shrink-0" />
                          {inq.targetCorridor || inq.location || 'Gujarat'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border capitalize text-center whitespace-nowrap ${badgeStyle}`}
                      >
                        {inq.stage.replace(/_/g, ' ')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const DashboardView = DashboardPage;
export default DashboardPage;
