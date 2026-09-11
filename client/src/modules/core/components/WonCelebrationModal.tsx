import React, { useState, useEffect } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Select, Textarea, Input } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';


import { Trophy, Sparkles } from 'lucide-react';
import { Property } from '@/modules/core/types';
import { StorageService } from '@/modules/core/services/storageService';
import confetti from 'canvas-confetti';

export interface WonCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryNumber: string;
  companyName: string;
  defaultPropertyId?: string;
  defaultMonthlyRent?: number;
  onConfirm: (data: {
    wonPropertyId: string;
    wonPropertyName: string;
    wonFinalValueMonthlyINR: number;
    wonComments: string;
    wonDate: string;
  }) => void;
}

export const WonCelebrationModal: React.FC<WonCelebrationModalProps> = ({
  isOpen,
  onClose,
  inquiryNumber,
  companyName,
  defaultPropertyId,
  defaultMonthlyRent = 1500000,
  onConfirm,
}) => {
  const properties = StorageService.getProperties();
  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || '');
  const [monthlyValue, setMonthlyValue] = useState(defaultMonthlyRent.toString());
  const [wonDate, setWonDate] = useState(new Date().toISOString().split('T')[0]);
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fire confetti burst!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EB661F', '#F59E0B', '#3B82F6', '#10B981'],
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProp = properties.find((p) => p.id === propertyId);
    onConfirm({
      wonPropertyId: propertyId,
      wonPropertyName: selectedProp?.name || 'Fairway Warehouse Hub',
      wonFinalValueMonthlyINR: parseFloat(monthlyValue) || defaultMonthlyRent,
      wonComments: comments.trim() || 'Agreement finalized. Handover process initiated.',
      wonDate,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-emerald-800">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>Mark Opportunity as Won!</span>
        </div>
      }
      description={`Celebrate & finalize deal closure for ${inquiryNumber} (${companyName})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900">Congratulations on the conversion!</h4>
            <p className="text-[11px] text-emerald-700">Record final commercial lease details to update property occupancy and revenue reports.</p>
          </div>
        </div>

        <Select
          label="Contracted Warehouse Property"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          required
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.city})
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            label="Final Monthly Rent (INR)"
            value={monthlyValue}
            onChange={(e) => setMonthlyValue(e.target.value)}
            required
          />
          <DatePicker
            label="Execution / LOI Date"
            value={wonDate}
            onChange={(dateStr) => setWonDate(dateStr)}
            placeholder="Select date"
          />

        </div>

        <Textarea
          label="Commercial Highlights & Handover Notes"
          placeholder="e.g. 5-year lease executed with 3-year lock-in. Fit-outs start next week..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" leftIcon={<Trophy className="w-4 h-4 text-amber-300" />}>
            Confirm Deal Won
          </Button>
        </div>
      </form>
    </Modal>
  );
};
