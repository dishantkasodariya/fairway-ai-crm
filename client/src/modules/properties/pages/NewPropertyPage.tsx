import React, { useState } from 'react';
import {
  Warehouse,
  ArrowLeft,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Zap,
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
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
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

export const NewPropertyPage: React.FC<NewPropertyPageProps> = ({ onBack, onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState(`WH-${Math.floor(100 + Math.random() * 900)}`);
  const [status, setStatus] = useState<PropertyStatus>('Available');

  // Location
  const [corridor, setCorridor] = useState('Dahej PCPIR Corridor');
  const [city, setCity] = useState('Bharuch');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('392130');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(21.7051);
  const [longitude, setLongitude] = useState(72.5847);

  // Dimensions & Commercials
  const [totalAreaSqFt, setTotalAreaSqFt] = useState<number | ''>(120000);
  const [availableAreaSqFt, setAvailableAreaSqFt] = useState<number | ''>(75000);
  const [rentPerSqFtINR, setRentPerSqFtINR] = useState<number | ''>(22);
  const [depositMonths, setDepositMonths] = useState<number | ''>(6);
  const [leaseTermsYears, setLeaseTermsYears] = useState<number | ''>(5);
  const [availabilityDate, setAvailabilityDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Specifications
  const [clearHeightFt, setClearHeightFt] = useState<number | ''>(12);
  const [docksCount, setDocksCount] = useState<number | ''>(8);
  const [flooringCapacityMT, setFlooringCapacityMT] = useState<number | ''>(6);
  const [powerKVA, setPowerKVA] = useState<number | ''>(250);
  const [parkingSlots, setParkingSlots] = useState<number | ''>(40);
  const [fireSystems, setFireSystems] = useState('NFPA compliant K-14 Sprinklers + Fire Hydrants + Smoke Detectors');
  const [truckAccess, setTruckAccess] = useState('40ft Multi-Axle Container Trailer movement with 35m concrete apron');
  const [greenBuildingCert, setGreenBuildingCert] = useState('IGBC Gold Certified');
  const [cctvSecurity, setCctvSecurity] = useState(true);

  // Industries & Description
  const [suitableIndustries, setSuitableIndustries] = useState<string[]>([
    '3PL & Logistics',
    'E-Commerce & Retail',
    'Automotive & Ancillary',
  ]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>(DEFAULT_PHOTOS);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleIndustry = (ind: string) => {
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

  // Auto-Fill Templates
  const handleApplyTemplate = (type: 'grade_a' | 'cold_storage' | 'ecommerce') => {
    if (type === 'grade_a') {
      setName('Fairway Apex Logistics Park (Grade-A PEB)');
      setCode(`WH-${Math.floor(100 + Math.random() * 900)}`);
      setCorridor('Dahej PCPIR Corridor');
      setCity('Bharuch');
      setState('Gujarat');
      setPincode('392130');
      setLocation('Plot 54, Sector 3, PCPIR Industrial Corridor, NH-48 Express Highway');
      setTotalAreaSqFt(180000);
      setAvailableAreaSqFt(95000);
      setRentPerSqFtINR(24);
      setDepositMonths(6);
      setLeaseTermsYears(5);
      setClearHeightFt(12);
      setDocksCount(12);
      setFlooringCapacityMT(6);
      setPowerKVA(350);
      setParkingSlots(50);
      setFireSystems('NFPA compliant ESFR K-25 Sprinklers + Central Fire Hydrant Ring');
      setTruckAccess('40ft Container Trailer accessibility with 38m concrete staging apron');
      setGreenBuildingCert('IGBC Platinum Certified');
      setCctvSecurity(true);
      setSuitableIndustries(['3PL & Logistics', 'E-Commerce & Retail', 'Automotive & Ancillary', 'Heavy Engineering']);
      setDescription(
        'World-class Grade-A industrial logistics park with pre-engineered steel building (PEB), FM2 laser-screeded heavy-duty flooring, insulated standing seam roof with 5% skylights, and dedicated truck staging bays.'
      );
      toast('Template Applied', { message: 'Loaded Grade-A Logistics Park specifications', type: 'info' });
    } else if (type === 'cold_storage') {
      setName('Fairway CryoLogistics Cold Chain Hub');
      setCode(`WH-${Math.floor(100 + Math.random() * 900)}`);
      setCorridor('Sanand Industrial Corridor');
      setCity('Ahmedabad');
      setState('Gujarat');
      setPincode('382110');
      setLocation('GIDC Industrial Estate Phase II, Sanand-Viramgam Highway');
      setTotalAreaSqFt(85000);
      setAvailableAreaSqFt(45000);
      setRentPerSqFtINR(48);
      setDepositMonths(6);
      setLeaseTermsYears(7);
      setClearHeightFt(14);
      setDocksCount(6);
      setFlooringCapacityMT(7);
      setPowerKVA(750);
      setParkingSlots(25);
      setFireSystems('Multi-zone Pre-Action Sprinkler System & Thermal Smoke Sensors');
      setTruckAccess('Insulated dock shelters with hydraulic dock levelers for reefer trucks');
      setGreenBuildingCert('LEED Gold Certified');
      setCctvSecurity(true);
      setSuitableIndustries(['Pharma & Healthcare', 'Cold Chain & Perishables', 'FMCG & Consumer Goods']);
      setDescription(
        'Temperature-controlled multi-chamber cold storage facility (-25°C to +15°C) with 100% power backup (redundant DG sets), ante-rooms, automated temperature monitoring, and pharmaceutical compliant infrastructure.'
      );
      toast('Template Applied', { message: 'Loaded Cold Chain & Pharma Hub specifications', type: 'info' });
    } else {
      setName('Fairway FastTrack E-Commerce Fulfillment Center');
      setCode(`WH-${Math.floor(100 + Math.random() * 900)}`);
      setCorridor('Bhiwandi / NH-3 Corridor');
      setCity('Mumbai (MMR)');
      setState('Maharashtra');
      setPincode('421302');
      setLocation('Mankoli Industrial Hub, Mumbai-Nashik Expressway');
      setTotalAreaSqFt(220000);
      setAvailableAreaSqFt(110000);
      setRentPerSqFtINR(29);
      setDepositMonths(6);
      setLeaseTermsYears(5);
      setClearHeightFt(11);
      setDocksCount(16);
      setFlooringCapacityMT(5);
      setPowerKVA(500);
      setParkingSlots(80);
      setFireSystems('Fully automated high-density sprinkler system with dedicated fire water reservoir');
      setTruckAccess('Cross-docking layout with drive-through bays for ultra-fast parcel sorting');
      setGreenBuildingCert('IGBC Gold Certified');
      setCctvSecurity(true);
      setSuitableIndustries(['E-Commerce & Retail', '3PL & Logistics', 'FMCG & Consumer Goods']);
      setDescription(
        'High-throughput urban fulfillment warehouse engineered for rapid cross-docking, mezzanine conveyor systems, mezzanine sorting floors, 24/7 high-density vehicle circulation, and worker welfare amenities.'
      );
      toast('Template Applied', { message: 'Loaded E-Commerce Fulfillment specifications', type: 'info' });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Warehouse name is required';
    if (!code.trim()) errs.code = 'Property code is required';
    if (!corridor.trim()) errs.corridor = 'Corridor is required';
    if (!city.trim()) errs.city = 'City is required';
    if (!location.trim()) errs.location = 'Micro-market / address is required';
    if (!totalAreaSqFt || Number(totalAreaSqFt) <= 0) errs.totalAreaSqFt = 'Valid total area required';
    if (!availableAreaSqFt || Number(availableAreaSqFt) <= 0) errs.availableAreaSqFt = 'Valid available area required';
    if (!rentPerSqFtINR || Number(rentPerSqFtINR) <= 0) errs.rentPerSqFtINR = 'Valid rent is required';
    if (!availabilityDate) errs.availabilityDate = 'Availability date is required';

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
      depositMonths: Number(depositMonths) || 6,
      leaseTermsYears: Number(leaseTermsYears) || 5,
      availabilityDate,
      clearHeightFt: Number(clearHeightFt) || 12,
      docksCount: Number(docksCount) || 6,
      fireSystems: fireSystems.trim() || 'NFPA Standard Sprinklers',
      powerKVA: Number(powerKVA) || 200,
      parkingSlots: Number(parkingSlots) || 30,
      truckAccess: truckAccess.trim() || 'Multi-axle container trailer access',
      flooringCapacityMT: Number(flooringCapacityMT) || 5,
      cctvSecurity,
      greenBuildingCert: greenBuildingCert.trim() || 'None',
      latitude: Number(latitude) || 21.7051,
      longitude: Number(longitude) || 72.5847,
      photos: photos.length > 0 ? photos : DEFAULT_PHOTOS,
      status,
      amenities: [
        '24/7 Security Guarding',
        'CCTV Perimeter Surveillance',
        'LED Energy Saving Lighting',
        'Storm Water Drainage System',
        'Driver Restroom & Canteen',
        'Weighbridge Facility',
      ],
      suitableIndustries: suitableIndustries.length > 0 ? suitableIndustries : ['3PL & Logistics', 'Manufacturing'],
      description:
        description.trim() ||
        `${name} offers ${Number(availableAreaSqFt).toLocaleString()} sq.ft of Grade-A warehouse space situated along ${corridor} in ${city}. Equipped with ${clearHeightFt}m clear height, ${docksCount} hydraulic docks, and heavy duty industrial flooring.`,
    };

    try {
      let createdProp: Property | undefined;
      const res = await PropertyService.createProperty(propertyPayload);
      if (res.success && res.data) {
        createdProp = res.data;
      } else {
        createdProp = StorageService.createProperty(propertyPayload);
      }

      toast('Warehouse Created Successfully', {
        message: `${createdProp?.name || name} has been published to inventory.`,
        type: 'success',
      });

      onSuccess(createdProp ? createdProp.id : 'properties');
    } catch (err: any) {
      const fallback = StorageService.createProperty(propertyPayload);
      toast('Warehouse Created', {
        message: `${fallback.name} added to local storage.`,
        type: 'success',
      });
      onSuccess(fallback.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground text-left py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header Pattern */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fairway-100 dark:bg-fairway-950/80 border border-fairway-300 dark:border-fairway-800/80 flex items-center justify-center text-fairway-700 dark:text-fairway-400 shrink-0 shadow-xs">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>Create Warehouse Listing</span>
              </h1>
              <p className="text-xs text-foreground-muted mt-0.5">
                Add a new industrial warehouse property, technical specs, and commercial leasing parameters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Apply Template Dropdown */}
            <div className="relative inline-block text-left">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs"
                onClick={() => handleApplyTemplate('grade_a')}
                leftIcon={<Layers className="w-3.5 h-3.5" />}
              >
                Apply Template
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="border-border text-foreground hover:bg-surface-muted"
            >
              Back
            </Button>
          </div>
        </div>

        {/* Quick Template Switcher Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs bg-surface border border-border rounded-xl p-2.5 shadow-subtle">
          <span className="text-foreground-muted font-semibold px-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-fairway-600" />
            Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => handleApplyTemplate('grade_a')}
            className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-fairway-50 hover:text-fairway-800 border border-border text-foreground-muted font-medium transition-colors cursor-pointer"
          >
            🏭 Grade-A Logistics Park
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('cold_storage')}
            className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-sky-50 hover:text-sky-800 border border-border text-foreground-muted font-medium transition-colors cursor-pointer"
          >
            ❄️ Pharma Cold Chain Hub
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('ecommerce')}
            className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-amber-50 hover:text-amber-800 border border-border text-foreground-muted font-medium transition-colors cursor-pointer"
          >
            ⚡ E-Commerce Fulfillment
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
          {/* ================= SECTION 1: BASIC INFORMATION ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Basic Information</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Core identification and operational status of the facility</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Warehouse Name */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Property / Warehouse Name</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fairway Horizon Logistics Park Grade-A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                  } rounded-lg text-sm text-foreground placeholder:text-foreground-muted/60 h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors`}
                />
                {errors.name && <p className="text-[11px] text-rose-500 font-medium">{errors.name}</p>}
              </div>

              {/* Property Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Property Code</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. WH-108"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-foreground-muted/60 h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
                {errors.code && <p className="text-[11px] text-rose-500 font-medium">{errors.code}</p>}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Listing Status</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none transition-colors"
                >
                  <option value="Available">Available</option>
                  <option value="Partially Leased">Partially Leased</option>
                  <option value="Under Development">Under Development</option>
                  <option value="Fully Leased">Fully Leased</option>
                </select>
              </div>

              {/* Green Building Cert */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Green Building Rating</label>
                <select
                  value={greenBuildingCert}
                  onChange={(e) => setGreenBuildingCert(e.target.value)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none transition-colors"
                >
                  <option value="IGBC Platinum Certified">IGBC Platinum Certified</option>
                  <option value="IGBC Gold Certified">IGBC Gold Certified</option>
                  <option value="LEED Platinum Certified">LEED Platinum Certified</option>
                  <option value="LEED Gold Certified">LEED Gold Certified</option>
                  <option value="EDGE Certified">EDGE Certified</option>
                  <option value="None">None / Standard</option>
                </select>
              </div>

              {/* CCTV & Security Checkbox */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2.5 h-10 px-3.5 bg-surface-muted/40 dark:bg-[#18202b]/60 border border-border rounded-lg cursor-pointer hover:border-fairway-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={cctvSecurity}
                    onChange={(e) => setCctvSecurity(e.target.checked)}
                    className="w-4 h-4 rounded text-fairway-600 focus:ring-fairway-500 border-border"
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
              <h2 className="text-base font-bold text-foreground tracking-tight">Location & Corridor Details</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Geographic position, arterial highways, and corridor connectivity</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Corridor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Industrial Corridor / Belt</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  value={corridor}
                  onChange={(e) => setCorridor(e.target.value)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none transition-colors"
                >
                  {CORRIDOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>City / District</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bharuch"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* State & Pincode */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">PIN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 392130"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Full Micro-Market / Site Address</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 45-B, PCPIR Industrial Area, NH-48 Express Highway, Opp. Logistics Hub"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`w-full bg-surface-muted/60 dark:bg-[#18202b] border ${
                    errors.location ? 'border-rose-500' : 'border-border'
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
              <h2 className="text-base font-bold text-foreground tracking-tight">Dimensions & Commercial Terms</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Leasable area, pricing, security deposits, and possession schedule</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Total Park Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Total Park Area (sq.ft)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={totalAreaSqFt}
                  onChange={(e) => setTotalAreaSqFt(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Available Space */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Available Space (sq.ft)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 75000"
                  value={availableAreaSqFt}
                  onChange={(e) => setAvailableAreaSqFt(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Monthly Rent */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Base Rent (₹ / sq.ft / mo)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-foreground-muted font-bold">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 24"
                    value={rentPerSqFtINR}
                    onChange={(e) => setRentPerSqFtINR(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-8 bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 pr-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Deposit Months */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Security Deposit (Months)</label>
                <input
                  type="number"
                  placeholder="e.g. 6"
                  value={depositMonths}
                  onChange={(e) => setDepositMonths(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Lease Terms */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Lease Term (Years)</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={leaseTermsYears}
                  onChange={(e) => setLeaseTermsYears(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Availability Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Available From</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-border/80" />

          {/* ================= SECTION 4: TECHNICAL SPECIFICATIONS ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Technical Specifications & Infrastructure</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Engineering benchmarks, clear height, docks, and fire safety</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Clear Height */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Clear Height (Meters)</label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={clearHeightFt}
                  onChange={(e) => setClearHeightFt(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Docks Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Hydraulic Docks</label>
                <input
                  type="number"
                  placeholder="e.g. 8"
                  value={docksCount}
                  onChange={(e) => setDocksCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Flooring Capacity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Floor Load (MT/sq.m)</label>
                <input
                  type="number"
                  placeholder="e.g. 6"
                  value={flooringCapacityMT}
                  onChange={(e) => setFlooringCapacityMT(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Connected Power */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Power (KVA)</label>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={powerKVA}
                  onChange={(e) => setPowerKVA(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Fire Safety */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Fire Safety & Suppression</label>
                <input
                  type="text"
                  placeholder="e.g. NFPA compliant K-14 Sprinklers + Fire Hydrants + Smoke Detectors"
                  value={fireSystems}
                  onChange={(e) => setFireSystems(e.target.value)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Truck Access */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Truck Circulation & Apron</label>
                <input
                  type="text"
                  placeholder="e.g. 40ft multi-axle trailer movement with 35m concrete apron"
                  value={truckAccess}
                  onChange={(e) => setTruckAccess(e.target.value)}
                  className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-border/80" />

          {/* ================= SECTION 5: INDUSTRY SUITABILITY & DESCRIPTION ================= */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Industry Suitability & Overview</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Target occupant verticals and marketing highlights</p>
            </div>

            {/* Suitable Industry Pills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">Suitable Industry Segments</label>
              <div className="flex flex-wrap gap-2">
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
                          : 'bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-800 text-foreground-muted border border-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{ind}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground">Marketing Overview & Highlights</label>
              <textarea
                rows={3}
                placeholder="Describe key differentiators, PEB building quality, clear heights, flooring standards, and logistical advantages..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground p-3 focus:border-fairway-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Photos List & Add */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-foreground">Facility Gallery & Image URLs</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste direct image URL (https://...)"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="flex-1 bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-xs text-foreground h-9 px-3 focus:border-fairway-600 focus:outline-none"
                />
                <Button type="button" size="xs" variant="secondary" onClick={handleAddPhoto} leftIcon={<Plus className="w-3 h-3" />}>
                  Add Photo
                </Button>
              </div>

              {/* Photo Thumbnails */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                {photos.map((url, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-border aspect-video bg-surface-muted">
                    <img src={url} alt={`Warehouse photo ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= FORM ACTIONS FOOTER ================= */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 font-bold shadow-md bg-fairway-600 hover:bg-fairway-700 text-white"
                leftIcon={<Warehouse className="w-4 h-4" />}
              >
                Save & Publish Warehouse
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPropertyPage;
