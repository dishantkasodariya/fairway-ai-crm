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
  Building2,
  Maximize2,
  TrendingUp,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
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
import { PropertyService } from '@/modules/core/services/propertyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Modal, ModalFooter } from '@/modules/core/components/ui/Modal';
import { NewPropertyPage } from './NewPropertyPage';
import { Property, PropertyStatus } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import {
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridColumnVisibilityMenu } from '@/modules/core/components/ui/CommonDataGrid';
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
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { PropertiesList } from '../components/PropertiesList';
import { PropertiesCard } from '../components/PropertiesCard';
import { cn } from '@/modules/core/lib/utils';

export interface PropertyListViewProps {
  onSelectProperty: (id: string) => void;
  onNavigateToMap: () => void;
  onOpenNewProperty?: () => void;
}

const TABLE_STATE_STORAGE_KEY = 'properties_table_state_v2';
const VIEW_MODE_STORAGE_KEY = 'properties_view_mode_v2';

const getStoredTableState = () => {
  try {
    const saved = localStorage.getItem(TABLE_STATE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse stored properties table state', e);
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

export const PropertyListView: React.FC<PropertyListViewProps> = ({
  onSelectProperty,
  onNavigateToMap,
  onOpenNewProperty,
}) => {
  const { canCreate, canDeleteModule, canEditModule } = useAuth();
  const canDelete = canDeleteModule('properties');
  const canEditProp = canEditModule('properties');
  const { toast } = useToast();
  const initialTableState = useMemo(() => getStoredTableState(), []);

  // Page mode: 'list' or 'form' (for Edit / New)
  const [pageMode, setPageMode] = useState<'list' | 'form'>('list');
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => getStoredViewMode());

  // Persist View Mode
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (e) {
      console.error('Failed to persist view mode', e);
    }
  }, [viewMode]);

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

  // Controlled Table Grid State (Persisted)
  const [pagination, setPagination] = useState<PaginationState>(() => initialTableState.pagination || {
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>(() => initialTableState.sorting || []);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityMap>(() => initialTableState.columnVisibility || {});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningMap>(() => {
    const savedStart = (initialTableState.columnPinning?.start || []).filter((col: string) => col !== 'select');
    return {
      start: savedStart.length > 0 ? savedStart : ['actions', 'srNo'],
      end: Array.isArray(initialTableState.columnPinning?.end) ? initialTableState.columnPinning.end : [],
    };
  });
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
      console.error('Failed to persist properties table state', e);
    }
  }, [pagination, sorting, columnVisibility, columnPinning, columnOrder, columnSizing]);

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
      if (res.success && Array.isArray(res.data)) {
        setProperties(res.data);
      } else {
        setProperties([]);
      }
    } catch {
      setProperties([]);
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

  // Summary KPI Stats for client clarity
  const stats = useMemo(() => {
    const totalCount = properties.length;
    const totalAvailableSqFt = properties.reduce(
      (acc, p) => acc + (Number(p.availableAreaSqFt) || 0),
      0
    );
    const availableCount = properties.filter(
      (p) => p.status?.toLowerCase() === 'available'
    ).length;
    const rents = properties
      .map((p) => Number(p.rentPerSqFtINR))
      .filter((r) => !isNaN(r) && r > 0);
    const avgRent =
      rents.length > 0
        ? (rents.reduce((a, b) => a + b, 0) / rents.length).toFixed(1)
        : '0';

    return {
      totalCount,
      totalAvailableSqFt,
      availableCount,
      avgRent,
    };
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

  const handleOpenEditProperty = (prop: Property) => {
    setPropertyToEdit(prop);
    setPageMode('form');
  };

  const handleDeletePropertyConfirm = (prop: Property) => {
    setPropertyToDelete(prop);
    setIsDeleteModalOpen(true);
  };

  const executeDeleteProperty = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    try {
      const res = await PropertyService.deleteProperty(propertyToDelete.id);
      if (res.success) {
        toast('Warehouse Deleted', {
          message: `${propertyToDelete.name} has been removed from backend inventory.`,
          type: 'success',
        });
        setIsDeleteModalOpen(false);
        setPropertyToDelete(null);
        loadProperties();
      } else {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Failed to delete warehouse.';
        toast('Delete Failed', {
          message: msg,
          type: 'error',
        });
      }
    } catch (err: any) {
      toast('Error', {
        message: err.message || 'Cannot delete warehouse.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const propertyColumns = useMemo<ColumnDef<DataGridFeatures, Property>[]>(
    () => [
      {
        id: 'actions',
        header: () => <span className="text-[11px] font-semibold text-foreground-muted pl-1">Action</span>,
        cell: ({ row }) => {
          const prop = row.original;
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
                    onClick={() => onSelectProperty(prop.id)}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>View Warehouse</span>
                  </DropdownMenuItem>
                  {canEditProp && (
                    <DropdownMenuItem
                      onClick={() => handleOpenEditProperty(prop)}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
                      <span>Edit Warehouse</span>
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeletePropertyConfirm(prop)}
                        className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Warehouse</span>
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
        meta: { headerTitle: 'Warehouse / Park' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Warehouse / Park" />,
        cell: ({ row }) => (
          <div className="text-left py-0.5">
            <button
              type="button"
              onClick={() => onSelectProperty(row.original.id)}
              className="font-bold text-foreground hover:text-primary transition-colors text-xs text-left cursor-pointer truncate block"
            >
              {row.original.name}
            </button>
            <div className="text-[11px] text-foreground-muted truncate">
              {row.original.city || 'Gujarat'}{row.original.state ? `, ${row.original.state}` : ''}{row.original.corridor ? ` • ${row.original.corridor}` : ''}
            </div>
          </div>
        ),
        size: 260,
        minSize: 200,
        enableSorting: true,
      },
      {
        id: 'availableAreaSqFt',
        accessorKey: 'availableAreaSqFt',
        meta: { headerTitle: 'Available Space' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Available Space" />,
        cell: ({ row }) => (
          <span className="font-bold text-foreground text-xs">
            {formatSqFt(row.original.availableAreaSqFt)}
          </span>
        ),
        size: 150,
        minSize: 120,
        enableSorting: true,
      },
      {
        id: 'rentPerSqFtINR',
        accessorKey: 'rentPerSqFtINR',
        meta: { headerTitle: 'Base Rent' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Base Rent" />,
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-xs text-foreground">
            ₹{row.original.rentPerSqFtINR} / sq.ft
          </span>
        ),
        size: 130,
        minSize: 110,
        enableSorting: true,
      },
      {
        id: 'docksCount',
        accessorKey: 'docksCount',
        meta: { headerTitle: 'Docks' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Docks" />,
        cell: ({ row }) => (
          <span className="text-xs text-foreground font-medium">
            {row.original.docksCount || 0} Docks
          </span>
        ),
        size: 100,
        minSize: 85,
        enableSorting: true,
      },
      {
        id: 'clearHeightFt',
        accessorKey: 'clearHeightFt',
        meta: { headerTitle: 'Height' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Height" />,
        cell: ({ row }) => (
          <span className="text-xs text-foreground font-medium">
            {row.original.clearHeightFt || 0}m
          </span>
        ),
        size: 90,
        minSize: 80,
        enableSorting: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        meta: { headerTitle: 'Status' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const isAvail = row.original.status?.toLowerCase() === 'available';
          return (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isAvail
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
              }`}
            >
              {row.original.status}
            </span>
          );
        },
        size: 130,
        minSize: 100,
        enableSorting: true,
      },
    ],
    [onSelectProperty, pagination.pageIndex, pagination.pageSize]
  );

  const sortedAndFilteredProps = useMemo(() => {
    let result = [...filteredProps];
    if (sorting.length > 0) {
      const activeSort = sorting[0];
      const { id, desc } = activeSort;
      result.sort((a: any, b: any) => {
        let valA = a[id];
        let valB = b[id];
        if (id === 'srNo') {
          return 0;
        }
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toLowerCase();
          return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        if (typeof valA === 'number' || typeof valB === 'number') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
          return desc ? valB - valA : valA - valB;
        }
        return 0;
      });
    }
    return result;
  }, [filteredProps, sorting]);

  const pagedProperties = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedAndFilteredProps.slice(start, start + pagination.pageSize);
  }, [sortedAndFilteredProps, pagination.pageIndex, pagination.pageSize]);

  const table = useTable({
    features: dataGridFeatures,
    columns: propertyColumns,
    data: pagedProperties,
    pageCount: Math.max(1, Math.ceil(filteredProps.length / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: Property) => row.id,
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

  if (pageMode === 'form') {
    return (
      <NewPropertyPage
        initialProperty={propertyToEdit}
        onBack={() => {
          setPageMode('list');
          setPropertyToEdit(null);
        }}
        onSuccess={() => {
          setPageMode('list');
          setPropertyToEdit(null);
          loadProperties();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Top Header Pattern */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Warehouse className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
              <span>Warehouse Property Master</span>
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface-muted text-foreground-muted border border-border">
              {stats.totalCount} Parks
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Browse verified Grade-A logistics parks, chemical warehousing zones, and PEB industrial assets across Gujarat.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={onNavigateToMap}
            leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-600 shrink-0" />}
            className="flex-1 sm:flex-initial text-[11px] sm:text-xs px-2 sm:px-3 justify-center whitespace-nowrap h-8.5"
          >
            <span>View Map</span>
          </Button>

          {canCreate('properties') && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (onOpenNewProperty) {
                  onOpenNewProperty();
                } else {
                  setPropertyToEdit(null);
                  setPageMode('form');
                }
              }}
              leftIcon={<Plus className="w-3.5 h-3.5 shrink-0" />}
              className="flex-1 sm:flex-initial bg-fairway-600 hover:bg-fairway-700 text-white font-semibold text-[11px] sm:text-xs px-2 sm:px-3 justify-center whitespace-nowrap shadow-xs h-8.5"
            >
              <span>Add Warehouse</span>
            </Button>
          )}
        </div>
      </div>

      {/* Client-Friendly Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Total Warehouses */}
        <div className="bg-surface rounded-card border border-border p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs hover:border-fairway-500/40 transition-colors">
          <div className="size-10 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
              Total Warehouses
            </span>
            <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {stats.totalCount} <span className="text-xs font-semibold text-foreground-muted">Parks</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              {stats.availableCount} Ready to Lease
            </span>
          </div>
        </div>

        {/* Card 2: Total Available Capacity */}
        <div className="bg-surface rounded-card border border-border p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs hover:border-fairway-500/40 transition-colors">
          <div className="size-10 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center shrink-0">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
              Total Available Space
            </span>
            <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
              {formatSqFt(stats.totalAvailableSqFt)}
            </div>
            <span className="text-[11px] text-foreground-muted font-medium block mt-0.5">
              Verified Grade-A facilities
            </span>
          </div>
        </div>

        {/* Card 3: Avg Base Rental */}
        <div className="bg-surface rounded-card border border-border p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs hover:border-fairway-500/40 transition-colors">
          <div className="size-10 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
              Average Base Rent
            </span>
            <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              ₹{stats.avgRent} <span className="text-xs font-semibold text-foreground-muted">/ sq.ft / mo</span>
            </div>
            <span className="text-[11px] text-foreground-muted font-medium block mt-0.5">
              Gujarat Industrial Corridors
            </span>
          </div>
        </div>
      </div>

      {/* Sleek Search & Control Toolbar matching reference */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 w-full">
        {/* Left: Search Bar */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search warehouse parks, codes, cities, or corridors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors h-9"
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
                  Card
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Quick Filter Pills (1-Click Selection for Client) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-foreground-muted shrink-0 mr-1 hidden sm:inline-block">
          Quick Filters:
        </span>
        
        {/* All Button */}
        <button
          type="button"
          onClick={() => {
            setCorridorFilter('all');
            setStatusFilter('all');
          }}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border",
            corridorFilter === 'all' && statusFilter === 'all'
              ? "bg-fairway-600 text-white border-fairway-600 shadow-2xs"
              : "bg-surface text-foreground-muted border-border hover:bg-surface-muted hover:text-foreground"
          )}
        >
          All ({properties.length})
        </button>

        {/* Available Only */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev.toLowerCase() === 'available' ? 'all' : 'Available'));
          }}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5",
            statusFilter.toLowerCase() === 'available'
              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
              : "bg-surface text-foreground-muted border-border hover:bg-surface-muted hover:text-foreground"
          )}
        >
          <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
          Available ({stats.availableCount})
        </button>

        {/* Corridors Pills */}
        {uniqueCorridors.map((corr) => {
          const count = properties.filter((p) => p.corridor === corr).length;
          const isSelected = corridorFilter === corr;
          return (
            <button
              key={corr}
              type="button"
              onClick={() => {
                setCorridorFilter((prev) => (prev === corr ? 'all' : corr));
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border",
                isSelected
                  ? "bg-fairway-600 text-white border-fairway-600 shadow-2xs"
                  : "bg-surface text-foreground-muted border-border hover:bg-surface-muted hover:text-foreground"
              )}
            >
              {corr} ({count})
            </button>
          );
        })}

        {(corridorFilter !== 'all' || statusFilter !== 'all' || activeFiltersCount > 0 || searchQuery) && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-semibold text-fairway-700 dark:text-fairway-400 hover:underline px-2 py-1 shrink-0 cursor-pointer ml-auto"
          >
            Clear All
          </button>
        )}
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
      ) : (
        <>
          {/* Mobile view: ONLY Card View show, NOT list page show */}
          <div className="block sm:hidden">
            <PropertiesCard
              properties={pagedProperties}
              onSelectProperty={onSelectProperty}
              onEditProperty={canEditProp ? handleOpenEditProperty : undefined}
              onDeleteProperty={canDelete ? handleDeletePropertyConfirm : undefined}
            />
          </div>

          {/* Desktop view: Respects user viewMode (List vs Card) */}
          <div className="hidden sm:block">
            {viewMode === 'table' ? (
              <PropertiesList
                table={table}
                recordCount={filteredProps.length}
                isLoading={isLoading}
                onSelectProperty={onSelectProperty}
              />
            ) : (
              <PropertiesCard
                properties={pagedProperties}
                onSelectProperty={onSelectProperty}
                onEditProperty={canEditProp ? handleOpenEditProperty : undefined}
                onDeleteProperty={canDelete ? handleDeletePropertyConfirm : undefined}
              />
            )}
          </div>
        </>
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
          <div className="relative w-full max-w-full sm:max-w-sm bg-surface border-l border-border border-t-0 border-r-0 border-b-0 h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none ring-0 text-left">
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && propertyToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setPropertyToDelete(null);
          }}
          title={
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">Delete Warehouse</span>
            </div>
          }
          description="Are you sure you want to permanently delete this warehouse asset from backend inventory?"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-1.5 text-foreground">
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                You are deleting: <span className="font-bold underline">{propertyToDelete.name}</span> ({propertyToDelete.code})
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80">
                This will remove the warehouse and its specifications from the backend database.
              </p>
            </div>
            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setPropertyToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isDeleting}
                onClick={executeDeleteProperty}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Delete Warehouse
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const PropertiesPage = PropertyListView;
export default PropertiesPage;
