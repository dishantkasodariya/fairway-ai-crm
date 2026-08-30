import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent, ReactNode } from "react"
import { useDataGrid } from "@/components/reui/data-grid/data-grid"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/modules/core/lib/utils"

export type DataGridScrollAreaOrientation = "horizontal" | "vertical" | "both"

export type DataGridScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  orientation?: DataGridScrollAreaOrientation
}

export function DataGridScrollArea({
  children,
  className,
  orientation = "both",
  ...props
}: DataGridScrollAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600/70 scrollbar-track-transparent",
        className
      )}
      data-slot="data-grid-scroll-area"
      {...props}
    >
      <div
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="min-w-full inline-block align-top"
      >
        <div data-slot="scroll-area-content" className="w-full">
          {children}
        </div>
      </div>
    </div>
  )
}

export default DataGridScrollArea