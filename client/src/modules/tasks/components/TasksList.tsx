import React, { useMemo, useState, useEffect } from 'react';
import {
  CheckCircle2,
  Building2,
  User,
  Trash2,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  MoreHorizontal,
  Edit3,
  ExternalLink,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Task } from '@/modules/core/types';
import { formatDate } from '@/modules/core/utils/formatters';
import { cn } from '@/modules/core/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import {
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { CommonDataGrid } from '@/modules/core/components/ui/CommonDataGrid';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from '@tanstack/react-table';

export interface ColumnVisibility {
  status: boolean;
  description: boolean;
  priority: boolean;
  company: boolean;
  inquiry: boolean;
  dueDate: boolean;
  assignee: boolean;
  actions: boolean;
}

export const getTaskTypeIcon = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'call':
      return <Phone className="w-3.5 h-3.5 text-foreground-muted" />;
    case 'email':
      return <Mail className="w-3.5 h-3.5 text-foreground-muted" />;
    case 'meeting':
      return <Calendar className="w-3.5 h-3.5 text-foreground-muted" />;
    case 'site visit':
      return <Building2 className="w-3.5 h-3.5 text-foreground-muted" />;
    default:
      return <CheckSquare className="w-3.5 h-3.5 text-foreground-muted" />;
  }
};

export const normalizeStatus = (status?: string): 'Completed' | 'Pending' => {
  if (!status) return 'Pending';
  const clean = status.trim().toLowerCase();
  if (clean === 'completed' || clean === 'done' || clean === 'closed') {
    return 'Completed';
  }
  return 'Pending';
};

export const getValidDueDate = (task: Task): string => {
  const raw = task.dueDate || (task as any).due_date;
  if (!raw) return new Date().toISOString().split('T')[0];
  if (typeof raw === 'string' && raw.includes('T')) {
    return raw.split('T')[0];
  }
  return String(raw);
};

export interface TasksListProps {
  tasks: Task[];
  columns?: ColumnVisibility;
  todayStr?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onToggleTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const TasksList: React.FC<TasksListProps> = ({
  tasks,
  columns,
  todayStr = new Date().toISOString().split('T')[0],
  isLoading = false,
  emptyState,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'dueDate', desc: false },
  ]);

  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [tasks.length]);

  const taskColumns = useMemo<ColumnDef<DataGridFeatures, Task>[]>(
    () => [
      // 1. Completion Checkbox (1-click)
      {
        id: 'statusToggle',
        header: () => <span className="sr-only">Status</span>,
        cell: ({ row }) => {
          const isDone = normalizeStatus(row.original.status) === 'Completed';
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => onToggleTask(row.original.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer group"
                title={isDone ? 'Click to mark as Pending' : 'Click to mark as Done'}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-foreground-muted" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-border group-hover:border-foreground/50 transition-colors" />
                )}
              </button>
            </div>
          );
        },
        size: 46,
        minSize: 44,
        maxSize: 50,
        enableSorting: false,
        enableResizing: false,
        enablePinning: true,
      },

      // 2. Normal Sr. No.
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
        enablePinning: true,
      },

      // 3. Task & Context (Title + Company + Inquiry combined to eliminate empty dashes)
      {
        accessorKey: 'description',
        id: 'description',
        header: ({ column }) => <DataGridColumnHeader title="Task & Customer" column={column} />,
        cell: ({ row }) => {
          const t = row.original;
          const isDone = normalizeStatus(t.status) === 'Completed';
          return (
            <div className="py-1.5 space-y-1 min-w-[220px] max-w-xl">
              {/* Task Description / Action */}
              <div
                className={cn(
                  'text-xs font-semibold leading-snug line-clamp-2',
                  isDone ? 'line-through text-foreground-muted opacity-70' : 'text-foreground'
                )}
                title={t.description}
              >
                {t.description}
              </div>
              {isDone && t.completedNotes && (
                <div className="text-[11px] text-foreground-muted leading-snug line-clamp-2" title={t.completedNotes}>
                  <span className="font-semibold text-foreground">Outcome:</span> {t.completedNotes}
                </div>
              )}

              {/* Company & Inquiry Reference in one clear line */}
              {(t.companyName || t.inquiryNumber) && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[11px] text-foreground-muted flex-wrap"
                >
                  {t.companyName && (
                    <button
                      type="button"
                      onClick={() => t.companyId && onNavigateToCompany(t.companyId)}
                      className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer truncate max-w-[200px]"
                    >
                      <Building2 className="w-3 h-3 text-foreground-muted shrink-0" />
                      <span className="truncate">{t.companyName}</span>
                    </button>
                  )}

                  {t.companyName && t.inquiryNumber && (
                    <span className="text-foreground-muted/40">•</span>
                  )}

                  {t.inquiryNumber && (
                    <button
                      type="button"
                      onClick={() => t.inquiryId && onNavigateToInquiry(t.inquiryId)}
                      className="font-mono font-medium text-[10px] bg-surface-muted hover:bg-surface-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border transition-colors cursor-pointer"
                    >
                      {t.inquiryNumber}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        },
        size: 340,
        minSize: 240,
        enableSorting: true,
      },

      // 3. Task Type Pill
      {
        accessorKey: 'taskType',
        id: 'taskType',
        header: ({ column }) => <DataGridColumnHeader title="Type" column={column} />,
        cell: ({ row }) => {
          const type = row.original.taskType || 'Task';
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-surface-muted px-2.5 py-1 rounded-md text-foreground border border-border whitespace-nowrap">
              {getTaskTypeIcon(type)}
              <span>{type}</span>
            </span>
          );
        },
        size: 110,
        minSize: 95,
        enableSorting: true,
      },

      // 4. Due Date & Time (Smart relative label)
      {
        accessorKey: 'dueDate',
        id: 'dueDate',
        header: ({ column }) => <DataGridColumnHeader title="Due Date & Time" column={column} />,
        cell: ({ row }) => {
          const t = row.original;
          const dueDateStr = getValidDueDate(t);
          const isDone = normalizeStatus(t.status) === 'Completed';
          const isOverdue = !isDone && dueDateStr < todayStr;
          const isToday = !isDone && dueDateStr === todayStr;

          return (
            <div className="flex flex-col gap-0.5 whitespace-nowrap text-xs">
              <div className="flex items-center gap-1.5">
                {isOverdue ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <AlertTriangle className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    Overdue
                  </span>
                ) : isToday ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <Clock className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    Today
                  </span>
                ) : (
                  <span className="text-foreground-muted font-medium">
                    {formatDate(dueDateStr)}
                  </span>
                )}

                {t.dueTime && (
                  <span className="text-[10px] text-foreground-muted font-mono bg-surface-muted px-1.5 py-0.5 rounded border border-border/70">
                    {t.dueTime}
                  </span>
                )}
              </div>

              {isOverdue && (
                <span className="text-[10px] text-foreground-muted">
                  Was due on {formatDate(dueDateStr)}
                </span>
              )}
            </div>
          );
        },
        size: 155,
        minSize: 140,
        enableSorting: true,
      },

      // 5. Priority (Subtle minimal colors, no screaming red on every row)
      {
        accessorKey: 'priority',
        id: 'priority',
        header: ({ column }) => <DataGridColumnHeader title="Priority" column={column} />,
        cell: ({ row }) => {
          const priority = row.original.priority || 'Medium';
          const isHigh = priority === 'High';
          const isLow = priority === 'Low';

          return (
            <span
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-md border inline-flex items-center whitespace-nowrap',
                isHigh
                  ? 'bg-surface-muted text-foreground font-bold border-foreground/30'
                  : isLow
                  ? 'bg-surface-muted/40 text-foreground-muted/80 border-border'
                  : 'bg-surface-muted text-foreground-muted border-border'
              )}
            >
              {priority}
            </span>
          );
        },
        size: 95,
        minSize: 85,
        enableSorting: true,
      },

      // 6. Assigned Salesperson (With initials circle avatar)
      {
        accessorKey: 'assignedUserName',
        id: 'assignedUserName',
        header: ({ column }) => <DataGridColumnHeader title="Salesperson" column={column} />,
        cell: ({ row }) => {
          const name = row.original.assignedUserName || 'Unassigned';
          const initials = name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div className="flex items-center gap-2 text-xs text-foreground font-medium truncate">
              <span className="w-5 h-5 rounded-full bg-surface-muted border border-border text-[9px] font-bold text-foreground flex items-center justify-center shrink-0">
                {initials || <User className="w-3 h-3" />}
              </span>
              <span className="truncate">{name}</span>
            </div>
          );
        },
        size: 145,
        minSize: 120,
        enableSorting: true,
      },

      // 7. Actions Menu (Far right)
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const t = row.original;
          const isDone = normalizeStatus(t.status) === 'Completed';
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md border border-transparent hover:border-border hover:bg-surface-muted flex items-center justify-center text-foreground-muted hover:text-foreground transition-all cursor-pointer"
                    title="Task options"
                    aria-label="Actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-surface border border-border shadow-dialog z-50">
                  {t.companyId && (
                    <DropdownMenuItem
                      onClick={() => onNavigateToCompany(t.companyId!)}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-foreground-muted" />
                      <span>View Company</span>
                    </DropdownMenuItem>
                  )}
                  {t.inquiryId && (
                    <DropdownMenuItem
                      onClick={() => onNavigateToInquiry(t.inquiryId!)}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-foreground-muted" />
                      <span>View Inquiry</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onToggleTask(t.id)}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>{isDone ? 'Mark Pending' : 'Mark Done'}</span>
                  </DropdownMenuItem>
                  {onEditTask && (
                    <DropdownMenuItem
                      onClick={() => onEditTask(t)}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
                      <span>Edit Task</span>
                    </DropdownMenuItem>
                  )}
                  {onDeleteTask && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteTask(t.id)}
                        className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Task</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 55,
        minSize: 50,
        maxSize: 60,
        enableSorting: false,
        enableResizing: false,
      },
    ],
    [onNavigateToCompany, onNavigateToInquiry, onToggleTask, onEditTask, onDeleteTask, todayStr]
  );

  const pagedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      const activeSort = sorting[0];
      if (!activeSort) return 0;
      let valA: any = a[activeSort.id as keyof Task] || '';
      let valB: any = b[activeSort.id as keyof Task] || '';
      if (activeSort.id === 'dueDate') {
        valA = getValidDueDate(a);
        valB = getValidDueDate(b);
      }
      if (valA < valB) return activeSort.desc ? 1 : -1;
      if (valA > valB) return activeSort.desc ? -1 : 1;
      return 0;
    });
    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [tasks, sorting, pagination.pageIndex, pagination.pageSize]);

  const table = useTable({
    features: dataGridFeatures,
    columns: taskColumns,
    data: pagedTasks,
    pageCount: Math.max(1, Math.ceil(tasks.length / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: Task) => row.id,
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
      recordCount={tasks.length}
      isLoading={isLoading}
      showPagination={true}
      paginationSizes={[10, 20, 50, 100]}
      onRowClick={(task) => onEditTask?.(task)}
      scrollMaxHeight="max-h-[calc(100vh-320px)]"
      emptyState={
        emptyState ?? (
          <div className="py-16 text-center text-xs text-foreground-muted bg-surface rounded-xl border border-border p-6">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-foreground text-sm">No tasks in this view</p>
            <p className="mt-1 max-w-sm mx-auto">
              Everything looks clear! Schedule a new follow-up to keep relationships warm.
            </p>
          </div>
        )
      }
    />
  );
};

export default TasksList;
