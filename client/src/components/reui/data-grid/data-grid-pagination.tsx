"use client"

import type { JSX, ReactNode } from "react"
import { useDataGrid } from "@/components/reui/data-grid/data-grid"

import { cn } from "@/modules/core/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/core/components/ui/Select"
import { Skeleton } from "@/modules/core/components/ui/Skeleton"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

interface DataGridPaginationProps {
  sizes?: number[]
  sizesInfo?: string
  sizesLabel?: string
  sizesDescription?: string
  sizesSkeleton?: ReactNode
  more?: boolean
  moreLimit?: number
  info?: string
  infoSkeleton?: ReactNode
  paginationSkeleton?: ReactNode
  className?: string
  rowsPerPageLabel?: string
  previousPageLabel?: string
  nextPageLabel?: string
  ellipsisText?: string
}

function DataGridPagination(props: DataGridPaginationProps): JSX.Element {
  const { table, recordCount, isLoading } = useDataGrid()

  const defaultProps: Partial<DataGridPaginationProps> = {
    sizes: [10, 20, 50, 100],
    sizesSkeleton: <Skeleton className="h-7 w-32 rounded-md" />,
    infoSkeleton: <Skeleton className="h-7 w-44 rounded-md" />,
    paginationSkeleton: (
      <div className="flex items-center gap-1.5">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="size-7 rounded-md" />
      </div>
    ),
    rowsPerPageLabel: "Items per page:",
    previousPageLabel: "Previous page",
    nextPageLabel: "Next page",
  }

  const mergedProps: DataGridPaginationProps = { ...defaultProps, ...props }

  const pageIndex = table.state.pagination.pageIndex
  const pageSize = table.state.pagination.pageSize
  const from = recordCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, recordCount)
  const pageCount = table.getPageCount()
  const displayPage = pageCount === 0 ? 0 : pageIndex + 1

  return (
    <div
      data-slot="data-grid-pagination"
      className={cn(
        "flex grow flex-col flex-wrap items-center justify-between gap-4 py-2 sm:flex-row select-none",
        mergedProps.className
      )}
    >
      {/* Left: Items per page */}
      <div className="flex items-center space-x-2">
        {isLoading ? (
          mergedProps.sizesSkeleton
        ) : (
          <>
            <span className="text-foreground-muted text-xs font-medium whitespace-nowrap">
              {mergedProps.rowsPerPageLabel}
            </span>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                const newPageSize = Number(value)
                table.setPageSize(newPageSize)
              }}
            >
              <SelectTrigger className="w-16 h-7 text-xs bg-surface border border-border rounded-md px-2 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="min-w-[4rem] bg-surface border border-border shadow-popover"
              >
                {mergedProps.sizes?.map((size: number) => (
                  <SelectItem key={size} value={`${size}`} className="text-xs cursor-pointer">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Middle: Showing X to Y of Z items */}
      <div className="flex items-center justify-center">
        {isLoading ? (
          mergedProps.infoSkeleton
        ) : (
          <span className="text-foreground-muted text-xs font-medium text-nowrap">
            Showing <strong className="text-foreground font-semibold">{from}</strong> to{" "}
            <strong className="text-foreground font-semibold">{to}</strong> of{" "}
            <strong className="text-foreground font-semibold">{recordCount}</strong> items
          </span>
        )}
      </div>

      {/* Right: « ‹ Page X of Y › » */}
      <div className="flex items-center space-x-1">
        {isLoading ? (
          mergedProps.paginationSkeleton
        ) : (
          <>
            <button
              type="button"
              className="size-7 rounded-md inline-flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
              title="First page"
            >
              <ChevronsLeft className="size-4" />
            </button>

            <button
              type="button"
              className="size-7 rounded-md inline-flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="text-xs font-medium text-foreground-muted px-2 min-w-[72px] text-center whitespace-nowrap">
              Page <strong className="text-foreground font-semibold">{displayPage}</strong> of{" "}
              <strong className="text-foreground font-semibold">{pageCount}</strong>
            </span>

            <button
              type="button"
              className="size-7 rounded-md inline-flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="size-4" />
            </button>

            <button
              type="button"
              className="size-7 rounded-md inline-flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
              title="Last page"
            >
              <ChevronsRight className="size-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export { DataGridPagination, type DataGridPaginationProps }