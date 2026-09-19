import React from 'react';
import { Property } from '@/modules/core/types';
import { CommonDataGrid } from '@/modules/core/components/ui/CommonDataGrid';

export interface PropertiesListProps {
  table: any;
  recordCount: number;
  isLoading: boolean;
  onSelectProperty: (id: string) => void;
}

export const PropertiesList: React.FC<PropertiesListProps> = ({
  table,
  recordCount,
  isLoading,
  onSelectProperty,
}) => {
  return (
    <CommonDataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      onRowClick={(p: any) => onSelectProperty(p.id)}
    />
  );
};

export default PropertiesList;
