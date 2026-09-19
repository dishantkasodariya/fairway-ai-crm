import React from 'react';
import { cn } from '@/modules/core/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'default' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-600 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-button select-none active:scale-[0.98] transition-transform';

    const variants: Record<string, string> = {
      default: 'bg-fairway-600 text-white hover:bg-fairway-700 active:bg-fairway-800 shadow-subtle',
      primary: 'bg-fairway-600 text-white hover:bg-fairway-700 active:bg-fairway-800 shadow-subtle',
      secondary: 'bg-surface-muted text-foreground hover:bg-slate-200/80 active:bg-slate-300/80 border border-border',
      outline: 'bg-transparent border border-border text-foreground hover:bg-surface-muted active:bg-slate-200/60',
      ghost: 'bg-transparent text-foreground-muted hover:text-foreground hover:bg-surface-muted',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-subtle',
      destructive: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-subtle',
      accent: 'bg-accent-500 text-fairway-950 hover:bg-accent-600 active:bg-accent-700 font-semibold shadow-subtle',
    };

    const sizes: Record<string, string> = {
      xs: 'text-xs px-2.5 py-1 gap-1 h-7',
      'icon-xs': 'h-6 w-6 p-0',
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8 font-medium',
      'icon-sm': 'h-7 w-7 p-0',
      icon: 'h-8 w-8 p-0',
      md: 'text-sm px-4 py-2 gap-2 h-9',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : leftIcon}
        {children !== undefined && <span className="inline-flex items-center gap-1.5">{children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';
