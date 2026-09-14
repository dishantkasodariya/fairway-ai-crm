import React from 'react';
import {
  CheckCircle2,
  Clock,
  Building2,
  User,
  Trash2,
  MoreVertical,
  Edit3,
} from 'lucide-react';
import { Task } from '@/modules/core/types';
import { formatRelativeDate, formatDate } from '@/modules/core/utils/formatters';
import { Badge } from '@/modules/core/components/ui/Badge';
import { cn } from '@/modules/core/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import { getTaskTypeIcon, normalizeStatus, getValidDueDate } from './TasksList';

export interface TasksCardProps {
  tasks: Task[];
  todayStr: string;
  onToggleTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const TasksCard: React.FC<TasksCardProps> = ({
  tasks,
  todayStr,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {tasks.map((t) => {
        const isDone = normalizeStatus(t.status) === 'Completed';
        const dueDateStr = getValidDueDate(t);
        const isOverdue = !isDone && dueDateStr < todayStr;

        return (
          <div
            key={t.id}
            className={cn(
              "bg-surface rounded-card border border-border p-4 shadow-subtle hover:border-fairway-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left relative",
              isOverdue && "border-l-4 border-l-rose-500 bg-rose-500/[0.02]"
            )}
          >
            {/* Card Top: Badges & Actions */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-muted px-2 py-0.5 rounded text-foreground border border-border">
                  {getTaskTypeIcon(t.taskType)}
                  <span>{t.taskType || 'Task'}</span>
                </span>

                {t.priority && (
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

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleTask(t.id)}
                  className="p-1 text-foreground-muted hover:text-emerald-600 transition-colors rounded hover:bg-surface-muted cursor-pointer"
                  title={isDone ? 'Mark Pending' : 'Mark Complete'}
                >
                  <CheckCircle2
                    className={cn(
                      "w-4 h-4",
                      isDone
                        ? "text-emerald-600 fill-emerald-100 dark:fill-emerald-950/50"
                        : "text-slate-400"
                    )}
                  />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-7 rounded-md border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground-muted hover:text-foreground transition-all cursor-pointer shadow-2xs focus:outline-none"
                      title="Task options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
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
            </div>

            {/* Card Body: Description & Details */}
            <div className="space-y-2 flex-1">
              <p
                className={cn(
                  "text-xs font-semibold line-clamp-2",
                  isDone ? "line-through text-foreground-muted" : "text-foreground"
                )}
              >
                {t.description}
              </p>

              <div className="space-y-1 text-[11px]">
                {t.companyName && (
                  <div
                    onClick={() => t.companyId && onNavigateToCompany(t.companyId)}
                    className="font-bold text-foreground hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                    <span className="truncate">{t.companyName}</span>
                  </div>
                )}

                {t.inquiryNumber && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-foreground-muted text-[10px]">Inquiry:</span>
                    <span
                      onClick={() => t.inquiryId && onNavigateToInquiry(t.inquiryId)}
                      className="font-mono text-[10px] bg-surface-muted px-1.5 py-0.2 rounded border border-border text-foreground hover:border-foreground/40 cursor-pointer"
                    >
                      {t.inquiryNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Footer: Due Date & Assignee */}
            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1 min-w-0">
                <Clock
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    isOverdue ? "text-rose-600" : "text-foreground-muted"
                  )}
                />
                <span
                  className={cn(
                    "truncate text-[10px]",
                    isOverdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-foreground-muted"
                  )}
                >
                  {formatDate(dueDateStr)} {t.dueTime && `· ${t.dueTime}`}
                </span>
              </div>

              {t.assignedUserName && (
                <span className="text-foreground-muted text-[10px] truncate max-w-[45%] flex items-center gap-1">
                  <User className="w-3 h-3 text-foreground-muted shrink-0" />
                  <span className="truncate">{t.assignedUserName}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TasksCard;
