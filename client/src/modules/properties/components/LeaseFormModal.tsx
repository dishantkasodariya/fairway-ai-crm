import React, { useEffect, useMemo, useState } from 'react';
import { FileSignature } from 'lucide-react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Lease, Property } from '@/modules/core/types';
import { LeaseService, CreateLeasePayload, apiErrorMessage } from '@/modules/core/services/leaseService';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';

export interface LeaseFormDefaults {
  companyId?: string;
  companyName?: string;
  inquiryId?: string;
  areaSqFt?: number;
  rentPerSqFtINR?: number;
  startDate?: string;
  tenureYears?: number;
  lockInMonths?: number;
  escalationPercent?: number;
  notes?: string;
}

export interface LeaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  defaults?: LeaseFormDefaults;
  /** Space already on hold for this deal at this warehouse — usable by the lease on top of free space. */
  heldForThisDealSqFt?: number;
  onSaved: (lease: Lease) => void;
  title?: string;
}

const inputCls =
  'w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-xl text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none';

// Local-date formatting on purpose: toISOString() is UTC and shifts IST dates back a day.
const localIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addYears = (iso: string, years: number) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime()) || !years) return '';
  d.setMonth(d.getMonth() + Math.round(years * 12));
  d.setDate(d.getDate() - 1);
  return localIsoDate(d);
};

export const LeaseFormModal: React.FC<LeaseFormModalProps> = ({
  isOpen, onClose, property, defaults, heldForThisDealSqFt = 0, onSaved, title,
}) => {
  const today = localIsoDate(new Date());
  const [companyName, setCompanyName] = useState('');
  const [areaSqFt, setAreaSqFt] = useState<number | ''>('');
  const [rent, setRent] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(today);
  const [tenureYears, setTenureYears] = useState<number | ''>(5);
  const [lockInMonths, setLockInMonths] = useState<number | ''>('');
  const [escalation, setEscalation] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [fromBaseline, setFromBaseline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCompanyName(defaults?.companyName || '');
    setAreaSqFt(defaults?.areaSqFt ?? '');
    setRent(defaults?.rentPerSqFtINR ?? (property.rentPerSqFtINR || ''));
    setStartDate(defaults?.startDate || today);
    setTenureYears(defaults?.tenureYears ?? (property.leaseTermsYears || 5));
    setLockInMonths(defaults?.lockInMonths ?? '');
    setEscalation(defaults?.escalationPercent ?? '');
    setNotes(defaults?.notes || '');
    setFromBaseline(false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const baseline = property.baselineOccupiedSqFt || 0;
  const capacity = fromBaseline ? baseline : (property.availableAreaSqFt || 0) + heldForThisDealSqFt;
  const area = Number(areaSqFt) || 0;
  const overCapacity = area > capacity;
  const endDate = useMemo(() => addYears(startDate, Number(tenureYears) || 0), [startDate, tenureYears]);
  const monthly = area && rent !== '' ? area * Number(rent) : 0;

  const handleSave = async () => {
    setError('');
    if (!companyName.trim()) return setError('Enter the tenant company.');
    if (area <= 0) return setError('Enter the leased area.');
    if (!startDate) return setError('Enter the lease start date.');
    if (overCapacity) return setError(`Only ${formatSqFt(capacity)} is available for this lease.`);

    const payload: CreateLeasePayload = {
      propertyId: property.id,
      companyName: companyName.trim(),
      companyId: defaults?.companyId,
      inquiryId: defaults?.inquiryId,
      areaSqFt: area,
      rentPerSqFtINR: rent === '' ? undefined : Number(rent),
      startDate,
      tenureYears: tenureYears === '' ? undefined : Number(tenureYears),
      lockInMonths: lockInMonths === '' ? undefined : Number(lockInMonths),
      escalationPercent: escalation === '' ? undefined : Number(escalation),
      notes: notes.trim() || undefined,
      fromBaseline,
    };

    setIsSaving(true);
    try {
      const res = await LeaseService.createLease(payload);
      if (!res.success || !res.data) {
        setError(apiErrorMessage(res, 'Could not save the lease.'));
        return;
      }
      onSaved(res.data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <span className="flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-fairway-600" />
          {title || 'Record a lease'}
        </span>
      }
      description={`${property.name} · ${formatSqFt(property.availableAreaSqFt)} free${heldForThisDealSqFt ? ` + ${formatSqFt(heldForThisDealSqFt)} held for this deal` : ''}`}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" onClick={handleSave} isLoading={isSaving} disabled={overCapacity}>
            Save lease
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="lease-company" className="text-xs font-semibold text-foreground">Tenant company</label>
          <input id="lease-company" className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Client X Pvt Ltd" />
        </div>
        <div className="space-y-1">
          <label htmlFor="lease-area" className="text-xs font-semibold text-foreground">Area (sq ft)</label>
          <input id="lease-area" type="number" inputMode="numeric" min={1} className={inputCls} value={areaSqFt}
            onChange={(e) => setAreaSqFt(e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 200000" />
          {overCapacity && area > 0 && (
            <p className="text-[11px] text-rose-500 font-medium">Only {formatSqFt(capacity)} available.</p>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="lease-rent" className="text-xs font-semibold text-foreground">Rent (₹ / sq ft / month)</label>
          <input id="lease-rent" type="number" step="0.1" min={0} className={inputCls} value={rent}
            onChange={(e) => setRent(e.target.value ? Number(e.target.value) : '')} />
          {monthly > 0 && <p className="text-[11px] text-foreground-muted">{formatINR(monthly)} / month</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="lease-start" className="text-xs font-semibold text-foreground">Start date</label>
          <input id="lease-start" type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="lease-tenure" className="text-xs font-semibold text-foreground">Tenure (years)</label>
          <input id="lease-tenure" type="number" step="0.5" min={0} className={inputCls} value={tenureYears}
            onChange={(e) => setTenureYears(e.target.value ? Number(e.target.value) : '')} />
          {endDate && <p className="text-[11px] text-foreground-muted">Ends {endDate}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="lease-lockin" className="text-xs font-semibold text-foreground">Lock-in (months)</label>
          <input id="lease-lockin" type="number" min={0} className={inputCls} value={lockInMonths}
            onChange={(e) => setLockInMonths(e.target.value ? Number(e.target.value) : '')} />
        </div>
        <div className="space-y-1">
          <label htmlFor="lease-esc" className="text-xs font-semibold text-foreground">Yearly escalation (%)</label>
          <input id="lease-esc" type="number" step="0.5" min={0} className={inputCls} value={escalation}
            onChange={(e) => setEscalation(e.target.value ? Number(e.target.value) : '')} />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="lease-notes" className="text-xs font-semibold text-foreground">Notes</label>
          <textarea id="lease-notes" rows={2} className={`${inputCls} h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {baseline > 0 && !defaults?.inquiryId && (
          <label htmlFor="lease-from-baseline" className="sm:col-span-2 flex items-start gap-2 text-xs text-foreground cursor-pointer">
            <input id="lease-from-baseline" type="checkbox" className="mt-0.5" checked={fromBaseline} onChange={(e) => setFromBaseline(e.target.checked)} />
            <span>
              This tenant is already in the warehouse, counted in "occupied by existing tenants" ({formatSqFt(baseline)}).
              <span className="block text-foreground-muted">Free space won't change; the existing-tenant figure goes down instead.</span>
            </span>
          </label>
        )}
        {error && <p className="sm:col-span-2 text-xs text-rose-500 font-medium">{error}</p>}
      </div>
    </Modal>
  );
};

export default LeaseFormModal;
