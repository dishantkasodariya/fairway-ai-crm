import React, { useState } from 'react';
import {
  Building2,
  FileText,
  TrendingUp,
  Trophy,
  AlertTriangle,
  Clock,
  Warehouse,
  ArrowUpRight,
  PhoneCall,
  CheckCircle2,
  User,
  Plus,
  Compass,
  BarChart3,
  PieChart,
  Activity,
  Layers,
  Target,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Users,
  Award,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { formatINR, formatSqFt, formatDate, formatRelativeDate, getPriorityBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Tabs } from '@/modules/core/components/ui/Tabs';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/modules/core/components/ui/DropdownMenu';
import { ChartAreaInteractive, ChartPieDonutActive, ChartBarStacked } from '@/modules/core/components/ui';
import { useToast } from '@/modules/core/providers/ToastContext';

import { Inquiry, Task } from '@/modules/core/types';

export interface DashboardViewProps {
  onNavigate: (view: any, entityId?: string) => void;
  onOpenNewInquiry: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenNewInquiry }) => {
  const { currentUser, isSales, canEdit } = useAuth();
  const { success } = useToast();
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [activeChartTab, setActiveChartTab] = useState<'pipeline_funnel' | 'corridor_demand' | 'sales_team'>('pipeline_funnel');

  const companies = StorageService.getCompanies();
  const allInquiries = StorageService.getInquiries();
  const allTasks = StorageService.getTasks();
  const properties = StorageService.getProperties();
  const activities = StorageService.getActivities();
  const users = StorageService.getUsers();

  const inquiries = ownerFilter === 'all' ? allInquiries : allInquiries.filter((i) => i.salespersonId === ownerFilter);
  const tasks = ownerFilter === 'all' ? allTasks : allTasks.filter((t) => t.assignedUserId === ownerFilter);

  // Metrics
  const totalCompaniesCount = companies.length;
  const newInquiriesCount = inquiries.filter((i) => i.stage === 'new').length;
  const activeInquiriesCount = inquiries.filter((i) => i.status === 'Active').length;
  const qualifiedCount = inquiries.filter((i) => i.stage === 'requirement_confirmed' || i.stage === 'property_matched').length;
  const negotiationCount = inquiries.filter((i) => i.stage === 'negotiation' || i.stage === 'proposal').length;
  const wonInquiries = inquiries.filter((i) => i.stage === 'won' || i.status === 'Won');
  const wonCount = wonInquiries.length;
  const totalWonValue = wonInquiries.reduce((acc, curr) => acc + (curr.wonFinalValueMonthlyINR || curr.budgetMonthlyINR || 0), 0);

  const totalAvailableSqFt = properties.reduce((acc, p) => acc + p.availableAreaSqFt, 0);
  const totalPipelineValue = inquiries
    .filter((i) => i.status === 'Active')
    .reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

  // Tasks Breakdown
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.status === 'Pending' && t.dueDate === todayStr);
  const overdueTasks = tasks.filter((t) => t.status === 'Pending' && t.dueDate < todayStr);

  const handleCompleteTask = (taskId: string) => {
    StorageService.toggleTaskCompletion(taskId, 'Completed from Dashboard');
    success('Task Completed', 'Follow-up logged to company activity timeline.');
  };

  const pipelineStages = StorageService.getPipelineStages();

  // Corridor Analytics Data for Graphs
  const corridors = [
    { name: 'Dahej PCPIR Corridor', short: 'Dahej', demandArea: 185000, supplyArea: 240000, valueINR: 4250000 },
    { name: 'Ahmedabad - Sanand Auto Corridor', short: 'Sanand', demandArea: 145000, supplyArea: 190000, valueINR: 3100000 },
    { name: 'Vapi - Surat Industrial Corridor', short: 'Vapi-Surat', demandArea: 110000, supplyArea: 160000, valueINR: 2650000 },
    { name: 'Mumbai - Bhiwandi Logistics Corridor', short: 'Bhiwandi', demandArea: 210000, supplyArea: 180000, valueINR: 5200000 },
    { name: 'Pune - Chakan Auto Corridor', short: 'Chakan', demandArea: 95000, supplyArea: 120000, valueINR: 2100000 },
  ];

  const maxCorridorValue = Math.max(...corridors.map((c) => c.valueINR));

  // Funnel Stages Data
  const funnelStages = [
    { stage: 'New Leads', count: inquiries.filter((i) => i.stage === 'new').length, color: 'bg-sky-500' },
    { stage: 'Requirement Confirmed', count: inquiries.filter((i) => i.stage === 'requirement_confirmed').length, color: 'bg-blue-500' },
    { stage: 'Property Matched', count: inquiries.filter((i) => i.stage === 'property_matched').length, color: 'bg-indigo-500' },
    { stage: 'Site Visit Scheduled', count: inquiries.filter((i) => i.stage === 'site_visit').length, color: 'bg-purple-500' },
    { stage: 'Proposal Sent', count: inquiries.filter((i) => i.stage === 'proposal').length, color: 'bg-amber-500' },
    { stage: 'Negotiation', count: inquiries.filter((i) => i.stage === 'negotiation').length, color: 'bg-emerald-500' },
    { stage: 'Closed Won', count: wonCount, color: 'bg-fairway-600' },
  ];

  const maxFunnelCount = Math.max(...funnelStages.map((f) => f.count), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* Executive Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Operations</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <TrendingUp className="w-6 h-6 text-fairway-600" />
            <span>Sales & Operations Dashboard</span>
            {isSales && (
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                My Leads View
              </span>
            )}
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Real-time leasing pipeline, corridor demand graphs, and operational follow-ups across Gujarat & Western India.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Owner Filter Selector */}
          <DropdownMenu
            align="right"
            className="w-56"
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 text-xs bg-surface border border-border hover:border-fairway-400 rounded-input px-3 py-1.5 shadow-subtle flex-1 sm:flex-none max-w-full transition-colors focus:outline-none"
              >
                <User className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span className="text-foreground-muted font-medium shrink-0">Owner:</span>
                <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                  {ownerFilter === 'all' ? 'All Team Members' : users.find((u) => u.id === ownerFilter)?.name || 'Select Owner'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-foreground-muted shrink-0 ml-auto sm:ml-1" />
              </button>
            }
          >
            <DropdownMenuLabel>Filter by Owner</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setOwnerFilter('all')}
              className={ownerFilter === 'all' ? 'bg-surface-muted font-semibold text-fairway-800' : ''}
              icon={ownerFilter === 'all' ? <Check className="w-3.5 h-3.5 text-fairway-600" /> : <Users className="w-3.5 h-3.5 text-foreground-muted" />}
            >
              All Team Members
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {users.map((u) => (
              <DropdownMenuItem
                key={u.id}
                onClick={() => setOwnerFilter(u.id)}
                className={ownerFilter === u.id ? 'bg-surface-muted font-semibold text-fairway-800' : ''}
                icon={ownerFilter === u.id ? <Check className="w-3.5 h-3.5 text-fairway-600" /> : <User className="w-3.5 h-3.5 text-foreground-muted" />}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="truncate">{u.name}</span>
                  <span className="text-[10px] text-foreground-muted font-normal capitalize shrink-0">({u.role})</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenu>

          {canEdit && (
            <Button size="sm" onClick={onOpenNewInquiry} leftIcon={<Plus className="w-4 h-4" />} className="shrink-0">
              New Inquiry
            </Button>
          )}
        </div>
      </div>

      {/* Top 6 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigate('companies')}
          className="bg-surface border border-border hover:border-fairway-400 p-4 rounded-card shadow-subtle cursor-pointer transition-all group select-none"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
            Total Companies
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-foreground group-hover:text-fairway-800">
              {totalCompaniesCount}
            </span>
            <Building2 className="w-4 h-4 text-fairway-600 opacity-80" />
          </div>
          <span className="text-[10px] text-foreground-muted mt-1 block">Industrial Accounts</span>
        </div>

        <div
          onClick={() => onNavigate('inquiries')}
          className="bg-surface border border-border hover:border-sky-400 p-4 rounded-card shadow-subtle cursor-pointer transition-all group select-none"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
            New Leads
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-sky-700">{newInquiriesCount}</span>
            <FileText className="w-4 h-4 text-sky-600 opacity-80" />
          </div>
          <span className="text-[10px] text-foreground-muted mt-1 block">Awaiting First Call</span>
        </div>

        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-surface border border-border hover:border-indigo-400 p-4 rounded-card shadow-subtle cursor-pointer transition-all group select-none"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
            Active Pipeline
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-indigo-700">{activeInquiriesCount}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600 opacity-80" />
          </div>
          <span className="text-[10px] text-foreground-muted mt-1 block">{formatINR(totalPipelineValue, true)} / mo</span>
        </div>

        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-surface border border-border hover:border-amber-400 p-4 rounded-card shadow-subtle cursor-pointer transition-all group select-none"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
            In Negotiation
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-amber-700">{negotiationCount}</span>
            <Clock className="w-4 h-4 text-amber-600 opacity-80" />
          </div>
          <span className="text-[10px] text-foreground-muted mt-1 block">Proposal & Terms</span>
        </div>

        <div
          onClick={() => onNavigate('inquiries')}
          className="bg-surface border border-border hover:border-emerald-400 p-4 rounded-card shadow-subtle cursor-pointer transition-all group select-none"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
            Won Deals
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-700">{wonCount}</span>
            <Trophy className="w-4 h-4 text-amber-500 opacity-80" />
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">{formatINR(totalWonValue, true)} / mo</span>
        </div>

        <div
          onClick={() => onNavigate('properties')}
          className="bg-surface border border-border hover:border-fairway-400 p-4 rounded-card shadow-subtle cursor-pointer transition-all group select-none"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
            Available Stock
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-extrabold text-foreground">{formatSqFt(totalAvailableSqFt).replace(' sq.ft.', '')}</span>
            <Warehouse className="w-4 h-4 text-accent-600 opacity-80" />
          </div>
          <span className="text-[10px] text-foreground-muted mt-1 block">sq.ft ready to lease</span>
        </div>
      </div>

      {/* Interactive Demand & Inquiry Area Chart */}
      <ChartAreaInteractive />

      {/* Analytics Grid: Sector Demand Active Donut Chart & Revenue by Channel Stacked Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPieDonutActive
          title="Demand by Industry Category"
          subtitle="Hover over segments to inspect sector distribution & share"
        />

        {/* Revenue by Channel Horizontal Stacked Bar Chart */}
        <ChartBarStacked
          title="Revenue by Channel"
        />
      </div>


      {/* Operational Attention Grid: Overdue & Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Follow-ups */}
        <Card className={overdueTasks.length > 0 ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/20' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 dark:border dark:border-rose-800/60 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-rose-950 dark:text-rose-200 flex items-center gap-2">
                  <span>Overdue Follow-ups</span>
                  <span className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60">
                    {overdueTasks.length} Overdue
                  </span>
                </CardTitle>
                <p className="text-[11px] text-foreground-muted">Critical opportunities needing urgent attention today</p>
              </div>
            </div>
            <Button size="xs" variant="outline" onClick={() => onNavigate('tasks')}>
              View All Tasks
            </Button>
          </CardHeader>

          {overdueTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-foreground-muted flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="font-semibold text-foreground">Zero overdue tasks!</span>
              <span>All client follow-ups are up to date.</span>
            </div>
          ) : (
            <div className="divide-y divide-rose-100 dark:divide-rose-900/30">
              {overdueTasks.map((t) => (
                <div key={t.id} className="py-3 px-4 flex items-start justify-between gap-3 hover:bg-rose-50/40 dark:hover:bg-rose-950/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold text-foreground hover:text-fairway-600 dark:hover:text-fairway-400 cursor-pointer"
                        onClick={() => t.companyId && onNavigate('company_detail', t.companyId)}
                      >
                        {t.companyName}
                      </span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/70 dark:text-rose-300 dark:border dark:border-rose-800/60 px-1.5 py-0.2 rounded">
                        {formatRelativeDate(t.dueDate)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground mt-0.5">{t.description}</p>
                    <span className="text-[11px] text-foreground-muted block mt-1">
                      Assigned: {t.assignedUserName} · Type: {t.taskType}
                    </span>
                  </div>
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => handleCompleteTask(t.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Done
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Today's Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border dark:border-amber-800/60 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                  <span>Today&apos;s Follow-ups</span>
                  <span className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                    {todaysTasks.length} Scheduled
                  </span>
                </CardTitle>
                <p className="text-[11px] text-foreground-muted mt-0.5">Client communications and meetings planned for today</p>
              </div>
            </div>
            <Button size="xs" variant="outline" onClick={() => onNavigate('tasks')} className="shrink-0">
              Manage
            </Button>
          </CardHeader>

          {todaysTasks.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-foreground-muted flex flex-col items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center border border-border">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h5 className="font-bold text-foreground text-sm">All caught up for today!</h5>
                <p className="text-xs text-foreground-muted mt-1">No pending communications or meetings scheduled for today.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todaysTasks.map((t) => (
                <div key={t.id} className="py-3 px-4 flex items-start justify-between gap-3 hover:bg-surface-muted/40 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold text-foreground hover:text-fairway-600 dark:hover:text-fairway-400 cursor-pointer"
                        onClick={() => t.companyId && onNavigate('company_detail', t.companyId)}
                      >
                        {t.companyName}
                      </span>
                      {t.dueTime && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.2 rounded border border-border">
                          {t.dueTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground mt-0.5">{t.description}</p>
                    <span className="text-[11px] text-foreground-muted block mt-1">
                      Assigned: <strong className="text-foreground font-medium">{t.assignedUserName}</strong> · Type: {t.taskType}
                    </span>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleCompleteTask(t.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  >
                    Complete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>


      {/* Active High Priority Inquiries Table & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active High Priority Inquiries Dense Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 space-y-0">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">Active High-Value Inquiries</CardTitle>
              <p className="text-xs text-foreground-muted mt-0.5">Opportunities with requirements &gt; 50,000 sq.ft in Western India</p>
            </div>
            <Button size="xs" variant="outline" onClick={() => onNavigate('inquiries')} className="shrink-0">
              View All Inquiries
            </Button>
          </CardHeader>

          <div className="divide-y divide-border">
            {inquiries.slice(0, 5).map((inq) => {
              const stageColors: Record<string, string> = {
                new: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800/60',
                requirement_confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60',
                property_matched: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/60',
                site_visit: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60',
                proposal: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
                negotiation: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60',
                won: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60',
              };
              const badgeClass = stageColors[inq.stage] || 'bg-surface-muted text-foreground-muted border-border';

              return (
                <div
                  key={inq.id}
                  onClick={() => onNavigate('inquiry_detail', inq.id)}
                  className="py-3 px-4 flex items-center justify-between hover:bg-surface-muted/60 cursor-pointer transition-colors group select-none"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded border border-border shrink-0">
                        {inq.inquiryNumber}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate group-hover:text-fairway-600 dark:group-hover:text-fairway-400 transition-colors">
                        {inq.companyName}
                      </span>
                      <span className="text-[11px] font-medium text-foreground-muted truncate max-w-[140px]">· {inq.industry}</span>
                    </div>
                    <p className="text-xs text-foreground-muted truncate mt-1">
                      Needs <strong className="text-foreground font-semibold">{formatSqFt(inq.requiredAreaSqFt)}</strong> in <span className="text-foreground">{inq.location}</span> · Budget <span className="text-foreground font-mono font-medium">{formatINR(inq.budgetMonthlyINR, true)}/mo</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize block text-center ${badgeClass}`}>
                        {inq.stage.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-foreground-muted block mt-1">{inq.salespersonName}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-fairway-600 dark:group-hover:text-fairway-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Live CRM Activity Timeline Feed */}
        <Card>
          <CardHeader className="pb-3 pt-5 px-5 space-y-0">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">Recent Sales Actions</CardTitle>
              <p className="text-xs text-foreground-muted mt-0.5">Calls, proposals & site visits logged</p>
            </div>
          </CardHeader>

          <div className="p-4 space-y-3.5">
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-surface-muted border border-border text-fairway-600 dark:text-fairway-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground truncate">{act.title}</span>
                    <span className="text-[10px] text-foreground-muted font-mono shrink-0">{formatRelativeDate(act.activityDate)}</span>
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-2 mt-0.5 leading-relaxed">{act.description}</p>
                  <span className="text-[11px] text-fairway-600 dark:text-fairway-400 font-semibold block mt-1">by {act.userName}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};


export const DashboardPage = DashboardView;
export default DashboardPage;
