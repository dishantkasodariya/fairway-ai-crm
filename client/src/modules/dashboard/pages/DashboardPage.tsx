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
  Layers,
  ArrowRight,
  Calendar,
  Shield,
  Activity,
  Briefcase,
  Flame,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { CompanyService } from '@/modules/core/services/companyService';
import { PropertyService } from '@/modules/core/services/propertyService';
import { TaskService } from '@/modules/core/services/taskService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { formatINR, formatSqFt, formatRelativeDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/modules/core/components/ui/DropdownMenu';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Task, Inquiry, Company, Property, Activity as ActivityType } from '@/modules/core/types';

export interface DashboardViewProps {
  onNavigate: (view: any, entityId?: string) => void;
  onOpenNewInquiry: () => void;
}

export const DashboardPage: React.FC<DashboardViewProps> = ({ onNavigate, onOpenNewInquiry }) => {
  const { currentUser, isSales, canEdit } = useAuth();
  const { success } = useToast();
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [tasksList, setTasksList] = useState<Task[]>(() => StorageService.getTasks());
  const [companies, setCompanies] = useState<Company[]>(() => StorageService.getCompanies());
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>(() => StorageService.getInquiries());
  const [properties, setProperties] = useState<Property[]>(() => StorageService.getProperties());
  const [activities, setActivities] = useState<ActivityType[]>(() => StorageService.getActivities());
  const users = StorageService.getUsers();

  // Async load live PostgreSQL data from backend APIs
  useEffect(() => {
    let isMounted = true;
    const loadBackendData = async () => {
      try {
        const [inqRes, compRes, propRes, taskRes] = await Promise.allSettled([
          InquiryService.getInquiries({ pageSize: 500 }),
          CompanyService.getCompanies({ pageSize: 500 }),
          PropertyService.getProperties(),
          TaskService.getTasks(),
        ]);

        if (isMounted) {
          if (inqRes.status === 'fulfilled' && inqRes.value.success && inqRes.value.data) {
            setAllInquiries(inqRes.value.data);
            try { StorageService.saveInquiries(inqRes.value.data); } catch {}
          }
          if (compRes.status === 'fulfilled' && compRes.value.success && compRes.value.data) {
            setCompanies(compRes.value.data);
          }
          if (propRes.status === 'fulfilled' && propRes.value.success && propRes.value.data) {
            setProperties(propRes.value.data);
          }
          if (taskRes.status === 'fulfilled' && taskRes.value.success && taskRes.value.data) {
            setTasksList(taskRes.value.data);
          }
        }
      } catch (e) {
        console.warn('Backend live data fetch fallback to local cache:', e);
      }
    };

    loadBackendData();
    return () => { isMounted = false; };
  }, []);

  // Reactive listener for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTasksList(StorageService.getTasks());
      setAllInquiries(StorageService.getInquiries());
      setCompanies(StorageService.getCompanies());
      setProperties(StorageService.getProperties());
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

  // Pipeline Funnel Distribution - unified cohesive palette
  const funnelStages = [
    { key: 'new', label: 'New Leads', count: inquiries.filter((i) => i.stage === 'new').length, color: 'bg-zinc-400 dark:bg-zinc-600' },
    { key: 'requirement_confirmed', label: 'Confirmed', count: inquiries.filter((i) => i.stage === 'requirement_confirmed').length, color: 'bg-zinc-500 dark:bg-zinc-500' },
    { key: 'property_matched', label: 'Matched', count: inquiries.filter((i) => i.stage === 'property_matched').length, color: 'bg-primary/50' },
    { key: 'site_visit', label: 'Site Visits', count: inquiries.filter((i) => i.stage === 'site_visit').length, color: 'bg-primary/70' },
    { key: 'proposal', label: 'Proposals', count: inquiries.filter((i) => i.stage === 'proposal').length, color: 'bg-primary/90' },
    { key: 'negotiation', label: 'Negotiation', count: inquiries.filter((i) => i.stage === 'negotiation').length, color: 'bg-primary' },
    { key: 'won', label: 'Closed Won', count: wonCount, color: 'bg-emerald-500' },
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
    new: 'bg-surface-muted text-foreground border-border',
    requirement_confirmed: 'bg-surface-muted text-foreground border-border',
    property_matched: 'bg-surface-muted text-foreground border-border',
    site_visit: 'bg-surface-muted text-foreground border-border',
    proposal: 'bg-surface-muted text-foreground border-border',
    negotiation: 'bg-surface-muted text-foreground border-border',
    won: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto text-left">
      {/* 1. Executive Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Fairway Industrial CRM
            </span>
            <span className="text-xs text-foreground-muted hidden xs:inline">·</span>
            <span className="text-xs font-medium text-foreground-muted hidden xs:inline">Western India Leasing Desk</span>
            {isSales && (
              <span className="text-[10px] font-bold bg-surface-muted text-foreground border border-border px-2 py-0.5 rounded-full">
                My Desk View
              </span>
            )}
          </div>
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-1 break-words">
            {getGreeting()}, {currentUser?.name || currentUser?.email?.split('@')[0] || 'Member'}
          </h1>
        </div>

        {/* Action Tools & Owner Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto min-w-0 max-w-full">
          <DropdownMenu
            align="right"
            className="w-64 max-w-[calc(100vw-24px)] max-h-80 overflow-y-auto"
            containerClassName="min-w-0 max-w-full"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 xs:gap-2 text-xs bg-surface border border-border hover:border-foreground/40 rounded-xl px-2.5 xs:px-3 py-2 shadow-xs transition-colors focus:outline-none cursor-pointer min-w-0 max-w-[140px] xs:max-w-[170px] sm:max-w-[200px]"
              >
                <User className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span className="text-foreground-muted font-medium shrink-0 hidden md:inline">Desk:</span>
                <span className="text-xs font-semibold text-foreground truncate">
                  {ownerFilter === 'all' ? 'All Team Members' : users.find((u) => u.id === ownerFilter)?.name || 'Select Owner'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-foreground-muted shrink-0 ml-auto" />
              </button>
            }
          >
            <DropdownMenuLabel>Filter Portfolio by Owner</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setOwnerFilter('all')}
              className={ownerFilter === 'all' ? 'bg-surface-muted font-semibold text-foreground' : ''}
              icon={ownerFilter === 'all' ? <Check className="w-3.5 h-3.5 text-foreground" /> : <Users className="w-3.5 h-3.5 text-foreground-muted" />}
            >
              All Team Members
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {users.map((u) => (
              <DropdownMenuItem
                key={u.id}
                onClick={() => setOwnerFilter(u.id)}
                className={ownerFilter === u.id ? 'bg-surface-muted font-semibold text-foreground' : ''}
                icon={ownerFilter === u.id ? <Check className="w-3.5 h-3.5 text-foreground" /> : <User className="w-3.5 h-3.5 text-foreground-muted" />}
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
              className="shadow-sm rounded-xl px-3 sm:px-4 py-2 font-bold text-xs shrink-0 whitespace-nowrap"
            >
              New Inquiry
            </Button>
          )}
        </div>
      </div>

      {/* 2. Executive 6 KPI Stat Cards Grid - Minimal Swiss Design */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* Card 1: Companies */}
        <div
          onClick={() => onNavigate('companies')}
          className="bg-surface border border-border hover:border-foreground/40 p-3 xs:p-4 rounded-xl transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Companies</span>
            <Building2 className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
          <div className="mt-2.5 xs:mt-3">
            <div className="text-xl xs:text-2xl font-bold text-foreground">{totalCompaniesCount}</div>
            <span className="text-[10px] xs:text-[11px] text-foreground-muted block mt-0.5 font-medium truncate">Corporate Accounts</span>
          </div>
        </div>

        {/* Card 2: New Leads */}
        <div
          onClick={() => onNavigate('inquiries')}
          className="bg-surface border border-border hover:border-foreground/40 p-3 xs:p-4 rounded-xl transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">New Leads</span>
            <FileText className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
          <div className="mt-2.5 xs:mt-3">
            <div className="text-xl xs:text-2xl font-bold text-foreground">{newInquiriesCount}</div>
            <span className="text-[10px] xs:text-[11px] text-foreground-muted block mt-0.5 font-medium truncate">Fresh Inquiries</span>
          </div>
        </div>

        {/* Card 3: Active Pipeline */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-surface border border-border hover:border-foreground/40 p-3 xs:p-4 rounded-xl transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Pipeline</span>
            <TrendingUp className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
          <div className="mt-2.5 xs:mt-3">
            <div className="text-xl xs:text-2xl font-bold text-foreground">{activeInquiriesCount}</div>
            <span className="text-[10px] xs:text-[11px] text-foreground-muted block mt-0.5 font-medium truncate">{formatINR(totalPipelineValue, true)} / mo</span>
          </div>
        </div>

        {/* Card 4: Negotiation */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-surface border border-border hover:border-foreground/40 p-3 xs:p-4 rounded-xl transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Negotiation</span>
            <Clock className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
          <div className="mt-2.5 xs:mt-3">
            <div className="text-xl xs:text-2xl font-bold text-foreground">{negotiationCount}</div>
            <span className="text-[10px] xs:text-[11px] text-foreground-muted block mt-0.5 font-medium truncate">Closing Soon</span>
          </div>
        </div>

        {/* Card 5: Closed Won */}
        <div
          onClick={() => onNavigate('inquiries')}
          className="bg-surface border border-border hover:border-foreground/40 p-3 xs:p-4 rounded-xl transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Closed Won</span>
            <Trophy className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
          <div className="mt-2.5 xs:mt-3">
            <div className="text-xl xs:text-2xl font-bold text-foreground">{wonCount}</div>
            <span className="text-[10px] xs:text-[11px] text-foreground-muted block mt-0.5 font-medium truncate">{formatINR(totalWonValue, true)} / mo</span>
          </div>
        </div>

        {/* Card 6: Ready Stock */}
        <div
          onClick={() => onNavigate('properties')}
          className="bg-surface border border-border hover:border-foreground/40 p-3 xs:p-4 rounded-xl transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Ready Stock</span>
            <Warehouse className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
          <div className="mt-2.5 xs:mt-3">
            <div className="text-xl xs:text-2xl font-bold text-foreground truncate">{formatSqFt(totalAvailableSqFt).replace(' sq.ft.', '')}</div>
            <span className="text-[10px] xs:text-[11px] text-foreground-muted block mt-0.5 font-medium truncate">sq.ft available</span>
          </div>
        </div>
      </div>

      {/* 3. Pipeline Velocity Visualizer & Corridor Demand Bar */}
      <div className="p-4 sm:p-5 bg-surface rounded-xl border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-foreground" />
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
              leftIcon={<ArrowUpRight className="w-3.5 h-3.5 text-foreground" />}
              className="rounded-lg font-semibold text-xs"
            >
              Open Pipeline Board
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onNavigate('reports')}
              leftIcon={<BarChart3 className="w-3.5 h-3.5 text-foreground" />}
              className="rounded-lg font-semibold text-xs"
            >
              Reports & Graphs
            </Button>
          </div>
        </div>

        {/* Multi-segment Horizontal Progress Strip */}
        <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden flex">
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
              className="flex items-center gap-1.5 text-xs bg-surface-muted hover:bg-surface-muted/80 border border-border px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
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
        <Card className="rounded-xl bg-surface border border-border">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-muted text-foreground border border-border flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Overdue Follow-ups</span>
                    {overdueTasks.length > 0 && (
                      <span className="text-[10px] font-bold bg-surface-muted text-foreground border border-border px-2 py-0.5 rounded-full">
                        {overdueTasks.length} Urgent
                      </span>
                    )}
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
              <div className="w-9 h-9 rounded-full bg-surface-muted text-foreground flex items-center justify-center border border-border">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-foreground text-sm">All follow-ups on track</span>
              <span className="text-xs text-foreground-muted">Zero overdue tasks across your current view.</span>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {overdueTasks.map((t) => (
                <div key={t.id} className="py-3 px-5 flex items-start justify-between gap-3 hover:bg-surface-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-bold text-foreground hover:underline cursor-pointer truncate"
                        onClick={() => t.companyId && onNavigate('company_detail', t.companyId)}
                      >
                        {t.companyName}
                      </span>
                      <span className="text-[9px] font-medium bg-surface-muted text-foreground border border-border px-1.5 py-0.5 rounded">
                        {formatRelativeDate(t.dueDate)}
                      </span>
                      {t.priority && (
                        <span className="text-[9px] font-medium bg-surface-muted text-foreground border border-border px-1.5 py-0.5 rounded">
                          {t.priority}
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
                    variant="outline"
                    onClick={() => handleCompleteTask(t.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-foreground" />}
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
        <Card className="rounded-xl bg-surface border border-border">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-muted text-foreground border border-border flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Today&apos;s Follow-ups</span>
                    <span className="text-[10px] font-bold bg-surface-muted text-foreground border border-border px-2 py-0.5 rounded-full">
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
              <div className="w-9 h-9 rounded-full bg-surface-muted text-foreground-muted flex items-center justify-center border border-border">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-foreground text-sm">Schedule clear for today</span>
              <span className="text-xs text-foreground-muted">No pending calls or site visits scheduled today.</span>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {todaysTasks.map((t) => (
                <div key={t.id} className="py-3 px-5 flex items-start justify-between gap-3 hover:bg-surface-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-bold text-foreground hover:underline cursor-pointer truncate"
                        onClick={() => t.companyId && onNavigate('company_detail', t.companyId)}
                      >
                        {t.companyName}
                      </span>
                      {t.dueTime && (
                        <span className="text-[9px] font-semibold bg-surface-muted text-foreground px-1.5 py-0.5 rounded border border-border">
                          {t.dueTime}
                        </span>
                      )}
                      <span className="text-[9px] font-medium bg-surface-muted text-foreground border border-border px-1.5 py-0.5 rounded">
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
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-foreground" />}
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
        <Card className="lg:col-span-2 rounded-xl bg-surface border border-border">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Flame className="w-4 h-4 text-foreground" />
                  <span>High-Value Active Inquiries</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted mt-0.5">Top active industrial leasing requirements in Western India</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => onNavigate('inquiries')} className="rounded-lg text-xs">
                View All ({inquiries.length})
              </Button>
            </div>
          </CardHeader>

          <div className="divide-y divide-border">
            {inquiries.slice(0, 6).map((inq) => {
              const badgeClass = stageBadgeStyles[inq.stage] || 'bg-surface-muted text-foreground border-border';

              return (
                <div
                  key={inq.id}
                  onClick={() => {
                    StorageService.upsertInquiry(inq);
                    onNavigate('inquiry_detail', inq.id);
                  }}
                  className="py-3 px-5 flex items-center justify-between hover:bg-surface-muted/50 cursor-pointer transition-colors group select-none"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded border border-border shrink-0">
                        {inq.inquiryNumber}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate group-hover:underline transition-colors">
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
                        <MapPin className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
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
                    <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Live Activity Timeline Stream (1 Col) */}
        <Card className="rounded-xl bg-surface border border-border">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-foreground" />
                <span>Live Action Timeline</span>
              </CardTitle>
              <p className="text-xs text-foreground-muted mt-0.5">Calls, meetings & status changes</p>
            </div>
          </CardHeader>

          <div className="p-4 space-y-3">
            {activities.slice(0, 6).map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-surface-muted text-foreground border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <PhoneCall className="w-3.5 h-3.5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground truncate">{act.title}</span>
                    <span className="text-[10px] text-foreground-muted font-mono shrink-0">{formatRelativeDate(act.activityDate)}</span>
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-2 mt-0.5 leading-relaxed">{act.description}</p>
                  <span className="text-[11px] text-foreground-muted font-medium block mt-1">by {act.userName}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 6. Western India Industrial Corridor Demand Hub */}
      <div className="p-5 bg-surface rounded-xl border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-foreground" />
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
            leftIcon={<MapPin className="w-3.5 h-3.5 text-foreground" />}
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
              className="p-3 bg-surface-muted/50 hover:bg-surface-muted border border-border rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{c.short}</span>
                <span className="text-[10px] font-mono font-semibold text-foreground bg-surface px-1.5 py-0.5 rounded border border-border">
                  {formatSqFt(c.activeDemand).replace(' sq.ft.', '')} sqft
                </span>
              </div>
              <span className="text-[10px] text-foreground-muted block mt-1 truncate">{c.name}</span>
              <span className="text-[9px] font-medium text-foreground-muted block mt-0.5 truncate">{c.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardView = DashboardPage;
export default DashboardPage;
