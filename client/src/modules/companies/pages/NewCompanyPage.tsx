import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  FileText,
  Plus,
  ShieldCheck,
  Phone,
  Mail,
  User as UserIcon,
  Globe,
  Briefcase,
  Layers,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { UserCombobox } from '@/modules/core/components/ui/UserCombobox';
import { CompanyService } from '@/modules/core/services/companyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Company, PriorityLevel } from '@/modules/core/types';
import { cn } from '@/modules/core/lib/utils';
import { PhoneInput } from '@/components/reui/phone-input';

const INDUSTRY_OPTIONS = [
  'Specialty Chemicals & Polymers',
  '3PL & Contract Logistics',
  'Automotive & EV Components',
  'FMCG & Retail Logistics',
  'Pharmaceutical & Cold Chain',
  'Heavy Engineering & Machinery',
  'Solar & Renewable Energy Equipment',
  'E-Commerce Fulfillment',
  'Agri-Logistics & Grains',
  'General Industrial',
];

const CITY_OPTIONS = [
  { value: 'Dahej', label: 'Dahej PCPIR Corridor' },
  { value: 'Sanand', label: 'Sanand Industrial Corridor' },
  { value: 'Changodar', label: 'Changodar - Bavla Corridor' },
  { value: 'Hazira', label: 'Hazira Port Logistics Zone' },
  { value: 'Ankleshwar', label: 'Ankleshwar GIDC Chemical Zone' },
  { value: 'Jhagadia', label: 'Jhagadia Mega Industrial Park' },
  { value: 'Halol', label: 'Halol - Kalol Manufacturing Belt' },
  { value: 'Vapi', label: 'Vapi - Sarigam Industrial Corridor' },
  { value: 'Surat', label: 'Surat Ring Road Logistics Zone' },
  { value: 'Ahmedabad', label: 'Ahmedabad Aslali - Kheda Corridor' },
];

export interface NewCompanyPageProps {
  onBack: () => void;
  onSuccess: (companyId: string) => void;
  companyToEdit?: Company | null;
  companyId?: string;
}

export const NewCompanyPage: React.FC<NewCompanyPageProps> = ({
  onBack,
  onSuccess,
  companyToEdit,
  companyId,
}) => {
  const { currentUser, users } = useAuth();
  const { success, error } = useToast();

  const isEditing = !!companyToEdit || !!companyId;

  const [formData, setFormData] = useState({
    name: companyToEdit?.name || '',
    legalName: companyToEdit?.legalName || '',
    website: companyToEdit?.website || '',
    industry: companyToEdit?.industry || '',
    address: companyToEdit?.address || '',
    city: companyToEdit?.city || '',
    state: companyToEdit?.state || '',
    pincode: companyToEdit?.pincode || '',
    phone: companyToEdit?.phone || '',
    email: companyToEdit?.email || '',
    assignedOwnerId: companyToEdit?.assignedOwnerId || currentUser.id,
    prospectStage: companyToEdit?.prospectStage || 'New',
    priority: (companyToEdit?.priority as PriorityLevel) || 'Medium',
    annualTurnover: companyToEdit?.annualTurnover || '',
    employeeCount: companyToEdit?.employeeCount || '',
    gujaratPresence: companyToEdit?.gujaratPresence ?? true,
    // Primary contact person
    contactName: '',
    contactDesignation: '',
    contactPhone: '',
    contactEmail: '',
    initialNotes: '',
  });

  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string>('');

  useEffect(() => {
    if (companyToEdit) {
      setFormData({
        name: companyToEdit.name || '',
        legalName: companyToEdit.legalName || '',
        website: companyToEdit.website || '',
        industry: companyToEdit.industry || '',
        address: companyToEdit.address || '',
        city: companyToEdit.city || '',
        state: companyToEdit.state || '',
        pincode: companyToEdit.pincode || '',
        phone: companyToEdit.phone || '',
        email: companyToEdit.email || '',
        assignedOwnerId: companyToEdit.assignedOwnerId || currentUser.id,
        prospectStage: companyToEdit.prospectStage || 'New',
        priority: (companyToEdit.priority as PriorityLevel) || 'Medium',
        annualTurnover: companyToEdit.annualTurnover || '',
        employeeCount: companyToEdit.employeeCount || '',
        gujaratPresence: companyToEdit.gujaratPresence ?? true,
        contactName: '',
        contactDesignation: '',
        contactPhone: '',
        contactEmail: '',
        initialNotes: '',
      });
    } else if (companyId) {
      CompanyService.getCompanyById(companyId).then((res) => {
        if (res.success && res.data) {
          const comp = res.data;
          setFormData({
            name: comp.name || '',
            legalName: comp.legalName || '',
            website: comp.website || '',
            industry: comp.industry || '',
            address: comp.address || '',
            city: comp.city || '',
            state: comp.state || '',
            pincode: comp.pincode || '',
            phone: comp.phone || '',
            email: comp.email || '',
            assignedOwnerId: comp.assignedOwnerId || currentUser.id,
            prospectStage: comp.prospectStage || 'New',
            priority: (comp.priority as PriorityLevel) || 'Medium',
            annualTurnover: comp.annualTurnover || '',
            employeeCount: comp.employeeCount || '',
            gujaratPresence: comp.gujaratPresence ?? true,
            contactName: '',
            contactDesignation: '',
            contactPhone: '',
            contactEmail: '',
            initialNotes: '',
          });
        }
      });
    }
  }, [companyToEdit, companyId, currentUser]);

  const duplicateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedNameRef = useRef<string>('');

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
    }));

    if (duplicateTimerRef.current) {
      clearTimeout(duplicateTimerRef.current);
      duplicateTimerRef.current = null;
    }

    const trimmed = name.trim();
    // Do not call API until at least 3 characters entered
    if (isEditing || trimmed.length < 3) {
      lastCheckedNameRef.current = '';
      setDuplicates([]);
      return;
    }

    // Don't re-trigger if trimmed text is identical to last checked
    if (trimmed.toLowerCase() === lastCheckedNameRef.current.toLowerCase()) {
      return;
    }

    // Debounce duplicate search by 750ms to allow smooth continuous typing
    duplicateTimerRef.current = setTimeout(async () => {
      try {
        lastCheckedNameRef.current = trimmed;
        const res = await CompanyService.checkDuplicates(trimmed);
        if (res.success && res.duplicates) {
          setDuplicates(res.duplicates);
        } else {
          setDuplicates([]);
        }
      } catch {
        setDuplicates([]);
      }
    }, 750);
  };

  useEffect(() => {
    return () => {
      if (duplicateTimerRef.current) {
        clearTimeout(duplicateTimerRef.current);
      }
    };
  }, []);

  // Validation Errors State (referenced from NewInquiryPage.tsx)
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Validation Regex Patterns
  const PHONE_REGEX = /^(?:\+?[1-9]\d{6,14}|(?:\+91[\s-]?)?[6-9]\d{9})$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
  const URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
  const TEXT_ONLY_REGEX = /^[a-zA-Z\s.'-]{2,50}$/;

  // Comprehensive Form Validation Rules
  const validateForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    // 1. Corporate Identity
    if (!formData.name || !formData.name.trim()) {
      errs.name = 'Company Brand Name is required';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Please enter a valid company name (at least 2 characters)';
    }

    if (!formData.industry || !formData.industry.trim()) {
      errs.industry = 'Industry sector is required';
    }

    if (!formData.city || !formData.city.trim()) {
      errs.city = 'Primary cluster / hub is required';
    }

    if (formData.website && formData.website.trim() && !URL_REGEX.test(formData.website.trim())) {
      errs.website = 'Please enter a valid website URL (e.g. https://company.com)';
    }

    if (formData.state && formData.state.trim() && !TEXT_ONLY_REGEX.test(formData.state.trim())) {
      errs.state = 'Please enter a valid state name (letters only, e.g. Gujarat)';
    }

    if (formData.pincode && formData.pincode.trim() && !PINCODE_REGEX.test(formData.pincode.trim())) {
      errs.pincode = 'Please enter a valid 6-digit postal pincode (e.g. 392130)';
    }

    // 2. Official Contact
    if (formData.phone && formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      if (!PHONE_REGEX.test(cleanPhone)) {
        errs.phone = 'Please enter a valid 10-digit phone number (e.g. 9825011223)';
      }
    }

    if (formData.email && formData.email.trim() && !EMAIL_REGEX.test(formData.email.trim())) {
      errs.email = 'Please enter a valid official email address (e.g. contact@company.com)';
    }

    // Primary Contact Person (if provided)
    if (formData.contactName && formData.contactName.trim()) {
      if (!TEXT_ONLY_REGEX.test(formData.contactName.trim())) {
        errs.contactName = 'Please enter a valid contact name (letters only)';
      }
    }

    if (formData.contactPhone && formData.contactPhone.trim()) {
      const cleanCntPhone = formData.contactPhone.replace(/[\s-]/g, '');
      if (!PHONE_REGEX.test(cleanCntPhone)) {
        errs.contactPhone = 'Please enter a valid 10-digit mobile number';
      }
    }

    if (formData.contactEmail && formData.contactEmail.trim() && !EMAIL_REGEX.test(formData.contactEmail.trim())) {
      errs.contactEmail = 'Please enter a valid direct email address';
    }

    // 3. Governance
    if (!formData.assignedOwnerId) {
      errs.assignedOwnerId = 'Assigned account owner is required';
    }

    return errs;
  };

  // Form Validity check for bottom bar indicator
  const isValid = useMemo(() => {
    if (!formData.name || !formData.name.trim() || formData.name.trim().length < 2) return false;
    if (!formData.industry || !formData.industry.trim()) return false;
    if (!formData.city || !formData.city.trim()) return false;
    if (!formData.assignedOwnerId) return false;
    if (formData.website && formData.website.trim() && !URL_REGEX.test(formData.website.trim())) return false;
    if (formData.state && formData.state.trim() && !TEXT_ONLY_REGEX.test(formData.state.trim())) return false;
    if (formData.pincode && formData.pincode.trim() && !PINCODE_REGEX.test(formData.pincode.trim())) return false;
    if (formData.phone && formData.phone.trim() && !PHONE_REGEX.test(formData.phone.replace(/[\s-]/g, ''))) return false;
    if (formData.email && formData.email.trim() && !EMAIL_REGEX.test(formData.email.trim())) return false;
    if (formData.contactName && formData.contactName.trim() && !TEXT_ONLY_REGEX.test(formData.contactName.trim())) return false;
    if (formData.contactPhone && formData.contactPhone.trim() && !PHONE_REGEX.test(formData.contactPhone.replace(/[\s-]/g, ''))) return false;
    if (formData.contactEmail && formData.contactEmail.trim() && !EMAIL_REGEX.test(formData.contactEmail.trim())) return false;
    return true;
  }, [formData]);

  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      error('Form Incomplete', 'Please fill all mandatory fields highlighted in red.');
      const firstErrorKey = Object.keys(formErrors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const owner = users.find((u) => u.id === formData.assignedOwnerId) || currentUser;
    setIsSubmitting(true);

    try {
      const targetCompId = companyToEdit?.id || companyId;
      if (isEditing && targetCompId) {
        // Edit mode
        const updatePayload = {
          name: formData.name.trim(),
          legalName: formData.legalName.trim() || formData.name.trim(),
          website: formData.website.trim(),
          industry: formData.industry,
          address: formData.address.trim(),
          city: formData.city,
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          assignedOwnerId: formData.assignedOwnerId,
          assignedOwnerName: owner.name,
          prospectStage: formData.prospectStage,
          priority: formData.priority,
          annualTurnover: formData.annualTurnover,
          employeeCount: formData.employeeCount,
          gujaratPresence: formData.gujaratPresence,
        };

        const res = await CompanyService.updateCompany(targetCompId, updatePayload);
        if (!res.success) {
          throw new Error(res.error || 'Failed to update company in backend database');
        }

        success('Company Updated', `Saved profile updates for ${formData.name} in backend database.`);
        onSuccess(targetCompId);
      } else {
        // Create mode - all data entered into backend
        const createPayload = {
          name: formData.name.trim(),
          legalName: formData.legalName.trim() || formData.name.trim(),
          website: formData.website.trim(),
          industry: formData.industry,
          status: 'Active',
          address: formData.address.trim(),
          city: formData.city,
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          assignedOwnerId: formData.assignedOwnerId,
          assignedOwnerName: owner.name,
          prospectStage: formData.prospectStage,
          priority: formData.priority,
          annualTurnover: formData.annualTurnover,
          employeeCount: formData.employeeCount,
          gujaratPresence: formData.gujaratPresence,
          contactName: formData.contactName.trim(),
          contactDesignation: formData.contactDesignation.trim(),
          contactPhone: formData.contactPhone.trim() || formData.phone.trim(),
          contactEmail: formData.contactEmail.trim() || formData.email.trim(),
          initialNotes: formData.initialNotes.trim(),
        };

        const res = await CompanyService.createCompany(createPayload);

        if (!res.success || !res.data) {
          throw new Error(res.error || 'Backend failed to register company.');
        }

        const targetId = res.data.id;

        success('Company Registered', `Successfully created ${formData.name} in PostgreSQL backend database.`);
        setCreatedCompanyId(targetId);
        setShowSuccessView(true);
      }
    } catch (err: any) {
      error(isEditing ? 'Update Failed' : 'Registration Failed', err.message || 'Failed to process company');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (showSuccessView) {
    return (
      <div className="w-full text-left space-y-6 animate-fade-in pb-16">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-6 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-fairway-50 text-fairway-600 dark:bg-fairway-950 dark:text-fairway-400 flex items-center justify-center mx-auto border border-fairway-200 dark:border-fairway-800 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Company Account Registered!
            </h1>
            <p className="text-xs text-foreground-muted leading-relaxed">
              <strong className="text-foreground">{formData.name}</strong> ({formData.legalName}) has been added to your CRM account repository and linked to assigned owner.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => onSuccess(createdCompanyId)}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold text-xs px-5 shadow-xs"
            >
              Go to Company Dossier
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="text-xs border-border"
            >
              Return to Companies Master
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-left space-y-6 pb-20">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-border">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
                {isEditing ? `Edit Company: ${companyToEdit?.name}` : 'Register New Industrial Company'}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20 whitespace-nowrap shrink-0">
                {isEditing ? 'Edit Profile' : 'New Account'}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {isEditing
                ? 'Update corporate entity credentials, personnel, and sales assignments'
                : 'Register a top-level corporate account to map industrial sites and active warehouse inquiries'}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4 shrink-0" />}
            className="rounded-xl font-semibold justify-center h-9 shadow-2xs text-xs whitespace-nowrap"
          >
            Back
          </Button>
        </div>
      </div>

      {/* Main Form Form Body */}
      <form onSubmit={handleFinalSubmit} noValidate className="w-full space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: CORPORATE IDENTITY & BASIC INFORMATION */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 sm:gap-4 pb-3 border-b border-border">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                1. Corporate Identity & Basic Details
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Primary business name, legal registration, industry sector, and hub location
              </p>
            </div>
            <span className="inline-flex items-center text-[11px] font-bold text-fairway-600 bg-fairway-50 dark:bg-fairway-950/60 dark:text-fairway-300 px-2.5 py-1 rounded-md border border-fairway-200 dark:border-fairway-800 whitespace-nowrap shrink-0 self-start xs:self-center">
              Identity Tier
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Brand Name */}
            <div className="space-y-1.5" id="field-name">
              <label className="text-xs font-semibold text-foreground block">
                Company Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  handleNameChange(e.target.value);
                  clearError('name');
                }}
                placeholder="e.g. Reliance Petrochemicals, DHL Supply Chain"
                className={cn(
                  "w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border outline-none transition-all font-medium placeholder:text-foreground-muted",
                  errors.name
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                    : "border-border focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600"
                )}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Legal Entity Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="e.g. Reliance Industries Limited"
                className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all placeholder:text-foreground-muted"
              />
            </div>
          </div>

          {/* Duplicate Match Warning */}
          {duplicates.length > 0 && !isEditing && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Duplicate Account Warning ({duplicates.length} match detected)</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Found existing registered account(s):{' '}
                <strong className="underline">
                  {duplicates.map((d: any) => `${d.name} (${d.city || 'Gujarat'})`).join(', ')}
                </strong>
                . Ensure you are not creating a duplicate corporate account.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Website URL */}
            <div className="space-y-1.5" id="field-website">
              <label className="text-xs font-semibold text-foreground block">Corporate Website</label>
              <div className="relative flex items-center">
                <Globe className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => {
                    setFormData({ ...formData, website: e.target.value });
                    clearError('website');
                  }}
                  placeholder="https://company.com"
                  className={cn(
                    "w-full bg-surface-muted/50 text-foreground text-xs rounded-xl pl-10 pr-3.5 py-2.5 border outline-none transition-all placeholder:text-foreground-muted shadow-2xs",
                    errors.website
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                      : "border-border focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600"
                  )}
                />
              </div>
              {errors.website && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.website}</span>
                </p>
              )}
            </div>

            {/* Industry Sector Dropdown */}
            <div className="space-y-1.5" id="field-industry">
              <label className="text-xs font-semibold text-foreground block">
                Industry Sector <span className="text-rose-500">*</span>
              </label>
              <Combobox
                options={INDUSTRY_OPTIONS.map((ind) => ({ value: ind, label: ind }))}
                value={formData.industry}
                onChange={(val) => {
                  setFormData({ ...formData, industry: val });
                  clearError('industry');
                }}
                triggerClassName={errors.industry ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                placeholder="Select industry sector..."
              />
              {errors.industry && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.industry}</span>
                </p>
              )}
            </div>

            {/* Target Hub / City */}
            <div className="space-y-1.5" id="field-city">
              <label className="text-xs font-semibold text-foreground block">
                Primary Cluster / Hub <span className="text-rose-500">*</span>
              </label>
              <Combobox
                options={CITY_OPTIONS}
                value={formData.city}
                onChange={(val) => {
                  setFormData({ ...formData, city: val });
                  clearError('city');
                }}
                triggerClassName={errors.city ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                placeholder="Select city / hub..."
              />
              {errors.city && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.city}</span>
                </p>
              )}
            </div>
          </div>

          {/* Registered Industrial Address */}
          <div className="space-y-1.5" id="field-address">
            <label className="text-xs font-semibold text-foreground block">
              Registered Industrial Address / Estate Location
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Plot No., GIDC Phase / Estate, Highway Landmark..."
              className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl p-3 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all placeholder:text-foreground-muted resize-none shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5" id="field-state">
              <label className="text-xs font-semibold text-foreground block">State / Region</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => {
                  setFormData({ ...formData, state: e.target.value });
                  clearError('state');
                }}
                placeholder="e.g. Gujarat"
                className={cn(
                  "w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border outline-none transition-all placeholder:text-foreground-muted shadow-2xs",
                  errors.state
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                    : "border-border focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600"
                )}
              />
              {errors.state && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.state}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5" id="field-pincode">
              <label className="text-xs font-semibold text-foreground block">PIN / Postal Code</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => {
                  setFormData({ ...formData, pincode: e.target.value });
                  clearError('pincode');
                }}
                placeholder="e.g. 392130"
                className={cn(
                  "w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border outline-none transition-all placeholder:text-foreground-muted shadow-2xs",
                  errors.pincode
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                    : "border-border focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600"
                )}
              />
              {errors.pincode && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.pincode}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: OFFICIAL CONTACT DETAILS & PRIMARY STAKEHOLDER */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 sm:gap-4 pb-3 border-b border-border">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                2. Key Stakeholders & Direct Contact
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Official contact channels and designated point of contact
              </p>
            </div>
            <span className="inline-flex items-center text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 whitespace-nowrap shrink-0 self-start xs:self-center">
              Personnel
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Official Phone */}
            <div className="space-y-1.5" id="field-phone">
              <label className="text-xs font-semibold text-foreground block">Official Corporate Phone / Landline</label>
              <PhoneInput
                defaultCountry="IN"
                value={formData.phone}
                onChange={(val) => {
                  setFormData({ ...formData, phone: val });
                  clearError('phone');
                }}
                placeholder="e.g. 2642 24XXXX"
                error={Boolean(errors.phone)}
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            {/* Corporate Email */}
            <div className="space-y-1.5" id="field-email">
              <label className="text-xs font-semibold text-foreground block">Corporate Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    clearError('email');
                  }}
                  placeholder="contact@company.com"
                  className={cn(
                    "w-full bg-surface-muted/50 text-foreground text-xs rounded-xl pl-10 pr-3.5 py-2.5 border outline-none transition-all placeholder:text-foreground-muted shadow-2xs",
                    errors.email
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                      : "border-border focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600"
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Optional Primary Contact Person */}
          {!isEditing && (
            <div className="pt-2 border-t border-border/80 space-y-4">
              <span className="text-xs font-bold text-foreground block">
                Primary Contact Person (Optional)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5" id="field-contactName">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Contact Full Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => {
                      setFormData({ ...formData, contactName: e.target.value });
                      clearError('contactName');
                    }}
                    placeholder="e.g. Rajesh Sharma"
                    className={cn(
                      "w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2 border outline-none placeholder:text-foreground-muted",
                      errors.contactName
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.contactName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.contactName}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Designation / Role</label>
                  <input
                    type="text"
                    value={formData.contactDesignation}
                    onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                    placeholder="e.g. VP - Supply Chain"
                    className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2 border border-border focus:border-fairway-600 focus:outline-none placeholder:text-foreground-muted"
                  />
                </div>

                <div className="space-y-1.5" id="field-contactPhone">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Mobile Number</label>
                  <PhoneInput
                    defaultCountry="IN"
                    value={formData.contactPhone}
                    onChange={(val) => {
                      setFormData({ ...formData, contactPhone: val });
                      clearError('contactPhone');
                    }}
                    placeholder="e.g. 98250 11223"
                    error={Boolean(errors.contactPhone)}
                  />
                  {errors.contactPhone && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.contactPhone}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5" id="field-contactEmail">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Direct Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => {
                      setFormData({ ...formData, contactEmail: e.target.value });
                      clearError('contactEmail');
                    }}
                    placeholder="rajesh.sharma@company.com"
                    className={cn(
                      "w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2 border outline-none placeholder:text-foreground-muted",
                      errors.contactEmail
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.contactEmail && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.contactEmail}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Initial Notes / Strategy Context */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-foreground-muted block">
                  Initial Deal / Account Requirements Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.initialNotes}
                  onChange={(e) => setFormData({ ...formData, initialNotes: e.target.value })}
                  placeholder="e.g. Seeking 60,000–80,000 sq.ft Grade-A facility in Dahej PCPIR node with heavy industrial flooring and fire systems."
                  className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl p-3 border border-border focus:border-fairway-600 focus:outline-none transition-all placeholder:text-foreground-muted resize-none shadow-2xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: ACCOUNT GOVERNANCE & SALES OWNERSHIP */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 sm:gap-4 pb-3 border-b border-border">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                3. Governance, Sales Ownership & Priority
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Assign account manager with image dropdown, stage progression, and priority level
              </p>
            </div>
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0 self-start xs:self-center">
              Governance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Account Owner with UserCombobox */}
            <div className="space-y-1.5" id="field-assignedOwnerId">
              <UserCombobox
                label="Assigned Account Owner"
                users={users}
                value={formData.assignedOwnerId}
                onChange={(val) => {
                  setFormData({ ...formData, assignedOwnerId: val });
                  clearError('assignedOwnerId');
                }}
                triggerClassName={errors.assignedOwnerId ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                placeholder="Select account owner..."
              />
              {errors.assignedOwnerId && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.assignedOwnerId}</span>
                </p>
              )}
            </div>

            {/* Prospect Stage */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Prospect Stage</label>
              <Combobox
                options={[
                  { value: 'New', label: 'New Lead' },
                  { value: 'Requirement Confirmed', label: 'Requirement Confirmed' },
                  { value: 'Site Visit Planned', label: 'Site Visit Planned' },
                  { value: 'Proposal Submitted', label: 'Proposal Submitted' },
                  { value: 'Active Client', label: 'Active Client' },
                ]}
                value={formData.prospectStage}
                onChange={(val) => setFormData({ ...formData, prospectStage: val })}
                placeholder="Select stage..."
              />
            </div>

            {/* Priority Tier */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Priority Tier</label>
              <div className="grid grid-cols-3 gap-2 h-11">
                {(['High', 'Medium', 'Low'] as PriorityLevel[]).map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: prio })}
                    className={`h-full rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      formData.priority === prio
                        ? prio === 'High'
                          ? 'bg-rose-50 border-rose-400 text-rose-700 dark:bg-rose-950/70 dark:border-rose-700 dark:text-rose-300 shadow-xs'
                          : prio === 'Medium'
                          ? 'bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-300 shadow-xs'
                          : 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'bg-surface-muted/50 border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted'
                    }`}
                  >
                    <span>{prio === 'High' ? '🔴' : prio === 'Medium' ? '🟡' : '🟢'}</span>
                    <span>{prio}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
            {/* Turnover */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Estimated Annual Turnover</label>
              <input
                type="text"
                value={formData.annualTurnover}
                onChange={(e) => setFormData({ ...formData, annualTurnover: e.target.value })}
                placeholder="e.g. ₹500+ Cr"
                className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none"
              />
            </div>

            {/* Employee Count */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Employee Strength</label>
              <input
                type="text"
                value={formData.employeeCount}
                onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                placeholder="e.g. 1,000+ employees"
                className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: SUBMIT & ACTION CONTROLS (STICKY FOOTER) */}
        {/* ========================================================================= */}
        <div className="sticky bottom-2 sm:bottom-4 z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 bg-surface/95 dark:bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-lg sm:shadow-xl transition-all">
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs min-w-0">
            {Object.keys(errors).length > 0 ? (
              <span className="flex items-center gap-1.5 text-rose-500 font-semibold truncate">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="truncate">{Object.keys(errors).length} required {Object.keys(errors).length === 1 ? 'field needs' : 'fields need'} your attention</span>
              </span>
            ) : isValid ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">All mandatory fields verified</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-foreground-muted text-[11px] sm:text-xs min-w-0">
                <ShieldCheck className="w-4 h-4 text-fairway-600 shrink-0" />
                <span className="leading-snug truncate sm:whitespace-normal">Record will be saved with sequential identifier and synced to CRM audit trail</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap justify-center"
            >
              {isSubmitting
                ? (isEditing ? 'Saving...' : 'Registering...')
                : (isEditing ? 'Save Changes' : 'Register Company Account')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewCompanyPage;
