import React from 'react';
import { cn } from '@/modules/core/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-xs font-semibold text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none inline-flex items-center gap-1',
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
    );
  }
);
Label.displayName = 'Label';
