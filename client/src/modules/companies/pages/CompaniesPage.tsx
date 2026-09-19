import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  Download,
  UploadCloud,
  MapPin,
  ChevronRight,
  Settings,
  RefreshCw,
  List,
  LayoutGrid,
  Phone,
  Mail,
  Warehouse,
  FileText,
  X,
  RotateCcw,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  AlertTriangle,
  SlidersHorizontal,
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
import { DataGridColumnVisibilityMenu } from '@/modules/core/components/ui/CommonDataGrid';
import { CompanyService } from '@/modules/core/services/companyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { cn } from '@/modules/core/lib/utils';
import { Company, PriorityLevel, CompanyStatus } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card } from '@/modules/core/components/ui/Card';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { UserCombobox } from '@/modules/core/components/ui/UserCombobox';
import { NewCompanyModal } from '../components/NewCompanyModal';
import { NewCompanyPage } from './NewCompanyPage';
import { CompaniesList } from '../components/CompaniesList';
import { CompaniesCard } from '../components/CompaniesCard';
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

export interface CompanyListViewProps {
  onSelectCompany: (id: string) => void;
  onOpenNewCompany: () => void;
  onOpenImport: () => void;
  onNavigateToMap: () => void;
}

const VIEW_MODE_STORAGE_KEY = 'fairway_companies_view_mode_v3';
const TABLE_STATE_STORAGE_KEY = 'fairway_companies_table_grid_state_v3';

const formatStageLabel = (stage?: string) => {
  if (!stage) return 'New';
  const clean = stage.replace(/_/g, ' ').toLowerCase();
  if (clean.includes('requirement')) return 'Requirement Confirmed';
  if (clean.includes('matched') || clean.includes('property')) return 'Property Matched';
  if (clean.includes('visit')) return 'Site Visit Planned';
  if (clean.includes('proposal') || clean.includes('negotiation')) return 'Proposal / Neg.';
  if (clean.includes('won') || clean.includes('active')) return 'Active Client';
  if (clean.includes('lost')) return 'Closed Lost';
  if (clean.includes('new')) return 'New Lead';
  return stage.replace(/_/g, ' ');
};

const getStageBadgeStyle = (stage?: string) => {
  const clean = (stage || '').toLowerCase();
  if (clean.includes('won') || clean.includes('active')) {
    return 'bg-primary/10 text-primary border-primary/30 font-bold';
  }
  return 'bg-surface-muted text-foreground border-border font-medium';
};

const sanitizeDisplayString = (str?: string, fallback: string = '—'): string => {
  if (!str) return fallback;
  const trimmed = str.trim();
  // If string contains non-printable or corrupt binary chars from raw zip imports or too short artifacts
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(trimmed) || trimmed.startsWith('PK') || trimmed.includes('table1.xml') || trimmed.length <= 1) {
    return fallback;
  }
  return trimmed || fallback;
};

// Safe JSON parser for stored table state
const getStoredTableState = () => {
  try {
    const raw = localStorage.getItem(TABLE_STATE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored companies table state', e);
  }
  return {};
};

const getStoredViewMode = (): 'table' | 'grid' => {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === 'table' || saved === 'grid') return saved;
  } catch (e) {
    console.error('Failed to parse stored view mode', e);
  }
  return 'table';
};

export const CompanyListView: React.FC<CompanyListViewProps> = ({
  onSelectCompany,
  onOpenNewCompany,
  onOpenImport,
  onNavigateToMap,
}) => {
  const { canEdit, currentUser, users, canCreate, canEditModule, canDeleteModule, canExport, canImport } = useAuth();
  const { success, error } = useToast();
  const initialTableState = useMemo(() => getStoredTableState(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [industryFilter, setIndustryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Draft filter states for slide-out drawer
  const [draftIndustryFilter, setDraftIndustryFilter] = useState('all');
  const [draftStatusFilter, setDraftStatusFilter] = useState('all');
  const [draftPriorityFilter, setDraftPriorityFilter] = useState('all');
  const [draftOwnerFilter, setDraftOwnerFilter] = useState('all');
  const [draftCityFilter, setDraftCityFilter] = useState('all');

  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => getStoredViewMode());
  const [pageMode, setPageMode] = useState<'list' | 'form'>('list');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit and Delete state
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Persist View Mode
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (e) {
      console.error('Failed to persist view mode', e);
    }
  }, [viewMode]);

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
      const start = savedStart.length > 0 && savedStart.includes('srNo')
        ? savedStart
        : ['actions', 'srNo'];
      return {
        start,
        end: Array.isArray(initialTableState.columnPinning?.end) ? initialTableState.columnPinning.end : [],
      };
    }
  );

  // Adaptive column pinning: On mobile screens (<768px), pin only 'actions' so it doesn't freeze the whole viewport
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveColumnPinning = useMemo<ColumnPinningMap>(() => {
    if (isMobileScreen) {
      return {
        start: columnPinning.start?.filter((c) => c === 'actions') || [],
        end: columnPinning.end || [],
      };
    }
    return columnPinning;
  }, [columnPinning, isMobileScreen]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => initialTableState.columnOrder || []);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => initialTableState.columnSizing || {});

  // Persist Table Grid State
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
      console.error('Failed to persist companies table state', e);
    }
  }, [pagination, sorting, columnVisibility, columnPinning, columnOrder, columnSizing]);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const activeSort = sorting[0];
      const res = await CompanyService.getCompanies({
        search: debouncedSearchQuery || undefined,
        industry: industryFilter !== 'all' ? industryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        city: cityFilter !== 'all' ? cityFilter : undefined,
        assignedOwnerId: ownerFilter !== 'all' ? ownerFilter : undefined,
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        sortBy: activeSort ? activeSort.id : 'createdAt',
        ascending: activeSort ? !activeSort.desc : false,
      });

      if (res.success && res.data) {
        setCompanies(res.data);
        setTotalCount(res.totalCount ?? res.data.length);
      } else {
        setCompanies([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to load companies', err);
      setCompanies([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    debouncedSearchQuery,
    industryFilter,
    statusFilter,
    priorityFilter,
    ownerFilter,
    cityFilter,
  ]);

  // Extract unique industries & cities
  const uniqueIndustries = Array.from(new Set(companies.map((c) => c.industry))).filter(Boolean);
  const uniqueCities = Array.from(new Set(companies.map((c) => c.city))).filter(Boolean);

  const activeFiltersCount =
    (industryFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (ownerFilter !== 'all' ? 1 : 0) +
    (cityFilter !== 'all' ? 1 : 0);

  const openFilterDrawer = () => {
    setDraftIndustryFilter(industryFilter);
    setDraftStatusFilter(statusFilter);
    setDraftPriorityFilter(priorityFilter);
    setDraftOwnerFilter(ownerFilter);
    setDraftCityFilter(cityFilter);
    setIsFilterDrawerOpen(true);
  };

  const handleApplyFilters = () => {
    setIndustryFilter(draftIndustryFilter);
    setStatusFilter(draftStatusFilter);
    setPriorityFilter(draftPriorityFilter);
    setOwnerFilter(draftOwnerFilter);
    setCityFilter(draftCityFilter);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setIsFilterDrawerOpen(false);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setIndustryFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setOwnerFilter('all');
    setCityFilter('all');
    setDraftIndustryFilter('all');
    setDraftStatusFilter('all');
    setDraftPriorityFilter('all');
    setDraftOwnerFilter('all');
    setDraftCityFilter('all');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setIsFilterDrawerOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    handleClearAllFilters();
    try {
      await loadCompanies();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenEditCompany = (company: Company) => {
    setCompanyToEdit(company);
    setPageMode('form');
  };

  const handleDeleteCompanyConfirm = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteModalOpen(true);
  };

  const executeDeleteCompany = async () => {
    if (!companyToDelete) return;
    setIsDeleting(true);
    try {
      await CompanyService.deleteCompany(companyToDelete.id);
      success('Company Deleted', `Removed ${companyToDelete.name} from CRM.`);
      setIsDeleteModalOpen(false);
      setCompanyToDelete(null);
      loadCompanies();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete company');
    } finally {
      setIsDeleting(false);
    }
  };

  // TanStack Column Definitions
  const companyColumns = useMemo<ColumnDef<DataGridFeatures, Company>[]>(
    () => [
      {
        id: 'actions',
        header: () => <span className="text-[11px] font-semibold text-foreground-muted pl-1">Action</span>,
        cell: ({ row }) => {
          const comp = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                    title="Actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 bg-surface border border-border shadow-dialog z-50">
                  <DropdownMenuItem
                    onClick={() => onSelectCompany(comp.id)}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>View Company</span>
                  </DropdownMenuItem>
                  {canEditModule('companies') && (
                    <DropdownMenuItem
                      onClick={() => handleOpenEditCompany(comp)}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
                      <span>Edit Company</span>
                    </DropdownMenuItem>
                  )}
                  {canDeleteModule('companies') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteCompanyConfirm(comp)}
                        className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Company</span>
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
        accessorKey: 'srNo',
        id: 'srNo',
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
        id: 'name',
        accessorKey: 'name',
        meta: { headerTitle: 'Company Name' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Company Name" />,
        cell: ({ row }) => {
          const comp = row.original;
          const displayName = sanitizeDisplayString(comp.name, 'Unnamed Enterprise');
          const legal = sanitizeDisplayString(comp.legalName, '');
          const displayLegal = legal && legal.toLowerCase() !== displayName.toLowerCase() ? legal : null;
          const initials = (displayName.slice(0, 2) || 'CO').toUpperCase();

          return (
            <div
              onClick={() => onSelectCompany(comp.id)}
              className="flex items-center gap-2.5 py-0.5 cursor-pointer group/cell"
            >
              <div className="w-7 h-7 rounded-lg bg-surface-muted text-foreground font-bold text-xs flex items-center justify-center shrink-0 border border-border shadow-2xs">
                {initials}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-foreground group-hover/cell:text-primary transition-colors block truncate">
                  {displayName}
                </span>
                {displayLegal && (
                  <span className="text-[10px] text-foreground-muted font-normal block truncate">
                    {displayLegal}
                  </span>
                )}
              </div>
            </div>
          );
        },
        size: 260,
        minSize: 200,
        enableSorting: true,
        enablePinning: true,
      },
      {
        id: 'industry',
        accessorKey: 'industry',
        meta: { headerTitle: 'Industry' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Industry" />,
        cell: ({ row }) => (
          <span className="text-xs text-foreground-muted truncate block max-w-[200px]">
            {sanitizeDisplayString(row.original.industry, 'General Industrial')}
          </span>
        ),
        size: 190,
        minSize: 140,
        enableSorting: true,
      },
      {
        id: 'location',
        accessorKey: 'city',
        meta: { headerTitle: 'Location' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Location" />,
        cell: ({ row }) => {
          const city = sanitizeDisplayString(row.original.city, '');
          const state = sanitizeDisplayString(row.original.state, '');
          const locationText = [city, state].filter(Boolean).join(', ') || 'Gujarat, India';

          return (
            <div className="flex items-center gap-1 text-xs text-foreground truncate">
              <MapPin className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
              <span className="truncate font-medium">
                {locationText}
              </span>
            </div>
          );
        },
        size: 160,
        minSize: 130,
        enableSorting: true,
      },
      {
        id: 'assignedOwnerName',
        accessorKey: 'assignedOwnerName',
        meta: { headerTitle: 'Owner' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Owner" />,
        cell: ({ row }) => {
          const comp = row.original;
          const ownerUser = users.find(
            (u) => u.id === comp.assignedOwnerId || (comp.assignedOwnerName && u.name.toLowerCase() === comp.assignedOwnerName.toLowerCase())
          );
          const ownerName = sanitizeDisplayString(comp.assignedOwnerName || ownerUser?.name, 'Admin');
          const avatarUrl = ownerUser?.avatar;

          return (
            <div className="flex items-center gap-2 text-xs">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={ownerName}
                  className="w-5 h-5 rounded-full object-cover border border-border shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-surface-muted text-foreground font-bold text-[10px] items-center justify-center border border-border shrink-0",
                  avatarUrl ? "hidden" : "flex"
                )}
              >
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate font-medium text-foreground">
                {ownerName}
              </span>
            </div>
          );
        },
        size: 170,
        minSize: 130,
        enableSorting: true,
      },
      {
        id: 'prospectStage',
        accessorKey: 'prospectStage',
        meta: { headerTitle: 'Stage' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Stage" />,
        cell: ({ row }) => {
          const badgeClass = getStageBadgeStyle(row.original.prospectStage);
          const label = formatStageLabel(row.original.prospectStage);
          return (
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center whitespace-nowrap ${badgeClass}`}>
              {label}
            </span>
          );
        },
        size: 170,
        minSize: 140,
        enableSorting: true,
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        meta: { headerTitle: 'Priority' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-surface-muted text-foreground border-border whitespace-nowrap">
            {row.original.priority || 'Normal'}
          </span>
        ),
        size: 110,
        minSize: 90,
        enableSorting: true,
      },
      {
        id: 'facilitiesCount',
        meta: { headerTitle: 'Facilities' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Facilities" className="justify-center" />,
        cell: ({ row }) => {
          const count = row.original.facilitiesCount ?? 0;
          return (
            <div className="text-center">
              <span className="font-mono font-bold bg-surface-muted px-2 py-0.5 rounded border border-border text-[11px]">
                {count}
              </span>
            </div>
          );
        },
        size: 100,
        minSize: 85,
        enableSorting: false,
      },
      {
        id: 'inquiriesCount',
        meta: { headerTitle: 'Inquiries' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Inquiries" className="justify-center" />,
        cell: ({ row }) => {
          const count = row.original.inquiriesCount ?? 0;
          return (
            <div className="text-center">
              <span className="font-mono font-bold bg-surface-muted text-foreground px-2 py-0.5 rounded border border-border text-[11px]">
                {count}
              </span>
            </div>
          );
        },
        size: 100,
        minSize: 85,
        enableSorting: false,
      },
    ],
    [onSelectCompany, users]
  );

  const pagedCompanies = useMemo(() => {
    // If backend already paginated (server returned single page where totalCount > companies.length)
    if (totalCount > companies.length && companies.length <= pagination.pageSize) {
      return companies;
    }
    const start = pagination.pageIndex * pagination.pageSize;
    return companies.slice(start, start + pagination.pageSize);
  }, [companies, pagination.pageIndex, pagination.pageSize, totalCount]);

  const table = useTable({
    features: dataGridFeatures,
    columns: companyColumns,
    data: pagedCompanies,
    pageCount: Math.max(1, Math.ceil((totalCount || companies.length || 0) / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getRowId: (row: Company) => row.id,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnPinning: effectiveColumnPinning,
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

  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch all companies without pagination limits
      let allData: Company[] = [];
      try {
        const res = await CompanyService.getCompanies({
          search: debouncedSearchQuery || undefined,
          industry: industryFilter !== 'all' ? industryFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          city: cityFilter !== 'all' ? cityFilter : undefined,
          assignedOwnerId: ownerFilter !== 'all' ? ownerFilter : undefined,
          pageNumber: 1,
          pageSize: 10000,
        });
        if (res.success && res.data && res.data.length > 0) {
          allData = res.data;
        }
      } catch {
        // Continue with whatever data was retrieved
      }

      const headers = ['Company Name', 'Legal Name', 'Industry', 'Status', 'City', 'State', 'Phone', 'Email', 'Owner', 'Priority', 'Prospect Stage', 'Turnover', 'Employee Count'];
      const rows = allData.map((c) => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.legalName || '').replace(/"/g, '""')}"`,
        `"${(c.industry || '').replace(/"/g, '""')}"`,
        `"${(c.status || '').replace(/"/g, '""')}"`,
        `"${(c.city || '').replace(/"/g, '""')}"`,
        `"${(c.state || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.assignedOwnerName || '').replace(/"/g, '""')}"`,
        `"${(c.priority || '').replace(/"/g, '""')}"`,
        `"${(c.prospectStage || '').replace(/"/g, '""')}"`,
        `"${(c.annualTurnover || '').replace(/"/g, '""')}"`,
        `"${(c.employeeCount || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fairway_CRM_Companies_All_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export companies CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (pageMode === 'form') {
    return (
      <NewCompanyPage
        companyToEdit={companyToEdit}
        onBack={() => {
          setPageMode('list');
          setCompanyToEdit(null);
        }}
        onSuccess={(id) => {
          setPageMode('list');
          setCompanyToEdit(null);
          loadCompanies();
          onSelectCompany(id);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 w-full text-left">
      {/* Header Pattern with Actions & Full Width */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2.5 sm:pb-3 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <span>Companies Master</span>
            <span className="text-xs font-mono font-bold bg-surface-muted text-foreground border border-border px-2 py-0.5 rounded-full shrink-0">
              {totalCount || companies.length} Accounts
            </span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Top-level customer accounts, linked facilities, active inquiry requirements and ownership.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {canExport('companies') && (
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
          {canImport('companies') && (
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
          {canCreate('companies') && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setCompanyToEdit(null);
                setPageMode('form');
              }}
              leftIcon={<Plus className="w-4 h-4 shrink-0" />}
              className="flex-1 sm:flex-initial text-[11px] sm:text-xs px-1.5 sm:px-3 justify-center whitespace-nowrap h-8.5 shadow-xs font-bold"
            >
              Add Company
            </Button>
          )}
        </div>
      </div>

      {/* Compact 1-Line Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 sm:p-4 rounded-xl border border-border bg-surface shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-surface-muted text-foreground flex items-center justify-center border border-border shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-foreground-muted block">Registered Clients</span>
            <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums tracking-tight block">
              {totalCount || companies.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:border-l border-border sm:pl-4">
          <div className="size-8 rounded-lg bg-surface-muted text-foreground flex items-center justify-center border border-border shrink-0">
            <Warehouse className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-foreground-muted block">Industrial Sites Mapped</span>
            <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums tracking-tight block">
              {companies.reduce((acc, curr) => acc + (curr.facilitiesCount || 0), 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:border-l border-border sm:pl-4">
          <div className="size-8 rounded-lg bg-surface-muted text-foreground flex items-center justify-center border border-border shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-foreground-muted block">Active Inquiries</span>
            <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums tracking-tight block">
              {companies.reduce((acc, curr) => acc + (curr.inquiriesCount || 0), 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Quick Dropdown Filters, Refresh & View Switcher */}
      <div className="bg-surface border border-border p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search Box */}
        <div className="relative w-full lg:max-w-xs xl:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, city, contact..."
            className="w-full bg-surface-muted/60 text-foreground text-xs rounded-xl pl-9 pr-9 py-2 border border-border/80 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-foreground-muted"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and View Controls (Matches Warehouse Pattern) */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

            {/* Column Visibility Customizer Menu (Desktop Only) */}
            <div className="hidden sm:block">
              <DataGridColumnVisibilityMenu table={table} excludeColumns={['actions', 'srNo']} />
            </div>

            {/* Refresh Button */}
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

            {/* Segmented View Switcher (Desktop Only) */}
            <div className="hidden sm:flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
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
                  Grid
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Mobile view: ONLY Card View show, NOT list page show */}
      <div className="block sm:hidden">
        <CompaniesCard
          table={table}
          companies={pagedCompanies}
          recordCount={totalCount || companies.length}
          isLoading={isLoading}
          hasFilters={activeFiltersCount > 0 || !!searchQuery}
          onClearFilters={handleClearAllFilters}
          onNewCompany={onOpenNewCompany}
          onSelectCompany={onSelectCompany}
          onEditCompany={handleOpenEditCompany}
          onDeleteCompany={handleDeleteCompanyConfirm}
          pageSize={pagination.pageSize}
        />
      </div>

      {/* Desktop view: Respects user viewMode (List vs Card) */}
      <div className="hidden sm:block">
        {viewMode === 'table' ? (
          <CompaniesList
            table={table}
            companies={companies}
            recordCount={totalCount || companies.length}
            isLoading={isLoading}
            hasFilters={activeFiltersCount > 0 || !!searchQuery}
            onClearFilters={handleClearAllFilters}
            onNewCompany={onOpenNewCompany}
            onRowClick={(company) => onSelectCompany(company.id)}
          />
        ) : (
          <CompaniesCard
            table={table}
            companies={pagedCompanies}
            recordCount={totalCount || companies.length}
            isLoading={isLoading}
            hasFilters={activeFiltersCount > 0 || !!searchQuery}
            onClearFilters={handleClearAllFilters}
            onNewCompany={onOpenNewCompany}
            onSelectCompany={onSelectCompany}
            onEditCompany={handleOpenEditCompany}
            onDeleteCompany={handleDeleteCompanyConfirm}
            pageSize={pagination.pageSize}
          />
        )}
      </div>



      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && companyToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setCompanyToDelete(null);
          }}
          maxWidth="md"
          title={
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Company Account</span>
            </div>
          }
          description="Are you sure you want to permanently delete this corporate record?"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-surface-muted border border-border rounded-xl space-y-1.5 text-foreground">
              <p className="font-semibold text-foreground">
                You are deleting: <span className="font-bold underline">{companyToDelete.name}</span>
              </p>
              <p className="text-[11px] text-foreground-muted">
                This will delete the company account, related linked activity history and dissociate inquiries. This action cannot be reversed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCompanyToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={executeDeleteCompany}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Company'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Advanced Filters Drawer (Right Slide-Out) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in select-none overflow-hidden m-0 p-0">
          {/* Backdrop */}
          <div
            className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-full sm:max-w-sm bg-surface border-l border-border border-t-0 border-r-0 border-b-0 h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none ring-0">
            {/* Header */}
            <div className="p-5 border-b border-border bg-surface flex items-start justify-between border-t-0">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-fairway-600" />
                  <span>Company Filters</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Filter companies by industry, city, priority & status
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

            {/* Filter Controls Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Industry Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Industry Segment</label>
                <Combobox
                  options={[
                    { value: 'all', label: 'All Industries' },
                    ...uniqueIndustries.map((ind) => ({ value: ind, label: ind })),
                  ]}
                  value={draftIndustryFilter}
                  onChange={setDraftIndustryFilter}
                  placeholder="Select industry..."
                  searchPlaceholder="Search industry..."
                />
              </div>

              {/* City Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">City / Cluster</label>
                <Combobox
                  options={[
                    { value: 'all', label: 'All Cities' },
                    ...uniqueCities.map((ct) => ({ value: ct, label: ct })),
                  ]}
                  value={draftCityFilter}
                  onChange={setDraftCityFilter}
                  placeholder="Select city..."
                  searchPlaceholder="Search city..."
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Company Status</label>
                <Combobox
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Prospect', label: 'Prospect' },
                    { value: 'Inactive', label: 'Inactive' },
                  ]}
                  value={draftStatusFilter}
                  onChange={setDraftStatusFilter}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                />
              </div>

              {/* Priority Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Priority Level</label>
                <Combobox
                  options={[
                    { value: 'all', label: 'All Priorities' },
                    { value: 'High', label: 'High Priority' },
                    { value: 'Medium', label: 'Medium Priority' },
                    { value: 'Low', label: 'Low Priority' },
                  ]}
                  value={draftPriorityFilter}
                  onChange={setDraftPriorityFilter}
                  placeholder="Select priority..."
                  searchPlaceholder="Search priority..."
                />
              </div>

              {/* Assigned Owner Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Assigned Account Owner</label>
                <UserCombobox
                  users={users}
                  value={draftOwnerFilter === 'all' ? '' : draftOwnerFilter}
                  onChange={(val) => setDraftOwnerFilter(val || 'all')}
                  placeholder="All salespersons"
                  allowClear
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex-1 py-2.5 px-4 rounded-button border text-xs font-bold transition-all text-center bg-surface hover:bg-surface-muted border-border text-foreground cursor-pointer shadow-2xs"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
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

export const CompaniesPage = CompanyListView;
export default CompaniesPage;
