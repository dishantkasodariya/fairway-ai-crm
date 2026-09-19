import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Filter,
  Plus,
  Download,
  List,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  User,
  Building2,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/modules/core/components/ui/Select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/modules/core/components/ui/tooltip';
import { Button } from '@/modules/core/components/ui/Button';
import { CallService } from '@/modules/core/services/callService';
import { Call, CallStats } from '@/modules/core/types';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { CallsList } from '../components/CallsList';
import { CallsCard } from '../components/CallsCard';
import { EditCallModal } from '../components/EditCallModal';
import { cn } from '@/modules/core/lib/utils';

export interface CallsPageProps {
  onOpenNewCall: (type?: 'schedule' | 'log') => void;
  onSelectCall?: (id: string) => void;
}

export const CallsPage: React.FC<CallsPageProps> = ({
  onOpenNewCall,
  onSelectCall,
}) => {
  const { currentUser, users } = useAuth();
  const { success, error } = useToast();

  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<CallStats>({
    total: 0,
    scheduled: 0,
    completed: 0,
    inbound: 0,
    outbound: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View Mode: 'table' | 'grid' | 'line' (matching Inquiries module reference)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'line'>('table');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'completed' | 'my_calls'>('all');
  const [callTypeFilter, setCallTypeFilter] = useState<string>('all');
  const [callStatusFilter, setCallStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Selected records for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit Modal State
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load Calls and Stats
  const loadCalls = useCallback(async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      if (showSpin) {
        await new Promise((r) => setTimeout(r, 400));
      }

      const [callsRes, statsRes] = await Promise.all([
        CallService.getCalls({
          search: searchQuery || undefined,
          callType: callTypeFilter !== 'all' ? callTypeFilter : undefined,
          callStatus:
            activeTab === 'scheduled'
              ? 'Scheduled'
              : activeTab === 'completed'
              ? 'Completed'
              : callStatusFilter !== 'all'
              ? callStatusFilter
              : undefined,
          ownerId: activeTab === 'my_calls' ? currentUser?.id : ownerFilter !== 'all' ? ownerFilter : undefined,
        }),
        CallService.getCallStats(),
      ]);

      if (callsRes.success && callsRes.data) {
        setCalls(callsRes.data);
      } else {
        setCalls([]);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      setCalls([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, callTypeFilter, callStatusFilter, ownerFilter, activeTab, currentUser]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === calls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(calls.map((c) => c.id));
    }
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setCallTypeFilter('all');
    setCallStatusFilter('all');
    setOwnerFilter('all');
    setActiveTab('all');
  };

  const handleEditCall = (call: Call) => {
    setEditingCall(call);
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = async (call: Call) => {
    const nextStatus = call.callStatus === 'Completed' ? 'Scheduled' : 'Completed';
    try {
      const res = await CallService.updateCall(call.id, { callStatus: nextStatus as any });
      if (res.success) {
        success('Status Updated', `Call status changed to "${nextStatus}".`);
        loadCalls();
      } else {
        error('Update Failed', res.error || 'Could not change status');
      }
    } catch (err: any) {
      error('Update Failed', err.message);
    }
  };

  const handleDeleteCall = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this call record?')) return;
    try {
      const res = await CallService.deleteCall(id);
      if (res.success) {
        success('Call Deleted', 'Call record has been permanently removed.');
        loadCalls();
      } else {
        error('Delete Failed', res.error || 'Could not delete call');
      }
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (calls.length === 0) return;
    const headers = [
      'Subject',
      'Call Type',
      'Call Start Time',
      'Duration',
      'Status',
      'Call For',
      'Related To',
      'Call Owner',
      'Purpose',
      'Agenda',
      'Outcome',
    ];

    const rows = calls.map((c) => [
      `"${(c.subject || '').replace(/"/g, '""')}"`,
      `"${c.callType || ''}"`,
      `"${c.callStartDate || ''} ${c.callStartTime || ''}"`,
      `"${c.callDuration || ''}"`,
      `"${c.callStatus || ''}"`,
      `"${(c.callForName || '').replace(/"/g, '""')}"`,
      `"${(c.relatedToName || '').replace(/"/g, '""')}"`,
      `"${(c.callOwnerName || '').replace(/"/g, '""')}"`,
      `"${(c.callPurpose || '').replace(/"/g, '""')}"`,
      `"${(c.agenda || '').replace(/"/g, '""')}"`,
      `"${(c.callResult || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fairway_CRM_Calls_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeFiltersCount =
    (callTypeFilter !== 'all' ? 1 : 0) +
    (callStatusFilter !== 'all' ? 1 : 0) +
    (ownerFilter !== 'all' ? 1 : 0) +
    (activeTab !== 'all' ? 1 : 0);

  return (
    <div className="space-y-4 w-full text-left">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: TITLE, STATS & CREATE CALL DROPDOWN (SCREENSHOT 1 & 2) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-fairway-600 shrink-0" />
            <span>Calls</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Log, schedule, and review client phone interactions, consultation agendas, and call outcomes
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="text-xs rounded-xl h-9 px-3 whitespace-nowrap"
          >
            Export CSV
          </Button>

          {/* Split Dropdown Button matching Screenshot 1 & 2 */}
          <div className="relative inline-flex rounded-xl shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => onOpenNewCall('schedule')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-l-xl bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Create Call</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-2 py-2 rounded-r-xl bg-fairway-600 hover:bg-fairway-700 text-white border-l border-white/20 transition-colors cursor-pointer"
                  aria-label="Create Call Options"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-surface border-border shadow-xl rounded-xl z-50">
                <DropdownMenuItem
                  onClick={() => onOpenNewCall('schedule')}
                  className="gap-2 cursor-pointer text-xs font-medium"
                >
                  <Calendar className="w-3.5 h-3.5 text-fairway-600" />
                  <span>Schedule a call</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onOpenNewCall('log')}
                  className="gap-2 cursor-pointer text-xs font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Log a call</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS (Clean, Responsive & Wave Graph Removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Total Calls */}
        <div className="bg-surface dark:bg-[#121214] border border-border dark:border-white/[0.08] p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-xs transition-all hover:border-fairway-500/40 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
              Total Recorded Calls
            </span>
            <div className="size-9 rounded-xl bg-fairway-500/10 text-fairway-600 dark:text-fairway-400 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight block">
              {stats.total}
            </span>
            <span className="text-xs text-foreground-muted mt-1 block font-medium">
              {stats.inbound} Inbound · {stats.outbound} Outbound
            </span>
          </div>
        </div>

        {/* Card 2: Scheduled Calls */}
        <div className="bg-surface dark:bg-[#121214] border border-border dark:border-white/[0.08] p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-xs transition-all hover:border-blue-500/40 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
              Upcoming Scheduled Calls
            </span>
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight block">
              {stats.scheduled}
            </span>
            <span className="text-xs text-foreground-muted mt-1 block font-medium">
              Awaiting follow-up
            </span>
          </div>
        </div>

        {/* Card 3: Completed / Logged */}
        <div className="bg-surface dark:bg-[#121214] border border-border dark:border-white/[0.08] p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-xs transition-all hover:border-emerald-500/40 flex flex-col justify-between group sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
              Completed Conversations
            </span>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight block">
              {stats.completed}
            </span>
            <span className="text-xs text-foreground-muted mt-1 block font-medium">
              Documented outcomes
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABS BAR: ALL CALLS, SCHEDULED, COMPLETED, MY CALLS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1 border-b border-border text-xs font-semibold overflow-x-auto select-none pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-3.5 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'all'
              ? 'border-fairway-600 text-fairway-600 dark:text-fairway-400 font-bold'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          )}
        >
          All Calls ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scheduled')}
          className={cn(
            'px-3.5 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'scheduled'
              ? 'border-fairway-600 text-fairway-600 dark:text-fairway-400 font-bold'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          )}
        >
          Scheduled ({stats.scheduled})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={cn(
            'px-3.5 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'completed'
              ? 'border-fairway-600 text-fairway-600 dark:text-fairway-400 font-bold'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          )}
        >
          Completed ({stats.completed})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('my_calls')}
          className={cn(
            'px-3.5 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'my_calls'
              ? 'border-fairway-600 text-fairway-600 dark:text-fairway-400 font-bold'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          )}
        >
          My Calls
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. SEARCH & CONTROL TOOLBAR (VIEW MODE SWITCHER: LIST / CARD / LINE) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 w-full">
        {/* Left: Search Bar */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search calls, subjects, contacts, accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-xl text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-foreground-muted hover:text-foreground p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Controls & View Switcher (List / Card / Line) */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filter Drawer Trigger Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={cn(
                    'relative size-9 rounded-xl border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs',
                    activeFiltersCount > 0 && 'text-fairway-600 border-fairway-400 bg-fairway-50 dark:bg-fairway-950/40'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-fairway-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Filter Calls</TooltipContent>
            </Tooltip>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => loadCalls(true)}
                  disabled={isRefreshing || isLoading}
                  className="size-9 rounded-xl border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground transition-all cursor-pointer shrink-0 shadow-2xs disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      'w-4 h-4 transition-transform duration-700',
                      (isRefreshing || isLoading) && 'animate-spin text-fairway-600'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Refresh</TooltipContent>
            </Tooltip>

            {/* Segmented View Switcher: List / Card / Line (modeled from Inquiries module) */}
            <div className="hidden sm:flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-xl overflow-hidden shadow-2xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      viewMode === 'table'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">List View</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      viewMode === 'grid'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Card View (Grid)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('line')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      viewMode === 'line'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Line View (Compact)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* ========================================================================= */}
      {/* 5. MAIN CONTENT DISPLAY: LIST (TABLE) OR CARDS (GRID/LINE) */}
      {/* ========================================================================= */}
      {viewMode === 'table' ? (
        <CallsList
          calls={calls}
          isLoading={isLoading}
          hasFilters={activeFiltersCount > 0 || !!searchQuery}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onClearFilters={handleClearAllFilters}
          onNewCall={() => onOpenNewCall('schedule')}
          onSelectCall={onSelectCall}
          onEditCall={handleEditCall}
          onToggleStatus={handleToggleStatus}
          onDeleteCall={handleDeleteCall}
        />
      ) : (
        <CallsCard
          calls={calls}
          isLoading={isLoading}
          mode={viewMode}
          hasFilters={activeFiltersCount > 0 || !!searchQuery}
          onClearFilters={handleClearAllFilters}
          onNewCall={() => onOpenNewCall('schedule')}
          onSelectCall={onSelectCall}
          onEditCall={handleEditCall}
          onToggleStatus={handleToggleStatus}
          onDeleteCall={handleDeleteCall}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. SLIDE-OVER FILTER DRAWER */}
      {/* ========================================================================= */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-surface h-full flex flex-col border-l border-border shadow-2xl z-10 p-5 space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <Filter className="w-4 h-4 text-fairway-600" />
                <span>Filter Calls by</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto text-xs">
              {/* Call Type */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Call Type</label>
                <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types (Inbound & Outbound)</SelectItem>
                    <SelectItem value="Inbound">Inbound Calls</SelectItem>
                    <SelectItem value="Outbound">Outbound Calls</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Call Status */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Call Status</label>
                <Select value={callStatusFilter} onValueChange={setCallStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Call Owner */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Call Owner</label>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Team Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-bold text-xs px-4"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. QUICK EDIT MODAL */}
      {/* ========================================================================= */}
      <EditCallModal
        call={editingCall}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => loadCalls()}
      />
    </div>
  );
};

export default CallsPage;
