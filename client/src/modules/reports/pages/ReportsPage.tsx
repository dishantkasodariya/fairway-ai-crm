import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Trophy,
  PieChart,
  Calendar,
  Filter,
  Download,
  Users,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  Layers,
  MapPin,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/modules/core/components/ui/Card';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';
import {
  ChartAreaInteractive,
  ChartPieDonutActive,
  ChartBarStacked,
} from '@/modules/core/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/core/components/ui/Select';
import { useToast } from '@/modules/core/providers/ToastContext';

export const ReportsView: React.FC = () => {
  const [dateRange, setDateRange] = useState<'q3_2026' | 'ytd' | 'all_time'>('q3_2026');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const { success } = useToast();

  const allInquiries = StorageService.getInquiries();
  const companies = StorageService.getCompanies();
  const properties = StorageService.getProperties();
  const users = StorageService.getUsers();
  const tasks = StorageService.getTasks();
  const stages = StorageService.getPipelineStages();

  const inquiries = useMemo(() => {
    if (ownerFilter === 'all') return allInquiries;
    return allInquiries.filter((i) => i.salespersonId === ownerFilter);
  }, [allInquiries, ownerFilter]);

  const wonDeals = useMemo(
    () => inquiries.filter((i) => i.stage === 'won' || i.status === 'Won'),
    [inquiries]
  );
  const lostDeals = useMemo(
    () => inquiries.filter((i) => i.stage === 'lost' || i.status === 'Lost'),
    [inquiries]
  );
  const activeInquiries = useMemo(
    () => inquiries.filter((i) => i.status === 'Active'),
    [inquiries]
  );

  const totalWonValue = useMemo(
    () => wonDeals.reduce((acc, curr) => acc + (curr.wonFinalValueMonthlyINR || curr.budgetMonthlyINR || 0), 0),
    [wonDeals]
  );
  const totalPipelineValue = useMemo(
    () => activeInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0),
    [activeInquiries]
  );

  const totalDemandedArea = useMemo(
    () => activeInquiries.reduce((acc, curr) => acc + (curr.requiredAreaSqFt || 0), 0),
    [activeInquiries]
  );

  const completedTasksCount = tasks.filter((t) => t.status === 'Completed').length;
  const overdueTasksCount = tasks.filter(
    (t) => t.status === 'Pending' && new Date(t.dueDate) < new Date(new Date().toDateString())
  ).length;
  const onTimeFollowupRate = Math.round((completedTasksCount / (tasks.length || 1)) * 100);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Inquiry Number', 'Company', 'Industry', 'Corridor', 'Area (Sq.Ft)', 'Monthly Budget (INR)', 'Stage', 'Salesperson'];
    const rows = inquiries.map((inq) => [
      inq.inquiryNumber,
      `"${inq.companyName}"`,
      `"${inq.industry}"`,
      `"${inq.targetCorridor || inq.location}"`,
      inq.requiredAreaSqFt,
      inq.budgetMonthlyINR,
      inq.stage,
      `"${inq.salespersonName}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Fairway_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Export Completed', 'Real-time analytics data exported to CSV.');
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 dark:text-fairway-400 uppercase tracking-wider">
            CRM / Executive Intelligence
          </span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <BarChart3 className="w-6 h-6 text-fairway-600 dark:text-fairway-400" />
            <span>Reports & Real-Time Analytics</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Real-time pipeline trajectory, corridor demand absorption, sector breakdown, and salesperson performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Owner Filter */}
          <div className="w-48 sm:w-52">
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-8 text-xs bg-surface border border-border text-foreground rounded-lg">
                <SelectValue placeholder="All Team Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timeframe Filter */}
          <div className="w-52 sm:w-56">
            <Select value={dateRange} onValueChange={(val) => setDateRange(val as any)}>
              <SelectTrigger className="h-8 text-xs bg-surface border border-border text-foreground rounded-lg">
                <SelectValue placeholder="Q3 FY27 (Jul - Sep 2026)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="q3_2026">Q3 FY27 (Jul - Sep 2026)</SelectItem>
                <SelectItem value="ytd">Year to Date (FY 2026-27)</SelectItem>
                <SelectItem value="all_time">All Time Active Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top 4 Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Closed Won Revenue
          </span>
          <span className="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-2 block">
            {formatINR(totalWonValue, true)} / mo
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-500 font-semibold mt-1 block">
            {formatINR(totalWonValue * 12, true)} Annualized Run-Rate
          </span>
        </Card>

        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Active Weighted Pipeline
          </span>
          <span className="text-2xl font-black text-fairway-800 dark:text-fairway-300 mt-2 block">
            {formatINR(totalPipelineValue, true)} / mo
          </span>
          <span className="text-[10px] text-foreground-muted mt-1 block">
            Across {activeInquiries.length} active leads ({formatSqFt(totalDemandedArea)})
          </span>
        </Card>

        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Deal Conversion Rate
          </span>
          <span className="text-2xl font-black text-foreground mt-2 block">
            {Math.round((wonDeals.length / (wonDeals.length + lostDeals.length || 1)) * 100)}%
          </span>
          <span className="text-[10px] text-foreground-muted mt-1 block">
            {wonDeals.length} Won · {lostDeals.length} Lost Deals
          </span>
        </Card>

        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Follow-up Discipline
          </span>
          <span className="text-2xl font-black text-fairway-800 dark:text-fairway-300 mt-2 block">
            {onTimeFollowupRate}%
          </span>
          <span className="text-[10px] text-foreground-muted mt-1 block">
            {completedTasksCount} completed on-time · {overdueTasksCount} overdue
          </span>
        </Card>
      </div>

      {/* 1. Real-Time Interactive Area Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-fairway-600 animate-pulse" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Real-Time Inquiry & Inspection Trajectory
            </h3>
          </div>
          <span className="text-[11px] text-foreground-muted font-mono">Live CRM Data Feed</span>
        </div>
        <ChartAreaInteractive
          title="Industrial Inquiries & Site Visits Trajectory"
          subtitle="Real-time demand trend and client property inspections computed directly from CRM pipeline"
        />
      </div>

      {/* 2. Real-Time 2-Column Analytics: Industry Donut & Corridor Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Market Distribution & Corridor Absorption
            </h3>
          </div>
          <span className="text-[11px] text-foreground-muted font-mono">Real-time breakdown</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Sector Breakdown Donut Chart */}
          <ChartPieDonutActive
            title="Tenant Demand by Industry Category"
            subtitle="Hover over segments to inspect sector distribution & market share"
          />

          {/* Real-time Corridor Absorption Bar Chart */}
          <ChartBarStacked
            title="Corridor Demand & Monthly Pipeline Value"
            subtitle="Active tenant requirements & monthly rental budget across Western India hubs"
          />
        </div>
      </div>

      {/* 3. Grid: Pipeline by Stage & Salesperson Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stage Volume & Value */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-fairway-600 dark:text-fairway-400" />
              <CardTitle className="text-sm font-bold text-foreground">
                Pipeline Volume & Monthly Value by Stage
              </CardTitle>
            </div>
            <p className="text-xs text-foreground-muted">Rupee value and count distribution across leasing milestones</p>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            {stages.map((stg) => {
              const inqs = inquiries.filter((i) => i.stage === stg.key);
              const val = inqs.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);
              const maxVal = Math.max(totalPipelineValue, 1);
              const percent = Math.min(100, Math.round((val / maxVal) * 100));

              return (
                <div key={stg.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {stg.label} ({inqs.length} {inqs.length === 1 ? 'deal' : 'deals'})
                    </span>
                    <span className="font-mono font-bold text-fairway-900 dark:text-fairway-200">
                      {formatINR(val, true)}/mo
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-surface-muted overflow-hidden border border-border/50">
                    <div
                      className="h-full rounded-full bg-fairway-600 dark:bg-fairway-400 transition-all duration-300"
                      style={{ width: `${Math.max(percent, inqs.length > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Salesperson Performance Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                Sales Team Performance & Conversion
              </CardTitle>
            </div>
            <p className="text-xs text-foreground-muted">Individual pipeline ownership and win metrics</p>
          </CardHeader>

          <CardContent className="divide-y divide-border text-xs pt-1">
            {users
              .filter((u) => u.role === 'sales' || u.role === 'admin' || u.role === 'super_admin')
              .map((u) => {
                const userInquiries = inquiries.filter((i) => i.salespersonId === u.id);
                const userWon = userInquiries.filter((i) => i.stage === 'won' || i.status === 'Won').length;
                const userActive = userInquiries.filter((i) => i.status === 'Active').length;
                const userVal = userInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

                return (
                  <div key={u.id} className="py-3 flex items-center justify-between hover:bg-surface-muted/30 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar src={u.avatar} name={u.name} size="sm" />
                      <div className="truncate">
                        <span className="font-bold text-foreground block truncate">{u.name}</span>
                        <span className="text-[10px] text-foreground-muted font-mono">{u.role.replace('_', ' ').toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 sm:gap-6 text-right shrink-0">
                      <div>
                        <span className="text-[10px] uppercase text-foreground-muted block font-semibold">Active Leads</span>
                        <span className="font-bold text-foreground">{userActive}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-foreground-muted block font-semibold">Won Deals</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{userWon}</span>
                      </div>
                      <div className="min-w-[85px]">
                        <span className="text-[10px] uppercase text-foreground-muted block font-semibold">Pipeline</span>
                        <span className="font-mono font-bold text-fairway-900 dark:text-fairway-200">{formatINR(userVal, true)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* 4. Property Occupancy & Warehouse Park Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-accent-600 dark:text-accent-400" />
            <CardTitle className="text-sm font-bold text-foreground">
              Fairway Warehouse Parks — Inventory & Absorption
            </CardTitle>
          </div>
          <p className="text-xs text-foreground-muted">Capacity utilization, available space, and leasing status per facility</p>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((prop) => {
              const leasedArea = prop.totalAreaSqFt - prop.availableAreaSqFt;
              const occupancyRate = Math.round((leasedArea / prop.totalAreaSqFt) * 100);

              return (
                <div key={prop.id} className="p-4 bg-surface-muted/40 rounded-card border border-border text-xs space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-fairway-800 dark:text-fairway-300 bg-fairway-50 dark:bg-fairway-950/70 px-2 py-0.5 rounded border border-fairway-200 dark:border-fairway-800/60">
                      {prop.code}
                    </span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-400">{occupancyRate}% Leased</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground leading-snug">{prop.name}</h4>
                    <p className="text-[11px] text-foreground-muted mt-0.5">{prop.city} · {prop.corridor}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span>Available: <strong className="text-foreground">{formatSqFt(prop.availableAreaSqFt)}</strong></span>
                      <span className="text-foreground-muted">Total: {formatSqFt(prop.totalAreaSqFt)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden border border-border/60">
                      <div className="h-full bg-fairway-600 dark:bg-fairway-400 rounded-full" style={{ width: `${occupancyRate}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ReportsPage = ReportsView;
export default ReportsPage;
