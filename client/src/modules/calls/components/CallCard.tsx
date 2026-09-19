import React from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  User,
  Building2,
  FileText,
  MoreHorizontal,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Call } from '@/modules/core/types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';

export interface CallCardProps {
  call: Call;
  onSelect?: (id: string) => void;
  onEdit?: (call: Call) => void;
  onToggleStatus?: (call: Call) => void;
  onDelete?: (id: string) => void;
}

export const getCallStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return {
        label: 'Completed',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    case 'scheduled':
      return {
        label: 'Scheduled',
        className: 'bg-surface-muted text-foreground border-border',
      };
    case 'overdue':
      return {
        label: 'Overdue',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-surface-muted text-foreground-muted border-border',
      };
    default:
      return {
        label: status || 'Scheduled',
        className: 'bg-surface-muted text-foreground border-border',
      };
  }
};

export const getCallTypeBadge = (type: string) => {
  if (type === 'Inbound') {
    return {
      label: 'Inbound',
      icon: <PhoneIncoming className="w-3 h-3 text-foreground-muted" />,
      className: 'bg-surface-muted text-foreground border-border',
    };
  }
  return {
    label: 'Outbound',
    icon: <PhoneOutgoing className="w-3 h-3 text-foreground-muted" />,
    className: 'bg-surface-muted text-foreground border-border',
  };
};

/**
 * Grid Card View for Calls
 */
export const CallCard: React.FC<CallCardProps> = ({
  call,
  onSelect,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const statusBadge = getCallStatusBadge(call.callStatus);
  const typeBadge = getCallTypeBadge(call.callType);

  return (
    <div
      onClick={() => onSelect?.(call.id)}
      className="bg-surface border border-border hover:border-fairway-400/80 hover:shadow-card rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between group text-xs select-none shadow-2xs relative"
    >
      <div>
        {/* Top Row: Type Pill + Status Badge + 3-Dot Actions */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${typeBadge.className}`}
            >
              {typeBadge.icon}
              <span>{typeBadge.label}</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                  aria-label="Call Actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-surface border-border">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(call)} className="gap-2 cursor-pointer text-xs">
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
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(call.id)}
                    className="gap-2 text-rose-600 dark:text-rose-400 cursor-pointer text-xs focus:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Call</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Subject & Purpose */}
        <div className="mt-3">
          <h3 className="text-sm font-bold text-foreground group-hover:text-fairway-600 transition-colors line-clamp-1">
            {call.subject}
          </h3>
          <p className="text-xs text-foreground-muted line-clamp-2 mt-1 min-h-[32px] leading-relaxed">
            {call.agenda || `Purpose: ${call.callPurpose || 'Client Consultation'}`}
          </p>
        </div>

        {/* Association Matrix: Call For & Related To */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-[11px]">
          <div className="bg-surface-muted p-2 rounded-xl border border-border/60">
            <span className="text-[10px] text-foreground-muted block font-medium">
              Call For ({call.callForType})
            </span>
            <span className="font-bold text-foreground truncate block mt-0.5">
              {call.callForName || 'Not Specified'}
            </span>
          </div>
          <div className="bg-surface-muted p-2 rounded-xl border border-border/60">
            <span className="text-[10px] text-foreground-muted block font-medium">
              Related To ({call.relatedToType})
            </span>
            <span className="font-bold text-foreground truncate block mt-0.5">
              {call.relatedToName || 'Not Specified'}
            </span>
          </div>
        </div>

        {/* Date & Time & Duration */}
        <div className="flex items-center justify-between gap-2 mt-3 text-[11px] text-foreground-muted font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
            <span>{call.callStartDate} {call.callStartTime}</span>
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded-md border border-border/40">
            <Clock className="w-3 h-3 text-foreground-muted shrink-0" />
            <span>{call.callDuration || '00:15'}</span>
          </div>
        </div>
      </div>

      {/* Footer: Owner */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 font-bold text-[10px] flex items-center justify-center border border-fairway-500/20 shrink-0">
            {call.callOwnerName?.charAt(0) || 'U'}
          </div>
          <span className="truncate max-w-[130px] font-medium text-foreground">
            {call.callOwnerName || 'Unassigned'}
          </span>
        </div>

        {call.callResult && (
          <span className="text-[10px] font-medium text-fairway-700 dark:text-fairway-300 bg-fairway-50 dark:bg-fairway-950/50 px-2 py-0.5 rounded-md border border-fairway-200 dark:border-fairway-800 truncate max-w-[120px]">
            {call.callResult}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Line Card View for Calls (Horizontal Mode)
 */
export const CallLineCard: React.FC<CallCardProps> = ({
  call,
  onSelect,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const statusBadge = getCallStatusBadge(call.callStatus);
  const typeBadge = getCallTypeBadge(call.callType);

  return (
    <div
      onClick={() => onSelect?.(call.id)}
      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-xs rounded-xl p-3 sm:px-4 sm:py-3 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs group select-none shadow-2xs"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 border border-fairway-500/20">
          <PhoneCall className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-foreground group-hover:text-fairway-600 transition-colors text-xs sm:text-sm truncate">
              {call.subject}
            </h4>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full border ${typeBadge.className}`}
            >
              {typeBadge.icon}
              <span>{typeBadge.label}</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-foreground-muted mt-1 flex-wrap">
            {call.callForName && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-foreground-muted" />
                <strong className="text-foreground">{call.callForName}</strong> ({call.callForType})
              </span>
            )}
            {call.relatedToName && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-foreground-muted" />
                <span>{call.relatedToName}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-fairway-600" />
              <span>{call.callStartDate} {call.callStartTime}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-muted border border-border">
            {call.callDuration || '00:15'}
          </span>
          <div className="flex items-center gap-1.5 text-foreground-muted text-[11px]">
            <div className="w-5 h-5 rounded-full bg-fairway-500/10 text-fairway-600 font-bold text-[10px] flex items-center justify-center border border-fairway-500/20">
              {call.callOwnerName?.charAt(0) || 'U'}
            </div>
            <span className="hidden md:inline text-foreground">{call.callOwnerName}</span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                aria-label="Call Actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-surface border-border">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(call)} className="gap-2 cursor-pointer text-xs">
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
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(call.id)}
                  className="gap-2 text-rose-600 dark:text-rose-400 cursor-pointer text-xs focus:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Call</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export const CallCardSkeleton: React.FC<{ mode?: 'grid' | 'line' }> = ({ mode = 'grid' }) => {
  if (mode === 'line') {
    return (
      <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-xl bg-surface-muted shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 bg-surface-muted rounded w-48" />
            <div className="h-2.5 bg-surface-muted rounded w-32" />
          </div>
        </div>
        <div className="w-20 h-6 bg-surface-muted rounded-md" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-2.5 border-b border-border">
        <div className="h-4 bg-surface-muted rounded-full w-24" />
        <div className="h-4 bg-surface-muted rounded-full w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-surface-muted rounded w-3/4" />
        <div className="h-3 bg-surface-muted rounded w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <div className="h-12 bg-surface-muted rounded-xl" />
        <div className="h-12 bg-surface-muted rounded-xl" />
      </div>
      <div className="pt-2 flex items-center justify-between">
        <div className="h-3.5 bg-surface-muted rounded w-28" />
        <div className="h-5 bg-surface-muted rounded-full w-14" />
      </div>
    </div>
  );
};

export default CallCard;
