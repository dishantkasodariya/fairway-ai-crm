import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Loader2, MapPin, TrendingUp, Download, Search as SearchIcon, AlertTriangle } from 'lucide-react';
import {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
  useTable,
} from '@tanstack/react-table';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { Card } from '@/modules/core/components/ui/Card';
import { Button } from '@/modules/core/components/ui/Button';
import { Checkbox } from '@/modules/core/components/ui/checkbox';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { cn } from '@/modules/core/lib/utils';
import { useToast } from '@/modules/core/providers/ToastContext';
import {
  IntelligenceService,
  DiscoveredCompany,
  DiscoveryRun,
  BusinessTypeCount,
} from '@/modules/core/services/intelligenceService';
import { PropertyService } from '@/modules/core/services/propertyService';
import type { Property } from '@/modules/core/types';
import { exportProspectsCsv } from '../utils/exportProspectsCsv';

export interface AiDiscoveryPageProps {
  onSelectProspect: (id: number) => void;
}

const POLL_INTERVAL_MS = 4000;
const WAREHOUSE_STORAGE_KEY = 'aiDiscovery.warehouseId';

const readStoredWarehouse = (): string | null => {
  try {
    return localStorage.getItem(WAREHOUSE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const scoreBadgeClass = (score: number | null) => {
  if (score === null) return 'bg-surface-muted text-foreground-muted border-border';
  if (score >= 70) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (score >= 40) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-surface-muted text-foreground-muted border-border';
};

export const AiDiscoveryPage: React.FC<AiDiscoveryPageProps> = ({ onSelectProspect }) => {
  const { success, error: toastError } = useToast();

  // Warehouses that have a map location — the only places a search can start from.
  const [warehouses, setWarehouses] = useState<Property[]>([]);
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [run, setRun] = useState<DiscoveryRun | null>(null);
  const [prospects, setProspects] = useState<DiscoveredCompany[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeCount[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);

  const [search, setSearch] = useState('');
  // The box updates `search` per keystroke; the query only uses this settled value.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const latestRequestRef = useRef(0);
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  // 'all' = every discovered company; otherwise only those near this warehouse.
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [minScore, setMinScore] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'recency' | 'revenue' | 'distance'>('score');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrichPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  const stopEnrichPolling = () => {
    if (enrichPollRef.current) {
      clearInterval(enrichPollRef.current);
      enrichPollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
      stopEnrichPolling();
    };
  }, []);

  useEffect(() => {
    IntelligenceService.getBusinessTypes().then((res) => {
      if (res.success && res.data) setBusinessTypes(res.data.items);
    });
    PropertyService.getProperties().then((res) => {
      const located = (res.success && res.data ? res.data : [])
        .filter((p) => Number(p.latitude) && Number(p.longitude))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setWarehouses(located);
      const stored = readStoredWarehouse();
      setWarehouseId(located.find((p) => p.id === stored)?.id ?? located[0]?.id ?? '');
      setWarehousesLoaded(true);
    });
  }, []);

  const warehouseName = useMemo(() => {
    const names = new Map(warehouses.map((w) => [w.id, w.name]));
    return (id: string | null) => (id ? names.get(id) ?? 'Other warehouse' : '—');
  }, [warehouses]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadResults = async (propertyIdOverride?: string) => {
    const requestId = ++latestRequestRef.current;
    const propertyId = propertyIdOverride ?? (warehouseFilter !== 'all' ? warehouseFilter : undefined);
    setIsLoadingProspects(true);
    try {
      const res = await IntelligenceService.listDiscoveredCompanies({
        propertyId,
        sortBy,
        minScore: minScore !== 'all' ? Number(minScore) : undefined,
        search: debouncedSearch || undefined,
        businessType: businessTypeFilter !== 'all' ? businessTypeFilter : undefined,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      });
      // A slower, older request must not overwrite newer results (typing "chem" used to show "c"'s 481 rows).
      if (requestId !== latestRequestRef.current) return;
      if (res.success && res.data) {
        setProspects(res.data.items);
        setTotalCount(res.data.total);
        setHasResults(true);
        setLoadError(null);
      } else {
        const err = res.error;
        const msg = typeof err === 'string' ? err : (err as any)?.message || 'Could not load company intelligence.';
        setLoadError(msg);
      }
    } catch (err: any) {
      if (requestId === latestRequestRef.current) {
        setLoadError(err.message || 'Cannot reach intelligence service.');
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoadingProspects(false);
      }
    }
  };

  const handleSearch = async () => {
    if (!warehouseId) {
      toastError('Pick a warehouse', 'Choose which warehouse to search around.');
      return;
    }
    try {
      localStorage.setItem(WAREHOUSE_STORAGE_KEY, warehouseId);
    } catch {
      /* remembering the choice is only a convenience */
    }

    setIsStarting(true);
    setProspects([]);
    setRowSelection({});
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    try {
      const res = await IntelligenceService.startDiscoveryRun({ propertyId: warehouseId, radiusKm });
      if (!res.success || !res.data) {
        toastError('Search Failed', res.error || 'Could not start the prospect search.');
        return;
      }

      setRun(res.data);
      const runId = res.data.id;

      stopPolling();
      pollRef.current = setInterval(async () => {
        const poll = await IntelligenceService.getDiscoveryRun(runId);
        if (!poll.success || !poll.data) return;

        setRun(poll.data);
        if (poll.data.status === 'done') {
          stopPolling();
          // Show everything near this warehouse: the new companies plus already-known ones it re-found.
          const pid = poll.data.propertyId ?? warehouseId;
          setWarehouseFilter(pid);
          await loadResults(pid);
          const reFound = Math.max(0, poll.data.companiesLinked - poll.data.companiesFound);
          success(
            'Search complete',
            `${poll.data.companiesFound} new ${poll.data.companiesFound === 1 ? 'company' : 'companies'}` +
            (reFound > 0 ? `, ${reFound} already known now linked to this warehouse.` : '.')
          );
        } else if (poll.data.status === 'failed') {
          stopPolling();
          toastError('Search Failed', 'The prospect search failed on the intelligence service.');
        }
      }, POLL_INTERVAL_MS);
    } finally {
      setIsStarting(false);
    }
  };

  const handleEnrichRevenue = async () => {
    if (!run) return;
    setIsEnriching(true);
    try {
      const res = await IntelligenceService.enrichRevenue(run.id);
      if (!res.success || !res.data) {
        toastError('Enrich Failed', res.error || 'Could not start revenue enrichment.');
        setIsEnriching(false);
        return;
      }
      setRun(res.data);

      stopEnrichPolling();
      enrichPollRef.current = setInterval(async () => {
        const poll = await IntelligenceService.getDiscoveryRun(run.id);
        if (!poll.success || !poll.data) return;
        setRun(poll.data);
        if (poll.data.revenueEnrichmentStatus === 'done') {
          stopEnrichPolling();
          setIsEnriching(false);
          await loadResults();
          success('Revenue Enriched', `Researched revenue for ${poll.data.revenueEnrichedCount} companies.`);
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      setIsEnriching(false);
      toastError('Enrich Failed', err.message || 'Could not start revenue enrichment.');
    }
  };

  // Re-run the results query (server-side paginated) on mount and whenever a filter or page
  // changes — but not while a search is still running.
  useEffect(() => {
    if (!run || run.status === 'done' || run.status === 'failed') {
      loadResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, businessTypeFilter, warehouseFilter, minScore, sortBy, pagination.pageIndex, pagination.pageSize]);

  // A filter change can leave the current page out of range; jump back to page 1.
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, businessTypeFilter, warehouseFilter, minScore, sortBy]);

  const columns = useMemo<ColumnDef<DataGridFeatures, DiscoveredCompany>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={row.getIsSelected()} onCheckedChange={(val) => row.toggleSelected(!!val)} />
          </div>
        ),
        size: 40,
        enableSorting: false,
        enableResizing: false,
      },
      {
        id: 'name',
        accessorKey: 'name',
        meta: { headerTitle: 'Company' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Company" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-0.5', scoreBadgeClass(row.original.opportunityScore))}>
              <TrendingUp className="w-2.5 h-2.5" />
              {row.original.opportunityScore !== null ? Math.round(row.original.opportunityScore) : '—'}
            </span>
            <span className="font-bold text-foreground truncate">{row.original.name}</span>
            {row.original.siteCount > 1 && (
              <span
                className="shrink-0 px-1.5 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-semibold text-foreground-muted"
                title="Plants/gates of the same company, shown as one account"
              >
                {row.original.siteCount} sites
              </span>
            )}
          </div>
        ),
        size: 260,
        enableSorting: true,
      },
      {
        id: 'businessType',
        accessorKey: 'businessType',
        meta: { headerTitle: 'Business Type' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Business Type" />,
        cell: ({ row }) => <span className="text-xs text-foreground-muted">{row.original.businessType || '—'}</span>,
        size: 160,
      },
      {
        id: 'warehouse',
        accessorKey: 'nearestPropertyId',
        meta: { headerTitle: 'Warehouse' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Warehouse" />,
        cell: ({ row }) => {
          const shownId = warehouseFilter !== 'all' ? warehouseFilter : row.original.nearestPropertyId;
          const others = row.original.warehouseCount - 1;
          return (
            <span className="text-xs text-foreground-muted flex items-center gap-1 min-w-0">
              <span className="truncate">{warehouseName(shownId)}</span>
              {others > 0 && (
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-semibold"
                  title={`Also near ${others} other warehouse${others === 1 ? '' : 's'}`}
                >
                  +{others}
                </span>
              )}
            </span>
          );
        },
        size: 200,
        enableSorting: false,
      },
      {
        id: 'distanceKm',
        accessorKey: 'distanceKm',
        meta: { headerTitle: 'Distance' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Distance" />,
        cell: ({ row }) => (
          <span className="text-xs text-foreground-muted">
            {row.original.distanceKm !== null ? `${row.original.distanceKm.toFixed(1)} km` : '—'}
          </span>
        ),
        size: 100,
      },
      {
        id: 'latestRevenueCr',
        accessorKey: 'latestRevenueCr',
        meta: { headerTitle: 'Revenue (Cr)' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Revenue (Cr)" />,
        cell: ({ row }) => (
          <span className="text-xs text-foreground-muted">
            {row.original.latestRevenueCr !== null ? `₹${Number(row.original.latestRevenueCr.toFixed(2)).toLocaleString('en-IN')} Cr` : '—'}
          </span>
        ),
        size: 120,
      },
      {
        id: 'latestSignalFreshness',
        accessorKey: 'latestSignalFreshness',
        meta: { headerTitle: 'Latest Signal' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Latest Signal" />,
        cell: ({ row }) => <span className="text-xs text-foreground-muted">{row.original.latestSignalFreshness || '—'}</span>,
        size: 130,
      },
    ],
    [warehouseFilter, warehouseName]
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: prospects,
    getRowId: (row: DiscoveredCompany) => String(row.id),
    state: { pagination, sorting, rowSelection },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil((totalCount || 0) / (pagination.pageSize || 10))),
  });

  const selectedCount = Object.keys(rowSelection).length;

  const handleExportSelected = () => {
    const selectedIds = new Set(Object.keys(rowSelection));
    const selected = prospects.filter((p) => selectedIds.has(String(p.id)));
    if (selected.length === 0) {
      toastError('Nothing Selected', 'Select at least one row to export.');
      return;
    }
    exportProspectsCsv(selected.map((company) => ({ company })));
    success('Exported', `${selected.length} prospects exported to CSV.`);
  };

  const isSearching = run !== null && (run.status === 'queued' || run.status === 'running');
  // Only offer enrichment when this run actually brought companies to the warehouse.
  const showEnrichBanner = run?.status === 'done' && run.revenueEnrichmentStatus === 'not_started' && run.companiesLinked > 0;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fairway-600" />
            AI Discovery
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Find companies near your warehouses, scored by expansion, hiring, funding and distress signals.
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px]">
            <label className="text-[11px] font-semibold text-foreground-muted block mb-1">Warehouse</label>
            <Combobox
              options={warehouses.map((w) => ({ value: w.id, label: w.city ? `${w.name} · ${w.city}` : w.name }))}
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder={warehousesLoaded ? 'No warehouse with a map location' : 'Loading warehouses…'}
              disabled={isSearching || warehouses.length === 0}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-foreground-muted block mb-1">Radius (km)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-24 bg-surface-muted border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
              disabled={isSearching}
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            isLoading={isStarting || isSearching}
            disabled={!warehouseId}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            className="rounded-xl text-xs font-semibold"
          >
            {isSearching ? 'Searching…' : 'Find Prospects'}
          </Button>
        </div>
        {warehousesLoaded && warehouses.length === 0 && (
          <p className="text-[11px] text-foreground-muted">
            None of your warehouses has a map location yet. Add latitude and longitude on the warehouse page to search around it.
          </p>
        )}
      </Card>

      {isSearching && (
        <div className="py-10 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-fairway-600 animate-spin mx-auto" />
          <p className="text-xs text-foreground-muted">
            Searching {radiusKm} km around {warehouseName(run?.propertyId ?? warehouseId)} and classifying businesses — this can take a minute for larger radii.
          </p>
        </div>
      )}

      {showEnrichBanner && (
        <Card className="p-4 flex items-center justify-between gap-3 border-fairway-600/30 bg-fairway-600/5">
          <p className="text-xs text-foreground">
            This search brought {run?.companiesLinked} {run?.companiesLinked === 1 ? 'company' : 'companies'} to {warehouseName(run?.propertyId ?? null)}. Research revenue for the ones without it to improve opportunity scoring?
          </p>
          <Button type="button" size="sm" onClick={handleEnrichRevenue} isLoading={isEnriching} className="rounded-lg text-xs font-semibold shrink-0">
            {isEnriching ? `Enriching… (${run?.revenueEnrichedCount ?? 0})` : 'Enrich Revenue'}
          </Button>
        </Card>
      )}

      {loadError && (
        <Card className="p-4 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Unable to load AI Discovery prospects</p>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">{loadError}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => loadResults()} className="h-8 text-xs cursor-pointer">
            Retry
          </Button>
        </Card>
      )}

      {!isSearching && (hasResults || !loadError) && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search companies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-52 bg-surface-muted border border-border rounded-lg text-xs text-foreground focus:outline-none"
              />
            </div>
            <Combobox
              options={[{ value: 'all', label: 'All Business Types' }, ...businessTypes.map((bt) => ({ value: bt.businessType || '', label: `${bt.businessType || 'Unknown'} (${bt.count})` }))]}
              value={businessTypeFilter}
              onChange={setBusinessTypeFilter}
              placeholder="All Business Types"
              className="w-56"
            />
            {warehouses.length > 0 && (
              <Combobox
                options={[{ value: 'all', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: `Near ${w.name}` }))]}
                value={warehouseFilter}
                onChange={setWarehouseFilter}
                placeholder="All Warehouses"
                className="w-72"
              />
            )}
            <Combobox
              options={[
                { value: 'all', label: 'Any Score' },
                { value: '70', label: 'Score ≥ 70' },
                { value: '40', label: 'Score ≥ 40' },
              ]}
              value={minScore}
              onChange={setMinScore}
              placeholder="Any Score"
              className="w-36"
            />
            <Combobox
              options={[
                { value: 'score', label: 'Sort: Score' },
                { value: 'recency', label: 'Sort: Recency' },
                { value: 'revenue', label: 'Sort: Revenue' },
                { value: 'distance', label: 'Sort: Distance' },
              ]}
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              placeholder="Sort"
              className="w-40"
            />
            <div className="flex-1" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportSelected}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="rounded-lg text-xs font-semibold"
              disabled={selectedCount === 0}
            >
              Export Selected {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
          </div>

          <Card className="p-0 border border-border bg-surface shadow-xs rounded-xl overflow-hidden">
            <DataGrid table={table} recordCount={totalCount} tableLayout={{ columnsResizable: true, headerSticky: true }} onRowClick={(row) => onSelectProspect(row.id)}>
              <DataGridContainer className="w-full">
                <DataGridScrollArea className="w-full overflow-auto max-h-[calc(100vh-420px)]" orientation="both">
                  <DataGridTable />
                </DataGridScrollArea>
              </DataGridContainer>
              {prospects.length > 0 && <DataGridPagination sizes={[10, 20, 50, 100]} />}
            </DataGrid>
          </Card>

          {prospects.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-xs text-foreground-muted">
                {warehouseFilter !== 'all' && !debouncedSearch && businessTypeFilter === 'all' && minScore === 'all'
                  ? `No companies found near ${warehouseName(warehouseFilter)} yet. Run a search around it above.`
                  : 'No discovered companies match these filters yet.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AiDiscoveryPage;
