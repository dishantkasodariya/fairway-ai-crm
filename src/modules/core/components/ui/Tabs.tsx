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
      <div className={cn('flex items-center gap-1.5 p-1 bg-surface-muted border border-border rounded-lg inline-flex', className)}>
        {tabs.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all select-none',
                isActive
                  ? 'bg-surface text-fairway-800 font-semibold shadow-subtle border border-border/80'
                  : 'text-foreground-muted hover:text-foreground hover:bg-white/40'
              )}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    isActive ? 'bg-fairway-100 text-fairway-800' : 'bg-slate-200 text-slate-700'
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
    <div className={cn('flex items-center gap-6 border-b border-border', className)}>
      {tabs.map((t) => {
        const isActive = t.id === activeTab;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-all relative select-none -mb-px',
              isActive
                ? 'border-fairway-600 text-fairway-800 font-semibold'
                : 'border-transparent text-foreground-muted hover:text-foreground hover:border-slate-300'
            )}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-bold',
                  isActive ? 'bg-fairway-100 text-fairway-800' : 'bg-slate-100 text-slate-600'
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
