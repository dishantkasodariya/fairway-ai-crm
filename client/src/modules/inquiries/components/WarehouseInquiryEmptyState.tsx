import React from 'react';
import { SearchX, FilterX, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';

export interface WarehouseInquiryEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onNewInquiry?: () => void;
  className?: string;
}

export const WarehouseInquiryEmptyState: React.FC<WarehouseInquiryEmptyStateProps> = ({
  hasFilters,
  onClearFilters,
  onNewInquiry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface border border-border rounded-card select-none shadow-2xs ${className}`}
    >
      <div className="size-14 rounded-full bg-fairway-50 dark:bg-fairway-950/60 border border-fairway-200 dark:border-fairway-800/80 flex items-center justify-center text-fairway-600 mb-4 shadow-xs">
        {hasFilters ? (
          <FilterX className="w-6 h-6 stroke-[1.75]" />
        ) : (
          <SearchX className="w-6 h-6 stroke-[1.75]" />
        )}
      </div>

      <h3 className="text-base font-bold text-foreground tracking-tight">
        {hasFilters ? 'No matching inquiries found' : 'No inquiries available'}
      </h3>

      <p className="text-xs text-foreground-muted max-w-sm mt-1.5 leading-relaxed">
        {hasFilters
          ? 'Try adjusting your search terms or clearing some filters to find what you are looking for.'
          : 'Get started by creating your first warehouse inquiry or lead in the system.'}
      </p>

      <div className="flex items-center gap-2.5 mt-5">
        {hasFilters && onClearFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-xs h-8 px-3.5 flex items-center gap-1.5 cursor-pointer border-border hover:bg-surface-muted"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </Button>
        )}

        {onNewInquiry && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onNewInquiry}
            className="text-xs h-8 px-3.5 flex items-center gap-1.5 cursor-pointer bg-fairway-600 hover:bg-fairway-700 text-white font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Inquiry</span>
          </Button>
        )}
      </div>
    </div>
  );
};
