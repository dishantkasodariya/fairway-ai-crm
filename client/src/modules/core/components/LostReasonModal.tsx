import React, { useState } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Select, Textarea, Input } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';

import { AlertOctagon } from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';

export interface LostReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryNumber: string;
  companyName: string;
  onConfirm: (data: { lostReason: string; lostComments: string; lostDate: string; closedByUserId: string }) => void;
}

const LOST_REASONS = [
  'Budget / Pricing Misalignment',
  'Location / Corridor Mismatch',
  'Required Clear Height / Tech Spec Unavailable',
  'Timeline / Possession Date Delayed',
  'Competitor Warehouse Selected',
  'Project Postponed / Shelved by Client',
  'Client Decided to Buy Land / Self-Build',
  'Regulatory / Pollution Clearance Issue',
  'Other / Unspecified',
];

export const LostReasonModal: React.FC<LostReasonModalProps> = ({
  isOpen,
  onClose,
  inquiryNumber,
  companyName,
  onConfirm,
}) => {
  const { currentUser } = useAuth();
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [lostComments, setLostComments] = useState('');
  const [lostDate, setLostDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostComments.trim()) {
      setError('Please provide detailed closing context explaining why the opportunity was lost.');
      return;
    }

    onConfirm({
      lostReason,
      lostComments: lostComments.trim(),
      lostDate,
      closedByUserId: currentUser.id,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-700">
          <AlertOctagon className="w-5 h-5" />
          <span>Mark Opportunity as Lost</span>
        </div>
      }
      description={`Mandatory lost reason record for ${inquiryNumber} (${companyName})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
          <strong>Rule requirement:</strong> Closing an opportunity as Lost requires capturing the primary reason, date, and comprehensive notes for executive analytics.
        </div>

        <Select
          label="Primary Lost Reason"
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
          required
        >
          {LOST_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>

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

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm">
            Confirm & Mark Lost
          </Button>
        </div>
      </form>
    </Modal>
  );
};
