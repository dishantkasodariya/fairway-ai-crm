import React from 'react';
import {
  FileText,
  MapPin,
  Clock,
  ChevronRight,
  User,
} from 'lucide-react';
import { Inquiry } from '@/modules/core/types';
import { Badge } from '@/modules/core/components/ui/Badge';
import {
  formatINR,
  formatSqFt,
  formatRelativeDate,
  getPipelineStageBadge,
} from '@/modules/core/utils/formatters';

export interface WarehouseInquiryCardProps {
  inquiry: Inquiry;
  onSelect: (id: string) => void;
}

/**
 * Modern Rich Grid Card for Warehouse Inquiries & Leads
 */
export const WarehouseInquiryCard: React.FC<WarehouseInquiryCardProps> = ({
  inquiry,
  onSelect,
}) => {
  const stageStyle = getPipelineStageBadge(inquiry.stage);
  const isOverdue =
    inquiry.nextFollowUpDate &&
    inquiry.status === 'Active' &&
    new Date(inquiry.nextFollowUpDate) < new Date(new Date().toDateString());

  return (
    <div
      onClick={() => onSelect(inquiry.id)}
      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-card rounded-card p-4 transition-all cursor-pointer flex flex-col justify-between group text-xs select-none shadow-2xs"
    >
      <div>
        {/* Top Row: Code Badge + Stage Pill */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-white dark:border-primary/40 shadow-xs whitespace-nowrap">
            {inquiry.inquiryNumber}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${stageStyle.className}`}>
            {stageStyle.label}
          </span>
        </div>

        {/* Company Name & Requirement */}
        <div className="mt-3">
          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {inquiry.companyName}
          </h3>
          <p className="text-xs text-foreground-muted line-clamp-2 mt-1 min-h-[32px] leading-relaxed">
            {inquiry.requirement}
          </p>
        </div>

        {/* Key Specs Matrix */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-[11px]">
          <div className="bg-surface-muted p-2 rounded-lg border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Required Area</span>
            <span className="font-bold text-foreground tabular-nums whitespace-nowrap truncate block">{formatSqFt(inquiry.requiredAreaSqFt)}</span>
          </div>
          <div className="bg-surface-muted p-2 rounded-lg border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Monthly Budget</span>
            <span className="font-mono font-bold text-foreground tabular-nums whitespace-nowrap truncate block">{formatINR(inquiry.budgetMonthlyINR, true)}</span>
          </div>
        </div>

        {/* Location & Priority */}
        <div className="flex items-center justify-between gap-2 mt-3 text-[11px] text-foreground-muted">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{inquiry.location}</span>
          </div>
          <Badge
            variant={inquiry.priority === 'High' ? 'danger' : inquiry.priority === 'Medium' ? 'warning' : 'default'}
            size="sm"
            dot
          >
            {inquiry.priority}
          </Badge>
        </div>
      </div>

      {/* Bottom Footer: Owner & Follow-up Action */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-white font-bold text-[10px] flex items-center justify-center border border-primary/25 dark:border-primary/40 shrink-0">
            {inquiry.salespersonName?.charAt(0) || 'U'}
          </div>
          <span className="truncate max-w-[110px] font-medium text-foreground">{inquiry.salespersonName}</span>
        </div>

        {inquiry.nextFollowUpDate ? (
          <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-foreground-muted'}`}>
            <Clock className="w-3 h-3" />
            <span>{formatRelativeDate(inquiry.nextFollowUpDate)}</span>
          </div>
        ) : (
          <span className="text-primary dark:text-white group-hover:underline flex items-center gap-0.5 font-semibold">
            <span>View Details</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Single-line Dense Card for Warehouse Inquiries
 */
export const WarehouseInquiryLineCard: React.FC<WarehouseInquiryCardProps> = ({
  inquiry,
  onSelect,
}) => {
  const stageStyle = getPipelineStageBadge(inquiry.stage);
  const isOverdue =
    inquiry.nextFollowUpDate &&
    inquiry.status === 'Active' &&
    new Date(inquiry.nextFollowUpDate) < new Date(new Date().toDateString());

  return (
    <div
      onClick={() => onSelect(inquiry.id)}
      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-subtle rounded-xl p-3 sm:px-4 sm:py-3 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 select-none shadow-2xs"
    >
      {/* Mobile-Adaptive Header / Desktop Left Block */}
      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div className="shrink-0 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-white dark:border-primary/40 flex items-center gap-1.5 shadow-xs whitespace-nowrap">
          <FileText className="w-3.5 h-3.5 text-primary dark:text-white" />
          <span>{inquiry.inquiryNumber}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors break-words">
              {inquiry.companyName}
            </span>
            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0 dark:bg-primary/20 dark:text-white dark:border-primary/30">
              {formatSqFt(inquiry.requiredAreaSqFt)}
            </span>
            <span className={`md:hidden text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageStyle.className}`}>
              {stageStyle.label}
            </span>
          </div>
          <p className="text-xs text-foreground-muted line-clamp-2 sm:truncate mt-0.5 max-w-xl leading-snug">
            {inquiry.requirement}
          </p>
        </div>
      </div>

      {/* Badges, Budget, Location & Action Trigger */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap md:flex-nowrap justify-between md:justify-end text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
        <div className="flex items-center gap-1 text-[11px] text-foreground-muted bg-surface-muted/70 px-2 py-1 rounded-md border border-border/80">
          <MapPin className="w-3 h-3 text-primary shrink-0" />
          <span className="font-medium truncate max-w-[120px] sm:max-w-none">{inquiry.location}</span>
        </div>

        <span className={`hidden md:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${stageStyle.className}`}>
          {stageStyle.label}
        </span>

        <div className="hidden lg:flex items-center gap-1 text-[11px] text-foreground-muted bg-surface-muted/60 px-2 py-1 rounded-md border border-border/60 whitespace-nowrap">
          <User className="w-3 h-3 text-foreground-muted shrink-0" />
          <span className="truncate max-w-[100px]">{inquiry.salespersonName}</span>
        </div>

        <Badge
          variant={inquiry.priority === 'High' ? 'danger' : inquiry.priority === 'Medium' ? 'warning' : 'default'}
          size="sm"
          dot
        >
          {inquiry.priority}
        </Badge>

        {inquiry.nextFollowUpDate && (
          <div
            className={`hidden xl:flex items-center gap-1 text-[11px] px-2 py-0.8 rounded-md font-medium whitespace-nowrap ${
              isOverdue
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold'
                : 'bg-surface-muted text-foreground-muted border border-border/70'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{formatRelativeDate(inquiry.nextFollowUpDate)}</span>
          </div>
        )}

        <div className="text-right whitespace-nowrap">
          <span className="font-mono font-bold text-foreground text-xs sm:text-sm">
            {formatINR(inquiry.budgetMonthlyINR, true)}
          </span>
          <span className="text-[10px] text-foreground-muted block leading-none">/ month</span>
        </div>

        <div className="w-7 h-7 rounded-lg bg-surface group-hover:bg-primary group-hover:text-white text-foreground-muted flex items-center justify-center border border-border group-hover:border-primary transition-all shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

/**
 * Loading Skeleton for Grid & Line Cards
 */
export const WarehouseInquiryCardSkeleton: React.FC<{ mode?: 'grid' | 'line' }> = ({ mode = 'grid' }) => {
  if (mode === 'line') {
    return (
      <div className="bg-surface border border-border rounded-xl p-3.5 space-y-2 animate-pulse flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="size-7 bg-surface-muted rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4.5 w-48 bg-surface-muted rounded-md" />
            <div className="h-3.5 w-72 bg-surface-muted rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-20 bg-surface-muted rounded-md" />
          <div className="h-6 w-16 bg-surface-muted rounded-full" />
          <div className="h-6 w-24 bg-surface-muted rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-center pb-2.5 border-b border-border">
        <div className="h-5 w-20 bg-surface-muted rounded-md" />
        <div className="h-5 w-16 bg-surface-muted rounded-full" />
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="h-5 w-3/4 bg-surface-muted rounded-md" />
        <div className="h-3.5 w-full bg-surface-muted rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <div className="h-10 bg-surface-muted rounded-lg" />
        <div className="h-10 bg-surface-muted rounded-lg" />
      </div>
    </div>
  );
};
