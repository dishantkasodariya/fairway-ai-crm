import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
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
import { PipelineStageService } from '@/modules/core/services/pipelineStageService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { cn } from '@/modules/core/lib/utils';
import { Inquiry, PipelineStageKey } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card } from '@/modules/core/components/ui/Card';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { EditInquiryModal } from '../components/EditInquiryModal';
import { InquiriesList } from '../components/InquiriesList';
import { InquiriesCard } from '../components/InquiriesCard';
import { WarehouseInquiryEmptyState } from '../components/WarehouseInquiryEmptyState';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import {
  CommonDataGrid,
  DataGridColumnVisibilityMenu,
} from '@/modules/core/components/ui/CommonDataGrid';
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
  const { canEdit, currentUser, canCreate, canEditModule, canDeleteModule, canExport, canImport } = useAuth();
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

  const { success: toastSuccess, error: toastError } = useToast();

  // Controlled Table Grid State (Persisted)
  const [pagination, setPagination] = useState<PaginationState>(() => initialTableState.pagination || {
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>(() => initialTableState.sorting || []);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityMap>(() => initialTableState.columnVisibility || {});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningMap>(
    () => {
      const savedStart = (initialTableState.columnPinning?.start || []).filter((col: string) => col !== 'select');
      return {
        start: savedStart.length > 0 ? savedStart : ['actions', 'inquiryNumber'],
        end: Array.isArray(initialTableState.columnPinning?.end) ? initialTableState.columnPinning.end : [],
      };
    }
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => initialTableState.columnOrder || []);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => initialTableState.columnSizing || {});

  // Action Modals State
  const [inquiryToEdit, setInquiryToEdit] = useState<Inquiry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [inquiryToDelete, setInquiryToDelete] = useState<Inquiry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const executeDeleteInquiry = async () => {
    if (!inquiryToDelete) return;
    setIsDeleting(true);
    try {
      await InquiryService.deleteInquiry(inquiryToDelete.id);
      toastSuccess('Inquiry Deleted', `Removed ${inquiryToDelete.inquiryNumber} (${inquiryToDelete.companyName}) from CRM.`);
      setIsDeleteModalOpen(false);
      setInquiryToDelete(null);
      loadInquiries();
    } catch (err: any) {
      toastError('Delete Failed', err.message || 'Failed to delete inquiry');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const { users } = useAuth();
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);

  useEffect(() => {
    PipelineStageService.getPipelineStages().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setPipelineStages(res.data);
      }
    });
  }, []);

  const loadInquiries = async (showSpin = false) => {
    if (showSpin) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      if (showSpin) {
        // Smooth visual delay matching Tasks page
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
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
        setInquiries([]);
        setTotalCount(0);
      }
    } catch {
      setInquiries([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSelectInquiry = useCallback(
    (inq: Inquiry) => {
      onSelectInquiry(inq.id);
    },
    [onSelectInquiry]
  );

  const handleSelectInquiryById = useCallback(
    (id: string) => {
      onSelectInquiry(id);
    },
    [onSelectInquiry]
  );

  // Track previous filter values to prevent duplicate concurrent API calls
  const prevFiltersRef = useRef({
    debouncedSearchQuery,
    stageFilter,
    priorityFilter,
    corridorFilter,
    ownerFilter,
    areaFilter,
    budgetFilter,
    industryFilter,
  });

  // Load inquiries when pagination, sorting, or search/filters change (strictly single call per user action)
  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.debouncedSearchQuery !== debouncedSearchQuery ||
      prevFiltersRef.current.stageFilter !== stageFilter ||
      prevFiltersRef.current.priorityFilter !== priorityFilter ||
      prevFiltersRef.current.corridorFilter !== corridorFilter ||
      prevFiltersRef.current.ownerFilter !== ownerFilter ||
      prevFiltersRef.current.areaFilter !== areaFilter ||
      prevFiltersRef.current.budgetFilter !== budgetFilter ||
      prevFiltersRef.current.industryFilter !== industryFilter;

    if (filtersChanged) {
      prevFiltersRef.current = {
        debouncedSearchQuery,
        stageFilter,
        priorityFilter,
        corridorFilter,
        ownerFilter,
        areaFilter,
        budgetFilter,
        industryFilter,
      };

      if (pagination.pageIndex !== 0) {
        // Resetting page to 0 will re-trigger this effect once cleanly with pageIndex 0
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        return;
      }
    }

    loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearchQuery,
    stageFilter,
    priorityFilter,
    corridorFilter,
    ownerFilter,
    areaFilter,
    budgetFilter,
    industryFilter,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
  ]);

  const uniqueCorridors = Array.from(new Set(inquiries.map((i) => i.targetCorridor || i.location))).filter(Boolean);

  // Combobox Options Memo
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All statuses' },
      ...pipelineStages.map((stg: any) => ({ value: stg.key, label: stg.label })),
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

  const handleRefresh = () => {
    loadInquiries(true);
  };

  const getStageBadgeStyle = (stageKey: string) => {
    const config = STAGE_CONFIGS[stageKey as PipelineStageKey];
    if (!config) return { className: 'bg-surface-muted text-foreground border-border', label: stageKey };
    return {
      className: `${config.bg} ${config.text} ${config.border}`,
      label: config.label,
    };
  };

  const isBusy = isLoading || isRefreshing;

  // Filter inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      Boolean(inq.inquiryNumber && inq.inquiryNumber.toLowerCase().includes(q)) ||
      Boolean(inq.companyName && inq.companyName.toLowerCase().includes(q)) ||
      Boolean(inq.location && inq.location.toLowerCase().includes(q)) ||
      Boolean(inq.requirement && inq.requirement.toLowerCase().includes(q)) ||
      Boolean(inq.contactName && inq.contactName.toLowerCase().includes(q));

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
    // If backend already paginated (server returned single page where totalCount > inquiries.length)
    if (totalCount > inquiries.length && inquiries.length <= pagination.pageSize && filteredInquiries.length === inquiries.length) {
      return filteredInquiries;
    }
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredInquiries.slice(start, start + pagination.pageSize);
  }, [filteredInquiries, inquiries.length, pagination.pageIndex, pagination.pageSize, totalCount]);

  const inquiryColumns = useMemo<ColumnDef<DataGridFeatures, Inquiry>[]>(
    () => [
      {
        id: 'actions',
        header: () => <span className="text-[11px] font-semibold text-foreground-muted pl-1">Action</span>,
        cell: ({ row }) => {
          const inq = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                    title="Actions"
                    aria-label="Actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 bg-surface border border-border shadow-dialog z-50">
                  <DropdownMenuItem
                    onClick={() => onSelectInquiry(inq.id)}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-fairway-600" />
                    <span>View Inquiry</span>
                  </DropdownMenuItem>
                  {canEditModule('inquiries') && (
                    <DropdownMenuItem
                      onClick={() => {
                        setInquiryToEdit(inq);
                        setIsEditModalOpen(true);
                      }}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit Inquiry</span>
                    </DropdownMenuItem>
                  )}
                  {canDeleteModule('inquiries') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setInquiryToDelete(inq);
                          setIsDeleteModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Inquiry</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 70,
        minSize: 60,
        maxSize: 80,
        enableSorting: false,
        enableResizing: false,
        enablePinning: true,
      },
      {
        accessorKey: 'inquiryNumber',
        id: 'inquiryNumber',
        meta: { headerTitle: 'Sr. No.' },
        header: ({ column }) => <DataGridColumnHeader title="Sr. No." column={column} />,
        cell: ({ row }) => {
          const serialNo = pagination.pageIndex * pagination.pageSize + row.index + 1;
          return (
            <span className="font-medium text-foreground-muted tabular-nums text-xs pl-2">
              {serialNo}
            </span>
          );
        },
        size: 85,
        minSize: 75,
        maxSize: 95,
        enableSorting: true,
        enablePinning: true,
      },
      {
        accessorKey: 'companyName',
        id: 'companyName',
        header: ({ column }) => <DataGridColumnHeader title="Customer Company & Contact" column={column} />,
        cell: ({ row }) => (
          <div className="py-0.5 min-w-0 max-w-[240px]">
            <button
              type="button"
              onClick={() => handleSelectInquiry(row.original)}
              className="font-bold text-foreground hover:text-primary transition-colors truncate block text-left cursor-pointer text-xs w-full"
            >
              {row.original.companyName}
            </button>
            {row.original.contactName ? (
              <span className="text-[11px] text-foreground-muted truncate block">
                {row.original.contactName} {row.original.contactPhone ? `• ${row.original.contactPhone}` : ''}
              </span>
            ) : row.original.location ? (
              <span className="text-[10px] text-foreground-muted/70 truncate block">
                {row.original.location}
              </span>
            ) : null}
          </div>
        ),
        size: 220,
        minSize: 180,
        enableSorting: true,
      },
      {
        accessorKey: 'requiredAreaSqFt',
        id: 'requirement',
        header: ({ column }) => <DataGridColumnHeader title="Requirement & Budget" column={column} />,
        cell: ({ row }) => (
          <div className="py-0.5 text-xs" title={row.original.requirement || undefined}>
            <div className="font-bold text-foreground tabular-nums whitespace-nowrap">
              {formatSqFt(row.original.requiredAreaSqFt)}
            </div>
            <div className="font-mono text-[11px] text-foreground-muted tabular-nums whitespace-nowrap">
              {formatINR(row.original.budgetMonthlyINR, true)} / mo
            </div>
          </div>
        ),
        size: 170,
        minSize: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'location',
        id: 'location',
        header: ({ column }) => <DataGridColumnHeader title="Corridor" column={column} />,
        cell: ({ row }) => <span className="text-foreground-muted text-xs truncate block">{row.original.targetCorridor || row.original.location || '—'}</span>,
        size: 150,
        minSize: 130,
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
        size: 140,
        minSize: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'priority',
        id: 'priority',
        header: ({ column }) => <DataGridColumnHeader title="Priority" column={column} />,
        cell: ({ row }) => {
          const priority = (row.original.priority || 'Medium').toLowerCase();
          return (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center whitespace-nowrap",
              priority === 'high'
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : priority === 'medium'
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-surface-muted text-foreground-muted border-border"
            )}>
              {row.original.priority || 'Normal'}
            </span>
          );
        },
        size: 100,
        minSize: 90,
        enableSorting: true,
      },
      {
        accessorKey: 'salespersonName',
        id: 'salespersonName',
        header: ({ column }) => <DataGridColumnHeader title="Owner" column={column} />,
        cell: ({ row }) => {
          const ownerName = row.original.salespersonName || 'Unassigned';
          return (
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted font-medium truncate">
              <div className="w-5 h-5 rounded-full bg-surface-muted border border-border text-foreground font-bold text-[9px] flex items-center justify-center shrink-0">
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{ownerName}</span>
            </div>
          );
        },
        size: 130,
        minSize: 110,
        enableSorting: true,
      },
    ],
    [handleSelectInquiry]
  );

  const table = useTable({
    features: dataGridFeatures,
    columns: inquiryColumns,
    data: pagedInquiries,
    pageCount: Math.max(1, Math.ceil(filteredInquiries.length / (pagination.pageSize || 10))),
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

  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch all inquiries from backend without pagination limits
      let allData: Inquiry[] = [];
      try {
        const res = await InquiryService.getInquiries({
          search: debouncedSearchQuery || undefined,
          stage: stageFilter !== 'all' ? stageFilter : undefined,
          corridor: corridorFilter !== 'all' ? corridorFilter : undefined,
          pageNumber: 1,
          pageSize: 10000,
        });
        if (res.success && res.data && res.data.length > 0) {
          allData = res.data;
        }
      } catch {
        // Continue with whatever was fetched
      }

      // 3. Apply active filters to full dataset
      const q = searchQuery.toLowerCase().trim();
      const exportList = allData.filter((inq) => {
        const matchesQuery =
          !q ||
          inq.inquiryNumber?.toLowerCase().includes(q) ||
          inq.companyName?.toLowerCase().includes(q) ||
          inq.location?.toLowerCase().includes(q) ||
          inq.requirement?.toLowerCase().includes(q) ||
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

      const finalRecords = exportList.length > 0 ? exportList : filteredInquiries;

      const headers = [
        'Inquiry Number',
        'Customer Company',
        'Contact Person',
        'Phone',
        'Email',
        'Requirement / Specs',
        'Required Area (sq.ft)',
        'Location',
        'Target Corridor',
        'Industry',
        'Stage',
        'Owner',
        'Monthly Budget (INR)',
        'Priority',
        'Next Action',
        'Next Follow-up Date',
        'Created Date',
      ];

      const rows = finalRecords.map((i) => [
        `"${(i.inquiryNumber || '').replace(/"/g, '""')}"`,
        `"${(i.companyName || '').replace(/"/g, '""')}"`,
        `"${(i.contactName || '').replace(/"/g, '""')}"`,
        `"${(i.contactPhone || '').replace(/"/g, '""')}"`,
        `"${(i.contactEmail || '').replace(/"/g, '""')}"`,
        `"${(i.requirement || '').replace(/"/g, '""')}"`,
        `"${i.requiredAreaSqFt || 0}"`,
        `"${(i.location || '').replace(/"/g, '""')}"`,
        `"${(i.targetCorridor || '').replace(/"/g, '""')}"`,
        `"${(i.industry || '').replace(/"/g, '""')}"`,
        `"${(i.stage || '').replace(/"/g, '""')}"`,
        `"${(i.salespersonName || '').replace(/"/g, '""')}"`,
        `"${i.budgetMonthlyINR || 0}"`,
        `"${(i.priority || '').replace(/"/g, '""')}"`,
        `"${(i.nextAction || '').replace(/"/g, '""')}"`,
        `"${(i.nextFollowUpDate || '').replace(/"/g, '""')}"`,
        `"${(i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fairway_CRM_Inquiries_All_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
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

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {canExport('inquiries') && (
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              disabled={isExporting}
              leftIcon={isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
              className="flex-1 sm:flex-initial text-[11px] sm:text-xs px-1.5 sm:px-3 justify-center whitespace-nowrap h-8.5"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
          {canImport('inquiries') && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenImport}
              leftIcon={<UploadCloud className="w-3.5 h-3.5 shrink-0" />}
              className="flex-1 sm:flex-initial text-[11px] sm:text-xs px-1.5 sm:px-3 justify-center whitespace-nowrap h-8.5"
            >
              Import
            </Button>
          )}
          {canCreate('inquiries') && (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenNewInquiry}
              leftIcon={<Plus className="w-4 h-4 shrink-0" />}
              className="flex-1 sm:flex-initial text-[11px] sm:text-xs px-1.5 sm:px-3 justify-center whitespace-nowrap h-8.5"
            >
              New Inquiry
            </Button>
          )}
        </div>
      </div>

      {/* 1-Line Minimal Quick Filter Chips & Pipeline Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-surface p-2 sm:p-2.5 rounded-xl border border-border shadow-2xs text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setStageFilter('all');
              setPriorityFilter('all');
              setOwnerFilter('all');
            }}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer select-none whitespace-nowrap border text-xs",
              stageFilter === 'all' && priorityFilter === 'all' && ownerFilter === 'all'
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface-muted text-foreground-muted hover:text-foreground border-border"
            )}
          >
            All Inquiries ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setOwnerFilter(ownerFilter === currentUser?.id ? 'all' : currentUser?.id);
            }}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer select-none whitespace-nowrap border text-xs",
              ownerFilter === currentUser?.id
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface-muted text-foreground-muted hover:text-foreground border-border"
            )}
          >
            My Leads
          </button>
          <button
            type="button"
            onClick={() => {
              setPriorityFilter(priorityFilter === 'High' ? 'all' : 'High');
            }}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer select-none whitespace-nowrap border text-xs",
              priorityFilter === 'High'
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface-muted text-foreground-muted hover:text-foreground border-border"
            )}
          >
            High Priority {highPriorityCount > 0 && `(${highPriorityCount})`}
          </button>
          <button
            type="button"
            onClick={() => {
              setStageFilter(stageFilter === 'negotiation' ? 'all' : 'negotiation');
            }}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer select-none whitespace-nowrap border text-xs",
              stageFilter === 'negotiation'
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface-muted text-foreground-muted hover:text-foreground border-border"
            )}
          >
            In Negotiation
          </button>
        </div>

        {/* Right: Sleek Pipeline Value Pill */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto text-foreground-muted text-[11px] font-medium border-t sm:border-t-0 pt-2 sm:pt-0">
          <span>Active Pipeline:</span>
          <span className="font-mono font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded-md border border-border whitespace-nowrap">
            {formatINR(totalPipelineValue, true)} / mo
          </span>
        </div>
      </div>

      {/* Sleek Search & Control Toolbar */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 w-full">
        {/* Left: Search Bar */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search inquiries, requirements, companies, cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/70 border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-primary focus:outline-none transition-colors h-9"
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
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filter Drawer Trigger Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openFilterDrawer}
                  className={cn(
                    "relative size-9 rounded-button border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs",
                    activeFiltersCount > 0 && "text-primary border-primary bg-primary/10"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Filter
              </TooltipContent>
            </Tooltip>

            {/* Column Settings Dropdown (Desktop Only) */}
            <div className="hidden sm:block">
              <DataGridColumnVisibilityMenu table={table} excludeColumns={['actions', 'inquiryNumber']} />
            </div>

            {/* Refresh / Reset Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="size-9 rounded-button border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 transition-transform duration-700",
                      (isRefreshing || isLoading) && "animate-spin text-primary"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Refresh
              </TooltipContent>
            </Tooltip>

            {/* Segmented View Switcher (Desktop Only) */}
            <div className="hidden sm:flex items-center h-9 bg-surface border border-border rounded-button overflow-hidden shadow-2xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'table'
                        ? "bg-primary text-white font-bold"
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
                        ? "bg-primary text-white font-bold"
                        : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Grid
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Mobile view: ONLY Card view show, NOT list page show */}
      <div className="block sm:hidden">
        <InquiriesCard
          table={table}
          inquiries={pagedInquiries}
          recordCount={filteredInquiries.length}
          isLoading={isBusy}
          mode="grid"
          hasFilters={activeFiltersCount > 0 || !!searchQuery}
          onClearFilters={handleClearAllFilters}
          onNewInquiry={onOpenNewInquiry}
          onSelectInquiry={handleSelectInquiryById}
          pageSize={pagination.pageSize}
        />
      </div>

      {/* Desktop view: Respects user viewMode (List vs Card) */}
      <div className="hidden sm:block">
        {viewMode === 'table' ? (
          <InquiriesList
            table={table}
            recordCount={totalCount || filteredInquiries.length}
            isLoading={isBusy}
            hasFilters={activeFiltersCount > 0 || !!searchQuery}
            onClearFilters={handleClearAllFilters}
            onNewInquiry={onOpenNewInquiry}
            onRowClick={handleSelectInquiry}
          />
        ) : (
          <InquiriesCard
            table={table}
            inquiries={pagedInquiries}
            recordCount={filteredInquiries.length}
            isLoading={isBusy}
            mode={viewMode === 'line' ? 'line' : 'grid'}
            hasFilters={activeFiltersCount > 0 || !!searchQuery}
            onClearFilters={handleClearAllFilters}
            onNewInquiry={onOpenNewInquiry}
            onSelectInquiry={handleSelectInquiryById}
            pageSize={pagination.pageSize}
          />
        )}
      </div>

      {/* Advanced Filters Drawer (Right Slide-out taking reference from sidebar drawer) */}
      {isFilterDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-end select-none overflow-hidden m-0 p-0">
          {/* Backdrop taking reference from sidebar drawer */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-backdrop-fade cursor-pointer"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Drawer Container (Right-hand side slide-in: w-[85vw] max-w-sm on mobile, sm:w-96) */}
          <div className="relative w-[85vw] sm:w-96 max-w-sm bg-surface border-l border-border h-full shadow-2xl flex flex-col z-10 animate-slide-drawer-right outline-none">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface flex items-start justify-between shrink-0">
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
        </div>,
        document.body
      )}

      {/* Edit Inquiry Modal */}
      {isEditModalOpen && inquiryToEdit && (
        <EditInquiryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setInquiryToEdit(null);
          }}
          inquiry={inquiryToEdit}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setInquiryToEdit(null);
            loadInquiries();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && inquiryToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setInquiryToDelete(null);
          }}
          title={
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">Delete Inquiry</span>
            </div>
          }
          description="Are you sure you want to permanently delete this inquiry record?"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-1.5 text-foreground">
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                You are deleting: <span className="font-bold underline">{inquiryToDelete.inquiryNumber}</span> ({inquiryToDelete.companyName})
              </p>
              <p className="text-[11px] text-foreground-muted">
                This will remove the inquiry record ({inquiryToDelete.requirement}) from the active pipeline and local CRM database. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setInquiryToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={executeDeleteInquiry}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Inquiry'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const InquiriesPage = InquiryListView;
export default InquiriesPage;
