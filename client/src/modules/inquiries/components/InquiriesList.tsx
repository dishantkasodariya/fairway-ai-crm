import React from 'react';
import { Inquiry } from '@/modules/core/types';
import { CommonDataGrid } from '@/modules/core/components/ui/CommonDataGrid';
import { WarehouseInquiryEmptyState } from './WarehouseInquiryEmptyState';

export interface InquiriesListProps {
  table: any;
  recordCount: number;
  isLoading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewInquiry: () => void;
}

export const InquiriesList: React.FC<InquiriesListProps> = ({
  table,
  recordCount,
  isLoading,
  hasFilters,
  onClearFilters,
  onNewInquiry,
}) => {
  return (
    <CommonDataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      emptyState={
        <WarehouseInquiryEmptyState
          hasFilters={hasFilters}
          onClearFilters={onClearFilters}
          onNewInquiry={onNewInquiry}
        />
      }
    />
  );
};

export default InquiriesList;
