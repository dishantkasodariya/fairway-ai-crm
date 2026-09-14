import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  Warehouse,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Layers,
  FileText,
  Plus,
  Compass,
  Check,
  ShieldCheck,
  Zap,
  DollarSign,
  Calendar,
  ExternalLink,
  Users,
  Search,
  ChevronDown,
  RotateCcw,
  CheckCircle,
  Briefcase,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { UserCombobox } from '@/modules/core/components/ui/UserCombobox';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { PropertyService } from '@/modules/core/services/propertyService';
import { matchPropertiesForInquiry } from '@/modules/core/utils/propertyMatcher';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { CompanyService } from '@/modules/core/services/companyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import {
  Company,
  Contact,
  Facility,
  Inquiry,
  PropertyMatchResult,
} from '@/modules/core/types';
import {
  formatINR,
  formatSqFt,
} from '@/modules/core/utils/formatters';

const CORRIDOR_OPTIONS = [
  'Dahej PCPIR Corridor',
  'Sanand Industrial Corridor',
  'Changodar - Bavla Corridor',
  'Aslali - Kheda Industrial Corridor',
  'Ankleshwar - Panoli Chemical Corridor',
  'Halol - Kalol Industrial Belt',
  'Hazira Port Logistics Zone',
  'Jhagadia GIDC Logistics Park',
  'Mundra Port SEZ Corridor',
  'Vapi - Sarigam Industrial Corridor',
];

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
];

export interface NewInquiryPageProps {
  onBack: () => void;
  onSuccess: (inquiryId: string) => void;
  defaultCompanyId?: string;
}

export const NewInquiryPage: React.FC<NewInquiryPageProps> = ({
  onBack,
  onSuccess,
  defaultCompanyId,
}) => {
  const { currentUser, users } = useAuth();
  const { success, error } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<Company[]>([]);

  useEffect(() => {
    CompanyService.getCompanies({ pageSize: 1000 }).then((res) => {
      if (res && res.data) {
        setExistingCompanies(res.data);
      }
    });
  }, []);

  // Core Inquiry Data
  const [inquiryData, setInquiryData] = useState({
    requirement: '',
    requiredAreaSqFt: 0,
    location: '',
    targetCorridor: '',
    industry: '',
    possessionDate: '',
    leaseDurationMonths: 36,
    budgetMonthlyINR: 0,
    dockRequirements: 0,
    clearHeightFt: 0,
    floorLoadCapacity: '',
    powerKVA: 0,
    fireSystemsRequired: false,
    specialRequirements: '',
    source: 'Direct' as Inquiry['source'],
    priority: 'Medium' as Inquiry['priority'],
    nextAction: '',
    nextFollowUpDate: '',
  });

  // Company Selection / Creation
  const [selectedCompanyMode, setSelectedCompanyMode] = useState<'existing' | 'new'>(
    defaultCompanyId ? 'existing' : 'existing'
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    defaultCompanyId || ''
  );
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    legalName: '',
    website: '',
    industry: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    priority: 'Medium' as Company['priority'],
  });

  const [duplicateWarnings, setDuplicateWarnings] = useState<any[]>([]);

  // Contact Person
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('new');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactData, setContactData] = useState({
    name: '',
    designation: '',
    department: '',
    phone: '',
    email: '',
    linkedinUrl: '',
    isPrimary: true,
  });

  // Facility Setup
  const [createFacility, setCreateFacility] = useState(false);
  const [facilityData, setFacilityData] = useState({
    name: '',
    type: 'Warehouse' as Facility['type'],
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: 0,
    longitude: 0,
    builtUpAreaSqFt: 0,
  });

  // Deal Ownership
  const [assignedSalespersonId, setAssignedSalespersonId] = useState(
    currentUser?.id || 'usr_1'
  );

  // Result state after submission
  const [createdInquiry, setCreatedInquiry] = useState<Inquiry | null>(null);
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatchResult[]>([]);

  // Derived Values
  const selectedCompany = useMemo(() => {
    return existingCompanies.find((c) => c.id === selectedCompanyId);
  }, [existingCompanies, selectedCompanyId]);

  const [existingCompanyContacts, setExistingCompanyContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setExistingCompanyContacts([]);
      return;
    }
    CompanyService.getCompanyById(selectedCompanyId).then((res) => {
      if (res.success && res.data && res.data.contacts) {
        setExistingCompanyContacts(res.data.contacts);
      } else {
        setExistingCompanyContacts([]);
      }
    });
  }, [selectedCompanyId]);

  // Sync default contact when existing company changes
  useEffect(() => {
    if (existingCompanyContacts.length > 0) {
      setContactMode('existing');
      setSelectedContactId(existingCompanyContacts[0].id);
    } else {
      setContactMode('new');
      setSelectedContactId('');
    }
  }, [existingCompanyContacts]);

  // Duplicate Check on New Company Name (debounced 750ms, minimum 3 chars)
  const duplicateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedNameRef = useRef<string>('');

  const handleNewCompanyNameChange = (val: string) => {
    setNewCompanyData((prev) => ({ ...prev, name: val }));

    if (duplicateTimerRef.current) {
      clearTimeout(duplicateTimerRef.current);
      duplicateTimerRef.current = null;
    }

    const trimmed = val.trim();
    if (trimmed.length < 3) {
      lastCheckedNameRef.current = '';
      setDuplicateWarnings([]);
      return;
    }

    if (trimmed.toLowerCase() === lastCheckedNameRef.current.toLowerCase()) {
      return;
    }

    duplicateTimerRef.current = setTimeout(async () => {
      try {
        lastCheckedNameRef.current = trimmed;
        const res = await CompanyService.checkDuplicates(trimmed);
        if (res.success && res.duplicates) {
          setDuplicateWarnings(res.duplicates);
        } else {
          setDuplicateWarnings([]);
        }
      } catch {
        setDuplicateWarnings([]);
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

  // Validation Errors State
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
  const PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
  const URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
  const TEXT_ONLY_REGEX = /^[a-zA-Z\s.'-]{2,50}$/;

  // Comprehensive Form Validation Rules
  const validateForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    // 1. Company Selection
    if (selectedCompanyMode === 'existing') {
      if (!selectedCompanyId) {
        errs.selectedCompanyId = 'Please select an existing customer company';
      }
    } else {
      if (!newCompanyData.name || !newCompanyData.name.trim()) {
        errs.companyName = 'Company trade name is required';
      } else if (newCompanyData.name.trim().length < 2) {
        errs.companyName = 'Please enter a valid company name';
      }

      if (!newCompanyData.industry || !newCompanyData.industry.trim()) {
        errs.companyIndustry = 'Industry segment is required';
      }

      if (!newCompanyData.city || !newCompanyData.city.trim()) {
        errs.companyCity = 'City is required';
      } else if (!TEXT_ONLY_REGEX.test(newCompanyData.city.trim())) {
        errs.companyCity = 'Please enter a valid city name (letters only, e.g. Ahmedabad)';
      }

      if (newCompanyData.state && newCompanyData.state.trim() && !TEXT_ONLY_REGEX.test(newCompanyData.state.trim())) {
        errs.companyState = 'Please enter a valid state name (letters only, e.g. Gujarat)';
      }

      if (newCompanyData.pincode && newCompanyData.pincode.trim() && !PINCODE_REGEX.test(newCompanyData.pincode.trim())) {
        errs.companyPincode = 'Please enter a valid 6-digit postal pincode (e.g. 392130)';
      }

      if (newCompanyData.phone && newCompanyData.phone.trim()) {
        const cleanPhone = newCompanyData.phone.replace(/[\s-]/g, '');
        if (!PHONE_REGEX.test(cleanPhone)) {
          errs.companyPhone = 'Please enter a valid 10-digit mobile phone number (e.g. 9825011223)';
        }
      }

      if (newCompanyData.email && newCompanyData.email.trim() && !EMAIL_REGEX.test(newCompanyData.email.trim())) {
        errs.companyEmail = 'Please enter a valid official email address (e.g. info@company.com)';
      }

      if (newCompanyData.website && newCompanyData.website.trim() && !URL_REGEX.test(newCompanyData.website.trim())) {
        errs.companyWebsite = 'Please enter a valid website URL (e.g. https://company.com)';
      }
    }

    // 2. Warehouse Requirements
    if (!inquiryData.requirement || !inquiryData.requirement.trim()) {
      errs.requirement = 'Requirement posting title / summary is required';
    } else if (inquiryData.requirement.trim().length < 3) {
      errs.requirement = 'Requirement summary must be at least 3 characters';
    }

    if (!inquiryData.requiredAreaSqFt || inquiryData.requiredAreaSqFt <= 0) {
      errs.requiredAreaSqFt = 'Please enter a valid required area (greater than 0 sq.ft)';
    }

    if (!inquiryData.targetCorridor || !inquiryData.targetCorridor.trim()) {
      errs.targetCorridor = 'Target logistics corridor is required';
    }

    if (!inquiryData.location || !inquiryData.location.trim()) {
      errs.location = 'Specific hub / location is required';
    }

    // 3. Contact Person
    if (contactMode === 'existing' && existingCompanyContacts.length > 0) {
      if (!selectedContactId) {
        errs.selectedContactId = 'Please select a registered contact person';
      }
    } else {
      if (!contactData.name || !contactData.name.trim()) {
        errs.contactName = 'Full name of decision maker is required';
      } else if (!TEXT_ONLY_REGEX.test(contactData.name.trim())) {
        errs.contactName = 'Please enter a valid contact name (letters only)';
      }

      if (!contactData.phone || !contactData.phone.trim()) {
        errs.contactPhone = 'Direct mobile phone is required';
      } else {
        const cleanPhone = contactData.phone.replace(/[\s-]/g, '');
        if (!PHONE_REGEX.test(cleanPhone)) {
          errs.contactPhone = 'Please enter a valid 10-digit mobile phone number (e.g. 9825055667)';
        }
      }

      if (contactData.email && contactData.email.trim() && !EMAIL_REGEX.test(contactData.email.trim())) {
        errs.contactEmail = 'Please enter a valid work email address (e.g. name@company.com)';
      }
    }

    // 4. Commercial Terms
    if (!inquiryData.budgetMonthlyINR || inquiryData.budgetMonthlyINR <= 0) {
      errs.budgetMonthlyINR = 'Please enter a valid monthly rental budget';
    }
    if (!inquiryData.possessionDate || !inquiryData.possessionDate.trim()) {
      errs.possessionDate = 'Target possession date is required';
    }
    if (!inquiryData.priority) {
      errs.priority = 'Inquiry priority is required';
    }
    if (!inquiryData.source) {
      errs.source = 'Lead source is required';
    }
    if (!assignedSalespersonId) {
      errs.assignedSalespersonId = 'Assigned sales owner is required';
    }

    return errs;
  };

  // Form Validation
  const isValid = useMemo(() => {
    if (selectedCompanyMode === 'existing' && !selectedCompanyId) return false;
    if (selectedCompanyMode === 'new') {
      if (!newCompanyData.name || !newCompanyData.city || !newCompanyData.industry) return false;
      if (!TEXT_ONLY_REGEX.test(newCompanyData.city.trim())) return false;
      if (newCompanyData.state && !TEXT_ONLY_REGEX.test(newCompanyData.state.trim())) return false;
      if (newCompanyData.pincode && !PINCODE_REGEX.test(newCompanyData.pincode.trim())) return false;
      if (newCompanyData.phone && !PHONE_REGEX.test(newCompanyData.phone.replace(/[\s-]/g, ''))) return false;
      if (newCompanyData.email && !EMAIL_REGEX.test(newCompanyData.email.trim())) return false;
      if (newCompanyData.website && !URL_REGEX.test(newCompanyData.website.trim())) return false;
    }
    if (!inquiryData.requirement) return false;
    if (!inquiryData.requiredAreaSqFt || inquiryData.requiredAreaSqFt <= 0) return false;
    if (!inquiryData.targetCorridor) return false;
    if (!inquiryData.location) return false;
    if (!inquiryData.possessionDate) return false;
    if (!inquiryData.budgetMonthlyINR || inquiryData.budgetMonthlyINR <= 0) return false;
    if (!inquiryData.priority) return false;
    if (!inquiryData.source) return false;
    if (!assignedSalespersonId) return false;
    if (contactMode === 'new') {
      if (!contactData.name || !contactData.phone) return false;
      if (!TEXT_ONLY_REGEX.test(contactData.name.trim())) return false;
      if (!PHONE_REGEX.test(contactData.phone.replace(/[\s-]/g, ''))) return false;
      if (contactData.email && !EMAIL_REGEX.test(contactData.email.trim())) return false;
    }
    if (contactMode === 'existing' && existingCompanyContacts.length > 0 && !selectedContactId) return false;
    return true;
  }, [
    selectedCompanyMode,
    selectedCompanyId,
    newCompanyData,
    inquiryData,
    contactMode,
    contactData,
    selectedContactId,
    existingCompanyContacts.length,
    assignedSalespersonId,
  ]);

  // Rent per sq.ft computation
  const rentPerSqFt = useMemo(() => {
    if (!inquiryData.requiredAreaSqFt || !inquiryData.budgetMonthlyINR) return 0;
    return (inquiryData.budgetMonthlyINR / inquiryData.requiredAreaSqFt).toFixed(2);
  }, [inquiryData.budgetMonthlyINR, inquiryData.requiredAreaSqFt]);

  // Combobox options
  const companyComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return existingCompanies.map((c) => ({
      value: c.id,
      label: c.name,
      description: `${c.industry} • ${c.city}, ${c.state}`,
    }));
  }, [existingCompanies]);

  const industryComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return INDUSTRY_OPTIONS.map((ind) => ({
      value: ind,
      label: ind,
    }));
  }, []);

  const corridorComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return CORRIDOR_OPTIONS.map((cor) => ({
      value: cor,
      label: cor,
    }));
  }, []);

  const clearHeightOptions: ComboboxOption[] = [
    { value: '9', label: '9 Meters (Standard Box - 30 Ft)' },
    { value: '10.5', label: '10.5 Meters (High Clearance - 35 Ft)' },
    { value: '12', label: '12 Meters (High Bay Rack - 40 Ft)' },
    { value: '14', label: '14 Meters (Automated Multi-tier - 45 Ft)' },
  ];

  const floorLoadOptions: ComboboxOption[] = [
    { value: '5 MT/sq.m', label: '5 MT/sq.m (Standard Warehouse)' },
    { value: '6 MT/sq.m', label: '6 MT/sq.m (Heavy Chemical & FMCG)' },
    { value: '8 MT/sq.m', label: '8 MT/sq.m (Heavy Stacking / Cold Storage)' },
    { value: '10 MT/sq.m', label: '10 MT/sq.m (Ultra Heavy Engineering)' },
  ];

  const priorityOptions: ComboboxOption[] = [
    { value: 'High', label: 'High Priority' },
    { value: 'Medium', label: 'Medium Priority' },
    { value: 'Low', label: 'Low Priority' },
  ];

  const sourceOptions: ComboboxOption[] = [
    { value: 'Direct', label: 'Direct Client' },
    { value: 'Broker', label: 'Channel Partner / Broker' },
    { value: 'Website', label: 'Website Inbound' },
    { value: 'LinkedIn', label: 'LinkedIn Campaign' },
    { value: 'Expo', label: 'Gujarat Industrial Expo' },
    { value: 'Referral', label: 'Client Referral' },
  ];

  const leaseTenureOptions: ComboboxOption[] = [
    { value: '36', label: '3 Years (36 Months)' },
    { value: '60', label: '5 Years (60 Months - Standard)' },
    { value: '108', label: '9 Years (108 Months - Long Term)' },
    { value: '120', label: '10 Years (120 Months)' },
  ];

  const contactComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return existingCompanyContacts.map((cnt) => ({
      value: cnt.id,
      label: cnt.name,
      description: `${cnt.designation || 'Contact'} • ${cnt.phone}`,
    }));
  }, [existingCompanyContacts]);

  // Handle Form Submission
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

    const salesperson = users.find((u) => u.id === assignedSalespersonId) || currentUser;
    setIsSubmitting(true);

    try {
      const payload = {
        inquiryData,
        companyMode: selectedCompanyMode,
        selectedCompanyId,
        newCompanyData,
        contactMode,
        selectedContactId,
        contactData,
        createFacility,
        facilityData,
        assignedSalespersonId: salesperson?.id || 'usr_1',
        assignedSalespersonName: salesperson?.name || 'Assigned Lead',
      };

      const res = await InquiryService.createInquiryStepper(payload);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to register inquiry on backend server');
      }

      const finalInq = res.data;
      setCreatedInquiry(finalInq);

      // Fetch dynamic property matches
      try {
        const propRes = await PropertyService.getProperties();
        const allProps = propRes.success && propRes.data ? propRes.data : [];
        const matches = matchPropertiesForInquiry(finalInq, allProps);
        setPropertyMatches(matches);
      } catch {
        setPropertyMatches([]);
      }

      success('Inquiry Created Successfully', `${finalInq.inquiryNumber} registered in CRM pipeline.`);
      onBack();
    } catch (err: any) {
      error('Creation Failed', err?.message || 'Unable to register new inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS / MATCH RESULTS VIEW
  if (showSuccessView && createdInquiry) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 animate-in fade-in duration-300">
          {/* Top Back Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Inquiries</span>
            </button>
            <Badge variant="outline" className="font-mono text-xs">
              {createdInquiry.inquiryNumber}
            </Badge>
          </div>

          {/* Success Banner */}
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Warehouse Inquiry Registered!
              </h1>
              <p className="text-sm text-foreground-muted max-w-lg mx-auto mt-1.5">
                <strong className="text-foreground">{createdInquiry.companyName}</strong> has been successfully added to the CRM pipeline.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Button
                variant="primary"
                onClick={() => onSuccess(createdInquiry.id)}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold text-xs px-5 shadow-xs"
              >
                Go to Inquiry Record
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="text-xs border-border"
              >
                Return to Inquiries List
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-left space-y-6 pb-20">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-border">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Create Warehouse Inquiry
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20 whitespace-nowrap shrink-0">
                New Requirement
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Create a new warehouse requirement & register client in pipeline
            </p>
          </div>
        </div>

        {/* Right Action Buttons - Full Width on Mobile */}
        <div className="flex items-center w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4 shrink-0" />}
            className="w-full sm:w-auto rounded-xl font-semibold justify-center h-9 shadow-2xs"
          >
            Back
          </Button>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleFinalSubmit} className="w-full space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: BASIC INFORMATION (Company & Customer Entity) */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Basic Information
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Specify client corporate entity and business category
              </p>
            </div>

            {/* Entity Selection Mode Pills */}
            <div className="flex items-center gap-1 p-1 bg-surface-muted rounded-xl border border-border w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyMode('existing');
                  clearError('companyName');
                  clearError('companyIndustry');
                  clearError('companyCity');
                }}
                className={`flex-1 sm:flex-initial px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap flex items-center justify-center ${
                  selectedCompanyMode === 'existing'
                    ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <span>
                  <span className="hidden sm:inline">Select </span>Existing Company
                  <span className="ml-1 text-[10px] sm:text-xs font-mono font-medium opacity-80">({existingCompanies.length})</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyMode('new');
                  clearError('selectedCompanyId');
                }}
                className={`flex-1 sm:flex-initial px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                  selectedCompanyMode === 'new'
                    ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <span className="hidden sm:inline">Register </span>New Entity
                </span>
              </button>
            </div>
          </div>

          {/* Existing Company Mode View */}
          {selectedCompanyMode === 'existing' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div id="field-selectedCompanyId" className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Choose Customer Company <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Combobox
                    options={companyComboboxOptions}
                    value={selectedCompanyId}
                    onChange={(val) => {
                      setSelectedCompanyId(val);
                      clearError('selectedCompanyId');
                    }}
                    placeholder="Search and select existing customer company..."
                    searchPlaceholder="Search company by name, industry, location..."
                    className="h-10 text-xs"
                    triggerClassName={errors.selectedCompanyId ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                  />
                  {errors.selectedCompanyId && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.selectedCompanyId}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Customer Priority
                  </label>
                  <div className="h-10 px-3.5 rounded-xl bg-surface-muted/50 border border-border flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>{selectedCompany?.priority || 'High'} Priority</span>
                    <Badge
                      variant={selectedCompany?.priority === 'High' ? 'danger' : selectedCompany?.priority === 'Medium' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {selectedCompany?.priority || 'High'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Selected Company Preview Bar */}
              {selectedCompany && (
                <div className="p-3.5 bg-surface-muted/40 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span>{selectedCompany.name}</span>
                      <span className="text-[10px] px-2 py-0.2 font-normal rounded-full bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20">
                        {selectedCompany.industry}
                      </span>
                    </div>
                    <div className="text-foreground-muted">
                      {selectedCompany.address}, {selectedCompany.city}, {selectedCompany.state} — {selectedCompany.pincode}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-foreground-muted shrink-0">
                    <span>{selectedCompany.phone}</span>
                    <span>{selectedCompany.email}</span>
                    <span className="font-semibold text-foreground">{selectedCompany.inquiriesCount || 1} Active Inquiries</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Register New Entity Fields */
            <div className="space-y-4">
              {duplicateWarnings.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl flex items-center gap-2.5 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <div>
                    <strong>Potential duplicate match:</strong> We found {duplicateWarnings.length} company records matching "{newCompanyData.name}".
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="field-companyName" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Company Trade Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Logistics India"
                    value={newCompanyData.name}
                    onChange={(e) => {
                      handleNewCompanyNameChange(e.target.value);
                      clearError('companyName');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.companyName
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.companyName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyName}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Registered Legal Entity Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Logistics Solutions Private Limited"
                    value={newCompanyData.legalName}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, legalName: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div id="field-companyIndustry" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Industry Segment <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Combobox
                    options={industryComboboxOptions}
                    value={newCompanyData.industry}
                    onChange={(val) => {
                      setNewCompanyData({ ...newCompanyData, industry: val });
                      clearError('companyIndustry');
                    }}
                    placeholder="Select industry..."
                    triggerClassName={errors.companyIndustry ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                  />
                  {errors.companyIndustry && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyIndustry}</span>
                    </p>
                  )}
                </div>

                <div id="field-companyWebsite" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Company Website
                  </label>
                  <input
                    type="text"
                    placeholder="https://company.example.com"
                    value={newCompanyData.website}
                    onChange={(e) => {
                      setNewCompanyData({ ...newCompanyData, website: e.target.value });
                      clearError('companyWebsite');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.companyWebsite
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.companyWebsite && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyWebsite}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Company Priority
                  </label>
                  <Combobox
                    options={priorityOptions}
                    value={newCompanyData.priority}
                    onChange={(val) => setNewCompanyData({ ...newCompanyData, priority: val as Company['priority'] })}
                    placeholder="Select priority..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div id="field-companyCity" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    City <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Dahej / Ahmedabad / Surat"
                    value={newCompanyData.city}
                    onChange={(e) => {
                      setNewCompanyData({ ...newCompanyData, city: e.target.value });
                      clearError('companyCity');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.companyCity
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.companyCity && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyCity}</span>
                    </p>
                  )}
                </div>

                <div id="field-companyState" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="Gujarat"
                    value={newCompanyData.state}
                    onChange={(e) => {
                      setNewCompanyData({ ...newCompanyData, state: e.target.value });
                      clearError('companyState');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.companyState
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.companyState && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyState}</span>
                    </p>
                  )}
                </div>

                <div id="field-companyPincode" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Postal Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="392130"
                    value={newCompanyData.pincode}
                    onChange={(e) => {
                      setNewCompanyData({ ...newCompanyData, pincode: e.target.value });
                      clearError('companyPincode');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.companyPincode
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.companyPincode && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyPincode}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="field-companyPhone" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Official Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98250 11223"
                    value={newCompanyData.phone}
                    onChange={(e) => {
                      setNewCompanyData({ ...newCompanyData, phone: e.target.value });
                      clearError('companyPhone');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.companyPhone
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.companyPhone && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyPhone}</span>
                    </p>
                  )}
                </div>

                <div id="field-companyEmail" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="procurement@company.com"
                    value={newCompanyData.email}
                    onChange={(e) => {
                      setNewCompanyData({ ...newCompanyData, email: e.target.value });
                      clearError('companyEmail');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.companyEmail
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.companyEmail && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.companyEmail}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: WAREHOUSE REQUIREMENTS & TECHNICAL SPECS */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="pb-3 border-b border-border">
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Warehouse Requirements & Technical Specifications
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Define required carpet area, corridor location, clear heights, and facility parameters
            </p>
          </div>

          <div className="space-y-4">
            {/* Requirement Title / Summary */}
            <div id="field-requirement" className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Requirement Posting Title / Summary <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Grade-A compliant chemical warehousing with fire sprinkler system and multi-dock access"
                value={inquiryData.requirement}
                onChange={(e) => {
                  setInquiryData({ ...inquiryData, requirement: e.target.value });
                  clearError('requirement');
                }}
                className={cn(
                  "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                  errors.requirement
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                    : "border-border focus:border-fairway-600"
                )}
              />
              {errors.requirement && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.requirement}</span>
                </p>
              )}
            </div>

            {/* Area & Corridor & Specific Hub */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Required Area with Quick Presets */}
              <div id="field-requiredAreaSqFt" className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Required Area (Sq.Ft) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-fairway-600 dark:text-fairway-400">
                    {inquiryData.requiredAreaSqFt > 0 ? formatSqFt(inquiryData.requiredAreaSqFt) : '—'}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 50000"
                  value={inquiryData.requiredAreaSqFt || ''}
                  onChange={(e) => {
                    setInquiryData({ ...inquiryData, requiredAreaSqFt: Number(e.target.value) || 0 });
                    clearError('requiredAreaSqFt');
                  }}
                  className={cn(
                    "w-full bg-surface-muted/40 border rounded-xl text-xs font-bold text-foreground p-2.5 outline-none transition-colors",
                    errors.requiredAreaSqFt
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                      : "border-border focus:border-fairway-600"
                  )}
                />
                {errors.requiredAreaSqFt && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.requiredAreaSqFt}</span>
                  </p>
                )}
              </div>

              {/* Target Corridor */}
              <div id="field-targetCorridor" className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Target Logistics Corridor <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={corridorComboboxOptions}
                  value={inquiryData.targetCorridor}
                  onChange={(val) => {
                    setInquiryData({
                      ...inquiryData,
                      targetCorridor: val,
                      location: val.replace(' Corridor', ''),
                    });
                    clearError('targetCorridor');
                    clearError('location');
                  }}
                  placeholder="Select target corridor..."
                  triggerClassName={errors.targetCorridor ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                />
                {errors.targetCorridor && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.targetCorridor}</span>
                  </p>
                )}
              </div>

              {/* Specific Location Hub */}
              <div id="field-location" className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Specific Hub / Location <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dahej PCPIR / Sanand GIDC"
                  value={inquiryData.location}
                  onChange={(e) => {
                    setInquiryData({ ...inquiryData, location: e.target.value });
                    clearError('location');
                  }}
                  className={cn(
                    "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                    errors.location
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                      : "border-border focus:border-fairway-600"
                  )}
                />
                {errors.location && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.location}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Engineering Parameters: Clear Height, Docks, Floor Load */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Clear Height (Meters / Ft)
                </label>
                <Combobox
                  options={clearHeightOptions}
                  value={inquiryData.clearHeightFt ? String(inquiryData.clearHeightFt) : ''}
                  onChange={(val) => setInquiryData({ ...inquiryData, clearHeightFt: Number(val) || 0 })}
                  placeholder="Select clear height..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Dock Openings Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 6"
                  value={inquiryData.dockRequirements || ''}
                  onChange={(e) => setInquiryData({ ...inquiryData, dockRequirements: Number(e.target.value) || 0 })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Floor Load Capacity
                </label>
                <Combobox
                  options={floorLoadOptions}
                  value={inquiryData.floorLoadCapacity}
                  onChange={(val) => setInquiryData({ ...inquiryData, floorLoadCapacity: val })}
                  placeholder="Select floor load capacity..."
                />
              </div>
            </div>

            {/* Power & Fire Sprinklers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Connected Power (kVA)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={inquiryData.powerKVA || ''}
                  onChange={(e) => setInquiryData({ ...inquiryData, powerKVA: Number(e.target.value) || 0 })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="inline-flex items-center gap-3 p-3 rounded-xl bg-surface-muted/50 border border-border cursor-pointer hover:border-fairway-400/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={inquiryData.fireSystemsRequired}
                    onChange={(e) => setInquiryData({ ...inquiryData, fireSystemsRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-fairway-600 focus:ring-fairway-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground block">NFPA Compliant Fire Sprinklers & Hydrants</span>
                    <span className="text-[11px] text-foreground-muted">Mandatory for hazardous / high fire risk cargo</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Special Requirements */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Special Operational & Engineering Requirements
              </label>
              <textarea
                rows={2}
                placeholder="e.g. NFPA compliant fire sprinklers, chemical grade epoxy flooring, 24/7 CCTV & security perimeter."
                value={inquiryData.specialRequirements}
                onChange={(e) => setInquiryData({ ...inquiryData, specialRequirements: e.target.value })}
                className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: KEY CONTACT PERSON & PROPOSED FACILITY NODE */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Contact Person & Facility Node
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Attach the designated decision maker and specify the proposed facility node
              </p>
            </div>

            {selectedCompanyMode === 'existing' && existingCompanyContacts.length > 0 && (
              <div className="flex items-center gap-1 p-1 bg-surface-muted rounded-xl border border-border w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setContactMode('existing');
                    clearError('contactName');
                    clearError('contactPhone');
                  }}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap flex items-center justify-center ${
                    contactMode === 'existing'
                      ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <span>
                    <span className="hidden sm:inline">Select </span>Existing Contact
                    <span className="ml-1 text-[10px] sm:text-xs font-mono font-medium opacity-80">({existingCompanyContacts.length})</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContactMode('new');
                    clearError('selectedContactId');
                  }}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                    contactMode === 'new'
                      ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <span className="hidden sm:inline">Add </span>New Contact
                  </span>
                </button>
              </div>
            )}
          </div>

          {contactMode === 'existing' && existingCompanyContacts.length > 0 ? (
            <div id="field-selectedContactId" className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Choose Contact Person <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={contactComboboxOptions}
                value={selectedContactId}
                onChange={(val) => {
                  setSelectedContactId(val);
                  clearError('selectedContactId');
                }}
                placeholder="Select registered contact..."
                triggerClassName={errors.selectedContactId ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
              />
              {errors.selectedContactId && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.selectedContactId}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="field-contactName" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Full Name of Decision Maker <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={contactData.name}
                    onChange={(e) => {
                      setContactData({ ...contactData, name: e.target.value });
                      clearError('contactName');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
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
                  <label className="text-xs font-semibold text-foreground block">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VP - Supply Chain & Infrastructure"
                    value={contactData.designation}
                    onChange={(e) => setContactData({ ...contactData, designation: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="Logistics Operations"
                    value={contactData.department}
                    onChange={(e) => setContactData({ ...contactData, department: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>

                <div id="field-contactPhone" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Direct Mobile Phone <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98250 55667"
                    value={contactData.phone}
                    onChange={(e) => {
                      setContactData({ ...contactData, phone: e.target.value });
                      clearError('contactPhone');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
                      errors.contactPhone
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-border focus:border-fairway-600"
                    )}
                  />
                  {errors.contactPhone && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.contactPhone}</span>
                    </p>
                  )}
                </div>

                <div id="field-contactEmail" className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="rajesh.sharma@company.com"
                    value={contactData.email}
                    onChange={(e) => {
                      setContactData({ ...contactData, email: e.target.value });
                      clearError('contactEmail');
                    }}
                    className={cn(
                      "w-full bg-surface-muted/40 border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 outline-none transition-colors",
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
            </div>
          )}

          {/* Facility Node Setup Toggle */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground">
                  Create Customer Facility Record
                </h3>
                <p className="text-[11px] text-foreground-muted">
                  Automatically register a facility node under this customer account for GIS mapping
                </p>
              </div>
              <input
                type="checkbox"
                checked={createFacility}
                onChange={(e) => setCreateFacility(e.target.checked)}
                className="w-4 h-4 rounded text-fairway-600 focus:ring-fairway-500 cursor-pointer"
              />
            </div>

            {createFacility && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-surface-muted/50 border border-border rounded-xl">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Facility Node Name</label>
                  <input
                    type="text"
                    value={facilityData.name}
                    onChange={(e) => setFacilityData({ ...facilityData, name: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg text-xs text-foreground p-2 focus:border-fairway-600 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Plot / Industrial Estate Address</label>
                  <input
                    type="text"
                    value={facilityData.address}
                    onChange={(e) => setFacilityData({ ...facilityData, address: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg text-xs text-foreground p-2 focus:border-fairway-600 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: COMMERCIAL TERMS & LEAD OWNERSHIP */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="pb-3 border-b border-border">
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Commercial Terms, Timeline & Ownership
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Define monthly budget, lease tenure, target possession, and assign the lead owner
            </p>
          </div>

          <div className="space-y-4">
            {/* Row 1: Budget, Possession Date, Lease Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monthly Rental Budget with Live Rate */}
              <div id="field-budgetMonthlyINR" className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Monthly Rental Budget (₹ INR) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] font-mono font-semibold text-foreground-muted">
                    {Number(rentPerSqFt) > 0 ? `≈ ₹${rentPerSqFt}/sq.ft` : '—'}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 500000"
                  value={inquiryData.budgetMonthlyINR || ''}
                  onChange={(e) => {
                    setInquiryData({ ...inquiryData, budgetMonthlyINR: Number(e.target.value) || 0 });
                    clearError('budgetMonthlyINR');
                  }}
                  className={cn(
                    "w-full bg-surface-muted/40 border rounded-xl text-xs font-bold text-foreground p-2.5 outline-none transition-colors",
                    errors.budgetMonthlyINR
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                      : "border-border focus:border-fairway-600"
                  )}
                />
                <span className="text-[11px] text-foreground-muted block">
                  Formatted: <strong>{inquiryData.budgetMonthlyINR > 0 ? `${formatINR(inquiryData.budgetMonthlyINR, true)} / month` : '—'}</strong>
                </span>
                {errors.budgetMonthlyINR && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.budgetMonthlyINR}</span>
                  </p>
                )}
              </div>

              {/* Target Possession Date with DatePicker */}
              <div id="field-possessionDate" className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Target Possession Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <DatePicker
                  value={inquiryData.possessionDate}
                  onChange={(val) => {
                    setInquiryData((prev) => ({ ...prev, possessionDate: val }));
                    clearError('possessionDate');
                  }}
                  placeholder="Select target possession date"
                  error={errors.possessionDate}
                />
              </div>

              {/* Lease Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Lease Duration (Tenure)
                </label>
                <Combobox
                  options={leaseTenureOptions}
                  value={inquiryData.leaseDurationMonths ? String(inquiryData.leaseDurationMonths) : ''}
                  onChange={(val) => setInquiryData({ ...inquiryData, leaseDurationMonths: Number(val) || 36 })}
                  placeholder="Select lease duration..."
                />
              </div>
            </div>

            {/* Row 2: Priority, Lead Source, Sales Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div id="field-priority" className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Inquiry Priority <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={priorityOptions}
                  value={inquiryData.priority}
                  onChange={(val) => {
                    setInquiryData({ ...inquiryData, priority: val as Inquiry['priority'] });
                    clearError('priority');
                  }}
                  placeholder="Select priority..."
                  triggerClassName={errors.priority ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                />
                {errors.priority && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.priority}</span>
                  </p>
                )}
              </div>

              <div id="field-source" className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Lead Source <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={sourceOptions}
                  value={inquiryData.source}
                  onChange={(val) => {
                    setInquiryData({ ...inquiryData, source: val as Inquiry['source'] });
                    clearError('source');
                  }}
                  placeholder="Select lead source..."
                  triggerClassName={errors.source ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                />
                {errors.source && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.source}</span>
                  </p>
                )}
              </div>

              <div id="field-assignedSalespersonId" className="space-y-1.5">
                <UserCombobox
                  label={
                    <span>
                      Assigned Sales Owner <span className="text-rose-500 font-bold">*</span>
                    </span>
                  }
                  users={users}
                  value={assignedSalespersonId}
                  onChange={(val) => {
                    setAssignedSalespersonId(val);
                    clearError('assignedSalespersonId');
                  }}
                  placeholder="Select sales owner..."
                  triggerClassName={errors.assignedSalespersonId ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}
                />
                {errors.assignedSalespersonId && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.assignedSalespersonId}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Next Action Step & Follow-up Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Next Action Step
                </label>
                <input
                  type="text"
                  placeholder="e.g. Share commercial proposal & schedule joint site inspection."
                  value={inquiryData.nextAction}
                  onChange={(e) => setInquiryData({ ...inquiryData, nextAction: e.target.value })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Follow-up Due Date
                </label>
                <DatePicker
                  value={inquiryData.nextFollowUpDate}
                  onChange={(val) => setInquiryData((prev) => ({ ...prev, nextFollowUpDate: val }))}
                  placeholder="Select follow-up date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SUBMISSION FOOTER (STICKY) */}
        {/* ========================================================================= */}
        <div className="sticky bottom-2 sm:bottom-4 z-30 bg-surface/95 dark:bg-surface/95 backdrop-blur-md border border-border rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-lg sm:shadow-xl transition-all">
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
              <span className="flex items-center gap-1.5 text-foreground-muted text-[11px] sm:text-xs min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                <span className="truncate sm:whitespace-normal">Please complete all fields marked with *</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="text-xs border-border px-4 justify-center flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold text-xs px-4 sm:px-6 shadow-xs flex items-center justify-center gap-2 cursor-pointer text-center flex-1 sm:flex-initial whitespace-nowrap"
            >
              Register Warehouse Inquiry & Match Assets
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewInquiryPage;
