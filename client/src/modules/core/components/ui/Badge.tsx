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
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700',
    primary: 'bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-white dark:border-primary/40',
    accent: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30',
    success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/30',
    info: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-500/30',
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
