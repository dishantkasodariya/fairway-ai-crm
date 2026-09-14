import React from 'react';
import { Property } from '@/modules/core/types';
import { DataTable7, ColumnConfig } from '@/modules/core/components/ui/data-table-7';

export interface PropertiesListProps {
  properties: Property[];
  columns: ColumnConfig<Property>[];
  onSelectProperty: (id: string) => void;
}

export const PropertiesList: React.FC<PropertiesListProps> = ({
  properties,
  columns,
  onSelectProperty,
}) => {
  return (
    <DataTable7<Property>
      data={properties}
      columns={columns}
      keyExtractor={(p) => p.id}
      onRowClick={(p) => onSelectProperty(p.id)}
    />
  );
};

export default PropertiesList;
