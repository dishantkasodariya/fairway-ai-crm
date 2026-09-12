import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  Search,
  Filter,
  MapPin,
  ChevronRight,
  Shield,
  Zap,
  Truck,
  Flame,
  Plus,
  RefreshCw,
  List,
  LayoutGrid,
  X,
  Settings,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
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
import { PropertyService } from '@/modules/core/services/propertyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { Property, PropertyStatus } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { DataTable7, ColumnConfig } from '@/modules/core/components/ui/data-table-7';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { cn } from '@/modules/core/lib/utils';

export interface PropertyListViewProps {
  onSelectProperty: (id: string) => void;
  onNavigateToMap: () => void;
  onOpenNewProperty?: () => void;
}

const PropertyCardBanner: React.FC<{
  photoSrc?: string;
  code: string;
  status: string;
  isAvail: boolean;
  rentPerSqFtINR: number;
}> = ({ photoSrc, code, status, isAvail, rentPerSqFtINR }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative h-44 sm:h-48 w-full bg-slate-900 overflow-hidden shrink-0 select-none">
      {!hasError && photoSrc ? (
        <img
          src={photoSrc}
          alt=""
          onError={() => setHasError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-linear-to-br from-slate-900 via-slate-800 to-fairway-950 text-white relative">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <Warehouse className="w-10 h-10 text-fairway-400/70 mb-1 z-1" />
          <span className="text-[11px] font-medium text-slate-300 z-1">Grade-A Logistics Facility</span>
        </div>
      )}

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-1.5 flex-wrap max-w-[85%] z-10">
        <span className="font-mono text-[11px] sm:text-xs font-bold bg-slate-950/85 text-white backdrop-blur-md px-2 py-0.5 rounded shadow-xs border border-white/10">
          {code}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md shadow-xs ${
            isAvail ? 'bg-emerald-600/90 text-white' : 'bg-amber-600/90 text-white'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Rent Badge */}
      <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-slate-950/85 text-white backdrop-blur-md px-2.5 py-1 rounded text-xs font-black border border-white/10 shadow-xs z-10">
        ₹{rentPerSqFtINR} <span className="text-[10px] font-normal text-slate-300">/ sq.ft</span>
      </div>
    </div>
  );
};

export const PropertyListView: React.FC<PropertyListViewProps> = ({
  onSelectProperty,
  onNavigateToMap,
  onOpenNewProperty,
}) => {
  const { canEdit } = useAuth();

  // Search & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Active Filters
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [heightFilter, setHeightFilter] = useState('all');

  // Filter Drawer Drafts
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftCorridorFilter, setDraftCorridorFilter] = useState('all');
  const [draftStatusFilter, setDraftStatusFilter] = useState('all');
  const [draftIndustryFilter, setDraftIndustryFilter] = useState('all');
  const [draftHeightFilter, setDraftHeightFilter] = useState('all');

  // Column Visibility Config
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    actions: true,
    code: true,
    name: true,
    availableAreaSqFt: true,
    rentPerSqFtINR: true,
    docksCount: true,
    clearHeightFt: true,
    status: true,
  });

  // State
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadProperties = async (isSpin = false) => {
    if (isSpin) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await PropertyService.getProperties();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setProperties(res.data);
      } else {
        const local = StorageService.getProperties();
        setProperties(local);
      }
    } catch {
      const local = StorageService.getProperties();
      setProperties(local);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const uniqueCorridors = useMemo(() => {
    return Array.from(
      new Set(properties.map((p) => p.corridor).filter((c): c is string => Boolean(c && c.trim())))
    );
  }, [properties]);

  const uniqueIndustries = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      if (Array.isArray(p.suitableIndustries)) {
        p.suitableIndustries.forEach((ind) => ind && set.add(ind));
      }
    });
    return Array.from(set);
  }, [properties]);

  // Drawer open/apply/reset
  const openFilterDrawer = () => {
    setDraftCorridorFilter(corridorFilter);
    setDraftStatusFilter(statusFilter);
    setDraftIndustryFilter(industryFilter);
    setDraftHeightFilter(heightFilter);
    setIsFilterDrawerOpen(true);
  };

  const applyFilters = () => {
    setCorridorFilter(draftCorridorFilter);
    setStatusFilter(draftStatusFilter);
    setIndustryFilter(draftIndustryFilter);
    setHeightFilter(draftHeightFilter);
    setIsFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setDraftCorridorFilter('all');
    setDraftStatusFilter('all');
    setDraftIndustryFilter('all');
    setDraftHeightFilter('all');
    setCorridorFilter('all');
    setStatusFilter('all');
    setIndustryFilter('all');
    setHeightFilter('all');
    setSearchQuery('');
    setIsFilterDrawerOpen(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (corridorFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (industryFilter !== 'all') count++;
    if (heightFilter !== 'all') count++;
    return count;
  }, [corridorFilter, statusFilter, industryFilter, heightFilter]);

  const filteredProps = useMemo(() => {
    return properties.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.corridor && p.corridor.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q));

      const matchesCorridor = corridorFilter === 'all' || p.corridor === corridorFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        p.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesIndustry =
        industryFilter === 'all' ||
        (Array.isArray(p.suitableIndustries) && p.suitableIndustries.includes(industryFilter));

      let matchesHeight = true;
      if (heightFilter === '12plus') matchesHeight = (p.clearHeightFt || 0) >= 12;
      else if (heightFilter === '10plus') matchesHeight = (p.clearHeightFt || 0) >= 10;
      else if (heightFilter === 'under10') matchesHeight = (p.clearHeightFt || 0) < 10;

      return matchesQuery && matchesCorridor && matchesStatus && matchesIndustry && matchesHeight;
    });
  }, [properties, searchQuery, corridorFilter, statusFilter, industryFilter, heightFilter]);

  const allColumns: ColumnConfig<Property>[] = [
    {
      key: 'actions',
      label: 'Action',
      width: 70,
      render: (p) => (
        <button
          type="button"
          onClick={() => onSelectProperty(p.id)}
          className="size-7 rounded-md inline-flex items-center justify-center text-foreground-muted hover:text-fairway-700 hover:bg-fairway-50 dark:hover:bg-fairway-950/60 transition-colors cursor-pointer"
          title="View warehouse details"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      width: 130,
      render: (p) => <span className="font-mono text-xs font-bold text-fairway-700 dark:text-fairway-400">{p.code}</span>,
    },
    {
      key: 'name',
      label: 'Warehouse / Park',
      width: 260,
      render: (p) => (
        <div className="text-left py-0.5">
          <div className="font-semibold text-foreground text-xs">{p.name}</div>
          <div className="text-[11px] text-foreground-muted">
            {p.city || 'Gujarat'}{p.state ? `, ${p.state}` : ''}{p.corridor ? ` • ${p.corridor}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'availableAreaSqFt',
      label: 'Available Space',
      width: 160,
      render: (p) => <span className="font-bold text-fairway-900 dark:text-fairway-300">{formatSqFt(p.availableAreaSqFt)}</span>,
    },
    {
      key: 'rentPerSqFtINR',
      label: 'Base Rent',
      width: 130,
      render: (p) => <span className="font-mono font-semibold">₹{p.rentPerSqFtINR} / sq.ft</span>,
    },
    {
      key: 'docksCount',
      label: 'Docks',
      width: 100,
      render: (p) => <span>{p.docksCount || 0} Docks</span>,
    },
    {
      key: 'clearHeightFt',
      label: 'Height',
      width: 100,
      render: (p) => <span>{p.clearHeightFt || 0}m</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 140,
      render: (p) => {
        const isAvail = p.status?.toLowerCase() === 'available';
        return (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              isAvail
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
            }`}
          >
            {p.status}
          </span>
        );
      },
    },
  ];

  const visibleColumns = useMemo(() => {
    return allColumns.filter((col) => columnVisibility[col.key] !== false);
  }, [allColumns, columnVisibility]);

  // Combobox Options for Filter Drawer
  const corridorOptions: ComboboxOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Corridors' },
      ...uniqueCorridors.map((c) => ({ value: c, label: c })),
    ];
  }, [uniqueCorridors]);

  const statusOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Available', label: 'Available' },
    { value: 'Partially Leased', label: 'Partially Leased' },
    { value: 'Under Development', label: 'Under Development' },
    { value: 'Fully Leased', label: 'Fully Leased' },
  ];

  const industryOptions: ComboboxOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Industries' },
      ...uniqueIndustries.map((ind) => ({ value: ind, label: ind })),
    ];
  }, [uniqueIndustries]);

  const heightOptions: ComboboxOption[] = [
    { value: 'all', label: 'Any Clear Height' },
    { value: '12plus', label: '12m+ (Mega Logistics PEB)' },
    { value: '10plus', label: '10m+ (Grade-A Standard)' },
    { value: 'under10', label: 'Under 10m (Compact/Mid)' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Top Header Pattern */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Industrial Real Estate / Property Master
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-0.5">
            <Warehouse className="w-6 h-6 text-foreground" />
            <span>Warehouse Property Master</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Browse verified Grade-A logistics parks, chemical warehousing zones, and PEB industrial assets across Gujarat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onNavigateToMap}
            leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-600" />}
            className="text-xs"
          >
            <span>View Map</span>
          </Button>

          {canEdit && onOpenNewProperty && (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenNewProperty}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold text-xs shadow-xs"
            >
              <span>Add Warehouse</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sleek Search & Control Toolbar matching reference */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search warehouse parks, codes, cities, or corridors..."
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
                {allColumns.filter((c) => c.key !== 'actions').map((col) => (
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
                  onClick={() => loadProperties(true)}
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

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 sm:py-24 text-center space-y-3 bg-surface rounded-card border border-border">
          <div className="w-9 h-9 border-3 border-fairway-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-foreground-muted font-medium">Fetching warehouse listings from backend...</p>
        </div>
      ) : filteredProps.length === 0 ? (
        <div className="bg-surface rounded-card border border-border p-8 sm:p-12 text-center space-y-3 shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted text-foreground-muted flex items-center justify-center mx-auto border border-border">
            <Warehouse className="w-6 h-6 text-foreground-muted" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {errorMsg ? 'Unable to Load Warehouses' : 'No Warehouses Found'}
          </h3>
          <p className="text-xs text-foreground-muted max-w-sm mx-auto">
            {errorMsg
              ? errorMsg
              : searchQuery || activeFiltersCount > 0
              ? 'No warehouse properties match your current search or corridor filters.'
              : 'Start by adding your first Grade-A warehouse listing or industrial logistics park.'}
          </p>
          {(searchQuery || activeFiltersCount > 0) && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="mt-2"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* View 1: Data Table */
        <DataTable7<Property>
          data={filteredProps}
          columns={visibleColumns}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => onSelectProperty(p.id)}
        />
      ) : (
        /* View 2: Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProps.map((p) => {
            const isAvail = p.status?.toLowerCase() === 'available';
            return (
              <div
                key={p.id}
                onClick={() => onSelectProperty(p.id)}
                className="group bg-surface rounded-card border border-border hover:border-fairway-500/60 transition-all duration-200 shadow-subtle hover:shadow-card flex flex-col overflow-hidden text-left cursor-pointer"
              >
                <PropertyCardBanner
                  photoSrc={p.photos?.[0]}
                  code={p.code}
                  status={p.status || 'Available'}
                  isAvail={isAvail}
                  rentPerSqFtINR={p.rentPerSqFtINR}
                />

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-foreground text-sm group-hover:text-fairway-700 transition-colors line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-foreground-muted flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                      <span>{p.city || 'Gujarat'}, {p.corridor || p.location || 'Industrial Belt'}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/70 text-xs">
                    <div>
                      <span className="text-[11px] text-foreground-muted block">Available Space</span>
                      <span className="font-bold text-foreground">{formatSqFt(p.availableAreaSqFt)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-foreground-muted block">Total Area</span>
                      <span className="font-medium text-foreground">{formatSqFt(p.totalAreaSqFt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/70 text-[11px] text-foreground-muted flex-wrap">
                    {p.clearHeightFt && (
                      <span className="bg-surface-muted px-2 py-0.5 rounded border border-border/60">
                        {p.clearHeightFt}m Height
                      </span>
                    )}
                    {p.docksCount && (
                      <span className="bg-surface-muted px-2 py-0.5 rounded border border-border/60">
                        {p.docksCount} Docks
                      </span>
                    )}
                    {p.flooringCapacityMT && (
                      <span className="bg-surface-muted px-2 py-0.5 rounded border border-border/60">
                        {p.flooringCapacityMT} MT Flooring
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advanced Filters Drawer (Right Slide-out) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in select-none overflow-hidden m-0 p-0">
          {/* Backdrop */}
          <div
            className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-surface border-l border-border border-t-0 border-r-0 border-b-0 h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none ring-0 text-left">
            {/* Header */}
            <div className="p-5 border-b border-border bg-surface flex items-start justify-between border-t-0">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-fairway-600" />
                  <span>Property Filters</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Filter warehouses by corridor, status, height & vertical
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

            {/* Filter Fields Body using Combobox */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Industrial Corridor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Industrial Corridor</label>
                <Combobox
                  options={corridorOptions}
                  value={draftCorridorFilter}
                  onChange={setDraftCorridorFilter}
                  placeholder="Select corridor..."
                  searchPlaceholder="Search corridor..."
                />
              </div>

              {/* Property Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Property Status</label>
                <Combobox
                  options={statusOptions}
                  value={draftStatusFilter}
                  onChange={setDraftStatusFilter}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                />
              </div>

              {/* Suitable Industry */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Suitable Industry Segment</label>
                <Combobox
                  options={industryOptions}
                  value={draftIndustryFilter}
                  onChange={setDraftIndustryFilter}
                  placeholder="Select industry..."
                  searchPlaceholder="Search industry..."
                />
              </div>

              {/* Clear Height */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Clear Height</label>
                <Combobox
                  options={heightOptions}
                  value={draftHeightFilter}
                  onChange={setDraftHeightFilter}
                  placeholder="Select clear height..."
                  searchPlaceholder="Search clear height..."
                />
              </div>
            </div>

            {/* Footer Buttons */}
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

export const PropertiesPage = PropertyListView;
export default PropertiesPage;
