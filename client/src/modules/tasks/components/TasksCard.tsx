import React from 'react';
import {
  CheckCircle2,
  Clock,
  Building2,
  User,
  Trash2,
  MoreVertical,
  Edit3,
  ExternalLink,
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {tasks.map((t) => {
        const isDone = normalizeStatus(t.status) === 'Completed';
        const dueDateStr = getValidDueDate(t);
        const isOverdue = !isDone && dueDateStr < todayStr;
        const isToday = !isDone && dueDateStr === todayStr;
        const priority = t.priority || 'Medium';
        const isHigh = priority === 'High';
        const isLow = priority === 'Low';

        const assigneeName = t.assignedUserName || 'Unassigned';
        const initials = assigneeName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={t.id}
            onClick={() => onEditTask?.(t)}
            className={cn(
              'bg-surface rounded-xl border border-border p-4 shadow-2xs hover:border-foreground/30 hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-left relative cursor-pointer',
              isDone && 'opacity-70 bg-surface-muted/20'
            )}
          >
            {/* 1. Card Top: Type, Priority, 1-Click Checkbox & Options */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-muted px-2 py-0.5 rounded text-foreground border border-border">
                  {getTaskTypeIcon(t.taskType)}
                  <span>{t.taskType || 'Task'}</span>
                </span>

                <span
                  className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded border inline-flex items-center',
                    isHigh
                      ? 'bg-surface-muted text-foreground font-bold border-foreground/30'
                      : isLow
                      ? 'bg-surface-muted/40 text-foreground-muted/80 border-border'
                      : 'bg-surface-muted text-foreground-muted border-border'
                  )}
                >
                  {priority}
                </span>
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => onToggleTask(t.id)}
                  className="p-1 rounded-md text-foreground-muted hover:text-foreground transition-colors cursor-pointer group"
                  title={isDone ? 'Mark as Pending' : 'Mark as Done'}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-foreground-muted" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-border group-hover:border-foreground/50 transition-colors" />
                  )}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md border border-transparent hover:border-border hover:bg-surface-muted flex items-center justify-center text-foreground-muted hover:text-foreground transition-all cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
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
            </div>

            {/* 2. Card Body: Task Action & Entity Links */}
            <div className="space-y-2 flex-1">
              <p
                className={cn(
                  'text-xs font-semibold leading-snug line-clamp-2',
                  isDone ? 'line-through text-foreground-muted opacity-70' : 'text-foreground'
                )}
                title={t.description}
              >
                {t.description}
              </p>

              {(t.companyName || t.inquiryNumber) && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[11px] text-foreground-muted flex-wrap pt-0.5"
                >
                  {t.companyName && (
                    <button
                      type="button"
                      onClick={() => t.companyId && onNavigateToCompany(t.companyId)}
                      className="font-semibold text-foreground hover:underline flex items-center gap-1 truncate max-w-[170px] text-left cursor-pointer"
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
                      className="font-mono font-medium text-[10px] bg-surface-muted hover:bg-surface-muted/80 text-foreground px-1.5 py-0.2 rounded border border-border cursor-pointer"
                    >
                      {t.inquiryNumber}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Card Footer: Due Status & Assignee */}
            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                {isOverdue ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <AlertTriangle className="w-3 h-3 text-foreground-muted shrink-0" />
                    Overdue ({formatDate(dueDateStr)})
                  </span>
                ) : isToday ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <Clock className="w-3 h-3 text-foreground-muted shrink-0" />
                    Today {t.dueTime && `· ${t.dueTime}`}
                  </span>
                ) : (
                  <span className="text-foreground-muted text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0 text-foreground-muted" />
                    {formatDate(dueDateStr)} {t.dueTime && `· ${t.dueTime}`}
                  </span>
                )}
              </div>

              {t.assignedUserName && (
                <div className="flex items-center gap-1.5 text-[11px] text-foreground font-medium shrink-0 max-w-[45%]">
                  <span className="w-4 h-4 rounded-full bg-surface-muted border border-border text-[8px] font-bold text-foreground flex items-center justify-center shrink-0">
                    {initials || <User className="w-2.5 h-2.5" />}
                  </span>
                  <span className="truncate text-[10px]">{t.assignedUserName}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TasksCard;
