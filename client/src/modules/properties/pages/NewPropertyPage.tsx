import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  Truck,
  ShieldCheck,
  Building2,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  DollarSign,
  FileText,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  Layers,
  Zap,
  CheckCircle2,
  Sparkles,
  Eye,
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { Property, PropertyStatus } from '@/modules/core/types';
import { PropertyService } from '@/modules/core/services/propertyService';
import { useToast } from '@/modules/core/providers/ToastContext';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';

export interface NewPropertyPageProps {
  onBack: () => void;
  onSuccess: (propertyId: string) => void;
  initialProperty?: Property | null;
}

const STATE_OPTIONS: ComboboxOption[] = [
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Delhi NCR', label: 'Delhi NCR' },
];

const GREEN_BUILDING_OPTIONS: ComboboxOption[] = [
  { value: 'IGBC Platinum Certified', label: 'IGBC Platinum Certified' },
  { value: 'IGBC Gold Certified', label: 'IGBC Gold Certified' },
  { value: 'LEED Platinum Certified', label: 'LEED Platinum Certified' },
  { value: 'LEED Gold Certified', label: 'LEED Gold Certified' },
  { value: 'EDGE Certified', label: 'EDGE Certified' },
  { value: 'None', label: 'None / Standard' },
];

const FIRE_SYSTEMS_OPTIONS: ComboboxOption[] = [
  { value: 'NFPA ESFR K-25 Sprinklers + Central Hydrant Ring', label: 'NFPA ESFR K-25 Sprinklers + Central Hydrant Ring' },
  { value: 'Standard Fire Hydrant System + Smoke Detectors', label: 'Standard Fire Hydrant System + Smoke Detectors' },
  { value: 'High-Density Sprinklers + Smoke Evacuation Vents', label: 'High-Density Sprinklers + Smoke Evacuation Vents' },
  { value: 'Foam Suppression + Hazmat Ring System', label: 'Foam Suppression + Hazmat Ring System' },
];

const TRUCK_ACCESS_OPTIONS: ComboboxOption[] = [
  { value: '40ft Multi-Axle Container Trailer with 38m Concrete Apron', label: '40ft Multi-Axle Container Trailer with 38m Concrete Apron' },
  { value: '40ft Trailer Circulation with 32m Turning Apron', label: '40ft Trailer Circulation with 32m Turning Apron' },
  { value: '32ft Multi-Axle Heavy Truck Direct Access', label: '32ft Multi-Axle Heavy Truck Direct Access' },
  { value: 'Dual-Side Cross-Docking Staging Apron', label: 'Dual-Side Cross-Docking Staging Apron' },
];

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200&auto=format&fit=crop&q=80',
];

const STATUS_OPTIONS: ComboboxOption[] = [
  {
    value: 'Available',
    label: 'Available',
    description: 'Ready for immediate occupancy',
    icon: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />,
  },
  {
    value: 'Partially Leased',
    label: 'Partially Leased',
    description: 'Portion of warehouse space leased',
    icon: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />,
  },
  {
    value: 'Under Development',
    label: 'Under Development',
    description: 'Under construction or completion',
    icon: <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />,
  },
  {
    value: 'Fully Leased',
    label: 'Fully Leased',
    description: '100% occupied / unavailable',
    icon: <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />,
  },
];

const CURATED_INDUSTRIES = [
  '3PL & Logistics',
  'E-Commerce Fulfillment',
  'Automotive & EV Components',
  'Pharma & Healthcare',
  'Engineering & Heavy Industrial',
  'FMCG & Consumer Goods',
  'Cold Chain & Agro-Logistics',
  'Specialty Chemicals (GIDC Approved)',
];

export const NewPropertyPage: React.FC<NewPropertyPageProps> = ({ onBack, onSuccess, initialProperty }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [corridors, setCorridors] = useState<string[]>([]);
  const [dbIndustries, setDbIndustries] = useState<string[]>([]);

  useEffect(() => {
    PropertyService.getCorridors().then((res) => {
      if (res.success && res.data) {
        setCorridors(res.data.map((c: any) => c.corridor || c).filter(Boolean));
      }
    });
    PropertyService.getIndustries().then((res) => {
      if (res.success && res.data) {
        setDbIndustries(res.data);
      }
    });
  }, []);

  const corridorComboboxOptions = useMemo<ComboboxOption[]>(
    () => corridors.map((c) => ({ value: c, label: c })),
    [corridors]
  );

  // Auto Code Generator helper
  const generateRandomCode = (corr?: string) => {
    const prefix = corr ? corr.slice(0, 3).toUpperCase() : 'PROP';
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
  };

  // Form State
  const [name, setName] = useState(initialProperty?.name || '');
  const [code, setCode] = useState(initialProperty?.code || generateRandomCode('SAN'));
  const [status, setStatus] = useState<PropertyStatus | ''>(initialProperty?.status || 'Available');

  // Location
  const [corridor, setCorridor] = useState(initialProperty?.corridor || 'Sanand Industrial Corridor');
  const [city, setCity] = useState(initialProperty?.city || 'Ahmedabad');
  const [state, setState] = useState(initialProperty?.state || 'Gujarat');
  const [pincode, setPincode] = useState(initialProperty?.pincode || '382110');
  const [location, setLocation] = useState(initialProperty?.location || '');
  const [latitude, setLatitude] = useState<number | ''>(initialProperty?.latitude ?? 22.9868);
  const [longitude, setLongitude] = useState<number | ''>(initialProperty?.longitude ?? 72.3812);

  // Dimensions & Commercials
  const [totalAreaSqFt, setTotalAreaSqFt] = useState<number | ''>(initialProperty?.totalAreaSqFt ?? '');
  const [availableAreaSqFt, setAvailableAreaSqFt] = useState<number | ''>(initialProperty?.availableAreaSqFt ?? '');
  const [rentPerSqFtINR, setRentPerSqFtINR] = useState<number | ''>(initialProperty?.rentPerSqFtINR ?? '');
  const [depositMonths, setDepositMonths] = useState<number | ''>(initialProperty?.depositMonths ?? 3);
  const [leaseTermsYears, setLeaseTermsYears] = useState<number | ''>(initialProperty?.leaseTermsYears ?? 5);
  const [availabilityDate, setAvailabilityDate] = useState(
    initialProperty?.availabilityDate || new Date().toISOString().split('T')[0]
  );

  // Specifications
  const [clearHeightFt, setClearHeightFt] = useState<number | ''>(initialProperty?.clearHeightFt ?? 12);
  const [docksCount, setDocksCount] = useState<number | ''>(initialProperty?.docksCount ?? 8);
  const [flooringCapacityMT, setFlooringCapacityMT] = useState<number | ''>(initialProperty?.flooringCapacityMT ?? 6);
  const [powerKVA, setPowerKVA] = useState<number | ''>(initialProperty?.powerKVA ?? 250);
  const [parkingSlots, setParkingSlots] = useState<number | ''>(initialProperty?.parkingSlots ?? 20);
  const [fireSystems, setFireSystems] = useState(
    initialProperty?.fireSystems || 'NFPA ESFR K-25 Sprinklers + Central Hydrant Ring'
  );
  const [truckAccess, setTruckAccess] = useState(
    initialProperty?.truckAccess || '40ft Multi-Axle Container Trailer with 38m Concrete Apron'
  );
  const [greenBuildingCert, setGreenBuildingCert] = useState(initialProperty?.greenBuildingCert || 'IGBC Gold Certified');
  const [cctvSecurity, setCctvSecurity] = useState(initialProperty?.cctvSecurity !== undefined ? initialProperty.cctvSecurity : true);

  // Combined cleaned industry list
  const allIndustryOptions = useMemo(() => {
    const set = new Set([...CURATED_INDUSTRIES, ...(initialProperty?.suitableIndustries || [])]);
    return Array.from(set);
  }, [initialProperty]);

  const [suitableIndustries, setSuitableIndustries] = useState<string[]>(
    initialProperty?.suitableIndustries && initialProperty.suitableIndustries.length > 0
      ? initialProperty.suitableIndustries
      : ['3PL & Logistics', 'E-Commerce Fulfillment']
  );
  const [description, setDescription] = useState(
    initialProperty?.description ||
      'State-of-the-art Grade-A industrial facility designed for high-throughput logistics, heavy manufacturing, and distribution operations with world-class infrastructure.'
  );

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleIndustry = (ind: string) => {
    clearError('suitableIndustries');
    if (suitableIndustries.includes(ind)) {
      setSuitableIndustries(suitableIndustries.filter((i) => i !== ind));
    } else {
      setSuitableIndustries([...suitableIndustries, ind]);
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Warehouse / Property name is required';
    if (!code.trim()) errs.code = 'Property code is required';
    if (!status) errs.status = 'Listing status is required';
    if (!corridor.trim()) errs.corridor = 'Industrial corridor is required';
    if (!city.trim()) errs.city = 'City / District is required';
    if (!state.trim()) errs.state = 'State is required';
    if (!pincode.trim()) errs.pincode = 'PIN code is required';
    if (!location.trim()) errs.location = 'Micro-market / Site address is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!totalAreaSqFt || Number(totalAreaSqFt) <= 0) errs.totalAreaSqFt = 'Valid total park area is required (sq.ft)';
    if (!availableAreaSqFt || Number(availableAreaSqFt) <= 0) errs.availableAreaSqFt = 'Valid available space is required (sq.ft)';
    if (totalAreaSqFt && availableAreaSqFt && Number(availableAreaSqFt) > Number(totalAreaSqFt)) {
      errs.availableAreaSqFt = 'Available space cannot exceed total park area';
    }
    if (!rentPerSqFtINR || Number(rentPerSqFtINR) <= 0) errs.rentPerSqFtINR = 'Valid base monthly rent is required (₹ / sq.ft)';
    if (!depositMonths || Number(depositMonths) <= 0) errs.depositMonths = 'Security deposit months is required';
    if (!leaseTermsYears || Number(leaseTermsYears) <= 0) errs.leaseTermsYears = 'Lease term years is required';
    if (!availabilityDate.trim()) errs.availabilityDate = 'Availability date is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!clearHeightFt || Number(clearHeightFt) <= 0) errs.clearHeightFt = 'Clear height is required (meters)';
    if (docksCount === '' || Number(docksCount) < 0) errs.docksCount = 'Valid hydraulic docks count is required';
    if (!flooringCapacityMT || Number(flooringCapacityMT) <= 0) errs.flooringCapacityMT = 'Floor load capacity is required (MT)';
    if (!powerKVA || Number(powerKVA) <= 0) errs.powerKVA = 'Connected power is required (KVA)';
    if (!fireSystems.trim()) errs.fireSystems = 'Fire safety specification is required';
    if (!truckAccess.trim()) errs.truckAccess = 'Truck circulation / apron is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 4 Validation
  const validateStep4 = () => {
    const errs: Record<string, string> = {};
    if (suitableIndustries.length === 0) errs.suitableIndustries = 'Select at least one suitable industry segment';
    if (!description.trim()) errs.description = 'Marketing overview / description is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateStep1()) {
      setCurrentStep(1);
      toast('Validation Error', { message: 'Please complete all required fields in Step 1.', type: 'error' });
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      toast('Validation Error', { message: 'Please complete all required fields in Step 2.', type: 'error' });
      return;
    }
    if (!validateStep3()) {
      setCurrentStep(3);
      toast('Validation Error', { message: 'Please complete all required fields in Step 3.', type: 'error' });
      return;
    }
    if (!validateStep4()) {
      setCurrentStep(4);
      toast('Validation Error', { message: 'Please select industries and provide a brief description.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    const propertyPayload: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> = {
      code: code.trim(),
      name: name.trim(),
      location: location.trim(),
      corridor,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      totalAreaSqFt: Number(totalAreaSqFt),
      availableAreaSqFt: Number(availableAreaSqFt),
      rentPerSqFtINR: Number(rentPerSqFtINR),
      depositMonths: Number(depositMonths),
      leaseTermsYears: Number(leaseTermsYears),
      availabilityDate,
      clearHeightFt: Number(clearHeightFt),
      docksCount: Number(docksCount),
      fireSystems: fireSystems.trim(),
      powerKVA: Number(powerKVA),
      parkingSlots: Number(parkingSlots) || 20,
      truckAccess: truckAccess.trim(),
      flooringCapacityMT: Number(flooringCapacityMT),
      cctvSecurity,
      greenBuildingCert: greenBuildingCert.trim() || 'None',
      latitude: Number(latitude) || 22.9868,
      longitude: Number(longitude) || 72.3812,
      photos: initialProperty?.photos || [],
      status: status as PropertyStatus,
      amenities: [
        '24/7 Security Guarding',
        'CCTV Perimeter Surveillance',
        'LED Energy Saving Lighting',
        'Storm Water Drainage System',
        'Driver Restroom & Canteen',
        'Weighbridge Facility',
      ],
      suitableIndustries,
      description: description.trim(),
    };

    try {
      const res = initialProperty
        ? await PropertyService.updateProperty(initialProperty.id, propertyPayload)
        : await PropertyService.createProperty(propertyPayload);

      if (res.success && res.data) {
        toast(initialProperty ? 'Warehouse Updated Successfully' : 'Warehouse Created Successfully', {
          message: `${res.data.name || name} has been saved to the backend inventory.`,
          type: 'success',
        });
        onSuccess(res.data.id || initialProperty?.id || '');
      } else {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Failed to save warehouse to backend.';
        toast(initialProperty ? 'Failed to Update Warehouse' : 'Failed to Create Warehouse', {
          message: msg,
          type: 'error',
        });
      }
    } catch (err: any) {
      toast('Network Error', {
        message: err.message || 'Cannot reach backend server. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Monthly Revenue Calculation
  const estimatedMonthlyGross =
    availableAreaSqFt && rentPerSqFtINR ? Number(availableAreaSqFt) * Number(rentPerSqFtINR) : 0;

  const stepsList = [
    { num: 1, title: 'Identity & Location', sub: 'Name, corridor, address' },
    { num: 2, title: 'Space & Commercials', sub: 'Area, rent, lease terms' },
    { num: 3, title: 'Technical Specs', sub: 'Height, docks, floor load' },
    { num: 4, title: 'Verticals & Review', sub: 'Industries, overview & publish' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground text-left py-4 sm:py-6 px-3 sm:px-6 lg:px-8 pb-28 sm:pb-12">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
                Industrial Real Estate / Property Master
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{initialProperty ? 'Edit Warehouse Property' : 'Create Warehouse Property'}</span>
                <Badge variant="outline" size="sm" className="hidden sm:inline-flex text-[11px]">
                  {initialProperty ? `ID: ${initialProperty.code}` : 'New Listing'}
                </Badge>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs font-semibold rounded-xl"
            >
              Back to Catalog
            </Button>
          </div>
        </div>

        {/* 4-STEP INTERACTIVE PROGRESS BAR */}
        <div className="bg-surface border border-border rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="grid grid-cols-4 gap-2">
            {stepsList.map((st) => {
              const isDone = currentStep > st.num;
              const isCurrent = currentStep === st.num;
              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    if (st.num < currentStep) setCurrentStep(st.num as any);
                    else if (st.num === currentStep + 1) handleNext();
                  }}
                  className={`text-left p-2 sm:p-3 rounded-xl transition-all cursor-pointer flex flex-col justify-between border ${
                    isCurrent
                      ? 'bg-fairway-500/10 border-fairway-500/30 text-fairway-700 dark:text-fairway-300 shadow-xs'
                      : isDone
                      ? 'bg-surface-muted/40 border-border text-foreground hover:bg-surface-muted'
                      : 'border-transparent text-foreground-muted opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-fairway-600 text-white'
                          : 'bg-surface-muted text-foreground-muted'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : st.num}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider hidden md:inline-block">
                      Step {st.num}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs sm:text-sm font-bold block truncate">{st.title}</span>
                    <span className="text-[10px] text-foreground-muted hidden sm:block truncate mt-0.5">{st.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= STEP 1: PROPERTY IDENTITY & LOCATION ================= */}
        {currentStep === 1 && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 animate-fade-in">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-fairway-600" />
                <span>Step 1: Property Identity & Location</span>
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Core identity, regional corridor, and geographical address
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Warehouse Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Warehouse / Park Name</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fairway Logistics Park Sanand - Phase 1"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError('name');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground placeholder:text-foreground-muted/60 h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.name && <p className="text-[11px] text-rose-500 font-medium">{errors.name}</p>}
              </div>

              {/* Property Code with Auto-Generator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Property Code</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCode(generateRandomCode(corridor))}
                    className="text-[10px] text-fairway-600 dark:text-fairway-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto-Gen
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. PROP-SAN-001"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    clearError('code');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.code ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm font-mono text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.code && <p className="text-[11px] text-rose-500 font-medium">{errors.code}</p>}
              </div>

              {/* Listing Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Listing Status</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={(val) => {
                    setStatus(val as PropertyStatus);
                    clearError('status');
                  }}
                  placeholder="Select listing status..."
                  triggerClassName={`rounded-xl h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.status ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.status && <p className="text-[11px] text-rose-500 font-medium">{errors.status}</p>}
              </div>

              {/* Corridor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Industrial Corridor / Belt</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={corridorComboboxOptions}
                  value={corridor}
                  onChange={(val) => {
                    setCorridor(val);
                    clearError('corridor');
                  }}
                  placeholder="Select industrial corridor..."
                  triggerClassName={`rounded-xl h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.corridor ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.corridor && <p className="text-[11px] text-rose-500 font-medium">{errors.corridor}</p>}
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>City / District</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    clearError('city');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.city ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.city && <p className="text-[11px] text-rose-500 font-medium">{errors.city}</p>}
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>State</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={STATE_OPTIONS}
                  value={state}
                  onChange={(val) => {
                    setState(val);
                    clearError('state');
                  }}
                  placeholder="Select state..."
                  triggerClassName={`rounded-xl h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.state ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.state && <p className="text-[11px] text-rose-500 font-medium">{errors.state}</p>}
              </div>

              {/* PIN Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>PIN Code</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 382110"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    clearError('pincode');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.pincode ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.pincode && <p className="text-[11px] text-rose-500 font-medium">{errors.pincode}</p>}
              </div>

              {/* Full Address */}
              <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Full Micro-Market / Site Address</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42-45, Sanand GIDC Phase II, Near Tata Motors Plant"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    clearError('location');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.location ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.location && <p className="text-[11px] text-rose-500 font-medium">{errors.location}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SPACE & COMMERCIALS ================= */}
        {currentStep === 2 && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 animate-fade-in">
            <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-fairway-600" />
                  <span>Step 2: Space & Commercial Terms</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Leasable dimensions, base rate, security deposits, and possession schedule
                </p>
              </div>

              {/* Real-time Calculation Badge */}
              {estimatedMonthlyGross > 0 && (
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gross: ~ {formatINR(estimatedMonthlyGross, true)}/mo</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Park Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Total Park Area (sq.ft)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 180000"
                  value={totalAreaSqFt}
                  onChange={(e) => {
                    setTotalAreaSqFt(e.target.value ? Number(e.target.value) : '');
                    clearError('totalAreaSqFt');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.totalAreaSqFt ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.totalAreaSqFt && <p className="text-[11px] text-rose-500 font-medium">{errors.totalAreaSqFt}</p>}
              </div>

              {/* Available Space with Helper */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Available Space (sq.ft)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {totalAreaSqFt && (
                    <button
                      type="button"
                      onClick={() => setAvailableAreaSqFt(Number(totalAreaSqFt))}
                      className="text-[10px] text-fairway-600 dark:text-fairway-400 font-bold hover:underline cursor-pointer"
                    >
                      = Same as Total
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 125000"
                  value={availableAreaSqFt}
                  onChange={(e) => {
                    setAvailableAreaSqFt(e.target.value ? Number(e.target.value) : '');
                    clearError('availableAreaSqFt');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.availableAreaSqFt ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.availableAreaSqFt && <p className="text-[11px] text-rose-500 font-medium">{errors.availableAreaSqFt}</p>}
              </div>

              {/* Base Rent with Currency Symbol */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Base Rent (₹ / sq.ft / mo)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-foreground-muted font-bold">₹</span>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="e.g. 24.5"
                    value={rentPerSqFtINR}
                    onChange={(e) => {
                      setRentPerSqFtINR(e.target.value ? Number(e.target.value) : '');
                      clearError('rentPerSqFtINR');
                    }}
                    className={`w-full pl-8 bg-surface-muted/60 dark:bg-[#18202b] border ${
                      errors.rentPerSqFtINR ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                    } rounded-xl text-sm text-foreground h-10 pr-3.5 focus:border-fairway-600 focus:outline-none`}
                  />
                </div>
                {errors.rentPerSqFtINR && <p className="text-[11px] text-rose-500 font-medium">{errors.rentPerSqFtINR}</p>}
              </div>

              {/* Security Deposit with Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Security Deposit (Months)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="flex gap-1">
                    {[3, 6].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDepositMonths(m)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          depositMonths === m
                            ? 'bg-fairway-600 text-white border-fairway-600'
                            : 'border-border text-foreground-muted hover:bg-surface-muted'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 3"
                  value={depositMonths}
                  onChange={(e) => {
                    setDepositMonths(e.target.value ? Number(e.target.value) : '');
                    clearError('depositMonths');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.depositMonths ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.depositMonths && <p className="text-[11px] text-rose-500 font-medium">{errors.depositMonths}</p>}
              </div>

              {/* Lease Term with Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Lease Term (Years)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="flex gap-1">
                    {[3, 5, 9].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setLeaseTermsYears(y)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          leaseTermsYears === y
                            ? 'bg-fairway-600 text-white border-fairway-600'
                            : 'border-border text-foreground-muted hover:bg-surface-muted'
                        }`}
                      >
                        {y}y
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 5"
                  value={leaseTermsYears}
                  onChange={(e) => {
                    setLeaseTermsYears(e.target.value ? Number(e.target.value) : '');
                    clearError('leaseTermsYears');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.leaseTermsYears ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.leaseTermsYears && <p className="text-[11px] text-rose-500 font-medium">{errors.leaseTermsYears}</p>}
              </div>

              {/* Available From Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Available From</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <DatePicker
                  value={availabilityDate}
                  onChange={(val) => {
                    setAvailabilityDate(val);
                    clearError('availabilityDate');
                  }}
                  placeholder="Select availability date"
                  className={errors.availabilityDate ? 'border-rose-500 ring-1 ring-rose-500' : ''}
                />
                {errors.availabilityDate && <p className="text-[11px] text-rose-500 font-medium">{errors.availabilityDate}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: TECHNICAL & LOGISTICS SPECS ================= */}
        {currentStep === 3 && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 animate-fade-in">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-fairway-600" />
                <span>Step 3: Technical Specifications & Safety</span>
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Engineering benchmarks, load limits, power infrastructure, and compliance standards
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Clear Height */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Clear Height (Meters)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 12"
                  value={clearHeightFt}
                  onChange={(e) => {
                    setClearHeightFt(e.target.value ? Number(e.target.value) : '');
                    clearError('clearHeightFt');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.clearHeightFt ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {clearHeightFt ? (
                  <span className="text-[10px] text-foreground-muted block">
                    ~ {(Number(clearHeightFt) * 3.28).toFixed(1)} ft headroom
                  </span>
                ) : null}
                {errors.clearHeightFt && <p className="text-[11px] text-rose-500 font-medium">{errors.clearHeightFt}</p>}
              </div>

              {/* Docks Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Hydraulic Docks</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 8"
                  value={docksCount}
                  onChange={(e) => {
                    setDocksCount(e.target.value ? Number(e.target.value) : '');
                    clearError('docksCount');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.docksCount ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.docksCount && <p className="text-[11px] text-rose-500 font-medium">{errors.docksCount}</p>}
              </div>

              {/* Flooring Capacity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Floor Load (MT/sq.m)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 6"
                  value={flooringCapacityMT}
                  onChange={(e) => {
                    setFlooringCapacityMT(e.target.value ? Number(e.target.value) : '');
                    clearError('flooringCapacityMT');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.flooringCapacityMT ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.flooringCapacityMT && <p className="text-[11px] text-rose-500 font-medium">{errors.flooringCapacityMT}</p>}
              </div>

              {/* Connected Power */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Power (KVA)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={powerKVA}
                  onChange={(e) => {
                    setPowerKVA(e.target.value ? Number(e.target.value) : '');
                    clearError('powerKVA');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.powerKVA ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.powerKVA && <p className="text-[11px] text-rose-500 font-medium">{errors.powerKVA}</p>}
              </div>

              {/* Fire Safety Standards */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Fire Safety & Suppression</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={FIRE_SYSTEMS_OPTIONS}
                  value={fireSystems}
                  onChange={(val) => {
                    setFireSystems(val);
                    clearError('fireSystems');
                  }}
                  placeholder="Select fire safety standard..."
                  triggerClassName={`rounded-xl h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.fireSystems ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.fireSystems && <p className="text-[11px] text-rose-500 font-medium">{errors.fireSystems}</p>}
              </div>

              {/* Truck Access & Circulation */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Truck Circulation & Apron</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={TRUCK_ACCESS_OPTIONS}
                  value={truckAccess}
                  onChange={(val) => {
                    setTruckAccess(val);
                    clearError('truckAccess');
                  }}
                  placeholder="Select truck circulation & apron type..."
                  triggerClassName={`rounded-xl h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.truckAccess ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.truckAccess && <p className="text-[11px] text-rose-500 font-medium">{errors.truckAccess}</p>}
              </div>

              {/* Green Building Rating */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Green Building Rating</span>
                </label>
                <Combobox
                  options={GREEN_BUILDING_OPTIONS}
                  value={greenBuildingCert}
                  onChange={(val) => setGreenBuildingCert(val)}
                  placeholder="Select green building rating..."
                  triggerClassName="rounded-xl h-10 bg-surface-muted/60 dark:bg-[#18202b]"
                />
              </div>

              {/* 24/7 Gated Security & Staging Bays */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Security & Parking Slots</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center gap-2 h-10 px-3.5 bg-surface-muted/40 dark:bg-[#18202b]/60 border border-border rounded-xl cursor-pointer hover:border-fairway-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={cctvSecurity}
                      onChange={(e) => setCctvSecurity(e.target.checked)}
                      className="w-4 h-4 rounded text-fairway-600 focus:ring-fairway-500 border-border cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-foreground">24/7 Gated Security & CCTV</span>
                  </label>
                  <input
                    type="number"
                    placeholder="20 Bays"
                    value={parkingSlots}
                    onChange={(e) => setParkingSlots(e.target.value ? Number(e.target.value) : '')}
                    className="w-24 bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-xl text-xs text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none"
                    title="Staging Parking Bays"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PHOTOS, INDUSTRIES & REVIEW ================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            {/* Suitable Industries & Marketing Description */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-fairway-600" />
                  <span>Step 4: Industry Suitability & Final Review</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Select target occupant sectors, review property highlights, and verify listing dossier
                </p>
              </div>

              {/* Clean Deduplicated Industry Tags */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Suitable Industry Verticals</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div
                  className={`flex flex-wrap gap-2 p-3.5 rounded-xl border ${
                    errors.suitableIndustries
                      ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/10'
                      : 'border-border/80 bg-surface-muted/30'
                  }`}
                >
                  {allIndustryOptions.map((ind) => {
                    const isSelected = suitableIndustries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => toggleIndustry(ind)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-fairway-600 text-white shadow-xs'
                            : 'bg-surface hover:bg-surface-muted text-foreground border border-border/80'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{ind}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.suitableIndustries && <p className="text-[11px] text-rose-500 font-medium">{errors.suitableIndustries}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Marketing Overview & Key Highlights</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe PEB steel framework, clear height advantages, apron maneuvering, and location benefits..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearError('description');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.description ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-xl text-sm text-foreground p-3 focus:border-fairway-600 focus:outline-none`}
                />
                {errors.description && <p className="text-[11px] text-rose-500 font-medium">{errors.description}</p>}
              </div>
            </div>

            {/* LIVE DOSSIER PREVIEW CARD */}
            <div className="bg-fairway-500/5 dark:bg-fairway-500/10 border border-fairway-500/20 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fairway-700 dark:text-fairway-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> Live Warehouse Summary Preview
                </span>
                <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5 rounded-md">
                  {code || 'PROP-XXX'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] text-foreground-muted block">Available Area</span>
                  <span className="text-sm sm:text-base font-extrabold text-foreground block mt-0.5">
                    {availableAreaSqFt ? formatSqFt(Number(availableAreaSqFt)) : '—'}
                  </span>
                  <span className="text-[10px] text-foreground-muted block truncate">
                    of {totalAreaSqFt ? formatSqFt(Number(totalAreaSqFt)) : '—'} total
                  </span>
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] text-foreground-muted block">Base Asking Rent</span>
                  <span className="text-sm sm:text-base font-extrabold text-foreground block mt-0.5">
                    ₹{rentPerSqFtINR || '0'}/sq.ft
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                    ~ {formatINR(estimatedMonthlyGross, true)}/mo
                  </span>
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] text-foreground-muted block">Clear Height</span>
                  <span className="text-sm sm:text-base font-extrabold text-foreground block mt-0.5">
                    {clearHeightFt || '0'} Meters
                  </span>
                  <span className="text-[10px] text-foreground-muted block">
                    ~ {(Number(clearHeightFt || 0) * 3.28).toFixed(1)} ft headroom
                  </span>
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] text-foreground-muted block">Docks & Logistics</span>
                  <span className="text-sm sm:text-base font-extrabold text-foreground block mt-0.5">
                    {docksCount || '0'} Bays
                  </span>
                  <span className="text-[10px] text-foreground-muted block truncate">
                    {flooringCapacityMT || '0'} MT Floor Load
                  </span>
                </div>
              </div>

              <div className="text-xs text-foreground-muted flex items-center gap-2 flex-wrap pt-1">
                <MapPin className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                <span className="font-semibold text-foreground">{name || 'Warehouse Name'}</span>
                <span>·</span>
                <span>{corridor}</span>
                <span>·</span>
                <span>{city}, {state}</span>
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP FOOTER NAVIGATION */}
        <div className="hidden sm:flex items-center justify-between pt-4 border-t border-border">
          <div>
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handlePrev}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="rounded-xl text-xs font-bold"
              >
                Previous Step
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onBack}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Next: {stepsList[currentStep]?.title}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => handleSubmit()}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                {initialProperty ? 'Update Warehouse Asset' : 'Publish Warehouse Listing'}
              </Button>
            )}
          </div>
        </div>

        {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur-lg border-t border-border z-30 shadow-lg flex items-center justify-between gap-2">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="rounded-xl text-xs font-bold flex-1 justify-center"
            >
              Previous
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="rounded-xl text-xs font-bold flex-1 justify-center"
            >
              Cancel
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-bold text-xs rounded-xl shadow-xs flex-1 justify-center"
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSubmit()}
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-bold text-xs rounded-xl shadow-xs flex-1 justify-center"
            >
              Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewPropertyPage;
