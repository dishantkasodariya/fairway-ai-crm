import React from 'react';
import { Proposal } from '@/modules/core/types';
import { DataTable7, ColumnConfig } from '@/modules/core/components/ui/data-table-7';

export interface ProposalsListProps {
  proposals: Proposal[];
  columns: ColumnConfig<Proposal>[];
  onNavigateToInquiry: (inquiryId: string) => void;
  onNavigateToCompany?: (companyId: string) => void;
}

export const ProposalsList: React.FC<ProposalsListProps> = ({
  proposals,
  columns,
  onNavigateToInquiry,
  onNavigateToCompany,
}) => {
  return (
    <DataTable7<Proposal>
      data={proposals}
      columns={columns}
      keyExtractor={(p) => p.id}
      onRowClick={(p) => {
        if (p.inquiryId) {
          onNavigateToInquiry(p.inquiryId);
        } else if (p.companyId && onNavigateToCompany) {
          onNavigateToCompany(p.companyId);
        }
      }}
    />
  );
};

export default ProposalsList;
