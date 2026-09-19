import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  RefreshCw,
  Search,
  X,
  Clock,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from '@tanstack/react-table';
import {
  DataGridFeatures,
  dataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import {
  CommonDataGrid,
  DataGridColumnVisibilityMenu,
} from '@/modules/core/components/ui/CommonDataGrid';
import { AuditLogService } from '@/modules/core/services/auditLogService';
import { AuditLog } from '@/modules/core/types';
import { CardTitle } from '@/modules/core/components/ui/Card';
import { Button } from '@/modules/core/components/ui/Button';
import { cn } from '@/modules/core/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/modules/core/components/ui/tooltip';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/modules/core/components/ui/Select';

export const AuditLogsTab: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // TanStack Table State
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

  const loadAuditLogs = async (spin = false) => {
    if (spin) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await AuditLogService.getAuditLogs();
      if (res.success && res.data) {
        setAuditLogs(res.data);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setAuditLogs([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        (log.entityType && log.entityType.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.details && log.details.toLowerCase().includes(q));

      const matchesAction =
        actionFilter === 'all' ||
        log.action?.toUpperCase() === actionFilter.toUpperCase();

      return matchesSearch && matchesAction;
    });
  }, [auditLogs, searchQuery, actionFilter]);

  // Paged logs
  const pagedLogs = useMemo(() => {
    const sorted = [...filteredLogs];
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      sorted.sort((a, b) => {
        let valA = a[id as keyof AuditLog] || '';
        let valB = b[id as keyof AuditLog] || '';
        if (id === 'timestamp') {
          return desc
            ? new Date(valB).getTime() - new Date(valA).getTime()
            : new Date(valA).getTime() - new Date(valB).getTime();
        }
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });
    }
    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [filteredLogs, sorting, pagination.pageIndex, pagination.pageSize]);

  // Columns definition matching Inquiry / Users list
  const logColumns = useMemo<ColumnDef<DataGridFeatures, AuditLog>[]>(
    () => [
      {
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
        size: 70,
        minSize: 60,
        maxSize: 85,
        enableSorting: false,
      },
      {
        accessorKey: 'timestamp',
        id: 'timestamp',
        header: ({ column }) => (
          <DataGridColumnHeader title="Timestamp" column={column} />
        ),
        cell: ({ row }) => {
          const raw = row.original.timestamp;
          const d = new Date(raw);
          const formatted = isNaN(d.getTime()) ? raw : d.toLocaleString();
          return (
            <span className="font-mono text-[11px] text-foreground-muted flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-foreground-muted/60 shrink-0" />
              <span>{formatted}</span>
            </span>
          );
        },
        size: 190,
        minSize: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'userName',
        id: 'user',
        header: ({ column }) => (
          <DataGridColumnHeader title="User / Operator" column={column} />
        ),
        cell: ({ row }) => {
          const name = row.original.userName || 'System';
          const role = row.original.userRole;
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-fairway-500/15 text-fairway-600 dark:text-fairway-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-foreground text-xs block truncate">
                  {name}
                </span>
                {role && (
                  <span className="text-[10px] text-foreground-muted capitalize block">
                    {role.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          );
        },
        size: 180,
        minSize: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'action',
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="Action" column={column} />
        ),
        cell: ({ row }) => {
          const action = (row.original.action || '').toUpperCase();
          let colorStyle =
            'bg-surface-muted text-foreground-muted border-border';

          if (action.includes('CREATE') || action.includes('ADD')) {
            colorStyle =
              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:bg-emerald-950/40 dark:border-emerald-800';
          } else if (action.includes('UPDATE') || action.includes('EDIT')) {
            colorStyle =
              'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 dark:bg-blue-950/40 dark:border-blue-800';
          } else if (action.includes('DELETE') || action.includes('REMOVE')) {
            colorStyle =
              'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 dark:bg-rose-950/40 dark:border-rose-800';
          } else if (action.includes('STAGE') || action.includes('STATUS')) {
            colorStyle =
              'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 dark:bg-amber-950/40 dark:border-amber-800';
          } else if (action.includes('LOGIN') || action.includes('AUTH')) {
            colorStyle =
              'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25 dark:bg-purple-950/40 dark:border-purple-800';
          }

          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs whitespace-nowrap',
                colorStyle
              )}
            >
              {action || 'ACTION'}
            </span>
          );
        },
        size: 130,
        minSize: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'entityType',
        id: 'entity',
        header: ({ column }) => (
          <DataGridColumnHeader title="Entity" column={column} />
        ),
        cell: ({ row }) => {
          const entity = row.original.entityType || 'Record';
          return (
            <span className="font-mono text-xs font-semibold text-foreground bg-surface-muted/60 dark:bg-[#18202c] border border-border/80 dark:border-white/[0.08] px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <Layers className="w-3 h-3 text-foreground-muted" />
              <span>{entity}</span>
            </span>
          );
        },
        size: 150,
        minSize: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'details',
        id: 'details',
        header: ({ column }) => (
          <DataGridColumnHeader title="Details & Payload" column={column} />
        ),
        cell: ({ row }) => {
          const d = (row.original.details || '').trim();
          const isEmpty = !d || d === '{}' || d === 'null' || d === '[]';
          return (
            <span
              className={cn(
                'text-[11px] block truncate max-w-lg',
                isEmpty ? 'text-foreground-muted/50 italic' : 'text-foreground-muted'
              )}
              title={d}
            >
              {isEmpty ? 'System audit event logged' : d}
            </span>
          );
        },
        size: 280,
        minSize: 180,
        enableSorting: false,
      },
    ],
    []
  );

  const table = useTable({
    features: dataGridFeatures,
    columns: logColumns,
    data: pagedLogs,
    pageCount: Math.max(1, Math.ceil(filteredLogs.length / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: AuditLog) => row.id,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnOrder,
      columnSizing,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
  });

  return (
    <div className="space-y-4 animate-fade-in text-xs">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface dark:bg-[#121214] border border-border dark:border-white/[0.08] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div>
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-fairway-600 dark:text-fairway-400" />
            <span>Audit Trail & Security Logs</span>
          </CardTitle>
          <p className="text-xs text-foreground-muted mt-0.5">
            Immutable PostgreSQL audit logs recording user actions, access events, and data mutations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAuditLogs(true)}
          disabled={isRefreshing || loading}
          className="gap-1.5 text-xs self-start sm:self-auto border-border dark:border-white/[0.12] bg-white dark:bg-[#161c24] text-foreground hover:bg-surface-muted"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Control Toolbar (Search, Filter, Column Settings) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit logs by user, action, entity, details..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border dark:border-white/[0.08] rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="absolute right-2.5 top-2.5 text-foreground-muted hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Controls & Column Visibility Menu */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto shrink-0">
            {/* Action Filter */}
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="flex-1 sm:flex-initial sm:w-[150px] h-9">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="STAGE_CHANGE">STAGE CHANGE</SelectItem>
                <SelectItem value="LOGIN">LOGIN</SelectItem>
              </SelectContent>
            </Select>

            {/* Column Visibility Menu */}
            <DataGridColumnVisibilityMenu table={table} />
          </div>
        </TooltipProvider>
      </div>

      {/* CommonDataGrid Table (Matching Inquiries and User Management) */}
      <CommonDataGrid
        table={table}
        recordCount={filteredLogs.length}
        isLoading={loading || isRefreshing}
        emptyState={
          <div className="p-12 text-center text-foreground-muted bg-surface dark:bg-[#121214] rounded-xl border border-border dark:border-white/[0.08]">
            <Activity className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-foreground text-xs">No audit logs found</p>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Try adjusting your search query or action filter.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default AuditLogsTab;
