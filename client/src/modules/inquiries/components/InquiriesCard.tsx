import React from 'react';
import { Inquiry } from '@/modules/core/types';
import { DataGrid } from '@/components/reui/data-grid/data-grid';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import {
  WarehouseInquiryCard,
  WarehouseInquiryLineCard,
  WarehouseInquiryCardSkeleton,
} from './WarehouseInquiryCard';
import { WarehouseInquiryEmptyState } from './WarehouseInquiryEmptyState';

export interface InquiriesCardProps {
  table: any;
  inquiries: Inquiry[];
  recordCount: number;
  isLoading: boolean;
  mode?: 'grid' | 'line';
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewInquiry: () => void;
  onSelectInquiry: (id: string) => void;
  pageSize?: number;
}

export const InquiriesCard: React.FC<InquiriesCardProps> = ({
  table,
  inquiries,
  recordCount,
  isLoading,
  mode = 'grid',
  hasFilters,
  onClearFilters,
  onNewInquiry,
  onSelectInquiry,
  pageSize = 10,
}) => {
  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      loadingMode="skeleton"
    >
      <div className="space-y-4">
        {isLoading ? (
          mode === 'line' ? (
            <div className="space-y-2 animate-fade-in">
              {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                <WarehouseInquiryCardSkeleton key={i} mode="line" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                <WarehouseInquiryCardSkeleton key={i} mode="grid" />
              ))}
            </div>
          )
        ) : inquiries.length === 0 ? (
          <WarehouseInquiryEmptyState
            hasFilters={hasFilters}
            onClearFilters={onClearFilters}
            onNewInquiry={onNewInquiry}
          />
        ) : mode === 'line' ? (
          <div className="space-y-2 animate-fade-in">
            {inquiries.map((inq) => (
              <WarehouseInquiryLineCard
                key={inq.id}
                inquiry={inq}
                onSelect={onSelectInquiry}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {inquiries.map((inq) => (
              <WarehouseInquiryCard
                key={inq.id}
                inquiry={inq}
                onSelect={onSelectInquiry}
              />
            ))}
          </div>
        )}

        {/* Pagination for Card Views */}
        {inquiries.length > 0 && !isLoading && (
          <DataGridPagination sizes={[5, 10, 20, 50, 100]} />
        )}
      </div>
    </DataGrid>
  );
};

export default InquiriesCard;
