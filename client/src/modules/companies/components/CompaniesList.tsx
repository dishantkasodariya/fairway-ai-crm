import React from 'react';
import { Company } from '@/modules/core/types';
import { Card } from '@/modules/core/components/ui/Card';
import {
  DataGrid,
  DataGridContainer,
} from '@/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { CompanyEmptyState } from './CompanyCard';

export interface CompaniesListProps {
  table: any;
  companies: Company[];
  recordCount: number;
  isLoading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewCompany: () => void;
}

export const CompaniesList: React.FC<CompaniesListProps> = ({
  table,
  companies,
  recordCount,
  isLoading,
  hasFilters,
  onClearFilters,
  onNewCompany,
}) => {
  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      tableLayout={{
        columnsPinnable: true,
        columnsResizable: true,
        headerSticky: true,
      }}
    >
      <div className="w-full space-y-2.5">
        {companies.length === 0 && !isLoading ? (
          <CompanyEmptyState
            hasFilters={hasFilters}
            onClearFilters={onClearFilters}
            onNewCompany={onNewCompany}
          />
        ) : (
          <Card className="p-0 border border-border bg-surface shadow-xs rounded-xl overflow-hidden">
            {/* Mobile horizontal scroll helper */}
            <div className="sm:hidden px-3 py-1.5 bg-surface-muted/40 border-b border-border/80 flex items-center justify-between text-[11px] text-foreground-muted font-medium">
              <span>Swipe to view all columns</span>
              <span className="text-fairway-600 font-semibold">Scroll &rarr;</span>
            </div>
            <DataGridContainer className="w-full">
              <DataGridScrollArea className="w-full max-h-[calc(100vh-280px)] overflow-auto" orientation="both">
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
          </Card>
        )}
        {companies.length > 0 && <DataGridPagination sizes={[5, 10, 20, 50, 100]} />}
      </div>
    </DataGrid>
  );
};

export default CompaniesList;
