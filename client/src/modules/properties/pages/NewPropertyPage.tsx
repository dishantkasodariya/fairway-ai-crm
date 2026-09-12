import React, { useState } from 'react';
import {
  Warehouse,
  ArrowLeft,
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
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { Property, PropertyStatus } from '@/modules/core/types';
import { PropertyService } from '@/modules/core/services/propertyService';
import { StorageService } from '@/modules/core/services/storageService';
import { useToast } from '@/modules/core/providers/ToastContext';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';

export interface NewPropertyPageProps {
  onBack: () => void;
  onSuccess: (propertyId: string) => void;
}

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
  'Bhiwandi / NH-3 Corridor',
  'Chakan - Talegaon MIDC',
  'Oragadam Industrial Corridor',
  'Bilaspur - Tauru Road Corridor',
];

const CORRIDOR_COMBOBOX_OPTIONS: ComboboxOption[] = CORRIDOR_OPTIONS.map((c) => ({
  value: c,
  label: c,
}));

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

const INDUSTRY_OPTIONS = [
  '3PL & Logistics',
  'E-Commerce & Retail',
  'Automotive & Ancillary',
  'FMCG & Consumer Goods',
  'Pharma & Healthcare',
  'Cold Chain & Perishables',
  'Heavy Engineering',
  'Electronics & High-Tech',
  'Chemical & Specialized',
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

export const NewPropertyPage: React.FC<NewPropertyPageProps> = ({ onBack, onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: 100% Empty Clean Slate
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<PropertyStatus | ''>('');

  // Location
  const [corridor, setCorridor] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');

  // Dimensions & Commercials
  const [totalAreaSqFt, setTotalAreaSqFt] = useState<number | ''>('');
  const [availableAreaSqFt, setAvailableAreaSqFt] = useState<number | ''>('');
  const [rentPerSqFtINR, setRentPerSqFtINR] = useState<number | ''>('');
  const [depositMonths, setDepositMonths] = useState<number | ''>('');
  const [leaseTermsYears, setLeaseTermsYears] = useState<number | ''>('');
  const [availabilityDate, setAvailabilityDate] = useState('');

  // Specifications
  const [clearHeightFt, setClearHeightFt] = useState<number | ''>('');
  const [docksCount, setDocksCount] = useState<number | ''>('');
  const [flooringCapacityMT, setFlooringCapacityMT] = useState<number | ''>('');
  const [powerKVA, setPowerKVA] = useState<number | ''>('');
  const [parkingSlots, setParkingSlots] = useState<number | ''>('');
  const [fireSystems, setFireSystems] = useState('');
  const [truckAccess, setTruckAccess] = useState('');
  const [greenBuildingCert, setGreenBuildingCert] = useState('');
  const [cctvSecurity, setCctvSecurity] = useState(false);

  // Industries & Description
  const [suitableIndustries, setSuitableIndustries] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

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

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    setPhotos([...photos, newPhotoUrl.trim()]);
    setNewPhotoUrl('');
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Warehouse / Property name is required';
    if (!code.trim()) errs.code = 'Property code is required';
    if (!status) errs.status = 'Listing status is required';
    if (!corridor.trim()) errs.corridor = 'Industrial corridor is required';
    if (!city.trim()) errs.city = 'City / District is required';
    if (!state.trim()) errs.state = 'State is required';
    if (!pincode.trim()) errs.pincode = 'PIN code is required';
    if (!location.trim()) errs.location = 'Micro-market / Site address is required';
    if (!totalAreaSqFt || Number(totalAreaSqFt) <= 0) errs.totalAreaSqFt = 'Valid total park area is required (sq.ft)';
    if (!availableAreaSqFt || Number(availableAreaSqFt) <= 0) errs.availableAreaSqFt = 'Valid available space is required (sq.ft)';
    if (totalAreaSqFt && availableAreaSqFt && Number(availableAreaSqFt) > Number(totalAreaSqFt)) {
      errs.availableAreaSqFt = 'Available space cannot exceed total park area';
    }
    if (!rentPerSqFtINR || Number(rentPerSqFtINR) <= 0) errs.rentPerSqFtINR = 'Valid base monthly rent is required (₹ / sq.ft)';
    if (!depositMonths || Number(depositMonths) <= 0) errs.depositMonths = 'Security deposit months is required';
    if (!leaseTermsYears || Number(leaseTermsYears) <= 0) errs.leaseTermsYears = 'Lease term years is required';
    if (!availabilityDate.trim()) errs.availabilityDate = 'Availability date is required';
    if (!clearHeightFt || Number(clearHeightFt) <= 0) errs.clearHeightFt = 'Clear height is required (meters)';
    if (docksCount === '' || Number(docksCount) < 0) errs.docksCount = 'Valid hydraulic docks count is required';
    if (!flooringCapacityMT || Number(flooringCapacityMT) <= 0) errs.flooringCapacityMT = 'Floor load capacity is required (MT)';
    if (!powerKVA || Number(powerKVA) <= 0) errs.powerKVA = 'Connected power is required (KVA)';
    if (!fireSystems.trim()) errs.fireSystems = 'Fire safety specification is required';
    if (!truckAccess.trim()) errs.truckAccess = 'Truck circulation / apron is required';
    if (suitableIndustries.length === 0) errs.suitableIndustries = 'Select at least one suitable industry segment';
    if (!description.trim()) errs.description = 'Marketing overview / description is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast('Validation Error', {
        message: 'Please fill in all mandatory fields highlighted in red.',
        type: 'error',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      latitude: Number(latitude) || 21.7051,
      longitude: Number(longitude) || 72.5847,
      photos: photos.length > 0 ? photos : DEFAULT_PHOTOS,
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
      const res = await PropertyService.createProperty(propertyPayload);
      if (res.success && res.data) {
        toast('Warehouse Created Successfully', {
          message: `${res.data.name || name} has been published to the backend inventory.`,
          type: 'success',
        });
        onSuccess(res.data.id);
      } else {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Failed to save warehouse to backend.';
        toast('Failed to Create Warehouse', {
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

  return (
    <div className="min-h-screen bg-background text-foreground text-left py-4 sm:py-6 px-2 sm:px-0 lg:px-0">
      {/* 8XL Spacious Container */}
      <div className="max-w-7xl 2xl:max-w-8xl mx-auto w-full space-y-4 sm:space-y-6">
        {/* Top Header Pattern without template dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fairway-100 dark:bg-fairway-950/80 border border-fairway-300 dark:border-fairway-800/80 flex items-center justify-center text-fairway-700 dark:text-fairway-400 shrink-0 shadow-xs">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
                Industrial Real Estate / Property Master
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Create Warehouse Property</span>
                <Badge variant="outline" size="sm" className="hidden sm:inline-flex text-[11px]">
                  New Listing
                </Badge>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="border-border text-foreground hover:bg-surface-muted justify-center"
            >
              Back
            </Button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm space-y-6 sm:space-y-8">
          {/* ================= SECTION 1: BASIC INFORMATION ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Basic Information</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Core identification and operational status of the facility</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Warehouse Name */}
              <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Property / Warehouse Name</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fairway Horizon Logistics Park Grade-A"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError('name');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground placeholder:text-foreground-muted/60 h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.name && <p className="text-[11px] text-rose-500 font-medium">{errors.name}</p>}
              </div>

              {/* Property Code */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Property Code</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. WH-108"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    clearError('code');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.code ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm font-mono text-foreground placeholder:text-foreground-muted/60 h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.code && <p className="text-[11px] text-rose-500 font-medium">{errors.code}</p>}
              </div>

              {/* Status with Combobox */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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
                  searchPlaceholder="Search listing status..."
                  triggerClassName={`rounded-lg h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.status ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.status && <p className="text-[11px] text-rose-500 font-medium">{errors.status}</p>}
              </div>

              {/* Green Building Cert with Combobox */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Green Building Rating</span>
                </label>
                <Combobox
                  options={GREEN_BUILDING_OPTIONS}
                  value={greenBuildingCert}
                  onChange={(val) => setGreenBuildingCert(val)}
                  placeholder="Select green building rating..."
                  searchPlaceholder="Search green building rating..."
                  triggerClassName="rounded-lg h-10 bg-surface-muted/60 dark:bg-[#18202b]"
                />
              </div>

              {/* CCTV & Security Checkbox */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Facility Security</span>
                </label>
                <label className="flex items-center gap-2.5 h-10 px-3.5 bg-surface-muted/40 dark:bg-[#18202b]/60 border border-border rounded-lg cursor-pointer hover:border-fairway-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={cctvSecurity}
                    onChange={(e) => setCctvSecurity(e.target.checked)}
                    className="w-4 h-4 rounded text-fairway-600 focus:ring-fairway-500 border-border cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-foreground">24/7 Gated Security & CCTV</span>
                </label>
              </div>
            </div>
          </div>

          <div className="border-b border-border/80" />

          {/* ================= SECTION 2: LOCATION & MICRO-MARKET ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Location & Corridor Details</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Geographic position, arterial highways, and corridor connectivity</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Corridor with Combobox */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Industrial Corridor / Belt</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Combobox
                  options={CORRIDOR_COMBOBOX_OPTIONS}
                  value={corridor}
                  onChange={(val) => {
                    setCorridor(val);
                    clearError('corridor');
                  }}
                  placeholder="Select industrial corridor..."
                  searchPlaceholder="Search industrial corridor..."
                  triggerClassName={`rounded-lg h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.corridor ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.corridor && <p className="text-[11px] text-rose-500 font-medium">{errors.corridor}</p>}
              </div>

              {/* City */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>City / District</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bharuch / Ahmedabad / Surat"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    clearError('city');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.city ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.city && <p className="text-[11px] text-rose-500 font-medium">{errors.city}</p>}
              </div>

              {/* State with Combobox */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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
                  searchPlaceholder="Search state..."
                  triggerClassName={`rounded-lg h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.state ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.state && <p className="text-[11px] text-rose-500 font-medium">{errors.state}</p>}
              </div>

              {/* PIN Code */}
              <div className="sm:col-span-1 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>PIN Code</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 392130"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    clearError('pincode');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.pincode ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.pincode && <p className="text-[11px] text-rose-500 font-medium">{errors.pincode}</p>}
              </div>

              {/* Full Address */}
              <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Full Micro-Market / Site Address</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 45-B, PCPIR Industrial Area, NH-48 Express Highway, Opp. Logistics Hub"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    clearError('location');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.location ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.location && <p className="text-[11px] text-rose-500 font-medium">{errors.location}</p>}
              </div>
            </div>
          </div>

          <div className="border-b border-border/80" />

          {/* ================= SECTION 3: DIMENSIONS & COMMERCIALS ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Dimensions & Commercial Terms</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Leasable area, pricing, security deposits, and possession schedule</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Park Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Total Park Area (sq.ft)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={totalAreaSqFt}
                  onChange={(e) => {
                    setTotalAreaSqFt(e.target.value ? Number(e.target.value) : '');
                    clearError('totalAreaSqFt');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.totalAreaSqFt ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.totalAreaSqFt && <p className="text-[11px] text-rose-500 font-medium">{errors.totalAreaSqFt}</p>}
              </div>

              {/* Available Space */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Available Space (sq.ft)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 75000"
                  value={availableAreaSqFt}
                  onChange={(e) => {
                    setAvailableAreaSqFt(e.target.value ? Number(e.target.value) : '');
                    clearError('availableAreaSqFt');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.availableAreaSqFt ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.availableAreaSqFt && <p className="text-[11px] text-rose-500 font-medium">{errors.availableAreaSqFt}</p>}
              </div>

              {/* Monthly Rent */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Base Rent (₹ / sq.ft / mo)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-foreground-muted font-bold">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 24"
                    value={rentPerSqFtINR}
                    onChange={(e) => {
                      setRentPerSqFtINR(e.target.value ? Number(e.target.value) : '');
                      clearError('rentPerSqFtINR');
                    }}
                    className={`w-full pl-8 bg-surface-muted/60 dark:bg-[#18202b] border ${
                      errors.rentPerSqFtINR ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                    } rounded-lg text-sm text-foreground h-10 pr-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                  />
                </div>
                {errors.rentPerSqFtINR && <p className="text-[11px] text-rose-500 font-medium">{errors.rentPerSqFtINR}</p>}
              </div>

              {/* Deposit Months */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Security Deposit (Months)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 6"
                  value={depositMonths}
                  onChange={(e) => {
                    setDepositMonths(e.target.value ? Number(e.target.value) : '');
                    clearError('depositMonths');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.depositMonths ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.depositMonths && <p className="text-[11px] text-rose-500 font-medium">{errors.depositMonths}</p>}
              </div>

              {/* Lease Terms */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Lease Term (Years)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={leaseTermsYears}
                  onChange={(e) => {
                    setLeaseTermsYears(e.target.value ? Number(e.target.value) : '');
                    clearError('leaseTermsYears');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.leaseTermsYears ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.leaseTermsYears && <p className="text-[11px] text-rose-500 font-medium">{errors.leaseTermsYears}</p>}
              </div>

              {/* Availability Date with DatePicker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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

          <div className="border-b border-border/80" />

          {/* ================= SECTION 4: TECHNICAL SPECIFICATIONS ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Technical Specifications & Infrastructure</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Engineering benchmarks, clear height, docks, and fire safety</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Clear Height */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                  <span>Clear Height (Meters)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={clearHeightFt}
                  onChange={(e) => {
                    setClearHeightFt(e.target.value ? Number(e.target.value) : '');
                    clearError('clearHeightFt');
                  }}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.clearHeightFt ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.clearHeightFt && <p className="text-[11px] text-rose-500 font-medium">{errors.clearHeightFt}</p>}
              </div>

              {/* Docks Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.docksCount && <p className="text-[11px] text-rose-500 font-medium">{errors.docksCount}</p>}
              </div>

              {/* Flooring Capacity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.flooringCapacityMT && <p className="text-[11px] text-rose-500 font-medium">{errors.flooringCapacityMT}</p>}
              </div>

              {/* Connected Power */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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
                  } rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.powerKVA && <p className="text-[11px] text-rose-500 font-medium">{errors.powerKVA}</p>}
              </div>

              {/* Fire Safety with Combobox */}
              <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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
                  searchPlaceholder="Search fire safety systems..."
                  triggerClassName={`rounded-lg h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.fireSystems ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.fireSystems && <p className="text-[11px] text-rose-500 font-medium">{errors.fireSystems}</p>}
              </div>

              {/* Truck Access with Combobox */}
              <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
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
                  searchPlaceholder="Search truck access specifications..."
                  triggerClassName={`rounded-lg h-10 bg-surface-muted/60 dark:bg-[#18202b] ${
                    errors.truckAccess ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {errors.truckAccess && <p className="text-[11px] text-rose-500 font-medium">{errors.truckAccess}</p>}
              </div>
            </div>
          </div>

          <div className="border-b border-border/80" />

          {/* ================= SECTION 5: INDUSTRY SUITABILITY & DESCRIPTION ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Industry Suitability & Overview</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Target occupant verticals and marketing highlights</p>
            </div>

            {/* Suitable Industry Pills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                <span>Suitable Industry Segments</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className={`flex flex-wrap gap-2 p-3 rounded-xl border ${
                errors.suitableIndustries ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/10' : 'border-border/60 bg-surface-muted/30'
              }`}>
                {INDUSTRY_OPTIONS.map((ind) => {
                  const isSelected = suitableIndustries.includes(ind);
                  return (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleIndustry(ind)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-fairway-600 text-white shadow-xs'
                          : 'bg-surface hover:bg-surface-muted text-foreground border border-border/80'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      <span>{ind}</span>
                    </button>
                  );
                })}
              </div>
              {errors.suitableIndustries && <p className="text-[11px] text-rose-500 font-medium">{errors.suitableIndustries}</p>}
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                <span>Marketing Overview & Highlights</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Describe key differentiators, PEB building quality, clear heights, flooring standards, and logistical advantages..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearError('description');
                }}
                className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                  errors.description ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                } rounded-lg text-sm text-foreground p-3 focus:border-fairway-600 focus:outline-none transition-colors`}
              />
              {errors.description && <p className="text-[11px] text-rose-500 font-medium">{errors.description}</p>}
            </div>

            {/* Photos List & Add */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1 h-5 whitespace-nowrap">
                <span>Facility Gallery & Image URLs</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Paste direct image URL (https://...)"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="flex-1 bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-xs sm:text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddPhoto}
                  disabled={!newPhotoUrl.trim()}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="w-full sm:w-auto"
                >
                  Add Photo
                </Button>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border aspect-video bg-surface-muted">
                      <img src={url} alt={`Warehouse view ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-md transition-colors shadow-xs cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 sm:pt-6 border-t border-border flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onBack}
              disabled={isSubmitting}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-fairway-600 hover:bg-fairway-700 text-white font-bold shadow-xs justify-center"
            >
              {isSubmitting ? 'Publishing Warehouse...' : 'Publish Warehouse Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPropertyPage;
