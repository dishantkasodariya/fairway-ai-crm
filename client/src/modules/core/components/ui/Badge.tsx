import React from 'react';
import { cn } from '@/modules/core/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700',
    primary: 'bg-fairway-100 text-fairway-800 border-fairway-200 dark:bg-fairway-950/70 dark:text-fairway-200 dark:border-fairway-700/60',
    accent: 'bg-accent-100 text-accent-800 border-accent-200 dark:bg-accent-950/70 dark:text-accent-200 dark:border-accent-700/60',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
    info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800/60',
    outline: 'bg-transparent text-foreground-muted border-border dark:text-foreground-muted dark:border-border',
  };


  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border leading-none tracking-tight select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'primary' && 'bg-fairway-600',
            variant === 'accent' && 'bg-accent-600',
            variant === 'success' && 'bg-emerald-600',
            variant === 'warning' && 'bg-amber-600',
            variant === 'danger' && 'bg-rose-600',
            variant === 'info' && 'bg-sky-600',
            variant === 'default' && 'bg-slate-500'
          )}
        />
      )}
      {children}
    </span>
  );
};
