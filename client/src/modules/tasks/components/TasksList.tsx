import React from 'react';
import {
  CheckCircle2,
  Clock,
  Building2,
  User,
  Trash2,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  MoreVertical,
  Edit3,
} from 'lucide-react';
import { Task } from '@/modules/core/types';
import { formatRelativeDate, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { cn } from '@/modules/core/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';

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
      return <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
    case 'email':
      return <Mail className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
    case 'meeting':
    case 'site visit':
      return <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
    default:
      return <CheckSquare className="w-3 h-3 text-fairway-600 dark:text-fairway-400" />;
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
  columns: ColumnVisibility;
  todayStr: string;
  onToggleTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const TasksList: React.FC<TasksListProps> = ({
  tasks,
  columns,
  todayStr,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  return (
    <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden divide-y divide-border">
      {tasks.map((t) => {
        const isDone = normalizeStatus(t.status) === 'Completed';
        const dueDateStr = getValidDueDate(t);
        const isOverdue = !isDone && dueDateStr < todayStr;

        return (
          <div
            key={t.id}
            className={cn(
              "p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 hover:bg-surface-muted/50 transition-colors",
              isOverdue && "bg-rose-500/5 border-l-2 border-rose-500"
            )}
          >
            <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
              {columns.status && (
                <button
                  onClick={() => onToggleTask(t.id)}
                  className="mt-0.5 text-foreground-muted hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                  title={isDone ? 'Mark Pending' : 'Mark Complete'}
                >
                  <CheckCircle2
                    className={cn(
                      "w-5 h-5",
                      isDone
                        ? "text-emerald-600 fill-emerald-100 dark:fill-emerald-950/50"
                        : "text-slate-300 dark:text-slate-600 hover:text-slate-400"
                    )}
                  />
                </button>
              )}

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-muted px-2 py-0.5 rounded text-foreground border border-border">
                    {getTaskTypeIcon(t.taskType)}
                    <span>{t.taskType || 'Task'}</span>
                  </span>

                  {columns.priority && t.priority && (
                    <Badge
                      variant={
                        t.priority === 'High'
                          ? 'danger'
                          : t.priority === 'Medium'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                      dot
                    >
                      {t.priority}
                    </Badge>
                  )}
                </div>

                {columns.description && (
                  <p
                    className={cn(
                      "text-xs font-semibold leading-snug",
                      isDone ? "line-through text-foreground-muted" : "text-foreground"
                    )}
                  >
                    {t.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-foreground-muted mt-1.5 flex-wrap">
                  {columns.company && t.companyName && (
                    <span
                      onClick={() => t.companyId && onNavigateToCompany(t.companyId)}
                      className="font-bold text-foreground hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Building2 className="w-3 h-3 text-foreground-muted" />
                      <span>{t.companyName}</span>
                    </span>
                  )}

                  {columns.inquiry && t.inquiryNumber && (
                    <span
                      onClick={() => t.inquiryId && onNavigateToInquiry(t.inquiryId)}
                      className="font-mono bg-surface-muted px-1.5 py-0.2 rounded border border-border text-foreground hover:border-foreground/40 cursor-pointer"
                    >
                      {t.inquiryNumber}
                    </span>
                  )}

                  {columns.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock
                        className={cn("w-3 h-3", isOverdue ? "text-rose-600" : "text-foreground-muted")}
                      />
                      <span
                        className={
                          isOverdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-foreground-muted"
                        }
                      >
                        Due: {formatDate(dueDateStr)} {t.dueTime && `· ${t.dueTime}`} (
                        {formatRelativeDate(dueDateStr)})
                      </span>
                    </span>
                  )}

                  {columns.assignee && t.assignedUserName && (
                    <span className="flex items-center gap-1 text-foreground-muted">
                      <User className="w-3 h-3 text-foreground-muted" />
                      <span>{t.assignedUserName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {columns.actions && (
              <div className="flex items-center justify-end sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-8 rounded-lg border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground-muted hover:text-foreground transition-all cursor-pointer shadow-2xs focus:outline-none"
                      title="Task actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {onEditTask && (
                      <DropdownMenuItem
                        onClick={() => onEditTask(t)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-fairway-600" />
                        <span>Edit Task</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onToggleTask(t.id)}
                      className="gap-2 cursor-pointer"
                    >
                      <CheckCircle2
                        className={cn("w-3.5 h-3.5", isDone ? "text-slate-400" : "text-emerald-600")}
                      />
                      <span>{isDone ? 'Mark Pending' : 'Mark Complete'}</span>
                    </DropdownMenuItem>
                    {onDeleteTask && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteTask(t.id)}
                          className="gap-2 text-rose-600 dark:text-rose-400 focus:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete Task</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TasksList;
