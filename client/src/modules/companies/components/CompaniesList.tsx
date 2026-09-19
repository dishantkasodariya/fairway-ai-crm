import React from 'react';
import { Company } from '@/modules/core/types';
import { CommonDataGrid } from '@/modules/core/components/ui/CommonDataGrid';
import { CompanyEmptyState } from './CompanyCard';

export interface CompaniesListProps {
  table: any;
  companies: Company[];
  recordCount: number;
  isLoading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewCompany: () => void;
  onRowClick?: (company: Company) => void;
}

export const CompaniesList: React.FC<CompaniesListProps> = ({
  table,
  companies,
  recordCount,
  isLoading,
  hasFilters,
  onClearFilters,
  onNewCompany,
  onRowClick,
}) => {
  return (
    <CommonDataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      onRowClick={onRowClick}
      emptyState={
        <CompanyEmptyState
          hasFilters={hasFilters}
          onClearFilters={onClearFilters}
          onNewCompany={onNewCompany}
        />
      }
    />
  );
};

export default CompaniesList;
