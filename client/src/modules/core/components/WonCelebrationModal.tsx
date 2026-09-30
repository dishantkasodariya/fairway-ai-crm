import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Textarea, Input } from '@/modules/core/components/ui/Input';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { CheckCircle2, Loader2, Building2, AlertTriangle } from 'lucide-react';
import { PropertyService } from '@/modules/core/services/propertyService';
import { ProposalService } from '@/modules/core/services/proposalService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { Inquiry, Property, Proposal } from '@/modules/core/types';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';
import confetti from 'canvas-confetti';

export interface WonCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Pick<Inquiry, 'id' | 'inquiryNumber' | 'companyName' | 'requiredAreaSqFt' | 'leaseDurationMonths'>;
  defaultPropertyId?: string;
  /** Called after the deal is Won and its lease recorded on the server. */
  onWon: (result: { propertyName: string; areaSqFt: number; monthlyRentINR: number | null }) => void;
}

// toISOString() is UTC and would shift IST dates back a day.
const localIsoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isIsoDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const PROPOSAL_PRIORITY: Record<string, number> = { Accepted: 0, Negotiation: 1, Viewed: 2, Sent: 3, Draft: 4 };

export const WonCelebrationModal: React.FC<WonCelebrationModalProps> = ({ isOpen, onClose, inquiry, defaultPropertyId, onWon }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [heldForDeal, setHeldForDeal] = useState<Record<string, number>>({});
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [propertyId, setPropertyId] = useState('');
  const [areaSqFt, setAreaSqFt] = useState('');
  const [rent, setRent] = useState('');
  const [startDate, setStartDate] = useState(localIsoDate());
  const [tenureYears, setTenureYears] = useState('');
  const [lockInMonths, setLockInMonths] = useState('');
  const [escalation, setEscalation] = useState('');
  const [wonDate, setWonDate] = useState(localIsoDate());
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);
    setError('');

    (async () => {
      try {
        const [propRes, propsalRes, capRes] = await Promise.all([
          PropertyService.getProperties(),
          ProposalService.getProposals({ inquiryId: inquiry.id }),
          PropertyService.getCapacity(1, inquiry.id),
        ]);
        if (!isMounted) return;
        setHeldForDeal(
          Object.fromEntries((capRes.success && capRes.data ? capRes.data.warehouses : []).map((w) => [w.id, w.heldForThisDealSqFt]))
        );

        const props = propRes.success && Array.isArray(propRes.data) ? propRes.data : [];
        const candidates = (propsalRes.success ? propsalRes.data : [])
          .filter((p) => p.status !== 'Rejected' && p.status !== 'Expired')
          .sort((a, b) => (PROPOSAL_PRIORITY[a.status] ?? 9) - (PROPOSAL_PRIORITY[b.status] ?? 9) || b.createdAt.localeCompare(a.createdAt));
        const best = candidates[0] || null;
        setProperties(props);
        setProposal(best);

        const area = best?.proposedAreaSqFt || inquiry.requiredAreaSqFt || 0;
        const chosen =
          props.find((p) => p.id === best?.propertyId) ||
          props.find((p) => p.id === defaultPropertyId) ||
          props.find((p) => p.availableAreaSqFt >= area && p.totalAreaSqFt > 0) ||
          props[0];

        setPropertyId(chosen?.id || '');
        setAreaSqFt(area ? String(area) : '');
        setRent(String(best?.baseRentPerSqFtINR || chosen?.rentPerSqFtINR || ''));
        setStartDate(isIsoDate(best?.possessionDate) ? best!.possessionDate : localIsoDate());
        setTenureYears(
          String(best?.leaseTenureYears || (inquiry.leaseDurationMonths ? Math.round((inquiry.leaseDurationMonths / 12) * 10) / 10 : '') || chosen?.leaseTermsYears || '')
        );
        setLockInMonths(best?.lockInMonths ? String(best.lockInMonths) : '');
        setEscalation(best?.escalationPercentPerYear ? String(best.escalationPercentPerYear) : '');
        setWonDate(localIsoDate());
        setComments(best ? `Proposal ${best.proposalNumber} terms.` : '');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, inquiry.id]);

  const selected = properties.find((p) => p.id === propertyId);
  const area = Number(areaSqFt) || 0;
  const monthly = area && rent ? area * Number(rent) : 0;
  const heldHere = selected ? heldForDeal[selected.id] || 0 : 0;
  const usable = (selected?.availableAreaSqFt || 0) + heldHere;
  const looksShort = !!selected && area > usable;

  const propertyOptions: ComboboxOption[] = useMemo(
    () =>
      properties.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.totalAreaSqFt > 0 ? `${formatSqFt(p.availableAreaSqFt)} free of ${formatSqFt(p.totalAreaSqFt)}` : 'Area not set',
        icon: <Building2 className="w-4 h-4 text-foreground-muted shrink-0" />,
      })),
    [properties]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!propertyId) return setError('Choose the warehouse the tenant is taking.');
    if (area <= 0) return setError('Enter the leased area.');
    if (!startDate) return setError('Enter the lease start date.');

    setIsSaving(true);
    try {
      const res = await InquiryService.winInquiry(inquiry.id, {
        propertyId,
        areaSqFt: area,
        startDate,
        rentPerSqFtINR: rent ? Number(rent) : undefined,
        tenureYears: tenureYears ? Number(tenureYears) : undefined,
        lockInMonths: lockInMonths ? Number(lockInMonths) : undefined,
        escalationPercent: escalation ? Number(escalation) : undefined,
        wonDate,
        comments: comments.trim() || undefined,
      });
      if (!res.success) {
        setError(typeof res.error === 'string' ? res.error : 'Could not mark the deal as won.');
        return;
      }
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ['#EB661F', '#F59E0B', '#3B82F6', '#10B981'] });
      onWon({ propertyName: selected?.name || '', areaSqFt: area, monthlyRentINR: monthly || null });
      onClose();
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
        <div className="flex items-center gap-2 text-foreground font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>Mark Opportunity as Won</span>
        </div>
      }
      description={`${inquiry.inquiryNumber} · ${inquiry.companyName} — record the signed lease; the space comes out of the warehouse.`}
    >
      {isLoading ? (
        <div className="py-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-fairway-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {proposal && (
            <p className="text-[11px] text-foreground-muted">
              Pre-filled from proposal <span className="font-semibold text-foreground">{proposal.proposalNumber}</span> ({proposal.status}).
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Warehouse <span className="text-rose-500 font-bold">*</span>
            </label>
            <Combobox
              options={propertyOptions}
              value={propertyId}
              onChange={setPropertyId}
              placeholder="Select the warehouse..."
              searchPlaceholder="Search warehouse..."
              className="h-10 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input type="number" label="Leased area (sq ft)" value={areaSqFt} onChange={(e) => setAreaSqFt(e.target.value)} required min={1} />
            <Input type="number" label="Rent (₹ / sq ft / month)" value={rent} onChange={(e) => setRent(e.target.value)} min={0} step="0.1" />
            <DatePicker label="Lease start" value={startDate} onChange={setStartDate} placeholder="Select date" />
            <Input type="number" label="Tenure (years)" value={tenureYears} onChange={(e) => setTenureYears(e.target.value)} min={0} step="0.5" />
            <Input type="number" label="Lock-in (months)" value={lockInMonths} onChange={(e) => setLockInMonths(e.target.value)} min={0} />
            <Input type="number" label="Yearly escalation (%)" value={escalation} onChange={(e) => setEscalation(e.target.value)} min={0} step="0.5" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-muted/50 px-3 py-2 text-xs">
            <span className="text-foreground-muted">
              {selected ? (
                <>
                  Free at {selected.name}: <span className="font-semibold text-foreground">{formatSqFt(selected.availableAreaSqFt)}</span>
                  {heldHere > 0 && <> + <span className="font-semibold text-foreground">{formatSqFt(heldHere)}</span> on hold for this deal</>}
                </>
              ) : 'No warehouse selected'}
            </span>
            {monthly > 0 && <span className="font-semibold text-foreground">{formatINR(monthly)} / month</span>}
          </div>
          {looksShort && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              Only {formatSqFt(usable)} is available for this deal at {selected?.name}. Pick another warehouse or reduce the area.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker label="Signed / LOI date" value={wonDate} onChange={setWonDate} placeholder="Select date" />
          </div>

          <Textarea
            label="Commercial highlights & handover notes"
            placeholder="e.g. 10-year lease, 3-year lock-in, fit-outs start next week."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
          />

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl px-4 h-9 font-medium">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving} disabled={!propertyId}
              leftIcon={<CheckCircle2 className="w-4 h-4 shrink-0" />} className="rounded-xl px-4 h-9 font-bold shadow-xs">
              Confirm Deal Won
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default WonCelebrationModal;
