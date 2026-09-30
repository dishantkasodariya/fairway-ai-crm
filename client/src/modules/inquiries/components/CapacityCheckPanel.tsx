import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertOctagon, Loader2 } from 'lucide-react';
import { PropertyService, CapacityCheck } from '@/modules/core/services/propertyService';
import { formatSqFt } from '@/modules/core/utils/formatters';

/**
 * Answers "can we actually give them this much space?" as soon as the requirement is known,
 * so nobody promises space that is leased or on hold for another deal.
 */
export const CapacityCheckPanel: React.FC<{ areaSqFt: number; inquiryId: string; refreshKey?: unknown }> = ({
  areaSqFt, inquiryId, refreshKey,
}) => {
  const [data, setData] = useState<CapacityCheck | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!(areaSqFt > 0)) return;
    let alive = true;
    setLoading(true);
    PropertyService.getCapacity(areaSqFt, inquiryId).then((res) => {
      if (alive) {
        setData(res.success && res.data ? res.data : null);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [areaSqFt, inquiryId, refreshKey]);

  if (!(areaSqFt > 0)) {
    return <p className="text-[11px] text-foreground-muted px-1">Enter the required area to check warehouse capacity.</p>;
  }
  if (loading && !data) {
    return <div className="py-2 px-1"><Loader2 className="w-4 h-4 animate-spin text-fairway-600" /></div>;
  }
  if (!data) return null;

  const fitting = data.warehouses.filter((w) => w.fits);

  if (data.fitsAny) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {formatSqFt(areaSqFt)} fits at {fitting.length} warehouse{fitting.length > 1 ? 's' : ''}
        </div>
        <ul className="mt-1.5 space-y-0.5 text-foreground-muted">
          {fitting.map((w) => (
            <li key={w.id} className="flex justify-between gap-3">
              <span className="truncate">{w.name}</span>
              <span className="tabular-nums shrink-0">
                {formatSqFt(w.freeSqFt)} free{w.heldForThisDealSqFt ? ` + ${formatSqFt(w.heldForThisDealSqFt)} held for this deal` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3.5 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
        <AlertOctagon className="w-3.5 h-3.5" />
        No single warehouse has {formatSqFt(areaSqFt)} free
      </div>
      {data.split && data.split.parts.length > 0 && (
        <div className="mt-1.5 text-foreground-muted">
          <span className="text-foreground font-semibold">Split option: </span>
          {data.split.parts.map((p) => `${p.name} (${formatSqFt(p.useSqFt)})`).join(' + ')}
          {data.split.shortfallSqFt > 0 && (
            <span className="block mt-0.5 text-rose-700 dark:text-rose-400">
              Still {formatSqFt(data.split.shortfallSqFt)} short across all warehouses — consider a smaller first phase or space from an expiring lease.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CapacityCheckPanel;
