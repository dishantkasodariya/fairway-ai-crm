import React from 'react';
import { cn } from '@/modules/core/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
            <span>{label}</span>
            {props.required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-3 text-foreground-muted pointer-events-none">{leftIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-surface border border-border rounded-input text-sm text-foreground placeholder:text-foreground-subtle h-9 transition-colors',
              'focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 focus:outline-none disabled:bg-surface-muted disabled:cursor-not-allowed',
              leftIcon ? 'pl-9' : 'pl-3',
              rightIcon ? 'pr-9' : 'pr-3',
              error && 'border-rose-400 focus:border-rose-600 focus:ring-rose-600',
              className
            )}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 text-foreground-muted pointer-events-none">{rightIcon}</div>}
        </div>
        {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
        {helperText && !error && <span className="text-[11px] text-foreground-muted">{helperText}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
            <span>{label}</span>
            {props.required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full bg-surface border border-border rounded-input text-sm text-foreground h-9 px-3 transition-colors',
            'focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 focus:outline-none disabled:bg-surface-muted disabled:cursor-not-allowed',
            error && 'border-rose-400 focus:border-rose-600 focus:ring-rose-600',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
        {helperText && !error && <span className="text-[11px] text-foreground-muted">{helperText}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
            <span>{label}</span>
            {props.required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full bg-surface border border-border rounded-input text-sm text-foreground p-3 transition-colors min-h-[80px]',
            'focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 focus:outline-none disabled:bg-surface-muted disabled:cursor-not-allowed',
            error && 'border-rose-400 focus:border-rose-600 focus:ring-rose-600',
            className
          )}
          {...props}
        />
        {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
        {helperText && !error && <span className="text-[11px] text-foreground-muted">{helperText}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
