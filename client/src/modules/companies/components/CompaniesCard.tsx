import React from 'react';
import { Company } from '@/modules/core/types';
import { DataGrid } from '@/components/reui/data-grid/data-grid';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import {
  CompanyCard as SingleCompanyCard,
  CompanyCardSkeleton,
  CompanyEmptyState,
} from './CompanyCard';

export interface CompaniesCardProps {
  table: any;
  companies: Company[];
  recordCount: number;
  isLoading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewCompany: () => void;
  onSelectCompany: (id: string) => void;
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (company: Company) => void;
  pageSize?: number;
}

export const CompaniesCard: React.FC<CompaniesCardProps> = ({
  table,
  companies,
  recordCount,
  isLoading,
  hasFilters,
  onClearFilters,
  onNewCompany,
  onSelectCompany,
  onEditCompany,
  onDeleteCompany,
  pageSize = 10,
}) => {
  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
              <CompanyCardSkeleton key={i} mode="grid" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <CompanyEmptyState
            hasFilters={hasFilters}
            onClearFilters={onClearFilters}
            onNewCompany={onNewCompany}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {companies.map((comp) => (
              <SingleCompanyCard
                key={comp.id}
                company={comp}
                onSelect={onSelectCompany}
                onEdit={onEditCompany}
                onDelete={onDeleteCompany}
              />
            ))}
          </div>
        )}

        {/* Pagination for Card View */}
        {companies.length > 0 && <DataGridPagination sizes={[5, 10, 20, 50, 100]} />}
      </div>
    </DataGrid>
  );
};

export default CompaniesCard;
