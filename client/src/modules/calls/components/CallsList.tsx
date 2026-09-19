import React, { useMemo, useState } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  MoreHorizontal,
  Edit3,
  Trash2,
  CheckCircle2,
  User,
  Building2,
} from 'lucide-react';
import { Call } from '@/modules/core/types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import { CallEmptyState } from './CallEmptyState';
import { getCallStatusBadge, getCallTypeBadge } from './CallCard';
import { cn } from '@/modules/core/lib/utils';
import { CommonDataGrid } from '@/modules/core/components/ui/CommonDataGrid';
import {
  dataGridFeatures,
  DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from '@tanstack/react-table';

export interface CallsListProps {
  calls: Call[];
  isLoading: boolean;
  hasFilters: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearFilters: () => void;
  onNewCall: () => void;
  onSelectCall?: (id: string) => void;
  onEditCall?: (call: Call) => void;
  onToggleStatus?: (call: Call) => void;
  onDeleteCall?: (id: string) => void;
}

export const CallsList: React.FC<CallsListProps> = ({
  calls,
  isLoading,
  hasFilters,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onClearFilters,
  onNewCall,
  onSelectCall,
  onEditCall,
  onToggleStatus,
  onDeleteCall,
}) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'callStartDate', desc: true },
  ]);

  const allSelected = calls.length > 0 && selectedIds.length === calls.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < calls.length;

  const columns = useMemo<ColumnDef<DataGridFeatures, Call>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={onToggleSelectAll}
              className="rounded border-border text-fairway-600 focus:ring-fairway-500 cursor-pointer"
            />
          </div>
        ),
        cell: ({ row }) => {
          const isSelected = selectedIds.includes(row.original.id);
          return (
            <div
              className="flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(row.original.id);
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="rounded border-border text-fairway-600 focus:ring-fairway-500 cursor-pointer"
              />
            </div>
          );
        },
        size: 40,
        enableSorting: false,
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: ({ row }) => {
          const call = row.original;
          return (
            <div
              onClick={() => onSelectCall?.(call.id)}
              className="cursor-pointer group max-w-[280px]"
            >
              <div className="font-bold text-foreground group-hover:text-fairway-600 transition-colors truncate">
                {call.subject}
              </div>
              {call.agenda && (
                <div className="text-[11px] text-foreground-muted truncate mt-0.5">
                  {call.agenda}
                </div>
              )}
            </div>
          );
        },
        size: 240,
        enableSorting: true,
      },
      {
        accessorKey: 'callType',
        header: 'Call Type',
        cell: ({ row }) => {
          const typeBadge = getCallTypeBadge(row.original.callType);
          return (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadge.className}`}
            >
              {typeBadge.icon}
              <span>{typeBadge.label}</span>
            </span>
          );
        },
        size: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'callStartDate',
        header: 'Call Start Time',
        cell: ({ row }) => {
          const call = row.original;
          return (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
              <span>{call.callStartDate} {call.callStartTime}</span>
            </span>
          );
        },
        size: 170,
        enableSorting: true,
      },
      {
        accessorKey: 'callDuration',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="bg-surface-muted px-2 py-0.5 rounded-md border border-border/40 font-mono font-medium text-foreground text-xs">
            {row.original.callDuration || '00:15'}
          </span>
        ),
        size: 90,
        enableSorting: false,
      },
      {
        accessorKey: 'callStatus',
        header: 'Status',
        cell: ({ row }) => {
          const statusBadge = getCallStatusBadge(row.original.callStatus);
          return (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          );
        },
        size: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'callForName',
        header: 'Call For',
        cell: ({ row }) => {
          const call = row.original;
          return call.callForName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3 h-3 text-foreground-muted shrink-0" />
              <span className="truncate max-w-[130px] font-medium text-foreground text-xs">
                {call.callForName}
              </span>
            </div>
          ) : (
            <span className="text-foreground-muted text-xs">—</span>
          );
        },
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'relatedToName',
        header: 'Related To',
        cell: ({ row }) => {
          const call = row.original;
          return call.relatedToName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3 h-3 text-foreground-muted shrink-0" />
              <span className="truncate max-w-[130px] text-foreground text-xs">
                {call.relatedToName}
              </span>
            </div>
          ) : (
            <span className="text-foreground-muted text-xs">—</span>
          );
        },
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'callOwnerName',
        header: 'Owner',
        cell: ({ row }) => {
          const call = row.original;
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-fairway-500/10 text-fairway-600 font-bold text-[10px] flex items-center justify-center border border-fairway-500/20 shrink-0">
                {call.callOwnerName?.charAt(0) || 'U'}
              </div>
              <span className="text-[11px] font-medium text-foreground truncate max-w-[110px]">
                {call.callOwnerName}
              </span>
            </div>
          );
        },
        size: 130,
        enableSorting: true,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const call = row.original;
          return (
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                    aria-label="Call Options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-surface border-border">
                  {onEditCall && (
                    <DropdownMenuItem onClick={() => onEditCall(call)} className="gap-2 cursor-pointer text-xs">
                      <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
                      <span>Edit Call</span>
                    </DropdownMenuItem>
                  )}
                  {onToggleStatus && (
                    <DropdownMenuItem onClick={() => onToggleStatus(call)} className="gap-2 cursor-pointer text-xs">
                      {call.callStatus === 'Completed' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>Mark as Scheduled</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mark as Completed</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDeleteCall && (
                    <DropdownMenuItem
                      onClick={() => onDeleteCall(call.id)}
                      className="gap-2 text-rose-600 dark:text-rose-400 cursor-pointer text-xs focus:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Call</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 50,
        enableSorting: false,
      },
    ],
    [allSelected, someSelected, selectedIds, onToggleSelectAll, onToggleSelect, onSelectCall, onEditCall, onToggleStatus, onDeleteCall]
  );

  const pagedCalls = useMemo(() => {
    const sorted = [...calls].sort((a, b) => {
      const activeSort = sorting[0];
      if (!activeSort) return 0;
      const valA = (a as any)[activeSort.id] || '';
      const valB = (b as any)[activeSort.id] || '';
      if (valA < valB) return activeSort.desc ? 1 : -1;
      if (valA > valB) return activeSort.desc ? -1 : 1;
      return 0;
    });
    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [calls, sorting, pagination.pageIndex, pagination.pageSize]);

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: pagedCalls,
    pageCount: Math.max(1, Math.ceil(calls.length / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: Call) => row.id,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  return (
    <CommonDataGrid
      table={table}
      recordCount={calls.length}
      isLoading={isLoading}
      showPagination={true}
      paginationSizes={[10, 20, 50, 100]}
      scrollMaxHeight="max-h-[calc(100vh-280px)]"
      onRowClick={(call) => onSelectCall?.(call.id)}
      emptyState={
        <CallEmptyState
          hasFilters={hasFilters}
          onClearFilters={onClearFilters}
          onNewCall={onNewCall}
        />
      }
    />
  );
};

export default CallsList;
