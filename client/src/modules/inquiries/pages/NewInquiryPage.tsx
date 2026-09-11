import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Warehouse,
  ArrowLeft,
  Sparkles,
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
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { StorageService } from '@/modules/core/services/storageService';
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
  const existingCompanies = useMemo(() => StorageService.getCompanies(), []);

  // Core Inquiry Data
  const [inquiryData, setInquiryData] = useState({
    requirement: 'Grade-A compliant regional distribution center with multi-dock access and high flooring load capacity.',
    requiredAreaSqFt: 75000,
    location: 'Dahej PCPIR',
    targetCorridor: 'Dahej PCPIR Corridor',
    industry: 'Specialty Chemicals & Polymers',
    possessionDate: '2026-10-01',
    leaseDurationMonths: 60,
    budgetMonthlyINR: 1650000,
    dockRequirements: 10,
    clearHeightFt: 12,
    floorLoadCapacity: '6 MT/sq.m',
    powerKVA: 1200,
    fireSystemsRequired: true,
    specialRequirements: 'NFPA compliant fire sprinklers, chemical grade epoxy flooring, 24/7 CCTV & security perimeter.',
    source: 'Direct' as Inquiry['source'],
    priority: 'High' as Inquiry['priority'],
    nextAction: 'Review initial property matches and schedule joint site inspection.',
    nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });

  // Company Selection / Creation
  const [selectedCompanyMode, setSelectedCompanyMode] = useState<'existing' | 'new'>(
    defaultCompanyId ? 'existing' : 'existing'
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    defaultCompanyId || existingCompanies[0]?.id || ''
  );
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    legalName: '',
    website: '',
    industry: 'Specialty Chemicals & Polymers',
    address: 'Dahej Industrial Zone',
    city: 'Dahej',
    state: 'Gujarat',
    pincode: '392130',
    phone: '+91 98250 11223',
    email: 'info@newclient.example.com',
    priority: 'High' as Company['priority'],
  });

  const [duplicateWarnings, setDuplicateWarnings] = useState<any[]>([]);

  // Contact Person
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('new');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactData, setContactData] = useState({
    name: 'Rajesh Sharma',
    designation: 'VP - Supply Chain & Infrastructure',
    department: 'Logistics Operations',
    phone: '+91 98250 55667',
    email: 'rajesh.sharma@company.com',
    linkedinUrl: 'https://linkedin.com/in/rajesh-sharma-logistics',
    isPrimary: true,
  });

  // Facility Setup
  const [createFacility, setCreateFacility] = useState(true);
  const [facilityData, setFacilityData] = useState({
    name: 'Proposed Dahej Distribution Hub',
    type: 'Warehouse' as Facility['type'],
    address: 'Plot 55, GIDC Industrial Estate',
    city: 'Dahej',
    state: 'Gujarat',
    pincode: '392130',
    latitude: 21.712,
    longitude: 72.585,
    builtUpAreaSqFt: 75000,
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

  const existingCompanyContacts = useMemo(() => {
    if (!selectedCompanyId) return [];
    return StorageService.getContacts(selectedCompanyId);
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

  // Duplicate Check on New Company Name
  const handleNewCompanyNameChange = async (val: string) => {
    setNewCompanyData((prev) => ({ ...prev, name: val }));
    if (val.trim().length >= 3) {
      try {
        const res = await CompanyService.checkDuplicates(val);
        if (res.success && res.duplicates && res.duplicates.length > 0) {
          setDuplicateWarnings(res.duplicates);
        } else {
          const local = StorageService.getCompanies().filter((c) =>
            c.name.toLowerCase().includes(val.toLowerCase())
          );
          setDuplicateWarnings(local);
        }
      } catch {
        const local = StorageService.getCompanies().filter((c) =>
          c.name.toLowerCase().includes(val.toLowerCase())
        );
        setDuplicateWarnings(local);
      }
    } else {
      setDuplicateWarnings([]);
    }
  };

  // Form Validation
  const isValid = useMemo(() => {
    if (selectedCompanyMode === 'existing' && !selectedCompanyId) return false;
    if (selectedCompanyMode === 'new' && (!newCompanyData.name || !newCompanyData.city)) return false;
    if (!inquiryData.requirement) return false;
    if (!inquiryData.requiredAreaSqFt || inquiryData.requiredAreaSqFt <= 0) return false;
    if (!inquiryData.location) return false;
    if (!inquiryData.possessionDate) return false;
    if (!inquiryData.budgetMonthlyINR || inquiryData.budgetMonthlyINR <= 0) return false;
    if (contactMode === 'new' && (!contactData.name || !contactData.phone)) return false;
    if (contactMode === 'existing' && !selectedContactId) return false;
    return true;
  }, [
    selectedCompanyMode,
    selectedCompanyId,
    newCompanyData,
    inquiryData,
    contactMode,
    contactData,
    selectedContactId,
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
    { value: 'High', label: '🔴 High Priority' },
    { value: 'Medium', label: '🟡 Medium Priority' },
    { value: 'Low', label: '🟢 Low Priority' },
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

  const userComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return users.map((u) => ({
      value: u.id,
      label: u.name,
      description: u.role || 'Sales',
    }));
  }, [users]);

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
    if (!isValid) {
      error('Form Incomplete', 'Please fill all required fields marked with *');
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

      let finalInq: Inquiry;

      if (res.success && res.data) {
        finalInq = res.data;
        try {
          StorageService.createInquiry(res.data);
        } catch {}
      } else {
        // Fallback to local storage
        let finalCompany: Company;
        if (selectedCompanyMode === 'existing') {
          const existing = StorageService.getCompanyById(selectedCompanyId);
          if (!existing) throw new Error('Company not found');
          finalCompany = existing;
        } else {
          finalCompany = StorageService.createCompany({
            name: newCompanyData.name || 'New Industrial Client',
            legalName: newCompanyData.legalName || `${newCompanyData.name} Pvt Ltd`,
            website: newCompanyData.website || `https://${newCompanyData.name.toLowerCase().replace(/\s+/g, '')}.com`,
            industry: newCompanyData.industry,
            status: 'Active',
            address: newCompanyData.address,
            city: newCompanyData.city,
            state: newCompanyData.state,
            pincode: newCompanyData.pincode,
            phone: newCompanyData.phone,
            email: newCompanyData.email,
            assignedOwnerId: assignedSalespersonId,
            assignedOwnerName: salesperson?.name || 'Admin',
            prospectStage: 'Requirement Confirmed',
            priority: newCompanyData.priority,
          });
        }

        let finalContactName = contactData.name;
        let finalContactPhone = contactData.phone;
        let finalContactEmail = contactData.email;
        let finalContactId = selectedContactId;

        if (contactMode === 'new' && contactData.name) {
          const newCnt = StorageService.createContact({
            companyId: finalCompany.id,
            companyName: finalCompany.name,
            name: contactData.name,
            designation: contactData.designation,
            department: contactData.department,
            phone: contactData.phone,
            email: contactData.email,
            linkedinUrl: contactData.linkedinUrl,
            isPrimary: contactData.isPrimary,
          });
          finalContactId = newCnt.id;
          finalContactName = newCnt.name;
        }

        if (createFacility && facilityData.name) {
          StorageService.createFacility({
            companyId: finalCompany.id,
            companyName: finalCompany.name,
            name: facilityData.name,
            type: facilityData.type,
            address: facilityData.address,
            city: facilityData.city,
            state: facilityData.state,
            pincode: facilityData.pincode,
            latitude: facilityData.latitude,
            longitude: facilityData.longitude,
            status: 'Active',
            builtUpAreaSqFt: facilityData.builtUpAreaSqFt,
            corridor: inquiryData.targetCorridor,
          });
        }

        finalInq = StorageService.createInquiry({
          companyId: finalCompany.id,
          companyName: finalCompany.name,
          contactId: finalContactId || undefined,
          contactName: finalContactName,
          contactPhone: finalContactPhone,
          contactEmail: finalContactEmail,
          stage: 'requirement_confirmed',
          status: 'Active',
          priority: inquiryData.priority,
          source: inquiryData.source,
          inquiryDate: new Date().toISOString().split('T')[0],
          salespersonId: salesperson?.id || 'usr_1',
          salespersonName: salesperson?.name || 'Assigned Lead',
          leadScore: 85,
          opportunityScore: 75,
          industry: finalCompany.industry,
          requiredAreaSqFt: inquiryData.requiredAreaSqFt,
          location: inquiryData.location,
          targetCorridor: inquiryData.targetCorridor,
          budgetMonthlyINR: inquiryData.budgetMonthlyINR,
          possessionDate: inquiryData.possessionDate,
          leaseDurationMonths: inquiryData.leaseDurationMonths,
          requirement: inquiryData.requirement,
          dockRequirements: inquiryData.dockRequirements,
          clearHeightFt: inquiryData.clearHeightFt,
          floorLoadCapacity: inquiryData.floorLoadCapacity,
          powerKVA: inquiryData.powerKVA,
          fireSystemsRequired: inquiryData.fireSystemsRequired,
          specialRequirements: inquiryData.specialRequirements,
          nextAction: inquiryData.nextAction,
          nextFollowUpDate: inquiryData.nextFollowUpDate,
        });
      }

      setCreatedInquiry(finalInq);

      // Fetch matches
      const matches = StorageService.matchPropertiesForInquiry(finalInq);
      setPropertyMatches(matches);

      success('Inquiry Created Successfully', `${finalInq.inquiryNumber} registered in CRM pipeline.`);
      setShowSuccessView(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                <strong className="text-foreground">{createdInquiry.companyName}</strong> has been added to the CRM pipeline. Instant AI corridor analysis found {propertyMatches.length} matching warehouse assets.
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

          {/* AI Matches */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-fairway-500/10 text-fairway-600 dark:text-fairway-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Corridor Match Assets ({propertyMatches.length})
                  </h2>
                  <p className="text-xs text-foreground-muted">
                    Compatible inventory based on area ({formatSqFt(createdInquiry.requiredAreaSqFt)}), corridor ({createdInquiry.targetCorridor}), and clear height
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propertyMatches.map((m) => {
                const badgeStyle =
                  m.overallScore >= 80
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : m.overallScore >= 60
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    : m.overallScore >= 40
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-surface-muted text-foreground-muted border-border';

                return (
                  <div
                    key={m.property.id}
                    onClick={() => onSuccess(createdInquiry.id)}
                    className="bg-surface hover:bg-surface-muted/30 border border-border hover:border-primary/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1" title={m.property.name}>
                            {m.property.name}
                          </h3>
                          <p className="text-xs text-foreground-muted flex items-center gap-1.5 mt-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{m.property.location}</span>
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap shadow-2xs ${badgeStyle}`}>
                          {m.overallScore}% Match
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-border">
                      <div className="bg-surface-muted/50 rounded-lg p-2 border border-border/50">
                        <span className="text-foreground-muted block text-[10px] uppercase font-semibold">Available Area</span>
                        <span className="font-bold text-foreground text-xs mt-0.5 block">{formatSqFt(m.property.totalAreaSqFt)}</span>
                      </div>
                      <div className="bg-surface-muted/50 rounded-lg p-2 border border-border/50">
                        <span className="text-foreground-muted block text-[10px] uppercase font-semibold">Rate</span>
                        <span className="font-bold text-foreground text-xs mt-0.5 block">₹{m.property.rentPerSqFtINR}/sq.ft</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-foreground-muted group-hover:text-primary transition-colors font-semibold">
                      <span>Review in Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
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
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Create Warehouse Inquiry
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20">
                New Requirement
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Create a new warehouse requirement & register client in pipeline
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
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
            <div className="flex items-center p-1 bg-surface-muted rounded-xl border border-border self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedCompanyMode('existing')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCompanyMode === 'existing'
                    ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Select Existing Company ({existingCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCompanyMode('new')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCompanyMode === 'new'
                    ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register New Entity</span>
              </button>
            </div>
          </div>

          {/* Existing Company Mode View */}
          {selectedCompanyMode === 'existing' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Choose Customer Company <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Combobox
                    options={companyComboboxOptions}
                    value={selectedCompanyId}
                    onChange={setSelectedCompanyId}
                    placeholder="Search and select existing customer company..."
                    searchPlaceholder="Search company by name, industry, location..."
                    className="h-10 text-xs"
                  />
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
                      dot
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
                      📍 {selectedCompany.address}, {selectedCompany.city}, {selectedCompany.state} — {selectedCompany.pincode}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-foreground-muted shrink-0">
                    <span>📞 {selectedCompany.phone}</span>
                    <span>✉️ {selectedCompany.email}</span>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Company Trade Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Logistics India"
                    value={newCompanyData.name}
                    onChange={(e) => handleNewCompanyNameChange(e.target.value)}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Industry Segment <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Combobox
                    options={industryComboboxOptions}
                    value={newCompanyData.industry}
                    onChange={(val) => setNewCompanyData({ ...newCompanyData, industry: val })}
                    placeholder="Select industry..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Company Website
                  </label>
                  <input
                    type="text"
                    placeholder="https://company.example.com"
                    value={newCompanyData.website}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, website: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    City <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dahej / Ahmedabad / Surat"
                    value={newCompanyData.city}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, city: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="Gujarat"
                    value={newCompanyData.state}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, state: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Postal Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="392130"
                    value={newCompanyData.pincode}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, pincode: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Official Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98250 11223"
                    value={newCompanyData.phone}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, phone: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="procurement@company.com"
                    value={newCompanyData.email}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, email: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Requirement Posting Title / Summary <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grade-A compliant chemical warehousing with fire sprinkler system and multi-dock access"
                value={inquiryData.requirement}
                onChange={(e) => setInquiryData({ ...inquiryData, requirement: e.target.value })}
                className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Area & Corridor & Specific Hub */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Required Area with Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Required Area (Sq.Ft) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-fairway-600 dark:text-fairway-400">
                    {formatSqFt(inquiryData.requiredAreaSqFt)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={inquiryData.requiredAreaSqFt || ''}
                  onChange={(e) => setInquiryData({ ...inquiryData, requiredAreaSqFt: Number(e.target.value) || 0 })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs font-bold text-foreground p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {[25000, 50000, 75000, 100000, 150000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInquiryData({ ...inquiryData, requiredAreaSqFt: preset })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        inquiryData.requiredAreaSqFt === preset
                          ? 'bg-fairway-600 text-white border-fairway-600'
                          : 'bg-surface-muted text-foreground-muted border-border hover:text-foreground'
                      }`}
                    >
                      {(preset / 1000).toFixed(0)}k sq.ft
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Corridor */}
              <div className="space-y-1.5">
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
                  }}
                  placeholder="Select target corridor..."
                />
              </div>

              {/* Specific Location Hub */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Specific Hub / Location <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dahej PCPIR / Sanand GIDC"
                  value={inquiryData.location}
                  onChange={(e) => setInquiryData({ ...inquiryData, location: e.target.value })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
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
                  value={String(inquiryData.clearHeightFt)}
                  onChange={(val) => setInquiryData({ ...inquiryData, clearHeightFt: Number(val) || 12 })}
                  placeholder="Select clear height..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Dock Openings Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={inquiryData.dockRequirements}
                  onChange={(e) => setInquiryData({ ...inquiryData, dockRequirements: Number(e.target.value) || 1 })}
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
                  placeholder="1200"
                  value={inquiryData.powerKVA}
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
              <div className="flex items-center p-1 bg-surface-muted rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setContactMode('existing')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    contactMode === 'existing'
                      ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  Select Existing Contact ({existingCompanyContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setContactMode('new')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    contactMode === 'new'
                      ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add New Contact</span>
                </button>
              </div>
            )}
          </div>

          {contactMode === 'existing' && existingCompanyContacts.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Choose Contact Person <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={contactComboboxOptions}
                value={selectedContactId}
                onChange={setSelectedContactId}
                placeholder="Select registered contact..."
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Full Name of Decision Maker <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={contactData.name}
                    onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Direct Mobile Phone <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98250 55667"
                    value={contactData.phone}
                    onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="rajesh.sharma@company.com"
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Monthly Rental Budget (₹ INR) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] font-mono font-semibold text-foreground-muted">
                    ≈ ₹{rentPerSqFt}/sq.ft
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={inquiryData.budgetMonthlyINR || ''}
                  onChange={(e) => setInquiryData({ ...inquiryData, budgetMonthlyINR: Number(e.target.value) || 0 })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl text-xs font-bold text-foreground p-2.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
                <span className="text-[11px] text-foreground-muted block">
                  Formatted: <strong>{formatINR(inquiryData.budgetMonthlyINR, true)} / month</strong>
                </span>
              </div>

              {/* Target Possession Date with DatePicker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Target Possession Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <DatePicker
                  value={inquiryData.possessionDate}
                  onChange={(val) => setInquiryData((prev) => ({ ...prev, possessionDate: val }))}
                  placeholder="Select target possession date"
                />
              </div>

              {/* Lease Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Lease Duration (Tenure)
                </label>
                <Combobox
                  options={leaseTenureOptions}
                  value={String(inquiryData.leaseDurationMonths)}
                  onChange={(val) => setInquiryData({ ...inquiryData, leaseDurationMonths: Number(val) || 60 })}
                  placeholder="Select lease duration..."
                />
              </div>
            </div>

            {/* Row 2: Priority, Lead Source, Sales Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Inquiry Priority <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={priorityOptions}
                  value={inquiryData.priority}
                  onChange={(val) => setInquiryData({ ...inquiryData, priority: val as Inquiry['priority'] })}
                  placeholder="Select priority..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Lead Source <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={sourceOptions}
                  value={inquiryData.source}
                  onChange={(val) => setInquiryData({ ...inquiryData, source: val as Inquiry['source'] })}
                  placeholder="Select lead source..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Assigned Sales Owner <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={userComboboxOptions}
                  value={assignedSalespersonId}
                  onChange={setAssignedSalespersonId}
                  placeholder="Select deal owner..."
                />
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
        {/* BOTTOM SUBMISSION FOOTER */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All mandatory fields verified</span>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="text-xs border-border px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!isValid}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold text-xs px-6 shadow-xs flex items-center gap-2"
              leftIcon={<Building2 className="w-3.5 h-3.5" />}
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
