import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav className={cn('flex items-center gap-1.5 text-xs text-foreground-muted select-none', className)}>
      <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer" onClick={items[0]?.onClick}>
        <Home className="w-3.5 h-3.5" />
      </div>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[200px]">{item.label}</span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-foreground hover:underline transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
