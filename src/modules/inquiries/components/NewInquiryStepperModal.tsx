import React, { useState } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Company, Contact, Facility, Inquiry, PropertyMatchResult } from '@/modules/core/types';
import { Check, AlertTriangle, Building2, User, Factory, Sparkles, CheckCircle2, ChevronRight, ArrowLeft, Plus } from 'lucide-react';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';

export interface NewInquiryStepperModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCompanyId?: string;
  onSuccess: (inquiryId: string) => void;
}

export const NewInquiryStepperModal: React.FC<NewInquiryStepperModalProps> = ({
  isOpen,
  onClose,
  defaultCompanyId,
  onSuccess,
}) => {
  const { currentUser, users } = useAuth();
  const { success } = useToast();

  const [step, setStep] = useState<number>(1);
  const existingCompanies = StorageService.getCompanies();

  // Form State
  const [inquiryData, setInquiryData] = useState({
    requirement: '',
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
    specialRequirements: 'NFPA compliant fire sprinklers, chemical grade epoxy flooring, 24/7 security.',
    source: 'Direct' as Inquiry['source'],
    priority: 'High' as Inquiry['priority'],
    nextAction: 'Review initial property matches and share commercial proposal.',
    nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });

  // Company selection/creation state
  const [selectedCompanyMode, setSelectedCompanyMode] = useState<'existing' | 'new'>(
    defaultCompanyId ? 'existing' : 'existing'
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(defaultCompanyId || existingCompanies[0]?.id || '');
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
    email: 'info@newcompany.example.com',
    priority: 'High' as Company['priority'],
  });

  // Duplicate company warnings
  const [duplicateWarnings, setDuplicateWarnings] = useState<Company[]>([]);

  // Contact State
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('new');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactData, setContactData] = useState({
    name: '',
    designation: 'Supply Chain & Logistics Head',
    department: 'Logistics Operations',
    phone: '+91 98250 55667',
    email: 'supplychain@company.com',
    linkedinUrl: '',
    isPrimary: true,
  });

  // Facility State
  const [createFacility, setCreateFacility] = useState(true);
  const [facilityData, setFacilityData] = useState({
    name: 'Proposed Dahej Logistics Facility',
    type: 'Warehouse' as Facility['type'],
    address: 'Plot 55, GIDC Industrial Estate',
    city: 'Dahej',
    state: 'Gujarat',
    pincode: '392130',
    latitude: 21.712,
    longitude: 72.585,
    builtUpAreaSqFt: 75000,
  });

  // Assignment State
  const [assignedSalespersonId, setAssignedSalespersonId] = useState(currentUser.id);

  // Created Inquiry Result
  const [createdInquiry, setCreatedInquiry] = useState<Inquiry | null>(null);
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatchResult[]>([]);

  // Step 2 Duplicate Check
  const handleNewCompanyNameChange = (name: string) => {
    setNewCompanyData({ ...newCompanyData, name, legalName: `${name} Private Limited` });
    if (name.length > 2) {
      const dupes = StorageService.checkCompanyDuplicates(name);
      setDuplicateWarnings(dupes);
    } else {
      setDuplicateWarnings([]);
    }
  };

  const currentCompanyContacts = selectedCompanyId ? StorageService.getContacts(selectedCompanyId) : [];

  // Submit and Create
  const handleFinalCreate = () => {
    let finalCompany: Company;

    if (selectedCompanyMode === 'existing') {
      const existing = StorageService.getCompanyById(selectedCompanyId);
      if (!existing) return;
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
        assignedOwnerName: users.find((u) => u.id === assignedSalespersonId)?.name || currentUser.name,
        prospectStage: 'Requirement Confirmed',
        priority: newCompanyData.priority,
      });
    }

    // Contact
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
    } else if (contactMode === 'existing' && selectedContactId) {
      const cnt = StorageService.getContactById(selectedContactId);
      if (cnt) {
        finalContactName = cnt.name;
        finalContactPhone = cnt.phone;
        finalContactEmail = cnt.email;
      }
    }

    // Facility
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
        status: 'Planned',
        builtUpAreaSqFt: facilityData.builtUpAreaSqFt,
      });
    }

    // Salesperson
    const salesperson = users.find((u) => u.id === assignedSalespersonId) || currentUser;

    // Create Inquiry
    const inq = StorageService.createInquiry({
      companyId: finalCompany.id,
      companyName: finalCompany.name,
      contactId: finalContactId,
      contactName: finalContactName,
      contactPhone: finalContactPhone,
      contactEmail: finalContactEmail,
      source: inquiryData.source,
      inquiryDate: new Date().toISOString().split('T')[0],
      salespersonId: salesperson.id,
      salespersonName: salesperson.name,
      requirement: inquiryData.requirement || `Requirement for ${formatSqFt(inquiryData.requiredAreaSqFt)} in ${inquiryData.location}`,
      requiredAreaSqFt: inquiryData.requiredAreaSqFt,
      location: inquiryData.location,
      targetCorridor: inquiryData.targetCorridor,
      industry: inquiryData.industry,
      possessionDate: inquiryData.possessionDate,
      leaseDurationMonths: inquiryData.leaseDurationMonths,
      budgetMonthlyINR: inquiryData.budgetMonthlyINR,
      dockRequirements: inquiryData.dockRequirements,
      clearHeightFt: inquiryData.clearHeightFt,
      floorLoadCapacity: inquiryData.floorLoadCapacity,
      powerKVA: inquiryData.powerKVA,
      fireSystemsRequired: inquiryData.fireSystemsRequired,
      specialRequirements: inquiryData.specialRequirements,
      priority: inquiryData.priority,
      leadScore: 85,
      opportunityScore: 90,
      stage: 'property_matched',
      status: 'Active',
      nextAction: inquiryData.nextAction,
      nextFollowUpDate: inquiryData.nextFollowUpDate,
    });

    const matches = StorageService.matchPropertiesForInquiry(inq);
    setCreatedInquiry(inq);
    setPropertyMatches(matches);
    setStep(6);
    success('Inquiry Created Successfully', `${inq.inquiryNumber} registered for ${finalCompany.name}`);
  };

  const stepsList = [
    { num: 1, label: 'Inquiry' },
    { num: 2, label: 'Company' },
    { num: 3, label: 'Contact' },
    { num: 4, label: 'Facility' },
    { num: 5, label: 'Assignment' },
    { num: 6, label: 'Matches' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <div className="flex items-center gap-2 text-fairway-900">
          <Sparkles className="w-5 h-5 text-accent-500" />
          <span>Guided New Inquiry Stepper</span>
        </div>
      }
      description="Continuous guided workflow: Inquiry → Company → Contact → Facility → Assignment → Property Matches"
    >
      <div className="space-y-5 text-left">
        {/* Stepper Progress Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-border overflow-x-auto gap-2">
          {stepsList.map((s) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isDone
                      ? 'bg-fairway-600 text-white'
                      : isCurrent
                      ? 'bg-fairway-100 text-fairway-900 border-2 border-fairway-600'
                      : 'bg-surface-muted text-foreground-muted border border-border'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`text-xs ${
                    isCurrent ? 'font-bold text-foreground' : 'text-foreground-muted'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < stepsList.length && <div className="w-2 sm:w-6 h-0.5 bg-border mx-0.5 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* ================= STEP 1: INQUIRY SPECS ================= */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Step 1: Warehouse Requirement Specifications</h4>

            <Textarea
              label="Detailed Requirement"
              placeholder="e.g. 70,000 sq.ft Grade-A Chemical Storage warehouse in Dahej PCPIR with 10 dock levelers and ESFR fire system..."
              value={inquiryData.requirement}
              onChange={(e) => setInquiryData({ ...inquiryData, requirement: e.target.value })}
              rows={2}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Required Area (sq.ft.)"
                value={inquiryData.requiredAreaSqFt.toString()}
                onChange={(e) => {
                  const area = parseInt(e.target.value) || 0;
                  setInquiryData({
                    ...inquiryData,
                    requiredAreaSqFt: area,
                    budgetMonthlyINR: area * 22,
                    dockRequirements: Math.max(2, Math.round(area / 8000)),
                  });
                }}
                required
              />
              <Input
                label="Target Location / GIDC Zone"
                value={inquiryData.location}
                onChange={(e) => setInquiryData({ ...inquiryData, location: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Target Corridor"
                value={inquiryData.targetCorridor}
                onChange={(e) => setInquiryData({ ...inquiryData, targetCorridor: e.target.value })}
              >
                <option value="Dahej PCPIR Corridor">Dahej PCPIR Corridor</option>
                <option value="Ahmedabad - Sanand Auto Corridor">Ahmedabad - Sanand Corridor</option>
                <option value="Vapi - Surat Industrial Corridor">Vapi - Surat Corridor</option>
                <option value="Mumbai - Bhiwandi Logistics Corridor">Bhiwandi Logistics Corridor</option>
                <option value="Pune - Chakan Auto Corridor">Pune - Chakan Corridor</option>
              </Select>

              <Select
                label="Industry Domain"
                value={inquiryData.industry}
                onChange={(e) => setInquiryData({ ...inquiryData, industry: e.target.value })}
              >
                <option value="Specialty Chemicals & Polymers">Specialty Chemicals</option>
                <option value="Pharmaceuticals & APIs">Pharmaceuticals</option>
                <option value="Automotive & EV Components">Automotive & EV</option>
                <option value="3PL & Contract Logistics">3PL Logistics</option>
                <option value="Consumer Electricals & White Goods">Consumer Durables</option>
                <option value="FMCG & Retail Distribution">FMCG Retail</option>
              </Select>

              <Select
                label="Lead Priority"
                value={inquiryData.priority}
                onChange={(e) => setInquiryData({ ...inquiryData, priority: e.target.value as any })}
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                label="Monthly Budget (INR)"
                value={inquiryData.budgetMonthlyINR.toString()}
                onChange={(e) => setInquiryData({ ...inquiryData, budgetMonthlyINR: parseInt(e.target.value) || 0 })}
                helperText={`~ ₹${(inquiryData.budgetMonthlyINR / (inquiryData.requiredAreaSqFt || 1)).toFixed(1)}/sq.ft/mo`}
              />
              <Input
                type="number"
                label="Dock Levelers Needed"
                value={inquiryData.dockRequirements.toString()}
                onChange={(e) => setInquiryData({ ...inquiryData, dockRequirements: parseInt(e.target.value) || 1 })}
              />
              <Input
                type="date"
                label="Target Possession Date"
                value={inquiryData.possessionDate}
                onChange={(e) => setInquiryData({ ...inquiryData, possessionDate: e.target.value })}
                required
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: COMPANY SELECTION / CREATION ================= */}
        {step === 2 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Step 2: Link or Create Customer Company</h4>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedCompanyMode('existing')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md border text-center transition-all ${
                  selectedCompanyMode === 'existing'
                    ? 'bg-fairway-100 text-fairway-900 border-fairway-400 shadow-subtle'
                    : 'bg-surface border-border text-foreground-muted hover:text-foreground'
                }`}
              >
                Select Existing Company ({existingCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCompanyMode('new')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md border text-center transition-all flex items-center justify-center gap-1.5 ${
                  selectedCompanyMode === 'new'
                    ? 'bg-fairway-100 text-fairway-900 border-fairway-400 shadow-subtle'
                    : 'bg-surface border-border text-foreground-muted hover:text-foreground'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Company Account</span>
              </button>
            </div>

            {selectedCompanyMode === 'existing' ? (
              <div className="space-y-3">
                <Select
                  label="Select Registered Company"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                >
                  {existingCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.industry} · {c.city})
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Company Name"
                  placeholder="e.g. Reliance BioChemicals"
                  value={newCompanyData.name}
                  onChange={(e) => handleNewCompanyNameChange(e.target.value)}
                  required
                />

                {/* Duplicate Warning Prompt (PRD Section 23 / Section 30) */}
                {duplicateWarnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Possible Duplicate Found ({duplicateWarnings.length} similar match)</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      A company with a similar name already exists in CRM:
                    </p>
                    <div className="space-y-1">
                      {duplicateWarnings.map((dw) => (
                        <div key={dw.id} className="flex items-center justify-between bg-white p-2 rounded border border-amber-200">
                          <span className="font-semibold text-foreground">{dw.name} ({dw.city})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompanyId(dw.id);
                              setSelectedCompanyMode('existing');
                              setDuplicateWarnings([]);
                            }}
                            className="text-[11px] text-fairway-800 font-bold hover:underline"
                          >
                            Use Existing →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Official Legal Entity Name"
                    value={newCompanyData.legalName}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, legalName: e.target.value })}
                  />
                  <Input
                    label="City / Hub"
                    value={newCompanyData.city}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, city: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Phone"
                    value={newCompanyData.phone}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, phone: e.target.value })}
                  />
                  <Input
                    label="Email"
                    value={newCompanyData.email}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, email: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 3: CONTACT SELECTION / CREATION ================= */}
        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Step 3: Key Decision Maker / Contact</h4>

            {selectedCompanyMode === 'existing' && currentCompanyContacts.length > 0 && (
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setContactMode('existing')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded border ${
                    contactMode === 'existing' ? 'bg-fairway-100 text-fairway-900 border-fairway-400' : 'bg-surface text-foreground-muted'
                  }`}
                >
                  Select Existing Contact ({currentCompanyContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setContactMode('new')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded border flex items-center justify-center gap-1.5 ${
                    contactMode === 'new' ? 'bg-fairway-100 text-fairway-900 border-fairway-400' : 'bg-surface text-foreground-muted'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Contact</span>
                </button>
              </div>
            )}

            {contactMode === 'existing' && currentCompanyContacts.length > 0 ? (
              <Select
                label="Select Contact"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
              >
                <option value="">Select contact...</option>
                {currentCompanyContacts.map((cnt) => (
                  <option key={cnt.id} value={cnt.id}>
                    {cnt.name} — {cnt.designation} ({cnt.phone})
                  </option>
                ))}
              </Select>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Contact Person Name"
                  placeholder="e.g. Rahul Shah"
                  value={contactData.name}
                  onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Designation"
                    placeholder="e.g. VP Supply Chain"
                    value={contactData.designation}
                    onChange={(e) => setContactData({ ...contactData, designation: e.target.value })}
                  />
                  <Input
                    label="Phone"
                    placeholder="+91 98250 00000"
                    value={contactData.phone}
                    onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                    required
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  placeholder="name@company.com"
                  value={contactData.email}
                  onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                />
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 4: FACILITY SPECS ================= */}
        {step === 4 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Step 4: Physical Facility Linking</h4>

            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={createFacility}
                onChange={(e) => setCreateFacility(e.target.checked)}
                className="rounded text-fairway-600 focus:ring-fairway-600"
              />
              <span>Record physical facility / manufacturing location for map plotting</span>
            </label>

            {createFacility && (
              <div className="space-y-3 p-3.5 bg-surface-muted/50 rounded-lg border border-border">
                <Input
                  label="Facility / Plant Name"
                  value={facilityData.name}
                  onChange={(e) => setFacilityData({ ...facilityData, name: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Facility Type"
                    value={facilityData.type}
                    onChange={(e) => setFacilityData({ ...facilityData, type: e.target.value as any })}
                  >
                    <option value="Warehouse">Warehouse</option>
                    <option value="Manufacturing Plant">Manufacturing Plant</option>
                    <option value="Distribution Center">Distribution Center</option>
                    <option value="R&D Center">R&D Center</option>
                  </Select>
                  <Input
                    label="City"
                    value={facilityData.city}
                    onChange={(e) => setFacilityData({ ...facilityData, city: e.target.value })}
                  />
                </div>
                <Input
                  label="Address / GIDC Plot"
                  value={facilityData.address}
                  onChange={(e) => setFacilityData({ ...facilityData, address: e.target.value })}
                />
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 5: ASSIGNMENT & FOLLOW-UP ================= */}
        {step === 5 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Step 5: Ownership Assignment & First Action</h4>

            <Select
              label="Assigned Lead Owner (Salesperson)"
              value={assignedSalespersonId}
              onChange={(e) => setAssignedSalespersonId(e.target.value)}
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </Select>

            <Input
              type="date"
              label="Initial Follow-up Due Date"
              value={inquiryData.nextFollowUpDate}
              onChange={(e) => setInquiryData({ ...inquiryData, nextFollowUpDate: e.target.value })}
              required
            />

            <Textarea
              label="Next Sales Action Plan"
              value={inquiryData.nextAction}
              onChange={(e) => setInquiryData({ ...inquiryData, nextAction: e.target.value })}
              rows={2}
              required
            />
          </div>
        )}

        {/* ================= STEP 6: PROPERTY MATCHES PREVIEW & DONE ================= */}
        {step === 6 && createdInquiry && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Inquiry {createdInquiry.inquiryNumber} Created Successfully!</h4>
                <p className="text-[11px] text-emerald-800">The opportunity is now active in the pipeline and ready for property matching.</p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Top Matching Warehouse Properties</h5>
              {propertyMatches.slice(0, 3).map((pm) => (
                <div key={pm.property.id} className="p-3 bg-surface border border-border rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{pm.property.name}</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                        {pm.overallScore}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      {pm.matchBreakdown.details[0]} · {formatSqFt(pm.property.availableAreaSqFt)} available @ ₹{pm.property.rentPerSqFtINR}/sq.ft
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onSuccess(createdInquiry.id);
                    }}
                  >
                    Open Workspace
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {step > 1 && step < 6 ? (
            <Button size="sm" variant="outline" onClick={() => setStep(step - 1)} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Previous
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              {step === 6 ? 'Close' : 'Cancel'}
            </Button>

            {step < 5 && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setStep(step + 1)}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next Step
              </Button>
            )}

            {step === 5 && (
              <Button size="sm" variant="primary" onClick={handleFinalCreate} leftIcon={<Sparkles className="w-4 h-4 text-accent-300" />}>
                Create & Match Properties
              </Button>
            )}

            {step === 6 && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onClose();
                  if (createdInquiry) onSuccess(createdInquiry.id);
                }}
              >
                Go to Inquiry Workspace
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
