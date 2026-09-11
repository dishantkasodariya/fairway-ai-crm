import React, { useState, useEffect } from 'react';
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
  MapPin,
  ChevronRight,
  Users,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  ArrowRight,
  Calendar,
  Shield,
  Activity,
  Briefcase,
  Flame,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { formatINR, formatSqFt, formatRelativeDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/modules/core/components/ui/DropdownMenu';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Task, Inquiry } from '@/modules/core/types';

export interface DashboardViewProps {
  onNavigate: (view: any, entityId?: string) => void;
  onOpenNewInquiry: () => void;
}

export const DashboardPage: React.FC<DashboardViewProps> = ({ onNavigate, onOpenNewInquiry }) => {
  const { currentUser, isSales, canEdit } = useAuth();
  const { success } = useToast();
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [tasksList, setTasksList] = useState<Task[]>(() => StorageService.getTasks());

  const companies = StorageService.getCompanies();
  const allInquiries = StorageService.getInquiries();
  const properties = StorageService.getProperties();
  const activities = StorageService.getActivities();
  const users = StorageService.getUsers();

  // Reactive listener for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTasksList(StorageService.getTasks());
    };
    window.addEventListener('fw_storage_change', handleStorageChange);
    return () => window.removeEventListener('fw_storage_change', handleStorageChange);
  }, []);

  const inquiries = ownerFilter === 'all' ? allInquiries : allInquiries.filter((i) => i.salespersonId === ownerFilter);
  const tasks = ownerFilter === 'all' ? tasksList : tasksList.filter((t) => t.assignedUserId === ownerFilter);

  // Key Metrics
  const totalCompaniesCount = companies.length;
  const newInquiriesCount = inquiries.filter((i) => i.stage === 'new').length;
  const activeInquiries = inquiries.filter((i) => i.status === 'Active');
  const activeInquiriesCount = activeInquiries.length;
  const negotiationCount = inquiries.filter((i) => i.stage === 'negotiation' || i.stage === 'proposal').length;
  const wonInquiries = inquiries.filter((i) => i.stage === 'won' || i.status === 'Won');
  const wonCount = wonInquiries.length;
  const totalWonValue = wonInquiries.reduce((acc, curr) => acc + (curr.wonFinalValueMonthlyINR || curr.budgetMonthlyINR || 0), 0);
  const totalPipelineValue = activeInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);
  const totalAvailableSqFt = properties.reduce((acc, p) => acc + p.availableAreaSqFt, 0);

  // Tasks Breakdown
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.status === 'Pending' && t.dueDate === todayStr);
  const overdueTasks = tasks.filter((t) => t.status === 'Pending' && t.dueDate < todayStr);

  const handleCompleteTask = (taskId: string) => {
    StorageService.toggleTaskCompletion(taskId, 'Completed from Dashboard');
    setTasksList(StorageService.getTasks());
    success('Task Completed', 'Follow-up marked done and logged to timeline.');
  };

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Pipeline Funnel Distribution
  const funnelStages = [
    { key: 'new', label: 'New Leads', count: inquiries.filter((i) => i.stage === 'new').length, color: 'bg-sky-500' },
    { key: 'requirement_confirmed', label: 'Confirmed', count: inquiries.filter((i) => i.stage === 'requirement_confirmed').length, color: 'bg-blue-500' },
    { key: 'property_matched', label: 'Matched', count: inquiries.filter((i) => i.stage === 'property_matched').length, color: 'bg-indigo-500' },
    { key: 'site_visit', label: 'Site Visits', count: inquiries.filter((i) => i.stage === 'site_visit').length, color: 'bg-purple-500' },
    { key: 'proposal', label: 'Proposals', count: inquiries.filter((i) => i.stage === 'proposal').length, color: 'bg-amber-500' },
    { key: 'negotiation', label: 'Negotiation', count: inquiries.filter((i) => i.stage === 'negotiation').length, color: 'bg-emerald-500' },
    { key: 'won', label: 'Closed Won', count: wonCount, color: 'bg-emerald-600' },
  ];
  const totalStageCount = Math.max(funnelStages.reduce((acc, s) => acc + s.count, 0), 1);

  // Key Western India Industrial Corridors
  const corridors = [
    { name: 'Dahej PCPIR Corridor', short: 'Dahej', tag: 'Chemical & Petrochemicals', activeDemand: 185000 },
    { name: 'Sanand - Ahmedabad Auto Hub', short: 'Sanand', tag: 'EV & Automotive', activeDemand: 145000 },
    { name: 'Vapi - Surat Industrial Belt', short: 'Vapi-Surat', tag: 'Textile & Engineering', activeDemand: 110000 },
    { name: 'Bhiwandi Logistics Hub', short: 'Bhiwandi', tag: '3PL & E-Commerce', activeDemand: 210000 },
    { name: 'Chakan - Pune Auto Belt', short: 'Chakan', tag: 'Manufacturing', activeDemand: 95000 },
  ];

  const stageBadgeStyles: Record<string, string> = {
    new: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    requirement_confirmed: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    property_matched: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    site_visit: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    proposal: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    negotiation: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    won: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-600/30',
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto text-left">
      {/* 1. Executive Personalized Header & Welcome Hero */}
      <div className="relative z-30 rounded-2xl bg-gradient-to-r from-surface via-surface to-surface-muted/80 border border-border p-5 sm:p-6 shadow-xs">
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-fairway-500/5 dark:bg-fairway-400/5 rounded-full blur-3xl -mr-20 -mt-20" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-fairway-700 dark:text-fairway-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Fairway Industrial CRM
              </span>
              <span className="text-[11px] text-foreground-muted">·</span>
              <span className="text-[11px] font-semibold text-foreground-muted">Western India Leasing Desk</span>
              {isSales && (
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  My Desk View
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2 flex-wrap">
              <span>{getGreeting()},</span>
              <span className="text-fairway-700 dark:text-fairway-400">
                {currentUser?.name || currentUser?.email?.split('@')[0] || 'Member'}!
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed max-w-3xl">
              {overdueTasks.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Attention: You have {overdueTasks.length} overdue client follow-up{overdueTasks.length > 1 ? 's' : ''} and {todaysTasks.length} task{todaysTasks.length > 1 ? 's' : ''} scheduled today.
                </span>
              ) : (
                <span>
                  All client follow-ups are up to date. You have <strong className="text-foreground">{activeInquiriesCount} active leasing inquiries</strong> with a total pipeline velocity of <strong className="text-foreground">{formatINR(totalPipelineValue, true)}/month</strong>.
                </span>
              )}
            </p>
          </div>

          {/* Action Tools & Owner Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Owner Filter Selector */}
            <DropdownMenu
              align="right"
              className="w-64 max-h-80 overflow-y-auto"
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs bg-surface border border-border hover:border-fairway-400 rounded-xl px-3.5 py-2 shadow-xs transition-colors focus:outline-none cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                  <span className="text-foreground-muted font-medium shrink-0">Desk:</span>
                  <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                    {ownerFilter === 'all' ? 'All Team Members' : users.find((u) => u.id === ownerFilter)?.name || 'Select Owner'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-foreground-muted shrink-0 ml-auto" />
                </button>
              }
            >
              <DropdownMenuLabel>Filter Portfolio by Owner</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setOwnerFilter('all')}
                className={ownerFilter === 'all' ? 'bg-surface-muted font-semibold text-fairway-700' : ''}
                icon={ownerFilter === 'all' ? <Check className="w-3.5 h-3.5 text-fairway-600" /> : <Users className="w-3.5 h-3.5 text-foreground-muted" />}
              >
                All Team Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {users.map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => setOwnerFilter(u.id)}
                  className={ownerFilter === u.id ? 'bg-surface-muted font-semibold text-fairway-700' : ''}
                  icon={ownerFilter === u.id ? <Check className="w-3.5 h-3.5 text-fairway-600" /> : <User className="w-3.5 h-3.5 text-foreground-muted" />}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="truncate">{u.name}</span>
                    <span className="text-[10px] text-foreground-muted font-normal capitalize shrink-0">({u.role?.replace('_', ' ')})</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenu>

            {canEdit && (
              <Button
                size="sm"
                variant="primary"
                onClick={onOpenNewInquiry}
                leftIcon={<Plus className="w-4 h-4" />}
                className="shadow-sm rounded-xl px-4 py-2 font-bold"
              >
                New Inquiry
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Executive 6 KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Accounts */}
        <div
          onClick={() => onNavigate('companies')}
          className="group relative bg-surface border border-border hover:border-fairway-500/50 hover:shadow-md p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
              Companies
            </span>
            <div className="w-8 h-8 rounded-xl bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-foreground group-hover:text-fairway-700 dark:group-hover:text-fairway-400 transition-colors">
              {totalCompaniesCount}
            </div>
            <span className="text-[11px] text-foreground-muted block mt-0.5 font-medium">Corporate Accounts</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-foreground-muted font-medium">
            <span>Western India</span>
            <ArrowUpRight className="w-3 h-3 text-fairway-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 2: New Leads */}
        <div
          onClick={() => onNavigate('inquiries')}
          className="group relative bg-surface border border-border hover:border-sky-500/50 hover:shadow-md p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
              New Leads
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-sky-700 dark:text-sky-300">
              {newInquiriesCount}
            </div>
            <span className="text-[11px] text-foreground-muted block mt-0.5 font-medium">Fresh Inquiries</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-foreground-muted font-medium">
            <span className="text-sky-600 dark:text-sky-400 font-semibold">Needs Contact</span>
            <ArrowUpRight className="w-3 h-3 text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 3: Active Pipeline */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="group relative bg-surface border border-border hover:border-indigo-500/50 hover:shadow-md p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
              Active Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
              {activeInquiriesCount}
            </div>
            <span className="text-[11px] text-foreground-muted block mt-0.5 font-medium">{formatINR(totalPipelineValue, true)} / mo</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-foreground-muted font-medium">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">In Qualification</span>
            <ArrowUpRight className="w-3 h-3 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 4: In Negotiation */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="group relative bg-surface border border-border hover:border-amber-500/50 hover:shadow-md p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
              Negotiation
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {negotiationCount}
            </div>
            <span className="text-[11px] text-foreground-muted block mt-0.5 font-medium">Proposal & Terms</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-foreground-muted font-medium">
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Closing Soon</span>
            <ArrowUpRight className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 5: Won Deals */}
        <div
          onClick={() => onNavigate('inquiries')}
          className="group relative bg-surface border border-border hover:border-emerald-500/50 hover:shadow-md p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
              Closed Won
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {wonCount}
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5">
              {formatINR(totalWonValue, true)} / mo
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-foreground-muted font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Leased Deals</span>
            <ArrowUpRight className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 6: Ready Stock */}
        <div
          onClick={() => onNavigate('properties')}
          className="group relative bg-surface border border-border hover:border-purple-500/50 hover:shadow-md p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block truncate">
              Ready Stock
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-foreground">
              {formatSqFt(totalAvailableSqFt).replace(' sq.ft.', '')}
            </div>
            <span className="text-[11px] text-foreground-muted block mt-0.5 font-medium">sq.ft available</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-foreground-muted font-medium">
            <span className="text-purple-600 dark:text-purple-400 font-semibold">Ready to Lease</span>
            <ArrowUpRight className="w-3 h-3 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* 3. Pipeline Velocity Visualizer & Corridor Demand Bar */}
      <div className="p-4 sm:p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-fairway-600" />
              <span>Pipeline Stage Velocity</span>
            </h3>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Distribution of all {inquiries.length} live opportunities across negotiation stages
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="xs"
              variant="outline"
              onClick={() => onNavigate('pipeline')}
              leftIcon={<ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />}
              className="rounded-lg font-semibold text-xs"
            >
              Open Pipeline Board
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onNavigate('reports')}
              leftIcon={<BarChart3 className="w-3.5 h-3.5 text-fairway-600" />}
              className="rounded-lg font-semibold text-xs"
            >
              Reports & Graphs
            </Button>
          </div>
        </div>

        {/* Multi-segment Horizontal Progress Strip */}
        <div className="h-3 w-full rounded-full bg-surface-muted overflow-hidden flex shadow-inner">
          {funnelStages.map((stage) => {
            const widthPct = (stage.count / totalStageCount) * 100;
            if (widthPct === 0) return null;
            return (
              <div
                key={stage.key}
                style={{ width: `${widthPct}%` }}
                title={`${stage.label}: ${stage.count} leads`}
                className={`${stage.color} h-full transition-all duration-300 hover:opacity-90`}
              />
            );
          })}
        </div>

        {/* Stage Legend Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {funnelStages.map((stage) => (
            <div
              key={stage.key}
              onClick={() => onNavigate('pipeline')}
              className="flex items-center gap-1.5 text-xs bg-surface-muted hover:bg-surface-muted/80 border border-border/80 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${stage.color}`} />
              <span className="text-[11px] text-foreground-muted">{stage.label}:</span>
              <span className="text-[11px] font-bold text-foreground">{stage.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Operational Urgency Desk: Overdue Follow-ups & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Follow-ups Card */}
        <Card className={`rounded-2xl ${overdueTasks.length > 0 ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/15' : 'bg-surface'}`}>
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border/60">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Overdue Follow-ups</span>
                    <span className="text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-full">
                      {overdueTasks.length} Urgent
                    </span>
                  </CardTitle>
                  <p className="text-[11px] text-foreground-muted">Client communications needing immediate resolution</p>
                </div>
              </div>
              <Button size="xs" variant="outline" onClick={() => onNavigate('tasks')} className="rounded-lg text-xs">
                All Tasks
              </Button>
            </div>
          </CardHeader>

          {overdueTasks.length === 0 ? (
            <div className="py-10 text-center text-xs text-foreground-muted flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-foreground text-sm">All follow-ups on track!</span>
              <span className="text-xs text-foreground-muted">Zero overdue tasks across your current view.</span>
            </div>
          ) : (
            <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
              {overdueTasks.map((t) => (
                <div key={t.id} className="py-3 px-5 flex items-start justify-between gap-3 hover:bg-surface-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-bold text-foreground hover:text-fairway-600 dark:hover:text-fairway-400 cursor-pointer truncate"
                        onClick={() => t.companyId && onNavigate('company_detail', t.companyId)}
                      >
                        {t.companyName}
                      </span>
                      <span className="text-[9px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded">
                        {formatRelativeDate(t.dueDate)}
                      </span>
                      {t.priority && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}`}>
                          {t.priority} Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground mt-1 leading-snug">{t.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-foreground-muted">
                      <span>Owner: <strong className="text-foreground font-medium">{t.assignedUserName}</strong></span>
                      <span>·</span>
                      <span>Type: {t.taskType}</span>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => handleCompleteTask(t.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    className="shrink-0 rounded-lg text-xs font-semibold"
                  >
                    Done
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Today's Follow-ups Card */}
        <Card className="rounded-2xl bg-surface">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border/60">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Today&apos;s Follow-ups</span>
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      {todaysTasks.length} Planned
                    </span>
                  </CardTitle>
                  <p className="text-[11px] text-foreground-muted">Scheduled client discussions, site visits & calls</p>
                </div>
              </div>
              <Button size="xs" variant="outline" onClick={() => onNavigate('tasks')} className="rounded-lg text-xs">
                Manage
              </Button>
            </div>
          </CardHeader>

          {todaysTasks.length === 0 ? (
            <div className="py-10 text-center text-xs text-foreground-muted flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-surface-muted text-foreground-muted flex items-center justify-center border border-border">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="font-bold text-foreground text-sm">Schedule cleared for today!</span>
              <span className="text-xs text-foreground-muted">No pending calls or site visits scheduled today.</span>
            </div>
          ) : (
            <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
              {todaysTasks.map((t) => (
                <div key={t.id} className="py-3 px-5 flex items-start justify-between gap-3 hover:bg-surface-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-bold text-foreground hover:text-fairway-600 dark:hover:text-fairway-400 cursor-pointer truncate"
                        onClick={() => t.companyId && onNavigate('company_detail', t.companyId)}
                      >
                        {t.companyName}
                      </span>
                      {t.dueTime && (
                        <span className="text-[9px] font-semibold bg-surface-muted text-foreground px-1.5 py-0.5 rounded border border-border">
                          {t.dueTime}
                        </span>
                      )}
                      <span className="text-[9px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded">
                        {t.taskType}
                      </span>
                    </div>
                    <p className="text-xs text-foreground mt-1 leading-snug">{t.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-foreground-muted">
                      <span>Owner: <strong className="text-foreground font-medium">{t.assignedUserName}</strong></span>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleCompleteTask(t.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    className="shrink-0 rounded-lg text-xs font-semibold"
                  >
                    Complete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 5. High-Value Inquiries Table & Live Timeline Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active High-Value Inquiries Dense Card (2 Cols) */}
        <Card className="lg:col-span-2 rounded-2xl bg-surface">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border/60">
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>High-Value Active Inquiries</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted mt-0.5">Top active industrial leasing requirements in Western India</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => onNavigate('inquiries')} className="rounded-lg text-xs">
                View All ({inquiries.length})
              </Button>
            </div>
          </CardHeader>

          <div className="divide-y divide-border/60">
            {inquiries.slice(0, 6).map((inq) => {
              const badgeClass = stageBadgeStyles[inq.stage] || 'bg-surface-muted text-foreground-muted border-border';

              return (
                <div
                  key={inq.id}
                  onClick={() => onNavigate('inquiry_detail', inq.id)}
                  className="py-3 px-5 flex items-center justify-between hover:bg-surface-muted/60 cursor-pointer transition-colors group select-none"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded border border-border shrink-0">
                        {inq.inquiryNumber}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate group-hover:text-fairway-700 dark:group-hover:text-fairway-400 transition-colors">
                        {inq.companyName}
                      </span>
                      <span className="text-[11px] font-medium text-foreground-muted truncate max-w-[140px]">· {inq.industry}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground-muted mt-1 truncate">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Warehouse className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                        {formatSqFt(inq.requiredAreaSqFt)}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-foreground-muted shrink-0" />
                        {inq.location}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-foreground font-medium">
                        {formatINR(inq.budgetMonthlyINR, true)}/mo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize block text-center ${badgeClass}`}>
                        {inq.stage.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-foreground-muted block mt-1">{inq.salespersonName}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-fairway-700 dark:group-hover:text-fairway-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Live Activity Timeline Stream (1 Col) */}
        <Card className="rounded-2xl bg-surface">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-fairway-600" />
                <span>Live Action Timeline</span>
              </CardTitle>
              <p className="text-xs text-foreground-muted mt-0.5">Calls, meetings & status changes</p>
            </div>
          </CardHeader>

          <div className="p-4 space-y-3.5">
            {activities.slice(0, 6).map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground truncate">{act.title}</span>
                    <span className="text-[10px] text-foreground-muted font-mono shrink-0">{formatRelativeDate(act.activityDate)}</span>
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-2 mt-0.5 leading-relaxed">{act.description}</p>
                  <span className="text-[11px] text-fairway-700 dark:text-fairway-400 font-semibold block mt-1">by {act.userName}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 6. Western India Industrial Corridor Demand Hub */}
      <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-fairway-600" />
              <span>Gujarat & Western India Logistics Hubs</span>
            </h4>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Active warehouse demand distribution across primary trade and manufacturing corridors
            </p>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onNavigate('map')}
            leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-600" />}
            className="rounded-lg text-xs"
          >
            Open Interactive Corridor Map
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {corridors.map((c) => (
            <div
              key={c.short}
              onClick={() => onNavigate('map')}
              className="p-3 bg-surface-muted/60 hover:bg-surface-muted border border-border rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{c.short}</span>
                <span className="text-[10px] font-mono font-semibold text-fairway-700 dark:text-fairway-400 bg-fairway-500/10 px-1.5 py-0.5 rounded">
                  {formatSqFt(c.activeDemand).replace(' sq.ft.', '')} sqft
                </span>
              </div>
              <span className="text-[10px] text-foreground-muted block mt-1 truncate">{c.name}</span>
              <span className="text-[9px] font-medium text-foreground-muted/80 block mt-0.5 truncate">{c.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardView = DashboardPage;
export default DashboardPage;
