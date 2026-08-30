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
          <span className="font-mono text-xs font-bold bg-fairway-100 text-fairway-900 px-2.5 py-0.5 rounded border border-fairway-300 dark:bg-fairway-950/70 dark:text-fairway-200 dark:border-fairway-700/60 shadow-xs">
            {inquiry.inquiryNumber}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageStyle.className}`}>
            {stageStyle.label}
          </span>
        </div>

        {/* Company Name & Requirement */}
        <div className="mt-3">
          <h3 className="text-base font-bold text-foreground group-hover:text-fairway-700 transition-colors truncate">
            {inquiry.companyName}
          </h3>
          <p className="text-xs text-foreground-muted line-clamp-2 mt-1 min-h-[32px] leading-relaxed">
            {inquiry.requirement}
          </p>
        </div>

        {/* Key Specs Matrix */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-[11px]">
          <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50">
            <span className="text-[10px] text-foreground-muted block">Required Area</span>
            <span className="font-bold text-foreground">{formatSqFt(inquiry.requiredAreaSqFt)}</span>
          </div>
          <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50">
            <span className="text-[10px] text-foreground-muted block">Monthly Budget</span>
            <span className="font-mono font-bold text-foreground">{formatINR(inquiry.budgetMonthlyINR, true)}</span>
          </div>
        </div>

        {/* Location & Priority */}
        <div className="flex items-center justify-between gap-2 mt-3 text-[11px] text-foreground-muted">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
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
          <div className="w-5 h-5 rounded-full bg-fairway-100 text-fairway-800 font-bold text-[10px] flex items-center justify-center border border-fairway-300 dark:bg-fairway-950/70 dark:text-fairway-300 dark:border-fairway-700/60 shrink-0">
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
          <span className="text-fairway-700 dark:text-fairway-400 group-hover:underline flex items-center gap-0.5 font-semibold">
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
      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-subtle rounded-xl p-3 sm:px-4 sm:py-3 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shadow-2xs"
    >
      {/* Left: Code Badge + Company Name + Requirement */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0 font-mono text-xs font-bold bg-fairway-100 text-fairway-900 px-2.5 py-1 rounded-lg border border-fairway-300 flex items-center gap-1.5 shadow-xs whitespace-nowrap dark:bg-fairway-950/70 dark:text-fairway-200 dark:border-fairway-700/60">
          <FileText className="w-3.5 h-3.5 text-fairway-700" />
          <span>{inquiry.inquiryNumber}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm text-foreground group-hover:text-fairway-700 transition-colors truncate">
              {inquiry.companyName}
            </span>
            <span className="text-[11px] font-semibold text-fairway-700 bg-fairway-50 px-2 py-0.5 rounded border border-fairway-200 shrink-0 dark:bg-fairway-950/70 dark:text-fairway-300 dark:border-fairway-800/60">
              {formatSqFt(inquiry.requiredAreaSqFt)}
            </span>
          </div>
          <p className="text-xs text-foreground-muted truncate mt-0.5 max-w-xl">
            {inquiry.requirement}
          </p>
        </div>
      </div>

      {/* Right: Badges & Price */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap md:flex-nowrap justify-between md:justify-end text-xs">
        <div className="flex items-center gap-1 text-[11px] text-foreground-muted bg-surface-muted/70 px-2 py-1 rounded-md border border-border/80 whitespace-nowrap">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-medium">{inquiry.location}</span>
        </div>

        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${stageStyle.className}`}>
          {stageStyle.label}
        </span>

        <div className="hidden lg:flex items-center gap-1 text-[11px] text-foreground-muted bg-surface-muted/60 px-2 py-1 rounded-md border border-border/60 whitespace-nowrap">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{inquiry.salespersonName}</span>
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
                ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60'
                : 'bg-surface-muted text-foreground-muted border border-border/70'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{formatRelativeDate(inquiry.nextFollowUpDate)}</span>
          </div>
        )}

        <div className="text-right min-w-[90px] whitespace-nowrap">
          <span className="font-mono font-bold text-foreground text-xs">
            {formatINR(inquiry.budgetMonthlyINR, true)}
          </span>
          <span className="text-[10px] text-foreground-muted block leading-none">/ month</span>
        </div>

        <div className="w-7 h-7 rounded-lg bg-surface group-hover:bg-fairway-600 group-hover:text-white text-foreground-muted flex items-center justify-center border border-border group-hover:border-fairway-600 transition-all shrink-0">
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
          <div className="size-7 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4.5 w-48 bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
            <div className="h-3.5 w-72 bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-20 bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
          <div className="h-6 w-16 bg-slate-200/80 dark:bg-slate-800/80 rounded-full" />
          <div className="h-6 w-24 bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-center pb-2.5 border-b border-border">
        <div className="h-5 w-20 bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
        <div className="h-5 w-16 bg-slate-200/80 dark:bg-slate-800/80 rounded-full" />
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="h-5 w-3/4 bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
        <div className="h-3.5 w-full bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <div className="h-10 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg" />
        <div className="h-10 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg" />
      </div>
    </div>
  );
};
