import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/modules/core/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 5, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-lg border border-border bg-slate-900 text-slate-50 dark:bg-[#1E232B] dark:text-neutral-100 dark:border-[#30363D] px-2.5 py-1 text-xs font-medium shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  asChild?: boolean;
}

/**
 * Convenient one-line wrapper for Tooltip
 * Example: <SimpleTooltip content="Filter"> <button>...</button> </SimpleTooltip>
 */
export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  children,
  side = "top",
  align = "center",
  className,
  asChild = true,
}) => {
  if (!content) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
