import React from 'react';
import { Property } from '@/modules/core/types';
import { formatSqFt } from '@/modules/core/utils/formatters';

const pct = (part: number, total: number) => (total > 0 ? Math.max(0, Math.min(100, (part / total) * 100)) : 0);

/** Leased / on hold / free split of a warehouse. Free space is derived by the backend, never typed. */
export const OccupancyBar: React.FC<{ property: Property; compact?: boolean }> = ({ property, compact }) => {
  const total = property.totalAreaSqFt || 0;
  const existing = property.baselineOccupiedSqFt || 0;
  const leased = property.leasedAreaSqFt || 0;
  const held = property.heldAreaSqFt || 0;
  const free = property.availableAreaSqFt || 0;

  if (total <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 px-4 py-3 text-xs text-foreground">
        <span className="font-bold">Area not set.</span>{' '}
        <span className="text-foreground-muted">Edit this warehouse and enter its total area so occupancy and free space can be tracked.</span>
      </div>
    );
  }

  const segments = [
    { key: 'existing', label: 'Existing tenants', value: existing, className: 'bg-slate-400 dark:bg-slate-500' },
    { key: 'leased', label: 'Leased', value: leased, className: 'bg-slate-600 dark:bg-slate-300' },
    { key: 'held', label: 'On hold', value: held, className: 'border-l border-amber-500', style: { backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b 0 4px, transparent 4px 8px)' } },
    { key: 'free', label: 'Free', value: free, className: 'bg-emerald-500' },
  ].filter((s) => s.value > 0 || s.key === 'free');

  return (
    <div className="space-y-2">
      <div className={`flex w-full overflow-hidden rounded-full bg-surface-muted ${compact ? 'h-2' : 'h-3.5'}`} role="img"
        aria-label={`${formatSqFt(free)} free of ${formatSqFt(total)}`}>
        {segments.map((s) => (
          <div key={s.key} className={s.className} style={{ ...('style' in s ? s.style : {}), width: `${pct(s.value, total)}%` }} title={`${s.label}: ${formatSqFt(s.value)}`} />
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
          {segments.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.className}`} style={'style' in s ? s.style : undefined} />
              {s.label}: <span className="font-semibold text-foreground tabular-nums">{formatSqFt(s.value)}</span>
              <span className="tabular-nums">({Math.round(pct(s.value, total))}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default OccupancyBar;
