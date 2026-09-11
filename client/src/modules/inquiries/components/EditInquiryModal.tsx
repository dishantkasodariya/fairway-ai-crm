import React, { useState, useEffect } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { StorageService } from '@/modules/core/services/storageService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Inquiry, PriorityLevel, PipelineStageKey } from '@/modules/core/types';
import { formatINR, formatSqFt, STAGE_CONFIGS } from '@/modules/core/utils/formatters';
import { Edit3, CheckCircle2, AlertCircle } from 'lucide-react';

export interface EditInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onSuccess: () => void;
}

const CORRIDOR_OPTIONS = [
  'Dahej PCPIR Corridor',
  'Jhagadia GIDC Corridor',
  'Sanand-Viramgam Corridor',
  'Changodar-Bavla Corridor',
  'Chhatral-Kadi Corridor',
  'Vapi-Sarigam Corridor',
  'Halol Industrial Corridor',
  'Ankleshwar GIDC',
  'United Jhagadia',
  'Aspee Chikhli',
  'LPS kosamba',
  'Universal kosamba',
  'Ahmedabad',
  'Surat Hazira',
];

const INDUSTRY_OPTIONS = [
  'Specialty Chemicals & Polymers',
  'Heavy Engineering & Auto Ancillaries',
  '3PL & Logistics',
  'E-Commerce & Retail Warehousing',
  'Pharmaceutical & Cold Chain',
  'FMCG & Packaging',
  'Electronics & Renewable Equipment',
  'Textiles & Apparels',
];

export const EditInquiryModal: React.FC<EditInquiryModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  onSuccess,
}) => {
  const { users } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    requirement: '',
    requiredAreaSqFt: 0,
    budgetMonthlyINR: 0,
    location: '',
    targetCorridor: '',
    industry: '',
    stage: 'requirement' as PipelineStageKey,
    priority: 'Medium' as PriorityLevel,
    salespersonId: '',
    salespersonName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    nextAction: '',
    nextFollowUpDate: '',
  });

  const pipelineStages = StorageService.getPipelineStages();

  useEffect(() => {
    if (inquiry) {
      setFormData({
        companyName: inquiry.companyName || '',
        requirement: inquiry.requirement || '',
        requiredAreaSqFt: inquiry.requiredAreaSqFt || 0,
        budgetMonthlyINR: inquiry.budgetMonthlyINR || 0,
        location: inquiry.location || '',
        targetCorridor: inquiry.targetCorridor || inquiry.location || '',
        industry: inquiry.industry || '3PL & Logistics',
        stage: (inquiry.stage as PipelineStageKey) || 'requirement',
        priority: inquiry.priority || 'Medium',
        salespersonId: inquiry.salespersonId || '',
        salespersonName: inquiry.salespersonName || '',
        contactName: inquiry.contactName || '',
        contactPhone: inquiry.contactPhone || '',
        contactEmail: inquiry.contactEmail || '',
        nextAction: inquiry.nextAction || '',
        nextFollowUpDate: inquiry.nextFollowUpDate ? inquiry.nextFollowUpDate.split('T')[0] : '',
      });
    }
  }, [inquiry, isOpen]);

  const handleSalespersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const user = users.find((u) => u.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      salespersonId: selectedId,
      salespersonName: user ? user.name : prev.salespersonName,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry) return;

    if (!formData.companyName.trim()) {
      toastError('Validation Error', 'Company name is required.');
      return;
    }
    if (formData.requiredAreaSqFt <= 0) {
      toastError('Validation Error', 'Required area must be greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Inquiry> = {
        companyName: formData.companyName.trim(),
        requirement: formData.requirement.trim(),
        requiredAreaSqFt: Number(formData.requiredAreaSqFt),
        budgetMonthlyINR: Number(formData.budgetMonthlyINR),
        location: formData.location.trim(),
        targetCorridor: formData.targetCorridor.trim() || formData.location.trim(),
        industry: formData.industry,
        stage: formData.stage,
        priority: formData.priority,
        salespersonId: formData.salespersonId,
        salespersonName: formData.salespersonName,
        contactName: formData.contactName.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        nextAction: formData.nextAction.trim() || undefined,
        nextFollowUpDate: formData.nextFollowUpDate || undefined,
      };

      // 1. Update backend database
      const res = await InquiryService.updateInquiry(inquiry.id, payload);

      // 2. Update local storage cache for instant UI response and offline safety
      StorageService.updateInquiry(inquiry.id, payload);

      toastSuccess(
        'Inquiry Updated',
        `Successfully updated ${inquiry.inquiryNumber} (${formData.companyName}).`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update inquiry:', err);
      // Fallback update in local storage if backend call had issues
      StorageService.updateInquiry(inquiry.id, formData);
      toastSuccess('Updated Locally', `Changes saved to local storage for ${inquiry.inquiryNumber}.`);
      onSuccess();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!inquiry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2 text-foreground">
          <div className="w-8 h-8 rounded-lg bg-fairway-50 dark:bg-fairway-950/60 border border-fairway-200 dark:border-fairway-800 flex items-center justify-center text-fairway-700 dark:text-fairway-400">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-none">
              Edit Inquiry <span className="text-fairway-600 dark:text-fairway-400 font-mono">{inquiry.inquiryNumber}</span>
            </h3>
            <p className="text-xs text-foreground-muted mt-1 font-normal">
              Update requirement parameters, corridor, budget, and assignment.
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Row 1: Company & Requirement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Customer Company"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="e.g. Pareek - State head, PMG Group"
          />

          <Select
            label="Industry / Segment"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          >
            {INDUSTRY_OPTIONS.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </Select>
        </div>

        {/* Row 2: Requirement Notes */}
        <div>
          <Textarea
            label="Requirement Specifications / Notes"
            rows={2}
            value={formData.requirement}
            onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
            placeholder="e.g. 60,000 sq.ft grade-A warehouse for FMCG storage with 6 docks..."
          />
        </div>

        {/* Row 3: Area & Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Required Area (Sq.Ft.)"
              type="number"
              min={1}
              required
              value={formData.requiredAreaSqFt || ''}
              onChange={(e) =>
                setFormData({ ...formData, requiredAreaSqFt: parseFloat(e.target.value) || 0 })
              }
              helperText={
                formData.requiredAreaSqFt > 0
                  ? `Formatted: ${formatSqFt(formData.requiredAreaSqFt)}`
                  : undefined
              }
            />
          </div>

          <div>
            <Input
              label="Monthly Budget (₹)"
              type="number"
              min={0}
              value={formData.budgetMonthlyINR || ''}
              onChange={(e) =>
                setFormData({ ...formData, budgetMonthlyINR: parseFloat(e.target.value) || 0 })
              }
              helperText={
                formData.budgetMonthlyINR > 0
                  ? `Formatted: ${formatINR(formData.budgetMonthlyINR)} / mo`
                  : undefined
              }
            />
          </div>
        </div>

        {/* Row 4: Location & Corridor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Location / City"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. United Jhagadia, Aspee Chikhli, Ahmedabad"
          />

          <div>
            <label className="text-xs font-semibold text-foreground inline-flex items-center gap-1 mb-1.5">
              <span>Target Corridor</span>
            </label>
            <input
              type="text"
              list="corridor-suggestions"
              value={formData.targetCorridor}
              onChange={(e) => setFormData({ ...formData, targetCorridor: e.target.value })}
              placeholder="Select or type corridor..."
              className="w-full bg-surface border border-border rounded-input text-sm text-foreground px-3 h-9 focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 focus:outline-none"
            />
            <datalist id="corridor-suggestions">
              {CORRIDOR_OPTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Row 5: Stage & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Pipeline Stage"
            value={formData.stage}
            onChange={(e) =>
              setFormData({ ...formData, stage: e.target.value as PipelineStageKey })
            }
          >
            {pipelineStages.map((stg) => (
              <option key={stg.key} value={stg.key}>
                {stg.label}
              </option>
            ))}
          </Select>

          <Select
            label="Priority Level"
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value as PriorityLevel })
            }
          >
            <option value="High">🔴 High Priority</option>
            <option value="Medium">🟡 Medium Priority</option>
            <option value="Low">🟢 Low Priority</option>
          </Select>
        </div>

        {/* Row 6: Salesperson Owner & Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Assigned Salesperson"
            value={formData.salespersonId}
            onChange={handleSalespersonChange}
          >
            <option value="">Select salesperson...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>

          <Input
            label="Contact Person Name"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            placeholder="e.g. Aditya Bhai, Anirudh Ji"
          />
        </div>

        {/* Row 7: Next Action & Follow-up Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Next Action"
            value={formData.nextAction}
            onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
            placeholder="e.g. Schedule meeting on Tuesday 25/8"
          />

          <Input
            label="Next Follow-up Date"
            type="date"
            value={formData.nextFollowUpDate}
            onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="bg-fairway-600 hover:bg-fairway-700 text-white font-bold"
          >
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
