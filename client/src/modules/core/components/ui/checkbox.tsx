import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from "lucide-react"

import { cn } from "@/modules/core/lib/utils"

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'checked'> {
  checked?: boolean | 'indeterminate'
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, checked, indeterminate, ...props }, ref) => {
  const resolvedChecked = indeterminate ? 'indeterminate' : checked

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={resolvedChecked}
      className={cn(
        "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-fairway-600 data-[state=checked]:text-white data-[state=indeterminate]:bg-fairway-600 data-[state=indeterminate]:text-white",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("grid place-content-center text-current")}
      >
        {indeterminate ? (
          <Minus className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
