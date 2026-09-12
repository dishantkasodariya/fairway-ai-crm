import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  Building2,
  Warehouse,
  Send,
  MoreVertical,
  ExternalLink,
  ChevronDown,
  Check,
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
  DropdownMenuItem,
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
import { ProposalService } from '@/modules/core/services/proposalService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Proposal, ProposalStatus } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate, getProposalStatusBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { DataTable7, ColumnConfig } from '@/modules/core/components/ui/data-table-7';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { downloadProposalPDF } from '@/modules/core/utils/proposalPdfGenerator';
import { cn } from '@/modules/core/lib/utils';

export interface ProposalListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const ProposalListView: React.FC<ProposalListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit } = useAuth();
  const { success, error } = useToast();

  // Search & View
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [rentRangeFilter, setRentRangeFilter] = useState('all');

  // Filter Drawer Drafts
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState('all');
  const [draftCompanyFilter, setDraftCompanyFilter] = useState('all');
  const [draftRentRangeFilter, setDraftRentRangeFilter] = useState('all');

  // Column Visibility Config
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    proposalNumber: true,
    companyName: true,
    propertyName: true,
    proposedAreaSqFt: true,
    commercialTerms: true,
    totalMonthlyRentINR: true,
    status: true,
    actions: true,
  });

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProposals = async (isSpin = false) => {
    if (isSpin) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await ProposalService.getProposals();
      if (res.success && res.data && res.data.length > 0) {
        setProposals(res.data);
      } else {
        setProposals(StorageService.getProposals());
      }
    } catch {
      setProposals(StorageService.getProposals());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: ProposalStatus) => {
    try {
      const res = await ProposalService.updateProposalStatus(id, newStatus);
      if (res.success && res.data) {
        setProposals((prev) => prev.map((p) => (p.id === id ? res.data! : p)));
        try {
          StorageService.updateProposalStatus(id, newStatus);
        } catch {}
      } else {
        StorageService.updateProposalStatus(id, newStatus);
        loadProposals();
      }
      success('Proposal Updated', `Status changed to ${newStatus}`);
    } catch {
      StorageService.updateProposalStatus(id, newStatus);
      loadProposals();
      success('Proposal Updated', `Status changed to ${newStatus}`);
    }
  };

  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>();
    proposals.forEach((p) => {
      if (p.companyId && p.companyName) {
        map.set(p.companyId, p.companyName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [proposals]);

  const openFilterDrawer = () => {
    setDraftStatusFilter(statusFilter);
    setDraftCompanyFilter(companyFilter);
    setDraftRentRangeFilter(rentRangeFilter);
    setIsFilterDrawerOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(draftStatusFilter);
    setCompanyFilter(draftCompanyFilter);
    setRentRangeFilter(draftRentRangeFilter);
    setIsFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setDraftStatusFilter('all');
    setDraftCompanyFilter('all');
    setDraftRentRangeFilter('all');
    setStatusFilter('all');
    setCompanyFilter('all');
    setRentRangeFilter('all');
    setSearchQuery('');
    setIsFilterDrawerOpen(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (companyFilter !== 'all') count++;
    if (rentRangeFilter !== 'all') count++;
    return count;
  }, [statusFilter, companyFilter, rentRangeFilter]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.proposalNumber.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.propertyName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesCompany = companyFilter === 'all' || p.companyId === companyFilter;

      let matchesRent = true;
      if (rentRangeFilter === 'under5L') matchesRent = p.totalMonthlyRentINR < 500000;
      else if (rentRangeFilter === '5Lto15L') matchesRent = p.totalMonthlyRentINR >= 500000 && p.totalMonthlyRentINR <= 1500000;
      else if (rentRangeFilter === '15Lplus') matchesRent = p.totalMonthlyRentINR > 1500000;

      return matchesQuery && matchesStatus && matchesCompany && matchesRent;
    });
  }, [proposals, searchQuery, statusFilter, companyFilter, rentRangeFilter]);

  const totalProposalsMonthlyValue = filteredProposals.reduce((acc, curr) => acc + curr.totalMonthlyRentINR, 0);

  const allColumns: ColumnConfig<Proposal>[] = [
    {
      key: 'proposalNumber',
      label: 'Proposal #',
      width: 140,
      render: (prp) => (
        <span className="font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/20 dark:border-purple-800/60">
          {prp.proposalNumber}
        </span>
      ),
    },
    {
      key: 'companyName',
      label: 'Customer Company',
      width: 220,
      render: (prp) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToCompany(prp.companyId);
          }}
          className="font-bold text-foreground hover:text-primary hover:underline cursor-pointer"
        >
          {prp.companyName}
        </span>
      ),
    },
    {
      key: 'propertyName',
      label: 'Offered Property',
      width: 240,
      render: (prp) => (
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Warehouse className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
          <span className="truncate">{prp.propertyName}</span>
        </div>
      ),
    },
    {
      key: 'proposedAreaSqFt',
      label: 'Proposed Area',
      width: 150,
      render: (prp) => <span className="font-bold text-foreground">{formatSqFt(prp.proposedAreaSqFt)}</span>,
    },
    {
      key: 'commercialTerms',
      label: 'Commercial Terms',
      width: 240,
      render: (prp) => (
        <span className="text-foreground-muted text-xs">
          Base: <span className="text-foreground font-semibold">₹{prp.baseRentPerSqFtINR}</span> + CAM: <span className="text-foreground font-semibold">₹{prp.maintenancePerSqFtINR}</span> ({prp.escalationPercentPerYear}% esc.)
        </span>
      ),
    },
    {
      key: 'totalMonthlyRentINR',
      label: 'Monthly Rent',
      width: 160,
      render: (prp) => (
        <span className="font-mono font-bold text-foreground dark:text-white text-sm tracking-tight">
          {formatINR(prp.totalMonthlyRentINR)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 150,
      render: (prp) => {
        const badge = getProposalStatusBadge(prp.status);
        return canEdit ? (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${badge.bg} focus:outline-none cursor-pointer`}
                >
                  <span>{prp.status}</span>
                  <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuLabel className="text-xs">Update Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['Draft', 'Sent', 'Viewed', 'Negotiation', 'Accepted', 'Rejected'] as const).map((st) => (
                  <DropdownMenuItem
                    key={st}
                    onClick={() => handleUpdateStatus(prp.id, st)}
                    className={prp.status === st ? 'bg-surface-muted font-semibold text-xs' : 'text-xs'}
                  >
                    {prp.status === st && <Check className="w-3.5 h-3.5 mr-1 text-primary" />}
                    {st}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
            {prp.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'PDF Document',
      width: 140,
      render: (prp) => (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Button
            size="xs"
            variant="outline"
            leftIcon={<Download className="w-3.5 h-3.5 text-primary shrink-0" />}
            onClick={() => {
              downloadProposalPDF(prp);
              success('Generating Proposal PDF', `Opening ${prp.documentName || 'Proposal.pdf'} for print/download`);
            }}
            className="bg-surface-muted/70 hover:bg-surface-muted text-foreground dark:text-white border-border hover:border-primary/50 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            title={`Download ${prp.documentName || 'Commercial Proposal'}`}
          >
            Download
          </Button>
        </div>
      ),
    },
  ];

  const visibleColumns = useMemo(() => {
    return allColumns.filter((col) => columnVisibility[col.key] !== false);
  }, [allColumns, columnVisibility]);

  const statusOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Sent', label: 'Sent' },
    { value: 'Viewed', label: 'Viewed' },
    { value: 'Negotiation', label: 'Negotiation' },
    { value: 'Accepted', label: 'Accepted' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const companyOptions: ComboboxOption[] = useMemo(() => {
    return [{ value: 'all', label: 'All Companies' }, ...uniqueCompanies];
  }, [uniqueCompanies]);

  const rentRangeOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Rent Ranges' },
    { value: 'under5L', label: 'Under ₹5 Lakhs / mo' },
    { value: '5Lto15L', label: '₹5L - ₹15 Lakhs / mo' },
    { value: '15Lplus', label: 'Over ₹15 Lakhs / mo' },
  ];

  return (
    <div className="space-y-4 max-w-8xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">CRM / Proposals</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <FileSpreadsheet className="w-6 h-6 text-purple-600" />
            <span>Commercial Proposal Management</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Delivered commercial terms, escalation clauses, security deposits, and proposal acceptance status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Total Quoted Value</span>
            <span className="text-sm font-extrabold text-foreground dark:text-white">{formatINR(totalProposalsMonthlyValue, true)} / month</span>
          </div>
        </div>
      </div>

      {/* Sleek Search & Control Toolbar matching reference */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search proposals by number, company, or property..."
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
                {allColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={columnVisibility[col.key] !== false}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumnVisibility((prev) => ({ ...prev, [col.key]: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => loadProposals(true)}
                  disabled={isRefreshing || isLoading}
                  className="size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 transition-transform duration-700",
                      (isRefreshing || isLoading) && "animate-spin text-fairway-600"
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
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'table'
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
      {isLoading ? (
        <div className="py-20 text-center text-xs text-foreground-muted flex flex-col items-center justify-center bg-surface rounded-card border border-border shadow-subtle">
          <div className="w-8 h-8 border-3 border-fairway-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="font-semibold text-foreground text-sm">Loading proposals...</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="py-16 text-center text-xs text-foreground-muted bg-surface rounded-card border border-border shadow-subtle p-6">
          <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-foreground text-sm">No proposals found</p>
          <p className="mt-1 max-w-sm mx-auto">
            {activeFiltersCount > 0 || searchQuery
              ? "No proposals match your current search and filter criteria."
              : "No commercial proposals currently generated."}
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
      ) : viewMode === 'table' ? (
        /* Pinned Columns Data Table */
        <DataTable7<Proposal>
          data={filteredProposals}
          columns={visibleColumns}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => onNavigateToInquiry(p.inquiryId)}
        />
      ) : (
        /* Card / Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProposals.map((prp) => {
            const badge = getProposalStatusBadge(prp.status);
            return (
              <div
                key={prp.id}
                onClick={() => onNavigateToInquiry(prp.inquiryId)}
                className="bg-surface rounded-card border border-border p-4 shadow-subtle hover:border-fairway-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {prp.proposalNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                    {prp.status}
                  </span>
                </div>

                {/* Body */}
                <div className="space-y-2 flex-1">
                  <div>
                    <h3
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToCompany(prp.companyId);
                      }}
                      className="font-bold text-sm text-foreground hover:underline cursor-pointer line-clamp-1"
                    >
                      {prp.companyName}
                    </h3>
                    <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5 line-clamp-1">
                      <Warehouse className="w-3 h-3 text-fairway-600 shrink-0" />
                      <span>{prp.propertyName}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-foreground-muted block">Proposed Space</span>
                      <span className="font-semibold text-foreground">{formatSqFt(prp.proposedAreaSqFt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-foreground-muted block">Base Rate</span>
                      <span className="font-semibold text-foreground">₹{prp.baseRentPerSqFtINR}/sq.ft</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-foreground-muted block">Monthly Total</span>
                    <span className="font-mono font-bold text-foreground text-sm">{formatINR(prp.totalMonthlyRentINR)}</span>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<Download className="w-3 h-3 text-primary" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadProposalPDF(prp);
                      success('Generating Proposal PDF', `Opening ${prp.documentName || 'Proposal.pdf'}`);
                    }}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            );
          })}
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
                  <span>Proposal Filters</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Filter commercial proposals by status, account, or rent
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
                <label className="text-xs font-bold text-foreground block">Proposal Status</label>
                <Combobox
                  options={statusOptions}
                  value={draftStatusFilter}
                  onChange={setDraftStatusFilter}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Customer Company</label>
                <Combobox
                  options={companyOptions}
                  value={draftCompanyFilter}
                  onChange={setDraftCompanyFilter}
                  placeholder="Select company..."
                  searchPlaceholder="Search company..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Monthly Rent Range</label>
                <Combobox
                  options={rentRangeOptions}
                  value={draftRentRangeFilter}
                  onChange={setDraftRentRangeFilter}
                  placeholder="Select rent range..."
                  searchPlaceholder="Search rent range..."
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

export const ProposalsPage = ProposalListView;
export default ProposalsPage;
