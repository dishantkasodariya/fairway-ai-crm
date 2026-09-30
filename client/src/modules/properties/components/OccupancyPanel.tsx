import React, { useEffect, useState } from 'react';
import { FileSignature, Plus, Loader2 } from 'lucide-react';
import { Lease, Property } from '@/modules/core/types';
import { LeaseService, apiErrorMessage } from '@/modules/core/services/leaseService';
import { Button } from '@/modules/core/components/ui/Button';
import { useToast } from '@/modules/core/providers/ToastContext';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { cn } from '@/modules/core/lib/utils';
import { OccupancyBar } from './OccupancyBar';
import { LeaseFormModal } from './LeaseFormModal';

const monthsUntil = (iso: string | null) => {
  if (!iso) return null;
  const end = new Date(`${iso}T00:00:00`);
  const now = new Date();
  return (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
};

export const OccupancyPanel: React.FC<{ property: Property; canEdit: boolean; onSpaceChanged: () => void }> = ({
  property, canEdit, onSpaceChanged,
}) => {
  const { success, error: toastError } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const res = await LeaseService.getLeases({ propertyId: property.id });
    if (res.success && res.data) setLeases(res.data);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id]);

  const endLease = async (lease: Lease) => {
    setBusyId(lease.id);
    try {
      const res = await LeaseService.updateLease(lease.id, { status: 'ended' });
      if (!res.success) {
        toastError('Could not end lease', apiErrorMessage(res, 'Try again.'));
        return;
      }
      success('Lease ended', `${formatSqFt(lease.areaSqFt)} is free again at ${property.name}.`);
      await load();
      onSpaceChanged();
    } finally {
      setBusyId(null);
    }
  };

  const active = leases.filter((l) => l.status === 'active');
  const monthlyRent = active.reduce((sum, l) => sum + (l.monthlyRentINR || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">Occupancy</h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Free space = total − existing tenants − active leases − space on hold for proposals. It updates itself when leases change.
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold text-foreground tabular-nums">{formatSqFt(property.availableAreaSqFt)}</div>
            <div className="text-[11px] text-foreground-muted">free of {formatSqFt(property.totalAreaSqFt)}</div>
          </div>
        </div>
        <OccupancyBar property={property} />
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-fairway-600" />
              Leases ({active.length} active)
            </h2>
            {monthlyRent > 0 && <p className="text-[11px] text-foreground-muted mt-0.5">{formatINR(monthlyRent)} / month from active leases</p>}
          </div>
          {canEdit && (
            <Button type="button" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsFormOpen(true)}
              disabled={(property.totalAreaSqFt || 0) <= 0}>
              Add lease
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-fairway-600" /></div>
        ) : leases.length === 0 ? (
          <p className="py-10 text-center text-xs text-foreground-muted">
            No leases recorded yet. Winning a deal (or "Add lease") records one and takes the space out of this warehouse.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-foreground-muted bg-surface-muted/40">
                  <th className="px-5 py-2.5 font-semibold">Tenant</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Area</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Rent / month</th>
                  <th className="px-3 py-2.5 font-semibold">Term</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {leases.map((l) => {
                  const left = monthsUntil(l.endDate);
                  const renewalSoon = l.status === 'active' && left !== null && left <= 12;
                  return (
                    <tr key={l.id} className="border-t border-border/70">
                      <td className="px-5 py-3">
                        <div className="font-bold text-foreground">{l.companyName || '—'}</div>
                        {l.fromBaseline && <div className="text-[10px] text-foreground-muted">Existing tenant</div>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatSqFt(l.areaSqFt)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{l.monthlyRentINR ? formatINR(l.monthlyRentINR) : '—'}</td>
                      <td className="px-3 py-3">
                        <div className="tabular-nums">{formatDate(l.startDate)} → {l.endDate ? formatDate(l.endDate) : 'open'}</div>
                        {l.lockInMonths ? <div className="text-[10px] text-foreground-muted">Lock-in {l.lockInMonths} mo{l.escalationPercent ? ` · +${l.escalationPercent}%/yr` : ''}</div> : null}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          l.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-surface-muted text-foreground-muted border-border')}>
                          {l.status}
                        </span>
                        {renewalSoon && <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">Ends in {Math.max(left!, 0)} mo — renewal due</div>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {canEdit && l.status === 'active' && (
                          <Button type="button" size="xs" variant="outline" isLoading={busyId === l.id} onClick={() => endLease(l)}>
                            End lease
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LeaseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        property={property}
        onSaved={async (lease) => {
          setIsFormOpen(false);
          success('Lease recorded', `${lease.companyName} · ${formatSqFt(lease.areaSqFt)} at ${property.name}.`);
          await load();
          onSpaceChanged();
        }}
      />
    </div>
  );
};

export default OccupancyPanel;
