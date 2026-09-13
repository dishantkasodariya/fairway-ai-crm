import React, { useState, useEffect } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Input, Textarea } from '@/modules/core/components/ui/Input';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { StorageService } from '@/modules/core/services/storageService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Inquiry, PriorityLevel, PipelineStageKey } from '@/modules/core/types';
import { formatINR, formatSqFt, STAGE_CONFIGS } from '@/modules/core/utils/formatters';
import { Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TEXT_ONLY_REGEX = /^[a-zA-Z\s.'-]{2,50}$/;

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

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      errs.companyName = 'Company name is required';
    } else if (formData.companyName.trim().length < 2) {
      errs.companyName = 'Please enter a valid company name';
    }

    if (!formData.requiredAreaSqFt || formData.requiredAreaSqFt <= 0) {
      errs.requiredAreaSqFt = 'Required area must be greater than 0 sq.ft';
    }

    if (formData.budgetMonthlyINR < 0) {
      errs.budgetMonthlyINR = 'Budget cannot be negative';
    }

    if (formData.location && formData.location.trim() && !TEXT_ONLY_REGEX.test(formData.location.trim())) {
      errs.location = 'Please enter a valid location/city (letters only)';
    }

    if (formData.contactPhone && formData.contactPhone.trim()) {
      const cleanPhone = formData.contactPhone.replace(/[\s-]/g, '');
      if (!PHONE_REGEX.test(cleanPhone)) {
        errs.contactPhone = 'Please enter a valid 10-digit mobile number';
      }
    }

    if (formData.contactEmail && formData.contactEmail.trim() && !EMAIL_REGEX.test(formData.contactEmail.trim())) {
      errs.contactEmail = 'Please enter a valid email address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry) return;

    if (!validate()) {
      toastError('Validation Error', 'Please check and correct the highlighted fields.');
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

  const getStageDotColor = (stageKey: string) => {
    switch (stageKey) {
      case 'new':
        return 'bg-slate-400';
      case 'contacted':
        return 'bg-sky-500';
      case 'requirement_confirmed':
        return 'bg-indigo-500';
      case 'property_matched':
        return 'bg-emerald-500';
      case 'property_shared':
        return 'bg-teal-500';
      case 'proposal':
        return 'bg-purple-500';
      case 'site_visit':
        return 'bg-orange-500';
      case 'negotiation':
        return 'bg-amber-500';
      case 'won':
        return 'bg-emerald-600';
      case 'lost':
        return 'bg-rose-500';
      default:
        return 'bg-fairway-500';
    }
  };

  if (!inquiry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-3 text-foreground">
          <div className="w-9 h-9 rounded-xl bg-fairway-50 dark:bg-fairway-950/60 border border-fairway-200 dark:border-fairway-800 flex items-center justify-center text-fairway-600 dark:text-fairway-400 shrink-0 shadow-2xs">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold leading-tight">Edit Inquiry</h3>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-fairway-100 dark:bg-fairway-900/60 text-fairway-800 dark:text-fairway-300 border border-fairway-200 dark:border-fairway-700/60 shadow-2xs">
                {inquiry.inquiryNumber}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5 font-normal">
              Update requirement parameters, corridor, budget, and assignment.
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Row 1: Company & Requirement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <Input
            label="Customer Company"
            required
            value={formData.companyName}
            onChange={(e) => {
              setFormData({ ...formData, companyName: e.target.value });
              if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: '' }));
            }}
            placeholder="e.g. Pareek - State head, PMG Group"
            className="h-10 rounded-xl"
            error={errors.companyName}
          />

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-foreground block">
              Industry / Segment
            </label>
            <Combobox
              options={INDUSTRY_OPTIONS.map((ind) => ({ value: ind, label: ind }))}
              value={formData.industry}
              onChange={(val) => setFormData({ ...formData, industry: val })}
              placeholder="Select industry sector..."
              searchPlaceholder="Search industry..."
            />
          </div>
        </div>

        {/* Row 2: Requirement Notes */}
        <div>
          <Textarea
            label="Requirement Specifications / Notes"
            rows={2}
            value={formData.requirement}
            onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
            placeholder="e.g. 60,000 sq.ft grade-A warehouse for FMCG storage with 6 docks..."
            className="rounded-xl border-border resize-y"
          />
        </div>

        {/* Row 3: Area & Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <Input
              label="Required Area (Sq.Ft.)"
              type="number"
              min={1}
              required
              value={formData.requiredAreaSqFt || ''}
              onChange={(e) => {
                setFormData({ ...formData, requiredAreaSqFt: parseFloat(e.target.value) || 0 });
                if (errors.requiredAreaSqFt) setErrors((prev) => ({ ...prev, requiredAreaSqFt: '' }));
              }}
              className="h-10 rounded-xl"
              error={errors.requiredAreaSqFt}
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
              onChange={(e) => {
                setFormData({ ...formData, budgetMonthlyINR: parseFloat(e.target.value) || 0 });
                if (errors.budgetMonthlyINR) setErrors((prev) => ({ ...prev, budgetMonthlyINR: '' }));
              }}
              className="h-10 rounded-xl"
              error={errors.budgetMonthlyINR}
              helperText={
                formData.budgetMonthlyINR > 0
                  ? `Formatted: ${formatINR(formData.budgetMonthlyINR)} / mo`
                  : undefined
              }
            />
          </div>
        </div>

        {/* Row 4: Location & Corridor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <Input
            label="Location / City"
            value={formData.location}
            onChange={(e) => {
              setFormData({ ...formData, location: e.target.value });
              if (errors.location) setErrors((prev) => ({ ...prev, location: '' }));
            }}
            placeholder="e.g. United Jhagadia, Aspee Chikhli, Ahmedabad"
            className="h-10 rounded-xl"
            error={errors.location}
          />

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-foreground block">
              Target Corridor
            </label>
            <Combobox
              options={CORRIDOR_OPTIONS.map((c) => ({ value: c, label: c }))}
              value={formData.targetCorridor}
              onChange={(val) => setFormData({ ...formData, targetCorridor: val })}
              placeholder="Select target corridor..."
              searchPlaceholder="Search corridor..."
            />
          </div>
        </div>

        {/* Row 5: Stage & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-foreground block">
              Pipeline Stage
            </label>
            <Combobox
              options={pipelineStages.map((stg) => ({
                value: stg.key,
                label: stg.label,
                icon: (
                  <span
                    className={cn(
                      'w-2.5 h-2.5 rounded-full shrink-0',
                      getStageDotColor(stg.key)
                    )}
                  />
                ),
              }))}
              value={formData.stage}
              onChange={(val) => setFormData({ ...formData, stage: val as PipelineStageKey })}
              placeholder="Select pipeline stage..."
              searchPlaceholder="Search stage..."
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-foreground block">
              Priority Level
            </label>
            <Combobox
              options={[
                { value: 'High', label: 'High Priority' },
                { value: 'Medium', label: 'Medium Priority' },
                { value: 'Low', label: 'Low Priority' },
              ]}
              value={formData.priority}
              onChange={(val) => setFormData({ ...formData, priority: val as PriorityLevel })}
              placeholder="Select priority..."
            />
          </div>
        </div>

        {/* Row 6: Salesperson Owner */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-foreground block">
            Assigned Salesperson
          </label>
          <Combobox
            options={users.map((u) => ({
              value: u.id,
              label: u.name,
              description: u.role,
              avatar: u.avatar,
              initials: u.name?.slice(0, 2).toUpperCase(),
            }))}
            value={formData.salespersonId}
            onChange={(selectedId) => {
              const user = users.find((u) => u.id === selectedId);
              setFormData((prev) => ({
                ...prev,
                salespersonId: selectedId,
                salespersonName: user ? user.name : prev.salespersonName,
              }));
            }}
            placeholder="Select salesperson..."
            searchPlaceholder="Search salesperson..."
          />
        </div>

        {/* Row 7: Contact Person, Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <Input
            label="Contact Person Name"
            value={formData.contactName}
            onChange={(e) => {
              setFormData({ ...formData, contactName: e.target.value });
              if (errors.contactName) setErrors((prev) => ({ ...prev, contactName: '' }));
            }}
            placeholder="e.g. Aditya Sharma"
            className="h-10 rounded-xl"
            error={errors.contactName}
          />

          <Input
            label="Contact Phone"
            value={formData.contactPhone}
            onChange={(e) => {
              setFormData({ ...formData, contactPhone: e.target.value });
              if (errors.contactPhone) setErrors((prev) => ({ ...prev, contactPhone: '' }));
            }}
            placeholder="e.g. 9825011223"
            className="h-10 rounded-xl"
            error={errors.contactPhone}
          />

          <Input
            label="Contact Email"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => {
              setFormData({ ...formData, contactEmail: e.target.value });
              if (errors.contactEmail) setErrors((prev) => ({ ...prev, contactEmail: '' }));
            }}
            placeholder="e.g. contact@company.com"
            className="h-10 rounded-xl sm:col-span-2 lg:col-span-1"
            error={errors.contactEmail}
          />
        </div>

        {/* Row 8: Next Action & Follow-up Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <Input
            label="Next Action"
            value={formData.nextAction}
            onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
            placeholder="e.g. Schedule meeting on Tuesday 25/8"
            className="h-10 rounded-xl"
          />

          <DatePicker
            label="Next Follow-up Date"
            value={formData.nextFollowUpDate}
            onChange={(dateStr) => setFormData({ ...formData, nextFollowUpDate: dateStr })}
            placeholder="Select follow-up date"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-border mt-5 w-full">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="w-full xs:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="w-full xs:w-auto bg-fairway-600 hover:bg-fairway-700 text-white font-bold"
          >
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
