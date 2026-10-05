import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Loader2, MapPin, TrendingUp, Download, Search as SearchIcon } from 'lucide-react';
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
import { exportProspectsCsv } from '../utils/exportProspectsCsv';

export interface AiDiscoveryPageProps {
  onSelectProspect: (id: number) => void;
}

const POLL_INTERVAL_MS = 4000;

const scoreBadgeClass = (score: number | null) => {
  if (score === null) return 'bg-surface-muted text-foreground-muted border-border';
  if (score >= 70) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (score >= 40) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-surface-muted text-foreground-muted border-border';
};

export const AiDiscoveryPage: React.FC<AiDiscoveryPageProps> = ({ onSelectProspect }) => {
  const { success, error: toastError } = useToast();

  const [lat, setLat] = useState('21.4779173');
  const [lng, setLng] = useState('72.7234733');
  const [radiusKm, setRadiusKm] = useState(10);
  const [run, setRun] = useState<DiscoveryRun | null>(null);
  const [prospects, setProspects] = useState<DiscoveredCompany[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeCount[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState('');
  // The box updates `search` per keystroke; the query only uses this settled value.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const latestRequestRef = useRef(0);
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
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
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadResults = async (runId?: number) => {
    const requestId = ++latestRequestRef.current;
    const res = await IntelligenceService.listDiscoveredCompanies({
      discoveryRunId: runId,
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
    }
  };

  const handleSearch = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      toastError('Invalid Coordinates', 'Enter valid latitude and longitude.');
      return;
    }

    setIsStarting(true);
    setProspects([]);
    setRowSelection({});
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    try {
      const res = await IntelligenceService.startDiscoveryRun({ lat: latNum, lng: lngNum, radiusKm });
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
          await loadResults(runId);
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
          await loadResults(run.id);
          success('Revenue Enriched', `Researched revenue for ${poll.data.revenueEnrichedCount} companies.`);
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      setIsEnriching(false);
      toastError('Enrich Failed', err.message || 'Could not start revenue enrichment.');
    }
  };

  // Re-run the results query (server-side paginated) whenever a filter or page changes, on
  // mount, scoped to the active run if a fresh search just completed, otherwise across every
  // already-discovered company.
  useEffect(() => {
    if (!run || run.status === 'done') {
      loadResults(run?.status === 'done' ? run.id : undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, businessTypeFilter, minScore, sortBy, pagination.pageIndex, pagination.pageSize]);

  // A filter change can leave the current page out of range; jump back to page 1.
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, businessTypeFilter, minScore, sortBy]);

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
    []
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
  const showEnrichBanner = run?.status === 'done' && run.revenueEnrichmentStatus === 'not_started' && prospects.length > 0;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fairway-600" />
            AI Discovery
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Search for companies near a location, scored by expansion/hiring/funding/distress signals.
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] font-semibold text-foreground-muted block mb-1">Latitude</label>
            <input
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-32 bg-surface-muted border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
              disabled={isSearching}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-foreground-muted block mb-1">Longitude</label>
            <input
              type="text"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-32 bg-surface-muted border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
              disabled={isSearching}
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
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            className="rounded-xl text-xs font-semibold"
          >
            {isSearching ? 'Searching…' : 'Find Prospects'}
          </Button>
        </div>
      </Card>

      {isSearching && (
        <div className="py-10 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-fairway-600 animate-spin mx-auto" />
          <p className="text-xs text-foreground-muted">
            Tiling a {radiusKm}km radius, classifying businesses, and scoring opportunity — this can take a minute for larger radii.
          </p>
        </div>
      )}

      {showEnrichBanner && (
        <Card className="p-4 flex items-center justify-between gap-3 border-fairway-600/30 bg-fairway-600/5">
          <p className="text-xs text-foreground">
            {prospects.length} companies found. Research revenue for all of them to improve opportunity scoring?
          </p>
          <Button type="button" size="sm" onClick={handleEnrichRevenue} isLoading={isEnriching} className="rounded-lg text-xs font-semibold shrink-0">
            {isEnriching ? `Enriching… (${run?.revenueEnrichedCount ?? 0})` : 'Enrich Revenue'}
          </Button>
        </Card>
      )}

      {!isSearching && hasResults && (
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
            />
            <Combobox
              options={[
                { value: 'all', label: 'Any Score' },
                { value: '70', label: 'Score ≥ 70' },
                { value: '40', label: 'Score ≥ 40' },
              ]}
              value={minScore}
              onChange={setMinScore}
              placeholder="Any Score"
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
                {run?.status === 'done'
                  ? `No companies found within ${run.radiusKm}km of this location.`
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
