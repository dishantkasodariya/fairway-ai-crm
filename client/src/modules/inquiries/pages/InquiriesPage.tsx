import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  UploadCloud,
  MapPin,
  Clock,
  ChevronRight,
  ArrowRight,
  Sparkles,
  LayoutList,
  LayoutGrid,
  List,
  Settings,
  Settings2,
  RefreshCw,
  Table as TableIcon,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  X,
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
import { InquiryService } from '@/modules/core/services/inquiryService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { cn } from '@/modules/core/lib/utils';
import { Inquiry, PipelineStageKey } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card } from '@/modules/core/components/ui/Card';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import {
  WarehouseInquiryCard,
  WarehouseInquiryLineCard,
  WarehouseInquiryCardSkeleton,
} from '../components/WarehouseInquiryCard';
import { WarehouseInquiryEmptyState } from '../components/WarehouseInquiryEmptyState';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from '@tanstack/react-table';

type ColumnVisibilityMap = Record<string, boolean>;
type ColumnPinningMap = {
  start: string[];
  end: string[];
};
import {
  formatINR,
  formatSqFt,
  formatDate,
  formatRelativeDate,
  getPriorityBadge,
  STAGE_CONFIGS,
} from '@/modules/core/utils/formatters';

export interface InquiryListViewProps {
  onSelectInquiry: (id: string) => void;
  onOpenNewInquiry: () => void;
  onOpenImport: () => void;
}

const TABLE_STATE_STORAGE_KEY = 'fw_inquiries_table_state_v3';
const VIEW_MODE_STORAGE_KEY = 'fw_inquiries_view_mode_v3';

const getStoredTableState = () => {
  try {
    const saved = localStorage.getItem(TABLE_STATE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse stored table state', e);
  }
  return {};
};

const getStoredViewMode = (): 'table' | 'line' | 'grid' => {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === 'table' || saved === 'line' || saved === 'grid') return saved;
  } catch (e) {
    console.error('Failed to parse stored view mode', e);
  }
  return 'table';
};

export const InquiryListView: React.FC<InquiryListViewProps> = ({
  onSelectInquiry,
  onOpenNewInquiry,
  onOpenImport,
}) => {
  const { canEdit, currentUser } = useAuth();
  const initialTableState = useMemo(() => getStoredTableState(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  // Draft filter states for drawer (applied only on "Apply Filters" button click)
  const [draftStageFilter, setDraftStageFilter] = useState('all');
  const [draftPriorityFilter, setDraftPriorityFilter] = useState('all');
  const [draftOwnerFilter, setDraftOwnerFilter] = useState('all');
  const [draftCorridorFilter, setDraftCorridorFilter] = useState('all');
  const [draftAreaFilter, setDraftAreaFilter] = useState('all');
  const [draftBudgetFilter, setDraftBudgetFilter] = useState('all');
  const [draftIndustryFilter, setDraftIndustryFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openFilterDrawer = () => {
    setDraftStageFilter(stageFilter);
    setDraftPriorityFilter(priorityFilter);
    setDraftOwnerFilter(ownerFilter);
    setDraftCorridorFilter(corridorFilter);
    setDraftAreaFilter(areaFilter);
    setDraftBudgetFilter(budgetFilter);
    setDraftIndustryFilter(industryFilter);
    setIsFilterDrawerOpen(true);
  };

  const handleApplyFilters = () => {
    setStageFilter(draftStageFilter);
    setPriorityFilter(draftPriorityFilter);
    setOwnerFilter(draftOwnerFilter);
    setCorridorFilter(draftCorridorFilter);
    setAreaFilter(draftAreaFilter);
    setBudgetFilter(draftBudgetFilter);
    setIndustryFilter(draftIndustryFilter);
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setDraftStageFilter('all');
    setDraftPriorityFilter('all');
    setDraftOwnerFilter('all');
    setDraftCorridorFilter('all');
    setDraftAreaFilter('all');
    setDraftBudgetFilter('all');
    setDraftIndustryFilter('all');

    setStageFilter('all');
    setPriorityFilter('all');
    setOwnerFilter('all');
    setCorridorFilter('all');
    setAreaFilter('all');
    setBudgetFilter('all');
    setIndustryFilter('all');
    setIsFilterDrawerOpen(false);
  };

  const isFiltered =
    stageFilter !== 'all' ||
    priorityFilter !== 'all' ||
    corridorFilter !== 'all' ||
    ownerFilter !== 'all' ||
    areaFilter !== 'all' ||
    budgetFilter !== 'all' ||
    industryFilter !== 'all' ||
    draftStageFilter !== 'all' ||
    draftPriorityFilter !== 'all' ||
    draftCorridorFilter !== 'all' ||
    draftOwnerFilter !== 'all' ||
    draftAreaFilter !== 'all' ||
    draftBudgetFilter !== 'all' ||
    draftIndustryFilter !== 'all';

  const [viewMode, setViewMode] = useState<'table' | 'line' | 'grid'>(() => getStoredViewMode());
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Controlled Table Grid State (Persisted)
  const [pagination, setPagination] = useState<PaginationState>(() => initialTableState.pagination || {
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>(() => initialTableState.sorting || []);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityMap>(() => initialTableState.columnVisibility || {});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningMap>(
    () => ({
      start: Array.isArray(initialTableState.columnPinning?.start)
        ? initialTableState.columnPinning.start
        : ['inquiryNumber'],
      end: Array.isArray(initialTableState.columnPinning?.end)
        ? initialTableState.columnPinning.end
        : ['actions'],
    })
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => initialTableState.columnOrder || []);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => initialTableState.columnSizing || {});

  // Persist View Mode
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (e) {
      console.error('Failed to persist view mode', e);
    }
  }, [viewMode]);

  // Persist Table Grid State (column visibility, pinning, sorting, order, sizing, pagination)
  useEffect(() => {
    try {
      localStorage.setItem(
        TABLE_STATE_STORAGE_KEY,
        JSON.stringify({
          pagination,
          sorting,
          columnVisibility,
          columnPinning,
          columnOrder,
          columnSizing,
        })
      );
    } catch (e) {
      console.error('Failed to persist table state', e);
    }
  }, [pagination, sorting, columnVisibility, columnPinning, columnOrder, columnSizing]);

  const users = StorageService.getUsers();
  const pipelineStages = StorageService.getPipelineStages();

  const loadInquiries = async () => {
    setIsLoading(true);
    try {
      const activeSort = sorting[0];
      const res = await InquiryService.getInquiries({
        search: debouncedSearchQuery || undefined,
        stage: stageFilter !== 'all' ? stageFilter : undefined,
        status: undefined,
        corridor: corridorFilter !== 'all' ? corridorFilter : undefined,
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        sortBy: activeSort?.id || 'createdAt',
        ascending: activeSort ? !activeSort.desc : false,
      });

      if (res.success && res.data) {
        setInquiries(res.data);
        setTotalCount(res.totalCount !== undefined ? res.totalCount : res.data.length);
      } else {
        const local = StorageService.getInquiries();
        setInquiries(local);
        setTotalCount(local.length);
      }
    } catch {
      const local = StorageService.getInquiries();
      setInquiries(local);
      setTotalCount(local.length);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset pageIndex when search or filter values change
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [debouncedSearchQuery, stageFilter, priorityFilter, corridorFilter, ownerFilter, areaFilter, budgetFilter, industryFilter]);

  // Load inquiries when pagination, sorting, or search changes
  useEffect(() => {
    loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearchQuery,
    stageFilter,
    priorityFilter,
    corridorFilter,
    ownerFilter,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
  ]);

  const uniqueCorridors = Array.from(new Set(inquiries.map((i) => i.targetCorridor || i.location))).filter(Boolean);

  // Combobox Options Memo
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All statuses' },
      ...pipelineStages.map((stg) => ({ value: stg.key, label: stg.label })),
    ],
    [pipelineStages]
  );

  const priorityOptions = useMemo(
    () => [
      { value: 'all', label: 'All priorities' },
      { value: 'High', label: 'High' },
      { value: 'Medium', label: 'Medium' },
      { value: 'Low', label: 'Low' },
    ],
    []
  );

  const corridorOptions = useMemo(
    () => [
      { value: 'all', label: 'All corridors' },
      ...uniqueCorridors.map((cor) => ({ value: cor, label: cor })),
    ],
    [uniqueCorridors]
  );

  const salespersonOptions = useMemo(
    () => [
      { value: 'all', label: 'All salespersons' },
      ...users.map((u) => ({ value: u.id, label: u.name })),
    ],
    [users]
  );

  const areaOptions = useMemo(
    () => [
      { value: 'all', label: 'All area sizes' },
      { value: 'under_25k', label: '< 25,000 Sq.Ft.' },
      { value: '25k_50k', label: '25,000 - 50,000 Sq.Ft.' },
      { value: '50k_100k', label: '50,000 - 100,000 Sq.Ft.' },
      { value: 'over_100k', label: '> 100,000 Sq.Ft.' },
    ],
    []
  );

  const budgetOptions = useMemo(
    () => [
      { value: 'all', label: 'All budget ranges' },
      { value: 'under_5L', label: '< ₹5 Lakhs / mo' },
      { value: '5L_15L', label: '₹5L - ₹15L / mo' },
      { value: '15L_30L', label: '₹15L - ₹30L / mo' },
      { value: 'over_30L', label: '> ₹30 Lakhs / mo' },
    ],
    []
  );

  const industryOptions = useMemo(
    () => [
      { value: 'all', label: 'All industry types' },
      { value: 'Logistics', label: '3PL & Logistics' },
      { value: 'E-Commerce', label: 'E-Commerce & Retail' },
      { value: 'Cold Storage', label: 'Cold Storage & Pharma' },
      { value: 'FMCG', label: 'FMCG & Consumer Goods' },
      { value: 'Manufacturing', label: 'Heavy Manufacturing' },
      { value: 'Chemical', label: 'Chemical & Hazmat' },
    ],
    []
  );

  const activeFiltersCount =
    (stageFilter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (ownerFilter !== 'all' ? 1 : 0) +
    (corridorFilter !== 'all' ? 1 : 0) +
    (areaFilter !== 'all' ? 1 : 0) +
    (budgetFilter !== 'all' ? 1 : 0) +
    (industryFilter !== 'all' ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStageFilter('all');
    setPriorityFilter('all');
    setOwnerFilter('all');
    setCorridorFilter('all');
    setAreaFilter('all');
    setBudgetFilter('all');
    setIndustryFilter('all');
    setDraftStageFilter('all');
    setDraftPriorityFilter('all');
    setDraftOwnerFilter('all');
    setDraftCorridorFilter('all');
    setDraftAreaFilter('all');
    setDraftBudgetFilter('all');
    setDraftIndustryFilter('all');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsLoading(true);
    handleClearAllFilters();
    try {
      // Small visual delay so the skeleton placeholder displays cleanly before rendering fresh data
      const [res] = await Promise.all([
        InquiryService.getInquiries({
          pageNumber: 1,
          pageSize: pagination.pageSize,
          sortBy: sorting[0]?.id || 'createdAt',
          ascending: sorting[0] ? !sorting[0].desc : false,
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);

      if (res.success && res.data) {
        setInquiries(res.data);
        setTotalCount(res.totalCount !== undefined ? res.totalCount : res.data.length);
      } else {
        const local = StorageService.getInquiries();
        setInquiries(local);
        setTotalCount(local.length);
      }
    } catch {
      const local = StorageService.getInquiries();
      setInquiries(local);
      setTotalCount(local.length);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getStageBadgeStyle = (stageKey: string) => {
    const config = STAGE_CONFIGS[stageKey as PipelineStageKey];
    if (!config) return { className: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', label: stageKey };
    return {
      className: `${config.bg} ${config.text} ${config.border}`,
      label: config.label,
    };
  };

  // Filter inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inq.inquiryNumber.toLowerCase().includes(q) ||
      inq.companyName.toLowerCase().includes(q) ||
      inq.location.toLowerCase().includes(q) ||
      inq.requirement.toLowerCase().includes(q) ||
      (inq.contactName && inq.contactName.toLowerCase().includes(q));

    const matchesStage = stageFilter === 'all' || inq.stage === stageFilter;
    const matchesPriority = priorityFilter === 'all' || inq.priority === priorityFilter;
    const matchesOwner = ownerFilter === 'all' || inq.salespersonId === ownerFilter;
    const matchesCorridor = corridorFilter === 'all' || (inq.targetCorridor || inq.location) === corridorFilter;

    const matchesArea =
      areaFilter === 'all' ||
      (areaFilter === 'under_25k' && (inq.requiredAreaSqFt || 0) < 25000) ||
      (areaFilter === '25k_50k' && (inq.requiredAreaSqFt || 0) >= 25000 && (inq.requiredAreaSqFt || 0) <= 50000) ||
      (areaFilter === '50k_100k' && (inq.requiredAreaSqFt || 0) > 50000 && (inq.requiredAreaSqFt || 0) <= 100000) ||
      (areaFilter === 'over_100k' && (inq.requiredAreaSqFt || 0) > 100000);

    const matchesBudget =
      budgetFilter === 'all' ||
      (budgetFilter === 'under_5L' && (inq.budgetMonthlyINR || 0) < 500000) ||
      (budgetFilter === '5L_15L' && (inq.budgetMonthlyINR || 0) >= 500000 && (inq.budgetMonthlyINR || 0) <= 1500000) ||
      (budgetFilter === '15L_30L' && (inq.budgetMonthlyINR || 0) > 1500000 && (inq.budgetMonthlyINR || 0) <= 3000000) ||
      (budgetFilter === 'over_30L' && (inq.budgetMonthlyINR || 0) > 3000000);

    const matchesIndustry =
      industryFilter === 'all' ||
      (inq.industry && inq.industry.toLowerCase().includes(industryFilter.toLowerCase())) ||
      (inq.requirement && inq.requirement.toLowerCase().includes(industryFilter.toLowerCase()));

    return matchesQuery && matchesStage && matchesPriority && matchesOwner && matchesCorridor && matchesArea && matchesBudget && matchesIndustry;
  });

  const pagedInquiries = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredInquiries.slice(start, start + pagination.pageSize);
  }, [filteredInquiries, pagination.pageIndex, pagination.pageSize]);

  const inquiryColumns = useMemo<ColumnDef<DataGridFeatures, Inquiry>[]>(
    () => [
      {
        accessorKey: 'inquiryNumber',
        id: 'inquiryNumber',
        header: ({ column }) => <DataGridColumnHeader title="Inquiry #" column={column} />,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onSelectInquiry(row.original.id)}
            className="font-mono font-bold text-fairway-800 dark:text-fairway-300 bg-fairway-50 dark:bg-fairway-950/70 px-2.5 py-1 rounded-md border border-fairway-200 dark:border-fairway-800/60 hover:bg-fairway-100 dark:hover:bg-fairway-900/60 hover:border-fairway-300 transition-colors text-xs text-left cursor-pointer inline-flex items-center"
          >
            {row.original.inquiryNumber}
          </button>
        ),
        size: 140,
        minSize: 130,
        enableSorting: true,
        enablePinning: true,
      },
      {
        accessorKey: 'companyName',
        id: 'companyName',
        header: ({ column }) => <DataGridColumnHeader title="Customer Company" column={column} />,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onSelectInquiry(row.original.id)}
            className="font-semibold text-foreground hover:text-fairway-600 dark:hover:text-fairway-400 text-left transition-colors truncate max-w-[200px] block cursor-pointer text-xs"
          >
            {row.original.companyName}
          </button>
        ),
        size: 220,
        minSize: 180,
        enableSorting: true,
      },
      {
        accessorKey: 'requirement',
        id: 'requirement',
        header: ({ column }) => <DataGridColumnHeader title="Requirement / Specs" column={column} />,
        cell: ({ row }) => (
          <span className="truncate block text-foreground-muted max-w-xs text-xs" title={row.original.requirement}>
            {row.original.requirement}
          </span>
        ),
        size: 240,
        minSize: 200,
        enableSorting: false,
      },
      {
        accessorKey: 'requiredAreaSqFt',
        id: 'requiredAreaSqFt',
        header: ({ column }) => <DataGridColumnHeader title="Required Area" column={column} />,
        cell: ({ row }) => (
          <span className="font-bold text-fairway-900 dark:text-fairway-300 text-xs tabular-nums">
            {formatSqFt(row.original.requiredAreaSqFt)}
          </span>
        ),
        size: 150,
        minSize: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'location',
        id: 'location',
        header: ({ column }) => <DataGridColumnHeader title="Location / Corridor" column={column} />,
        cell: ({ row }) => <span className="text-foreground-muted text-xs truncate block">{row.original.location}</span>,
        size: 170,
        minSize: 150,
        enableSorting: true,
      },
      {
        accessorKey: 'budgetMonthlyINR',
        id: 'budgetMonthlyINR',
        header: ({ column }) => <DataGridColumnHeader title="Monthly Budget" column={column} />,
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
            {formatINR(row.original.budgetMonthlyINR)}
          </span>
        ),
        size: 150,
        minSize: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'stage',
        id: 'stage',
        header: ({ column }) => <DataGridColumnHeader title="Stage" column={column} />,
        cell: ({ row }) => {
          const stageStyle = getStageBadgeStyle(row.original.stage);
          return (
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 whitespace-nowrap ${stageStyle.className}`}>
              <span>{stageStyle.label}</span>
            </span>
          );
        },
        size: 150,
        minSize: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'priority',
        id: 'priority',
        header: ({ column }) => <DataGridColumnHeader title="Priority" column={column} />,
        cell: ({ row }) => {
          const prioBadge = getPriorityBadge(row.original.priority);
          return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center whitespace-nowrap ${prioBadge.bg}`}>
              {row.original.priority}
            </span>
          );
        },
        size: 110,
        minSize: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'salespersonName',
        id: 'salespersonName',
        header: ({ column }) => <DataGridColumnHeader title="Owner" column={column} />,
        cell: ({ row }) => <span className="text-foreground-muted font-medium text-xs truncate block">{row.original.salespersonName}</span>,
        size: 140,
        minSize: 120,
        enableSorting: true,
      },
    ],
    [onSelectInquiry]
  );

  const table = useTable({
    features: dataGridFeatures,
    columns: inquiryColumns,
    data: filteredInquiries,
    pageCount: Math.ceil((totalCount || filteredInquiries.length || 0) / (pagination.pageSize || 10)),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: Inquiry) => row.id,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnPinning,
      columnOrder,
      columnSizing,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
  });

  // Calculate high-level KPIs
  const totalPipelineValue = inquiries
    .filter((i) => i.status === 'Active')
    .reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

  const highPriorityCount = inquiries.filter((i) => i.priority === 'High' && i.status === 'Active').length;

  const overdueCount = inquiries.filter((i) => {
    if (!i.nextFollowUpDate || i.status !== 'Active') return false;
    return new Date(i.nextFollowUpDate) < new Date(new Date().toDateString());
  }).length;

  const exportCSV = () => {
    const headers = [
      'Inquiry Number',
      'Company Name',
      'Requirement',
      'Required Area (sq.ft)',
      'Location',
      'Corridor',
      'Stage',
      'Owner',
      'Monthly Budget (INR)',
      'Priority',
      'Next Follow-up',
    ];
    const rows = filteredInquiries.map((i) => [
      `"${i.inquiryNumber}"`,
      `"${i.companyName}"`,
      `"${i.requirement.replace(/"/g, '""')}"`,
      `"${i.requiredAreaSqFt}"`,
      `"${i.location}"`,
      `"${i.targetCorridor || ''}"`,
      `"${i.stage}"`,
      `"${i.salespersonName}"`,
      `"${i.budgetMonthlyINR}"`,
      `"${i.priority}"`,
      `"${i.nextFollowUpDate || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fairway_CRM_Inquiries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 w-full text-left">
      {/* Header Pattern with Actions & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-fairway-600" />
            <span>Warehouse Inquiries & Leads</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Track industrial leasing requirements, deal sizes, corridor locations, and conversion stages.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={exportCSV} leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenImport} leftIcon={<UploadCloud className="w-3.5 h-3.5" />}>
            Import
          </Button>
          {canEdit && (
            <Button size="sm" variant="primary" onClick={onOpenNewInquiry} leftIcon={<Plus className="w-4 h-4" />}>
              New Inquiry
            </Button>
          )}
        </div>
      </div>

      {/* Modern KPI Cards with Glowing Sparkline Waves (Fully Theme-Adaptive) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Open Pipeline */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex items-end justify-between transition-all hover:border-fairway-400/60 relative overflow-hidden group">
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight block">
              Open Pipeline
            </span>
            <span className="text-xs text-foreground-muted mt-4 block font-medium">
              {inquiries.length} open deals
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight block mt-0.5">
              {formatINR(totalPipelineValue, true)}
            </span>
          </div>

          <div className="shrink-0 pb-1">
            <svg className="w-28 sm:w-36 h-12 overflow-visible" viewBox="0 0 120 40">
              <defs>
                <linearGradient id="themeWave1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--fw-600, #0084FF)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--fw-600, #0084FF)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 28 Q 12 18, 24 24 T 48 18 T 72 14 T 96 8 T 120 4 L 120 40 L 0 40 Z"
                fill="url(#themeWave1)"
              />
              <path
                d="M 0 28 Q 12 18, 24 24 T 48 18 T 72 14 T 96 8 T 120 4"
                fill="none"
                stroke="var(--fw-600, #0084FF)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Weighted Forecast */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex items-end justify-between transition-all hover:border-accent-400/60 relative overflow-hidden group">
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight block">
              Weighted Forecast
            </span>
            <span className="text-xs text-foreground-muted mt-4 block font-medium">
              Next 90 days
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight block mt-0.5">
              {formatINR(Math.round(totalPipelineValue * 0.65), true)}
            </span>
          </div>

          <div className="shrink-0 pb-1">
            <svg className="w-28 sm:w-36 h-12 overflow-visible" viewBox="0 0 120 40">
              <defs>
                <linearGradient id="themeWave2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-500, #10B981)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--accent-500, #10B981)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 30 Q 15 22, 30 25 T 60 19 T 90 12 T 120 8 L 120 40 L 0 40 Z"
                fill="url(#themeWave2)"
              />
              <path
                d="M 0 30 Q 15 22, 30 25 T 60 19 T 90 12 T 120 8"
                fill="none"
                stroke="var(--accent-500, #10B981)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Win Rate */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex items-end justify-between transition-all hover:border-indigo-400/60 relative overflow-hidden group">
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight block">
              Win Rate
            </span>
            <span className="text-xs text-foreground-muted mt-4 block font-medium">
              Last 90 days
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight block mt-0.5">
              26%
            </span>
          </div>

          <div className="shrink-0 pb-1">
            <svg className="w-28 sm:w-36 h-12 overflow-visible" viewBox="0 0 120 40">
              <defs>
                <linearGradient id="themeWave3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-5, #8B5CF6)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--chart-5, #8B5CF6)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 26 Q 15 18, 30 22 T 60 14 T 90 10 T 120 6 L 120 40 L 0 40 Z"
                fill="url(#themeWave3)"
              />
              <path
                d="M 0 26 Q 15 18, 30 22 T 60 14 T 90 10 T 120 6"
                fill="none"
                stroke="var(--chart-5, #8B5CF6)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
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
            placeholder="Search inquiries, requirements, companies, cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
          />
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
                {table
                  .getAllLeafColumns()
                  .filter((col) => col.id !== 'actions' && col.id !== 'inquiryNumber')
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={col.getIsVisible()}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(val) => col.toggleVisibility(!!val)}
                      className="text-xs cursor-pointer capitalize"
                    >
                      {typeof col.columnDef.header === 'string'
                        ? col.columnDef.header
                        : col.id.replace(/([A-Z])/g, ' $1')}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh / Reset Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleRefresh}
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

            {/* Segmented View Switcher (List / Card View matching exact reference UI) */}
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

      {/* ================= VIEW MODE 1: REUI C-DATA-GRID-16 ================= */}
      {viewMode === 'table' ? (
        <DataGrid
          table={table}
          recordCount={totalCount || filteredInquiries.length}
          isLoading={isLoading}
          tableLayout={{
            columnsPinnable: true,
            columnsResizable: true,
            headerSticky: true,
          }}
        >
          <div className="w-full space-y-2.5">
            {filteredInquiries.length === 0 && !isLoading ? (
              <WarehouseInquiryEmptyState
                hasFilters={activeFiltersCount > 0 || !!searchQuery}
                onClearFilters={handleClearAllFilters}
                onNewInquiry={onOpenNewInquiry}
              />
            ) : (
              <Card className="p-0 border border-border bg-surface shadow-xs rounded-xl overflow-hidden">
                <DataGridContainer className="w-full">
                  <DataGridScrollArea className="w-full max-h-[calc(100vh-280px)] overflow-auto" orientation="both">
                    <DataGridTable />
                  </DataGridScrollArea>
                </DataGridContainer>
              </Card>
            )}
            {filteredInquiries.length > 0 && <DataGridPagination sizes={[10, 20, 50, 100]} />}
          </div>
        </DataGrid>
      ) : viewMode === 'line' ? (
        /* ================= VIEW MODE 2: SINGLE-LINE DENSE CARDS ================= */
        <DataGrid
          table={table}
          recordCount={filteredInquiries.length}
          isLoading={isLoading}
        >
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: Math.min(pagination.pageSize, 6) }).map((_, i) => (
                  <WarehouseInquiryCardSkeleton key={i} mode="line" />
                ))}
              </div>
            ) : pagedInquiries.length === 0 ? (
              <WarehouseInquiryEmptyState
                hasFilters={activeFiltersCount > 0 || !!searchQuery}
                onClearFilters={handleClearAllFilters}
                onNewInquiry={onOpenNewInquiry}
              />
            ) : (
              <div className="space-y-2">
                {pagedInquiries.map((inq) => (
                  <WarehouseInquiryLineCard
                    key={inq.id}
                    inquiry={inq}
                    onSelect={onSelectInquiry}
                  />
                ))}
              </div>
            )}

            {/* Pagination for Single-Line View */}
            {pagedInquiries.length > 0 && <DataGridPagination sizes={[10, 20, 50, 100]} />}
          </div>
        </DataGrid>
      ) : (
        /* ================= VIEW MODE 3: RICH GRID CARDS ================= */
        <DataGrid
          table={table}
          recordCount={filteredInquiries.length}
          isLoading={isLoading}
        >
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: Math.min(pagination.pageSize, 6) }).map((_, i) => (
                  <WarehouseInquiryCardSkeleton key={i} mode="grid" />
                ))}
              </div>
            ) : pagedInquiries.length === 0 ? (
              <WarehouseInquiryEmptyState
                hasFilters={activeFiltersCount > 0 || !!searchQuery}
                onClearFilters={handleClearAllFilters}
                onNewInquiry={onOpenNewInquiry}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedInquiries.map((inq) => (
                  <WarehouseInquiryCard
                    key={inq.id}
                    inquiry={inq}
                    onSelect={onSelectInquiry}
                  />
                ))}
              </div>
            )}

            {/* Pagination for Card View */}
            {pagedInquiries.length > 0 && <DataGridPagination sizes={[10, 20, 50, 100]} />}
          </div>
        </DataGrid>
      )}

      {/* Advanced Filters Drawer (Right Slide-out with Combobox & Apply Trigger) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in select-none overflow-hidden m-0 p-0">
          {/* Backdrop */}
          <div
            className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-surface border-l border-border border-t-0 border-r-0 border-b-0 h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none ring-0">
            {/* Header */}
            <div className="p-5 border-b border-border bg-surface flex items-start justify-between border-t-0">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Advanced Filters
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Filter inquiries by additional criteria...
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
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Status</label>
                <Combobox
                  options={statusOptions}
                  value={draftStageFilter}
                  onChange={setDraftStageFilter}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Priority</label>
                <Combobox
                  options={priorityOptions}
                  value={draftPriorityFilter}
                  onChange={setDraftPriorityFilter}
                  placeholder="Select priority..."
                  searchPlaceholder="Search priority..."
                />
              </div>

              {/* Location / Corridor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Location / Corridor</label>
                <Combobox
                  options={corridorOptions}
                  value={draftCorridorFilter}
                  onChange={setDraftCorridorFilter}
                  placeholder="Select corridor..."
                  searchPlaceholder="Search corridor..."
                />
              </div>

              {/* Assigned Salesperson */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Assigned Salesperson</label>
                <Combobox
                  options={salespersonOptions}
                  value={draftOwnerFilter}
                  onChange={setDraftOwnerFilter}
                  placeholder="Select salesperson..."
                  searchPlaceholder="Search salesperson..."
                />
              </div>

              {/* Required Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Required Area (Sq.Ft.)</label>
                <Combobox
                  options={areaOptions}
                  value={draftAreaFilter}
                  onChange={setDraftAreaFilter}
                  placeholder="Select area size..."
                  searchPlaceholder="Search area size..."
                />
              </div>

              {/* Monthly Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Monthly Budget</label>
                <Combobox
                  options={budgetOptions}
                  value={draftBudgetFilter}
                  onChange={setDraftBudgetFilter}
                  placeholder="Select budget range..."
                  searchPlaceholder="Search budget range..."
                />
              </div>

              {/* Industry / Usage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Industry / Suitability</label>
                <Combobox
                  options={industryOptions}
                  value={draftIndustryFilter}
                  onChange={setDraftIndustryFilter}
                  placeholder="Select industry..."
                  searchPlaceholder="Search industry..."
                />
              </div>
            </div>

            {/* Footer Buttons Matching Active Theme & Radius */}
            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!isFiltered}
                onClick={handleClearFilters}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-button border text-xs font-bold transition-all text-center",
                  isFiltered
                    ? "bg-surface hover:bg-surface-muted border-border text-foreground cursor-pointer shadow-2xs"
                    : "bg-surface-muted/40 border-border/40 text-foreground-muted/40 cursor-not-allowed opacity-50 pointer-events-none"
                )}
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex-1 py-2.5 px-4 rounded-button bg-fairway-600 hover:bg-fairway-700 active:bg-fairway-800 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer text-center"
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

export const InquiriesPage = InquiryListView;
export default InquiriesPage;
