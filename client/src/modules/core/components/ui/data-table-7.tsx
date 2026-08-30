import React, { useState, useMemo, CSSProperties, ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/core/components/ui/table';
import {
  PinOff,
  MoreVertical,
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronDown,
  Search,
} from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';

export type PinSide = 'left' | 'right' | false;

export interface ColumnConfig<T = any> {
  key: string;
  label: string;
  width: number;
  render?: (row: T) => ReactNode;
  headerAlign?: 'left' | 'center' | 'right';
}

export interface DataTable7Props<T = any> {
  data: T[];
  columns: ColumnConfig<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  searchPlaceholder?: string;
}

export const DataTable7 = <T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  className = '',
  searchPlaceholder = 'Search records...',
}: DataTable7Props<T>) => {
  const [pinned, setPinned] = useState<Record<string, PinSide>>({});
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);

  const leftPinnedColumns = useMemo(
    () => columns.filter((column) => pinned[column.key] === 'left'),
    [columns, pinned]
  );

  const rightPinnedColumns = useMemo(
    () => columns.filter((column) => pinned[column.key] === 'right'),
    [columns, pinned]
  );

  const leftOffsets = useMemo(() => {
    return leftPinnedColumns.reduce(
      (acc, column) => {
        acc.offsets[column.key] = acc.offset;
        return {
          offsets: acc.offsets,
          offset: acc.offset + column.width,
        };
      },
      { offsets: {} as Record<string, number>, offset: 0 }
    ).offsets;
  }, [leftPinnedColumns]);

  const rightOffsets = useMemo(() => {
    return [...rightPinnedColumns].reverse().reduce(
      (acc, column) => {
        acc.offsets[column.key] = acc.offset;
        return {
          offsets: acc.offsets,
          offset: acc.offset + column.width,
        };
      },
      { offsets: {} as Record<string, number>, offset: 0 }
    ).offsets;
  }, [rightPinnedColumns]);

  const setPin = (key: string, side: PinSide) => {
    setPinned((current) => ({
      ...current,
      [key]: side,
    }));
    setOpenDropdownKey(null);
  };

  const getPinnedStyles = (column: ColumnConfig<T>): CSSProperties => {
    const pinSide = pinned[column.key];

    if (pinSide === 'left') {
      return {
        position: 'sticky',
        left: leftOffsets[column.key] || 0,
        width: column.width,
        minWidth: column.width,
        maxWidth: column.width,
        zIndex: 10,
      };
    }

    if (pinSide === 'right') {
      return {
        position: 'sticky',
        right: rightOffsets[column.key] || 0,
        width: column.width,
        minWidth: column.width,
        maxWidth: column.width,
        zIndex: 10,
      };
    }

    return {
      width: column.width,
      minWidth: column.width,
      maxWidth: column.width,
    };
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-subtle">
        <Table className="border-separate border-spacing-0 table-fixed w-full min-w-full text-xs">
          <TableHeader>
            <TableRow className="bg-surface-muted/60">
              {columns.map((column) => {
                const pinSide = pinned[column.key];

                return (
                  <TableHead
                    key={column.key}
                    className={cn(
                      'relative h-11 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-foreground-muted select-none border-b border-border bg-surface-muted/90 backdrop-blur-sm',
                      pinSide && 'bg-surface shadow-sm border-r border-border'
                    )}
                    style={getPinnedStyles(column)}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate">{column.label}</span>

                      <div className="relative">
                        {pinSide ? (
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-fairway-700 hover:bg-fairway-100 transition-colors"
                            onClick={() => setPin(column.key, false)}
                            aria-label={`Unpin ${column.label} column`}
                            title={`Unpin ${column.label} column`}
                          >
                            <PinOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdownKey(openDropdownKey === column.key ? null : column.key)
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:bg-surface-muted hover:text-foreground transition-colors"
                            title="Pin column"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {openDropdownKey === column.key && (
                          <div className="absolute right-0 top-full mt-1 w-36 rounded-md bg-surface border border-border p-1 shadow-popover z-50 animate-fade-in text-xs font-normal">
                            <button
                              type="button"
                              onClick={() => setPin(column.key, 'left')}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-muted text-foreground text-left"
                            >
                              <ArrowLeftToLine className="w-3.5 h-3.5 text-foreground-muted" />
                              <span>Stick to left</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPin(column.key, 'right')}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-muted text-foreground text-left"
                            >
                              <ArrowRightToLine className="w-3.5 h-3.5 text-foreground-muted" />
                              <span>Stick to right</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-foreground-muted">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'border-b border-border/70 hover:bg-surface-muted/40 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((column) => {
                    const pinSide = pinned[column.key];

                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          'truncate px-3.5 py-3 text-xs text-foreground',
                          pinSide ? 'bg-surface z-10 border-r border-border font-medium' : ''
                        )}
                        style={getPinnedStyles(column)}
                      >
                        {column.render ? column.render(row) : row[column.key] ?? '—'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable7;
