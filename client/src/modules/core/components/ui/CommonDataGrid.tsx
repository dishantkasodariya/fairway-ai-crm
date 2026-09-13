import React, { ReactNode } from 'react';
import {
  DataGrid,
  DataGridContainer,
  DataGridFeatures,
  DataGridTableInstance,
  getColumnHeaderLabel,
} from '@/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { Card } from '@/modules/core/components/ui/Card';
import { cn } from '@/modules/core/lib/utils';
import { Settings } from 'lucide-react';
import { Column } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/modules/core/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/modules/core/components/ui/tooltip';

export interface CommonDataGridProps<TData extends object> {
  table: DataGridTableInstance<TData>;
  recordCount: number;
  isLoading?: boolean;
  loadingMode?: 'skeleton' | 'spinner';
  emptyState?: ReactNode;
  showPagination?: boolean;
  paginationSizes?: number[];
  scrollMaxHeight?: string;
  cardClassName?: string;
  tableLayout?: {
    columnsPinnable?: boolean;
    columnsResizable?: boolean;
    columnsMovable?: boolean;
    columnsVisibility?: boolean;
    headerSticky?: boolean;
  };
  className?: string;
}

/**
 * CommonDataGrid
 * 
 * Reusable table list component adhering to the Inquiries list design pattern:
 * - Powered by TanStack React Table and ReUI DataGrid
 * - Responsive scroll container with sticky header support
 * - Automatic skeleton loading states
 * - Standardized empty states
 * - Unified pagination footer
 */
export function CommonDataGrid<TData extends object>({
  table,
  recordCount,
  isLoading = false,
  loadingMode = 'skeleton',
  emptyState,
  showPagination = true,
  paginationSizes = [5, 10, 20, 50, 100],
  scrollMaxHeight = 'max-h-[calc(100vh-280px)]',
  cardClassName,
  tableLayout = {
    columnsPinnable: true,
    columnsResizable: true,
    headerSticky: true,
  },
  className,
}: CommonDataGridProps<TData>) {
  const isTableEmpty = recordCount === 0 && !isLoading;

  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      loadingMode={loadingMode}
      tableLayout={tableLayout}
    >
      <div className={cn('w-full space-y-2.5', className)}>
        {isTableEmpty && emptyState ? (
          emptyState
        ) : (
          <Card
            className={cn(
              'p-0 border border-border bg-surface shadow-xs rounded-xl overflow-hidden',
              cardClassName
            )}
          >
            <DataGridContainer className="w-full">
              <DataGridScrollArea
                className={cn('w-full overflow-auto', scrollMaxHeight)}
                orientation="both"
              >
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
          </Card>
        )}
        {showPagination && recordCount > 0 && !isLoading && (
          <DataGridPagination sizes={paginationSizes} />
        )}
      </div>
    </DataGrid>
  );
}

export interface DataGridColumnVisibilityMenuProps<TData extends object> {
  table: DataGridTableInstance<TData>;
  excludeColumns?: string[];
  className?: string;
}

/**
 * DataGridColumnVisibilityMenu
 * 
 * Reusable column settings button with dropdown checkbox list matching Inquiries list.
 */
export function DataGridColumnVisibilityMenu<TData extends object>({
  table,
  excludeColumns = ['actions', 'code', 'key'],
  className,
}: DataGridColumnVisibilityMenuProps<TData>) {
  const leafColumns = (table.getAllLeafColumns() as Column<DataGridFeatures, TData, unknown>[]).filter(
    (col) => !excludeColumns.includes(col.id)
  );

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'size-9 rounded-button border border-border bg-white dark:bg-[#171717] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs',
                className
              )}
            >
              <Settings className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Columns</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-surface border border-border shadow-2xl p-1 rounded-card z-50"
      >
        <DropdownMenuLabel className="text-xs font-bold text-foreground px-2 py-1.5">
          Toggle Columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {leafColumns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={col.getIsVisible()}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(val) => col.toggleVisibility(!!val)}
            className="text-xs cursor-pointer capitalize"
          >
            {getColumnHeaderLabel(col)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CommonDataGrid;
