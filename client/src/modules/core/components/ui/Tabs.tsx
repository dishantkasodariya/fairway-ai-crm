import React from 'react';
import { cn } from '@/modules/core/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}) => {
  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 p-1 bg-surface-muted/90 dark:bg-[#111722] border border-border rounded-xl inline-flex max-w-full overflow-x-auto select-none shadow-2xs',
          className
        )}
      >
        {tabs.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-surface text-fairway-600 dark:text-fairway-400 font-bold shadow-xs border border-border'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface/60 font-medium'
              )}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={cn(
                    'text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors inline-flex items-center justify-center min-w-[20px]',
                    isActive
                      ? 'bg-fairway-500/15 text-fairway-600 dark:text-fairway-300 border border-fairway-500/30'
                      : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/80'
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-6 border-b border-border overflow-x-auto max-w-full select-none', className)}>
      {tabs.map((t) => {
        const isActive = t.id === activeTab;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'flex items-center gap-2 py-3 text-sm border-b-2 transition-all relative select-none -mb-px whitespace-nowrap cursor-pointer',
              isActive
                ? 'border-fairway-600 text-fairway-600 dark:text-fairway-400 font-bold'
                : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border font-medium'
            )}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-mono font-bold transition-colors inline-flex items-center justify-center min-w-[20px]',
                  isActive
                    ? 'bg-fairway-500/15 text-fairway-600 dark:text-fairway-300 border border-fairway-500/30'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/80'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
