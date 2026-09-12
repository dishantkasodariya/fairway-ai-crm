import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Clock,
  Warehouse,
  Building2,
  CheckCircle2,
  User,
  Phone,
  RefreshCw,
  List,
  LayoutGrid,
  X,
  Settings,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/modules/core/components/ui/tooltip';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { SiteVisit, SiteVisitStatus } from '@/modules/core/types';
import { formatDate, formatRelativeDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { cn } from '@/modules/core/lib/utils';

export interface SiteVisitListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const SiteVisitListView: React.FC<SiteVisitListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit, users } = useAuth();
  const { success } = useToast();

  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>(StorageService.getSiteVisits());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [hostFilter, setHostFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Filter Drawer Drafts
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState('all');
  const [draftHostFilter, setDraftHostFilter] = useState('all');
  const [draftDateFilter, setDraftDateFilter] = useState('');

  // Column Visibility Config
  const [columns, setColumns] = useState<Record<string, boolean>>({
    company: true,
    property: true,
    inspectionDate: true,
    host: true,
    status: true,
    actions: true,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = (spin = false) => {
    if (spin) {
      setIsRefreshing(true);
      setTimeout(() => {
        setSiteVisits(StorageService.getSiteVisits());
        setIsRefreshing(false);
      }, 400);
    } else {
      setSiteVisits(StorageService.getSiteVisits());
    }
  };

  const handleUpdateVisitStatus = (id: string, newStatus: SiteVisitStatus, feedback?: string) => {
    StorageService.updateSiteVisit(id, { status: newStatus, clientFeedback: feedback });
    refreshData();
    success('Site Visit Updated', `Status marked as ${newStatus}`);
  };

  const openFilterDrawer = () => {
    setDraftStatusFilter(statusFilter);
    setDraftHostFilter(hostFilter);
    setDraftDateFilter(dateFilter);
    setIsFilterDrawerOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(draftStatusFilter);
    setHostFilter(draftHostFilter);
    setDateFilter(draftDateFilter);
    setIsFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setDraftStatusFilter('all');
    setDraftHostFilter('all');
    setDraftDateFilter('');
    setStatusFilter('all');
    setHostFilter('all');
    setDateFilter('');
    setSearchQuery('');
    setIsFilterDrawerOpen(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (hostFilter !== 'all') count++;
    if (dateFilter) count++;
    return count;
  }, [statusFilter, hostFilter, dateFilter]);

  const uniqueHosts = useMemo(() => {
    const set = new Set<string>();
    siteVisits.forEach((v) => {
      if (v.assignedSalespersonName) set.add(v.assignedSalespersonName);
    });
    return Array.from(set).map((h) => ({ value: h, label: h }));
  }, [siteVisits]);

  const filteredVisits = useMemo(() => {
    return siteVisits.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        v.companyName.toLowerCase().includes(q) ||
        v.propertyName.toLowerCase().includes(q) ||
        v.inquiryNumber.toLowerCase().includes(q) ||
        (v.assignedSalespersonName && v.assignedSalespersonName.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesHost = hostFilter === 'all' || v.assignedSalespersonName === hostFilter;
      const matchesDate = !dateFilter || v.visitDate === dateFilter;

      return matchesQuery && matchesStatus && matchesHost && matchesDate;
    });
  }, [siteVisits, searchQuery, statusFilter, hostFilter, dateFilter]);

  const statusOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Inspection Statuses' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const hostOptions: ComboboxOption[] = useMemo(() => {
    return [{ value: 'all', label: 'All Hosts / Salespersons' }, ...uniqueHosts];
  }, [uniqueHosts]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Site Visits</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <Calendar className="w-6 h-6 text-orange-600" />
            <span>Warehouse Site Inspections</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Physical on-site tours, engineer walkthroughs, technical client feedback, and conversion outcomes.
          </p>
        </div>
      </div>

      {/* Sleek Search & Control Toolbar matching reference */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search inspections by company, property, or inquiry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
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

        {/* Right: Controls & View Switcher */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Filter Drawer Trigger Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openFilterDrawer}
                  className={cn(
                    "relative size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs",
                    activeFiltersCount > 0 && "text-fairway-600 border-fairway-400 bg-fairway-50 dark:bg-fairway-950/40"
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
              <TooltipContent side="top">
                Filter
              </TooltipContent>
            </Tooltip>

            {/* Column Settings Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-9 rounded-button border border-border bg-white dark:bg-[#171717] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Column
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48 bg-surface border border-border shadow-2xl p-1 rounded-card z-50">
                <DropdownMenuLabel className="text-xs font-bold text-foreground px-2 py-1.5">
                  Toggle Columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={columns.company}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(val) => setColumns((prev) => ({ ...prev, company: !!val }))}
                  className="text-xs cursor-pointer"
                >
                  Customer Company
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columns.property}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(val) => setColumns((prev) => ({ ...prev, property: !!val }))}
                  className="text-xs cursor-pointer"
                >
                  Property Details
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columns.inspectionDate}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(val) => setColumns((prev) => ({ ...prev, inspectionDate: !!val }))}
                  className="text-xs cursor-pointer"
                >
                  Inspection Date & Time
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columns.host}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(val) => setColumns((prev) => ({ ...prev, host: !!val }))}
                  className="text-xs cursor-pointer"
                >
                  Assigned Host
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columns.status}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(val) => setColumns((prev) => ({ ...prev, status: !!val }))}
                  className="text-xs cursor-pointer"
                >
                  Status Badge
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columns.actions}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(val) => setColumns((prev) => ({ ...prev, actions: !!val }))}
                  className="text-xs cursor-pointer"
                >
                  Action Buttons
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => refreshData(true)}
                  disabled={isRefreshing}
                  className="size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 transition-transform duration-700",
                      isRefreshing && "animate-spin text-fairway-600"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Refresh
              </TooltipContent>
            </Tooltip>

            {/* Segmented View Switcher */}
            <div className="flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'list'
                        ? "bg-fairway-600 text-white font-bold"
                        : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  List
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'grid'
                        ? "bg-fairway-600 text-white font-bold"
                        : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Card
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Main Content Area */}
      {filteredVisits.length === 0 ? (
        <div className="py-16 text-center text-xs text-foreground-muted bg-surface rounded-card border border-border shadow-subtle p-6">
          <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-foreground text-sm">No site inspections found</p>
          <p className="mt-1 max-w-sm mx-auto">
            {activeFiltersCount > 0 || searchQuery
              ? "No inspections match your search and filter criteria. Try resetting them."
              : "No physical property tours scheduled yet."}
          </p>
          {(activeFiltersCount > 0 || searchQuery) && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              className="mt-4"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden divide-y divide-border">
          {filteredVisits.map((sv) => (
            <div key={sv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/40 transition-colors text-xs">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {columns.company && (
                    <span className="font-bold text-foreground text-sm hover:text-fairway-800 cursor-pointer" onClick={() => onNavigateToCompany(sv.companyId)}>
                      {sv.companyName}
                    </span>
                  )}
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-white dark:border-primary/40">
                    {sv.inquiryNumber}
                  </span>
                  {columns.status && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        sv.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                          : 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
                      }`}
                    >
                      {sv.status}
                    </span>
                  )}
                  {sv.outcome && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      Outcome: {sv.outcome}
                    </span>
                  )}
                </div>

                {columns.property && (
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-foreground">{sv.propertyName}</span>
                    <span>({sv.propertyLocation})</span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-[11px] text-foreground-muted pt-1 flex-wrap">
                  {columns.inspectionDate && (
                    <span>
                      Inspection Date: <strong>{formatDate(sv.visitDate)} at {sv.visitTime}</strong>
                    </span>
                  )}
                  {columns.host && (
                    <span>
                      Host: <strong>{sv.assignedSalespersonName}</strong>
                    </span>
                  )}
                  {sv.contactPhone && (
                    <span>
                      Client Phone: <a href={`tel:${sv.contactPhone}`} className="hover:underline text-fairway-800">{sv.contactPhone}</a>
                    </span>
                  )}
                </div>

                {sv.notes && <p className="text-[11px] text-foreground-muted mt-1 bg-surface-muted p-2 rounded">Notes: {sv.notes}</p>}
                {sv.clientFeedback && (
                  <p className="text-[11px] text-emerald-900 mt-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                    <strong>Client Feedback:</strong> {sv.clientFeedback}
                  </p>
                )}
              </div>

              {columns.actions && (
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && sv.status === 'Scheduled' && (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleUpdateVisitStatus(sv.id, 'Completed', 'Client satisfied with clear height and dock bays.')}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Mark Completed
                    </Button>
                  )}
                  <Button size="xs" variant="outline" onClick={() => onNavigateToInquiry(sv.inquiryId)}>
                    Inquiry Workspace →
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Card / Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map((sv) => (
            <div
              key={sv.id}
              className="bg-surface rounded-card border border-border p-4 shadow-subtle hover:border-fairway-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <span className="font-mono text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/25">
                  {sv.inquiryNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    sv.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
                  }`}
                >
                  {sv.status}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <h3
                    onClick={() => onNavigateToCompany(sv.companyId)}
                    className="font-bold text-sm text-foreground hover:underline cursor-pointer"
                  >
                    {sv.companyName}
                  </h3>
                  <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5">
                    <Warehouse className="w-3 h-3 text-fairway-600 shrink-0" />
                    <span className="truncate">{sv.propertyName}</span>
                  </p>
                </div>

                <div className="text-[11px] text-foreground-muted space-y-1 pt-1 border-t border-border/60">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatDate(sv.visitDate)} at {sv.visitTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Host: {sv.assignedSalespersonName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                {canEdit && sv.status === 'Scheduled' ? (
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => handleUpdateVisitStatus(sv.id, 'Completed', 'Client satisfied with tour.')}
                  >
                    Complete
                  </Button>
                ) : (
                  <span className="text-[10px] text-foreground-muted">
                    {sv.outcome ? `Outcome: ${sv.outcome}` : 'Tour Recorded'}
                  </span>
                )}
                <Button size="xs" variant="outline" onClick={() => onNavigateToInquiry(sv.inquiryId)}>
                  Inquiry →
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Filters Drawer (Right Slide-out) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in select-none overflow-hidden m-0 p-0">
          <div
            className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="relative w-full max-w-xs sm:max-w-sm bg-surface border-l border-border h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none text-left">
            <div className="p-5 border-b border-border bg-surface flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-fairway-600" />
                  <span>Site Visit Filters</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Filter tours by status, host, or date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Inspection Status</label>
                <Combobox
                  options={statusOptions}
                  value={draftStatusFilter}
                  onChange={setDraftStatusFilter}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Assigned Host</label>
                <Combobox
                  options={hostOptions}
                  value={draftHostFilter}
                  onChange={setDraftHostFilter}
                  placeholder="Select host..."
                  searchPlaceholder="Search host..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Visit Date</label>
                <DatePicker
                  value={draftDateFilter}
                  onChange={setDraftDateFilter}
                  placeholder="Filter by date..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-2.5 px-4 rounded-button border text-xs font-bold transition-all text-center bg-surface hover:bg-surface-muted border-border text-foreground cursor-pointer shadow-2xs"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 py-2.5 px-4 rounded-button bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold transition-all text-center shadow-xs cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SiteVisitsPage = SiteVisitListView;
export default SiteVisitsPage;
