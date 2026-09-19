"use client"

import { memo, useMemo } from "react"
import type { HTMLAttributes, ReactNode } from "react"
import {
  getColumnHeaderLabel,
  useDataGrid,
} from "@/components/reui/data-grid/data-grid"
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid"
import { Subscribe } from "@tanstack/react-table"
import type { Column } from "@tanstack/react-table"

import { cn } from "@/modules/core/lib/utils"
import { Button } from "@/modules/core/components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/modules/core/components/ui/dropdown-menu"
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, CheckIcon, ArrowLeftToLineIcon, ArrowRightToLineIcon, ArrowLeftIcon, ArrowRightIcon, Settings2Icon, PinOffIcon } from "lucide-react"

interface DataGridColumnHeaderProps<
  TData extends object,
  TValue,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<DataGridFeatures, TData, TValue>
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string
  icon?: ReactNode
  /** Reserved; pin controls are gated by tableLayout.columnsPinnable + column.getCanPin(). */
  pinnable?: boolean
  filter?: ReactNode
  visibility?: boolean
}

function DataGridColumnHeaderInner<TData extends object, TValue>({
  column,
  title,
  icon,
  className,
  filter,
  visibility = false,
}: DataGridColumnHeaderProps<TData, TValue>) {
  const { isLoading, table, props } = useDataGrid()
  const resolvedTitle = title ?? getColumnHeaderLabel(column)

  // TanStack's columnOrder defaults to [] until a consumer seeds it; fall
  // back to the definition order so Move Left/Right work out of the box.
  const columnOrderState = table.state.columnOrder
  const columnOrder =
    columnOrderState.length > 0
      ? columnOrderState
      : table.getAllLeafColumns().map((leafColumn) => leafColumn.id)
  const columnVisibilityKey =
    props.tableLayout?.columnsVisibility && visibility
      ? JSON.stringify(table.state.columnVisibility)
      : ""
  const isSorted = column.getIsSorted()
  const isPinned = column.getIsPinned()
  const canSort = column.getCanSort()
  const canPin = column.getCanPin()
  const canResize = column.getCanResize()

  const columnIndex = columnOrder.indexOf(column.id)
  const canMoveLeft = columnIndex > 0
  const canMoveRight = columnIndex < columnOrder.length - 1

  const handleSort = () => {
    if (isSorted === "asc") {
      column.toggleSorting(true)
    } else if (isSorted === "desc") {
      column.clearSorting()
    } else {
      column.toggleSorting(false)
    }
  }

  const headerLabelClassName = cn(
    "text-foreground/80 inline-flex h-full items-center gap-1.5 font-semibold [&_svg]:opacity-60 text-xs whitespace-nowrap select-none",
    className
  )

  const headerButtonClassName = cn(
    "text-foreground/80 hover:bg-surface-muted data-[state=open]:bg-surface-muted hover:text-foreground data-[state=open]:text-foreground px-2 py-1 font-semibold text-xs rounded-md whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none focus:outline-none focus-visible:outline-none",
    className
  )

  const sortIcon =
    canSort &&
    (isSorted === "desc" ? (
      <ArrowDownIcon className="size-3.5 shrink-0" aria-hidden="true" />
    ) : isSorted === "asc" ? (
      <ArrowUpIcon className="size-3.5 shrink-0" aria-hidden="true" />
    ) : (
      <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
    ))

  const hasControls =
    canSort ||
    (props.tableLayout?.columnsPinnable && canPin) ||
    filter ||
    (props.tableLayout?.columnsVisibility && visibility) ||
    props.tableLayout?.columnsMovable

  const menuItems = useMemo(() => {
    const items: ReactNode[] = []
    let hasPreviousSection = false

    // Filter section
    if (filter) {
      items.push(
        <DropdownMenuGroup key="group-filter">
          <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
        </DropdownMenuGroup>
      )
      hasPreviousSection = true
    }

    // Sort section
    if (canSort) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-sort" className="my-1 border-border/80" />)
      }
      items.push(
        <DropdownMenuItem
          key="sort-asc"
          onClick={() => {
            if (isSorted === "asc") {
              column.clearSorting()
            } else {
              column.toggleSorting(false)
            }
          }}
          disabled={!canSort}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted/80 text-foreground cursor-pointer transition-colors"
        >
          <ArrowUpIcon className="size-3.5 shrink-0 text-foreground-muted" />
          <span className="grow">Asc</span>
          {isSorted === "asc" && (
            <CheckIcon className="text-fairway-600 size-3.5 opacity-100 font-bold" />
          )}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="sort-desc"
          onClick={() => {
            if (isSorted === "desc") {
              column.clearSorting()
            } else {
              column.toggleSorting(true)
            }
          }}
          disabled={!canSort}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted/80 text-foreground cursor-pointer transition-colors"
        >
          <ArrowDownIcon className="size-3.5 shrink-0 text-foreground-muted" />
          <span className="grow">Desc</span>
          {isSorted === "desc" && (
            <CheckIcon className="text-fairway-600 size-3.5 opacity-100 font-bold" />
          )}
        </DropdownMenuItem>
      )
      hasPreviousSection = true
    }

    // Pin section
    if (props.tableLayout?.columnsPinnable && canPin) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-pin" className="my-1 border-border/80" />)
      }
      items.push(
        <DropdownMenuItem
          key="pin-left"
          onClick={() => column.pin(isPinned === "start" ? false : "start")}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted/80 text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeftToLineIcon className="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span className="grow">Pin to left</span>
          {isPinned === "start" && (
            <CheckIcon className="text-fairway-600 size-3.5 opacity-100 font-bold" />
          )}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="pin-right"
          onClick={() => column.pin(isPinned === "end" ? false : "end")}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted/80 text-foreground cursor-pointer transition-colors"
        >
          <ArrowRightToLineIcon className="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span className="grow">Pin to right</span>
          {isPinned === "end" && (
            <CheckIcon className="text-fairway-600 size-3.5 opacity-100 font-bold" />
          )}
        </DropdownMenuItem>
      )
      hasPreviousSection = true
    }

    // Move section
    if (props.tableLayout?.columnsMovable) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-move" className="my-1 border-border/80" />)
      }
      items.push(
        <DropdownMenuItem
          key="move-left"
          onClick={() => {
            if (columnIndex > 0) {
              const newOrder = [...columnOrder]
              const [movedColumn] = newOrder.splice(columnIndex, 1)
              newOrder.splice(columnIndex - 1, 0, movedColumn)
              table.setColumnOrder(newOrder)
            }
          }}
          disabled={!canMoveLeft || isPinned !== false}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted/80 text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeftIcon className="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span>Move to Left</span>
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="move-right"
          onClick={() => {
            if (columnIndex < columnOrder.length - 1) {
              const newOrder = [...columnOrder]
              const [movedColumn] = newOrder.splice(columnIndex, 1)
              newOrder.splice(columnIndex + 1, 0, movedColumn)
              table.setColumnOrder(newOrder)
            }
          }}
          disabled={!canMoveRight || isPinned !== false}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted/80 text-foreground cursor-pointer transition-colors"
        >
          <ArrowRightIcon className="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span>Move to Right</span>
        </DropdownMenuItem>
      )
      hasPreviousSection = true
    }

    // Visibility section
    if (props.tableLayout?.columnsVisibility && visibility) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-visibility" className="my-1 border-border/80" />)
      }
      items.push(
        <DropdownMenuSub key="visibility">
          <DropdownMenuSubTrigger className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted/80 text-foreground cursor-pointer transition-colors">
            <Settings2Icon className="size-3.5 shrink-0 text-foreground-muted" />
            <span>Columns</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-white dark:bg-[#161c24] border border-border dark:border-white/[0.12] shadow-none ring-0 outline-none p-1.5 rounded-card">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  className="capitalize text-xs cursor-pointer"
                >
                  {getColumnHeaderLabel(col)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )
    }

    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter,
    canSort,
    isSorted,
    column,
    props.tableLayout?.columnsPinnable,
    props.tableLayout?.columnsMovable,
    props.tableLayout?.columnsVisibility,
    canPin,
    isPinned,
    canMoveLeft,
    canMoveRight,
    visibility,
    table,
    columnIndex,
    columnOrder,
    columnVisibilityKey, // Needed to update checkbox states when visibility changes
  ])

  if (hasControls) {
    return (
      <div className="-ms-1.5 flex h-full items-center justify-between gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={headerButtonClassName}
              disabled={isLoading}
            >
              {icon && icon}
              <span>{resolvedTitle}</span>
              {sortIcon}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-44 bg-white dark:bg-[#161c24] rounded-card border border-border dark:border-white/[0.12] shadow-none ring-0 outline-none p-1.5 space-y-0.5 z-50 animate-in fade-in-0 zoom-in-95"
            align="start"
            sideOffset={4}
          >
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  if (canSort || (props.tableLayout?.columnsResizable && canResize)) {
    return (
      <div className="-ms-1.5 flex h-full items-center">
        <button
          type="button"
          className={headerButtonClassName}
          disabled={isLoading}
          onClick={handleSort}
        >
          {icon && icon}
          <span>{resolvedTitle}</span>
          {sortIcon}
        </button>
      </div>
    )
  }

  return (
    <div className={headerLabelClassName}>
      {icon && icon}
      <span>{resolvedTitle}</span>
    </div>
  )
}

const DataGridColumnHeaderMemo = memo(DataGridColumnHeaderInner) as <
  TData extends object,
  TValue,
>(
  props: DataGridColumnHeaderProps<TData, TValue> & {
    /** Internal: the state slices the header re-renders on. Not part of the public API. */
    subscribedState?: unknown
  }
) => ReactNode

/**
 * Sort and pin state reaches this header through builder calls on `column`
 * (`getIsSorted()`, `getIsPinned()`), and `column` is a stable reference. That
 * combination is the one v9's fresh-table-per-state-change does NOT cover:
 * React Compiler is free to memoize against the stable column and never
 * re-evaluate those reads, which shows up as frozen sort arrows and pin
 * controls. The `Subscribe` below turns the slices this header actually reads
 * into a real reactive dependency, and threading the selection through as a
 * prop is what lets it past the `memo` - which would otherwise see unchanged
 * props and skip the render anyway.
 */
function DataGridColumnHeader<TData extends object, TValue>(
  props: DataGridColumnHeaderProps<TData, TValue>
) {
  const { table } = useDataGrid()

  return (
    <Subscribe
      source={table.store}
      selector={(state) => ({
        sorting: state.sorting,
        columnPinning: state.columnPinning,
        columnOrder: state.columnOrder,
        columnVisibility: state.columnVisibility,
      })}
    >
      {(subscribed) => (
        <DataGridColumnHeaderMemo {...props} subscribedState={subscribed} />
      )}
    </Subscribe>
  )
}

export { DataGridColumnHeader, type DataGridColumnHeaderProps }