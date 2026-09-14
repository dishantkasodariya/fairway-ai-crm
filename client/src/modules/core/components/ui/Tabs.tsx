import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 4;
    setHasOverflow(overflow);
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        checkScroll();
      });
      observer.observe(el);
    }

    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);

    const t1 = setTimeout(checkScroll, 60);
    const t2 = setTimeout(checkScroll, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [checkScroll, tabs]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    const timer = setTimeout(checkScroll, 350);
    return () => clearTimeout(timer);
  }, [activeTab, checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(160, el.clientWidth * 0.65);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 350);
  };

  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'flex items-center p-1 bg-surface-muted/90 dark:bg-[#111722] border border-border rounded-2xl max-w-full shadow-2xs select-none gap-1.5 transition-all',
          className
        )}
      >
        {/* Previous Button (Left Arrow) */}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Previous tabs"
            className={cn(
              'flex items-center justify-center size-7.5 sm:size-8 rounded-xl border border-border/80 bg-surface dark:bg-[#1e293b] text-foreground shadow-xs shrink-0 transition-all cursor-pointer select-none active:scale-95',
              !canScrollLeft
                ? 'opacity-25 cursor-not-allowed pointer-events-none'
                : 'hover:text-fairway-600 hover:border-fairway-500/40 hover:bg-surface-muted'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Pills Track (Sandwiched in middle, never overlapped) */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar touch-pan-x min-w-0"
        >
          {tabs.map((t) => {
            const isActive = t.id === activeTab;
            return (
              <button
                key={t.id}
                data-tab-id={t.id}
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

        {/* Next Button (Right Arrow) */}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Next tabs"
            className={cn(
              'flex items-center justify-center size-7.5 sm:size-8 rounded-xl border border-border/80 bg-surface dark:bg-[#1e293b] text-foreground shadow-xs shrink-0 transition-all cursor-pointer select-none active:scale-95',
              !canScrollRight
                ? 'opacity-25 cursor-not-allowed pointer-events-none'
                : 'hover:text-fairway-600 hover:border-fairway-500/40 hover:bg-surface-muted'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center w-full max-w-full gap-2 transition-all', className)}>
      {/* Previous Button (Left Arrow) */}
      {hasOverflow && (
        <button
          type="button"
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          aria-label="Previous tabs"
          className={cn(
            'flex items-center justify-center size-8 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 select-none',
            !canScrollLeft
              ? 'opacity-25 cursor-not-allowed pointer-events-none'
              : 'hover:text-fairway-600 hover:border-fairway-500/40'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Underline Tabs Track */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-6 border-b border-border overflow-x-auto no-scrollbar touch-pan-x flex-1 select-none min-w-0"
      >
        {tabs.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              data-tab-id={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                'flex items-center gap-2 py-3 text-sm border-b-2 transition-all relative select-none -mb-px whitespace-nowrap cursor-pointer shrink-0',
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

      {/* Next Button (Right Arrow) */}
      {hasOverflow && (
        <button
          type="button"
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          aria-label="Next tabs"
          className={cn(
            'flex items-center justify-center size-8 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 select-none',
            !canScrollRight
              ? 'opacity-25 cursor-not-allowed pointer-events-none'
              : 'hover:text-fairway-600 hover:border-fairway-500/40'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Tabs;
