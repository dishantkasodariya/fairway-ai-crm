import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Textarea, Input } from '@/modules/core/components/ui/Input';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { AlertOctagon, Loader2, Tag } from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { InquiryService } from '@/modules/core/services/inquiryService';

export interface LostReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryNumber: string;
  companyName: string;
  onConfirm: (data: { lostReason: string; lostComments: string; lostDate: string; closedByUserId: string }) => void;
}

interface LostReasonItem {
  id: string;
  reason: string;
  category?: string;
}

const FALLBACK_LOST_REASONS: LostReasonItem[] = [
  { id: 'lr_1', reason: 'Budget / Pricing Misalignment', category: 'Financial' },
  { id: 'lr_2', reason: 'Location / Corridor Mismatch', category: 'Location' },
  { id: 'lr_3', reason: 'Required Clear Height / Tech Spec Unavailable', category: 'Specifications' },
  { id: 'lr_4', reason: 'Timeline / Possession Date Delayed', category: 'Timeline' },
  { id: 'lr_5', reason: 'Competitor Warehouse Selected', category: 'Competition' },
  { id: 'lr_6', reason: 'Project Postponed / Shelved by Client', category: 'Client Strategy' },
  { id: 'lr_7', reason: 'Client Decided to Buy Land / Self-Build', category: 'Client Strategy' },
  { id: 'lr_8', reason: 'Regulatory / Pollution Clearance Issue', category: 'Regulatory' },
  { id: 'lr_9', reason: 'Other / Unspecified', category: 'Other' },
];

export const LostReasonModal: React.FC<LostReasonModalProps> = ({
  isOpen,
  onClose,
  inquiryNumber,
  companyName,
  onConfirm,
}) => {
  const { currentUser } = useAuth();
  const [reasons, setReasons] = useState<LostReasonItem[]>(FALLBACK_LOST_REASONS);
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);
  const [lostReason, setLostReason] = useState(FALLBACK_LOST_REASONS[0].reason);
  const [customReasonText, setCustomReasonText] = useState('');
  const [lostComments, setLostComments] = useState('');
  const [lostDate, setLostDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Fetch lost reasons dynamically from backend whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingReasons(true);

    const loadReasons = async () => {
      try {
        const res = await InquiryService.getLostReasons();
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const items: LostReasonItem[] = res.data.map((r) => ({
            id: r.id,
            reason: r.reason,
            category: r.category,
          }));
          setReasons(items);
          if (!lostReason || !items.some((it) => it.reason === lostReason)) {
            setLostReason(items[0].reason);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic lost reasons from backend:', err);
      } finally {
        if (isMounted) setIsLoadingReasons(false);
      }
    };

    loadReasons();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Real-time Searchable Combobox options for lost reasons
  const reasonComboboxOptions: ComboboxOption[] = useMemo(() => {
    return reasons.map((r) => ({
      value: r.reason,
      label: r.reason,
      description: r.category && r.category !== 'General' ? `Category: ${r.category}` : undefined,
      icon: <Tag className="w-3.5 h-3.5 text-foreground-muted shrink-0" />,
    }));
  }, [reasons]);

  const isCustomSelected =
    lostReason.toLowerCase().includes('other') ||
    lostReason.toLowerCase().includes('custom') ||
    lostReason === 'Other / Unspecified';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostComments.trim()) {
      setError('Please provide detailed closing context explaining why the opportunity was lost.');
      return;
    }

    const finalReason = isCustomSelected && customReasonText.trim()
      ? customReasonText.trim()
      : lostReason;

    // If a custom reason was typed, optionally save to backend dynamically in background
    if (isCustomSelected && customReasonText.trim()) {
      InquiryService.createLostReason(customReasonText.trim(), 'Custom').catch(() => {});
    }

    onConfirm({
      lostReason: finalReason,
      lostComments: lostComments.trim(),
      lostDate,
      closedByUserId: currentUser?.id || 'usr_sales_1',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-foreground font-bold">
          <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0" />
          <span>Mark Opportunity as Lost</span>
        </div>
      }
      description={`Mandatory lost reason record for ${inquiryNumber} (${companyName})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3 bg-surface-muted/60 border border-border rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface border border-border text-rose-500 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-xs font-bold text-foreground">Lost Reason Requirement</h4>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Capturing the primary reason and comprehensive context helps refine pricing, warehouse specifications, and pipeline analytics.
            </p>
          </div>
        </div>

        {/* Real-Time Searchable Combobox for Primary Lost Reason */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Primary Lost Reason</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            {isLoadingReasons && (
              <span className="text-[11px] text-foreground-muted flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                Loading reasons...
              </span>
            )}
          </div>

          <Combobox
            options={reasonComboboxOptions}
            value={lostReason}
            onChange={(val) => setLostReason(val)}
            placeholder={isLoadingReasons ? 'Loading reasons...' : 'Search and select primary lost reason...'}
            searchPlaceholder="Search lost reason by keyword or category..."
            disabled={isLoadingReasons}
            className="h-10 text-xs"
          />
        </div>

        {/* Dynamic custom reason input when "Other" is chosen */}
        {isCustomSelected && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span>Specify Custom Lost Reason</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Client acquired another business with existing warehouse..."
              value={customReasonText}
              onChange={(e) => setCustomReasonText(e.target.value)}
              required
            />
          </div>
        )}

        <DatePicker
          label="Lost Date"
          value={lostDate}
          onChange={(dateStr) => setLostDate(dateStr)}
          placeholder="Select lost date"
        />

        <Textarea
          label="Closing Notes & Client Feedback"
          placeholder="Explain competitor selected, pricing variance, client's feedback or why this opportunity could not convert..."
          value={lostComments}
          onChange={(e) => {
            setLostComments(e.target.value);
            if (error) setError('');
          }}
          error={error}
          rows={3}
          required
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl px-4 h-9 font-medium">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={isLoadingReasons || (isCustomSelected && !customReasonText.trim())}
            className="rounded-xl px-4 h-9 font-bold shadow-xs"
          >
            Confirm & Mark Lost
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LostReasonModal;
