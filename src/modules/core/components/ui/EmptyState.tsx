import React from 'react';
import { cn } from '@/modules/core/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-surface border border-dashed border-border rounded-card my-4',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-foreground-muted mb-3 border border-border">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
      <p className="text-xs text-foreground-muted max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
