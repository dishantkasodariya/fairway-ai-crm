import React from 'react';
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
  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-muted/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <CallEmptyState
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
        onNewCall={onNewCall}
      />
    );
  }

  const allSelected = calls.length > 0 && selectedIds.length === calls.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < calls.length;

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-muted/40 text-foreground-muted font-semibold select-none">
              <th className="w-10 px-3.5 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="rounded border-border text-fairway-600 focus:ring-fairway-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 font-semibold text-foreground">Subject</th>
              <th className="px-3.5 py-3 font-semibold text-foreground">Call Type</th>
              <th className="px-3.5 py-3 font-semibold text-foreground">Call Start Time</th>
              <th className="px-3 py-3 font-semibold text-foreground">Call Duration</th>
              <th className="px-3.5 py-3 font-semibold text-foreground">Status</th>
              <th className="px-3.5 py-3 font-semibold text-foreground">Call For</th>
              <th className="px-3.5 py-3 font-semibold text-foreground">Related To</th>
              <th className="px-3.5 py-3 font-semibold text-foreground">Call Owner</th>
              <th className="w-12 px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {calls.map((call) => {
              const isSelected = selectedIds.includes(call.id);
              const statusBadge = getCallStatusBadge(call.callStatus);
              const typeBadge = getCallTypeBadge(call.callType);

              return (
                <tr
                  key={call.id}
                  onClick={() => onSelectCall?.(call.id)}
                  className={cn(
                    'hover:bg-surface-muted/50 transition-colors cursor-pointer group',
                    isSelected && 'bg-fairway-50/40 dark:bg-fairway-950/20'
                  )}
                >
                  {/* Checkbox */}
                  <td
                    className="w-10 px-3.5 py-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(call.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-border text-fairway-600 focus:ring-fairway-500 cursor-pointer"
                    />
                  </td>

                  {/* Subject */}
                  <td className="px-4 py-3 min-w-[200px] max-w-[280px]">
                    <div className="font-bold text-foreground group-hover:text-fairway-600 transition-colors truncate">
                      {call.subject}
                    </div>
                    {call.agenda && (
                      <div className="text-[11px] text-foreground-muted truncate mt-0.5 max-w-[260px]">
                        {call.agenda}
                      </div>
                    )}
                  </td>

                  {/* Call Type */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadge.className}`}
                    >
                      {typeBadge.icon}
                      <span>{typeBadge.label}</span>
                    </span>
                  </td>

                  {/* Call Start Time */}
                  <td className="px-3.5 py-3 whitespace-nowrap font-mono text-[11px] text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                      <span>{call.callStartDate} {call.callStartTime}</span>
                    </span>
                  </td>

                  {/* Call Duration */}
                  <td className="px-3 py-3 whitespace-nowrap font-mono font-medium text-foreground">
                    <span className="bg-surface-muted px-2 py-0.5 rounded-md border border-border/40">
                      {call.callDuration || '00:15'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                  </td>

                  {/* Call For */}
                  <td className="px-3.5 py-3 whitespace-nowrap text-foreground min-w-[130px]">
                    {call.callForName ? (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-foreground-muted shrink-0" />
                        <span className="truncate max-w-[120px] font-medium">{call.callForName}</span>
                      </div>
                    ) : (
                      <span className="text-foreground-muted">—</span>
                    )}
                  </td>

                  {/* Related To */}
                  <td className="px-3.5 py-3 whitespace-nowrap text-foreground min-w-[140px]">
                    {call.relatedToName ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-foreground-muted shrink-0" />
                        <span className="truncate max-w-[130px]">{call.relatedToName}</span>
                      </div>
                    ) : (
                      <span className="text-foreground-muted">—</span>
                    )}
                  </td>

                  {/* Owner */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-fairway-500/10 text-fairway-600 font-bold text-[10px] flex items-center justify-center border border-fairway-500/20 shrink-0">
                        {call.callOwnerName?.charAt(0) || 'U'}
                      </div>
                      <span className="text-[11px] font-medium text-foreground truncate max-w-[110px]">
                        {call.callOwnerName}
                      </span>
                    </div>
                  </td>

                  {/* 3-Dot Actions */}
                  <td
                    className="w-12 px-3 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CallsList;
