import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
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
import { StorageService } from '@/modules/core/services/storageService';
import { CompanyService } from '@/modules/core/services/companyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Company, PriorityLevel } from '@/modules/core/types';

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
}

export const NewCompanyPage: React.FC<NewCompanyPageProps> = ({
  onBack,
  onSuccess,
  companyToEdit,
}) => {
  const { currentUser, users } = useAuth();
  const { success, error } = useToast();

  const isEditing = !!companyToEdit;

  const [formData, setFormData] = useState({
    name: companyToEdit?.name || '',
    legalName: companyToEdit?.legalName || '',
    website: companyToEdit?.website || '',
    industry: companyToEdit?.industry || 'Specialty Chemicals & Polymers',
    address: companyToEdit?.address || '',
    city: companyToEdit?.city || 'Dahej',
    state: companyToEdit?.state || 'Gujarat',
    pincode: companyToEdit?.pincode || '392130',
    phone: companyToEdit?.phone || '',
    email: companyToEdit?.email || '',
    assignedOwnerId: companyToEdit?.assignedOwnerId || currentUser.id,
    prospectStage: companyToEdit?.prospectStage || 'New',
    priority: (companyToEdit?.priority as PriorityLevel) || 'High',
    annualTurnover: companyToEdit?.annualTurnover || '₹500+ Cr',
    employeeCount: companyToEdit?.employeeCount || '1,000+',
    gujaratPresence: companyToEdit?.gujaratPresence ?? true,
    // Primary contact person
    contactName: '',
    contactDesignation: 'VP - Supply Chain & Operations',
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
        industry: companyToEdit.industry || 'Specialty Chemicals & Polymers',
        address: companyToEdit.address || '',
        city: companyToEdit.city || 'Dahej',
        state: companyToEdit.state || 'Gujarat',
        pincode: companyToEdit.pincode || '392130',
        phone: companyToEdit.phone || '',
        email: companyToEdit.email || '',
        assignedOwnerId: companyToEdit.assignedOwnerId || currentUser.id,
        prospectStage: companyToEdit.prospectStage || 'New',
        priority: (companyToEdit.priority as PriorityLevel) || 'High',
        annualTurnover: companyToEdit.annualTurnover || '₹500+ Cr',
        employeeCount: companyToEdit.employeeCount || '1,000+',
        gujaratPresence: companyToEdit.gujaratPresence ?? true,
        contactName: '',
        contactDesignation: 'VP - Supply Chain & Operations',
        contactPhone: '',
        contactEmail: '',
        initialNotes: '',
      });
    }
  }, [companyToEdit, currentUser]);

  const handleNameChange = async (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      legalName: prev.legalName || (name ? `${name} Private Limited` : ''),
    }));

    if (!isEditing && name.trim().length > 2) {
      try {
        const res = await CompanyService.checkDuplicates(name);
        if (res.success && res.duplicates && res.duplicates.length > 0) {
          setDuplicates(res.duplicates);
        } else {
          const localDupes = StorageService.checkCompanyDuplicates(name);
          setDuplicates(localDupes);
        }
      } catch {
        const localDupes = StorageService.checkCompanyDuplicates(name);
        setDuplicates(localDupes);
      }
    } else {
      setDuplicates([]);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error('Validation Error', 'Company Brand Name is required.');
      return;
    }

    const owner = users.find((u) => u.id === formData.assignedOwnerId) || currentUser;
    setIsSubmitting(true);

    try {
      if (isEditing && companyToEdit) {
        // Edit mode
        await CompanyService.updateCompany(companyToEdit.id, {
          ...formData,
          assignedOwnerName: owner.name,
        });

        StorageService.updateCompany(companyToEdit.id, {
          ...formData,
          assignedOwnerName: owner.name,
        });

        success('Company Updated', `Saved profile updates for ${formData.name}.`);
        onSuccess(companyToEdit.id);
      } else {
        // Create mode
        const res = await CompanyService.createCompany({
          ...formData,
          status: 'Active',
          assignedOwnerName: owner.name,
        });

        let targetId = '';
        if (res.success && res.data) {
          targetId = res.data.id;
          try {
            StorageService.createCompany({
              ...formData,
              status: 'Active',
              assignedOwnerName: owner.name,
            });
          } catch {}
        } else {
          const localCompany = StorageService.createCompany({
            ...formData,
            status: 'Active',
            assignedOwnerName: owner.name,
          });
          targetId = localCompany.id;
        }

        // If contact details provided, create contact
        if (formData.contactName.trim() && targetId) {
          try {
            StorageService.createContact({
              companyId: targetId,
              companyName: formData.name,
              name: formData.contactName.trim(),
              designation: formData.contactDesignation,
              department: 'Supply Chain & Operations',
              phone: formData.contactPhone || formData.phone,
              email: formData.contactEmail || formData.email,
              isPrimary: true,
            });
          } catch {}
        }

        success('Company Registered', `Successfully created ${formData.name} in CRM.`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {isEditing ? `Edit Company: ${companyToEdit?.name}` : 'Register New Industrial Company'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20">
                {isEditing ? 'Edit Profile' : 'New Account'}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              {isEditing
                ? 'Update corporate entity credentials, personnel, and sales assignments'
                : 'Register a top-level corporate account to map industrial sites and active warehouse inquiries'}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="rounded-xl font-semibold"
          >
            Back
          </Button>
        </div>
      </div>

      {/* Main Form Form Body */}
      <form onSubmit={handleFinalSubmit} className="w-full space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: CORPORATE IDENTITY & BASIC INFORMATION */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                1. Corporate Identity & Basic Details
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Primary business name, legal registration, industry sector, and hub location
              </p>
            </div>
            <span className="text-[11px] font-bold text-fairway-600 bg-fairway-50 dark:bg-fairway-950/60 dark:text-fairway-300 px-2.5 py-1 rounded-md border border-fairway-200 dark:border-fairway-800">
              Identity Tier
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Brand Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Company Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Reliance Petrochemicals, DHL Supply Chain"
                required
                className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all font-medium placeholder:text-foreground-muted"
              />
            </div>

            {/* Legal Entity Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Legal Entity Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="e.g. Reliance Industries Limited"
                required
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Corporate Website</label>
              <div className="relative flex items-center">
                <Globe className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://company.com"
                  className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all placeholder:text-foreground-muted shadow-2xs"
                />
              </div>
            </div>

            {/* Industry Sector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Industry Sector</label>
              <Combobox
                options={INDUSTRY_OPTIONS.map((ind) => ({ value: ind, label: ind }))}
                value={formData.industry}
                onChange={(val) => setFormData({ ...formData, industry: val })}
                placeholder="Select industry sector..."
              />
            </div>

            {/* Target Hub / City */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Primary Cluster / Hub</label>
              <Combobox
                options={CITY_OPTIONS}
                value={formData.city}
                onChange={(val) => setFormData({ ...formData, city: val })}
                placeholder="Select city / hub..."
              />
            </div>
          </div>

          {/* Registered Industrial Address */}
          <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">State / Region</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Gujarat"
                className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all placeholder:text-foreground-muted shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">PIN / Postal Code</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="392130"
                className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all placeholder:text-foreground-muted shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: OFFICIAL CONTACT DETAILS & PRIMARY STAKEHOLDER */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                2. Key Stakeholders & Direct Contact
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Official contact channels and designated point of contact
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
              Personnel
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Official Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Official Corporate Phone / Landline</label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 2642 24XXXX"
                  className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all font-mono placeholder:text-foreground-muted shadow-2xs"
                />
              </div>
            </div>

            {/* Corporate Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Corporate Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none focus:ring-1 focus:ring-fairway-600 transition-all placeholder:text-foreground-muted shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Optional Primary Contact Person */}
          {!isEditing && (
            <div className="pt-2 border-t border-border/80 space-y-4">
              <span className="text-xs font-bold text-foreground block">
                Primary Contact Person (Optional)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Contact Full Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="e.g. Anand Mahindra"
                    className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2 border border-border focus:border-fairway-600 focus:outline-none placeholder:text-foreground-muted"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Designation / Role</label>
                  <input
                    type="text"
                    value={formData.contactDesignation}
                    onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                    placeholder="VP - Supply Chain"
                    className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2 border border-border focus:border-fairway-600 focus:outline-none placeholder:text-foreground-muted"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91 98250 XXXXX"
                    className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2 border border-border focus:border-fairway-600 focus:outline-none font-mono placeholder:text-foreground-muted"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground-muted block">Direct Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="officer@company.com"
                    className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2 border border-border focus:border-fairway-600 focus:outline-none placeholder:text-foreground-muted"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: ACCOUNT GOVERNANCE & SALES OWNERSHIP */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                3. Governance, Sales Ownership & Priority
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Assign account manager with image dropdown, stage progression, and priority level
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              Governance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Account Owner with UserCombobox */}
            <UserCombobox
              label="Assigned Account Owner"
              users={users}
              value={formData.assignedOwnerId}
              onChange={(val) => setFormData({ ...formData, assignedOwnerId: val })}
              placeholder="Select account owner..."
            />

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
                placeholder="₹500+ Cr"
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
                placeholder="1,000+ employees"
                className="w-full bg-surface-muted/50 text-foreground text-xs rounded-xl px-3.5 py-2.5 border border-border focus:border-fairway-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: SUBMIT & ACTION CONTROLS */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-surface border border-border rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <ShieldCheck className="w-4 h-4 text-fairway-600 shrink-0" />
            <span>Record will be saved with sequential identifier and synced to CRM audit trail</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              {isSubmitting
                ? (isEditing ? 'Saving Changes...' : 'Registering Company...')
                : (isEditing ? 'Save Changes' : 'Register Company Account')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewCompanyPage;
