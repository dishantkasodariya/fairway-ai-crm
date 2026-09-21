import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  MapPin,
  Flame,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Check,
  Share2,
  Building2,
  Compass,
  Trash2,
  Edit3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PropertyService } from '@/modules/core/services/propertyService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { matchPropertiesForInquiry } from '@/modules/core/utils/propertyMatcher';
import { Property, Inquiry } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { cn } from '@/modules/core/lib/utils';
import { useToast } from '@/modules/core/providers/ToastContext';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { NewPropertyPage } from './NewPropertyPage';
import { AiProspectsPanel } from '../components/AiProspectsPanel';

export interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
  onNavigateToInquiry: (inquiryId: string) => void;
  onNavigateToMap: () => void;
  onOpenNewInquiryForProperty?: (propertyId: string) => void;
}

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  onBack,
  onNavigateToInquiry,
  onNavigateToMap,
  onOpenNewInquiryForProperty,
}) => {
  const { success, error: toastError } = useToast();
  const { canDeleteModule, canEditModule } = useAuth();
  const canDelete = canDeleteModule('properties');
  const canEditProp = canEditModule('properties');

  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'facility' | 'inquiries' | 'prospects'>('facility');
  const [areaUnit, setAreaUnit] = useState<'sqft' | 'sqm'>('sqft');

  useEffect(() => {
    InquiryService.getInquiries({ pageSize: 500 }).then((res) => {
      if (res && res.data) {
        setInquiries(res.data);
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchProp = async () => {
      setIsLoading(true);
      try {
        const res = await PropertyService.getPropertyById(propertyId);
        if (isMounted) {
          if (res.success && res.data) {
            setProperty(res.data);
          } else {
            setProperty(undefined);
          }
        }
      } catch (err: any) {
        console.error('Failed to load property details from backend:', err);
        if (isMounted) setProperty(undefined);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchProp();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const handleDelete = async () => {
    if (!property) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${property.name}" (${property.code})? This will remove it from the backend database.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await PropertyService.deleteProperty(property.id);
      if (res.success) {
        success('Property Deleted', `${property.name} has been removed.`);
        onBack();
      } else {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Failed to delete property';
        toastError('Delete Failed', msg);
      }
    } catch (err: any) {
      toastError('Error', err.message || 'Failed to delete property.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-fairway-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-foreground-muted font-medium">Loading warehouse dossier from backend...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-surface-muted text-foreground-muted flex items-center justify-center mx-auto border border-border">
          <Warehouse className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Property Asset Not Found</h3>
        <p className="text-xs text-foreground-muted">
          The requested warehouse asset (ID: {propertyId}) could not be retrieved from the database.
        </p>
        <Button size="sm" variant="outline" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Warehouse Catalog
        </Button>
      </div>
    );
  }

  if (isEditOpen) {
    return (
      <NewPropertyPage
        initialProperty={property}
        onBack={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
          PropertyService.getPropertyById(propertyId).then((res) => {
            if (res.success && res.data) {
              setProperty(res.data);
            }
          });
        }}
      />
    );
  }

  // Matching CRM inquiries
  const matchingInquiries = inquiries
    .map((inq) => {
      const matches = matchPropertiesForInquiry(inq, [property]);
      const matched = matches[0];
      return {
        inquiry: inq,
        score: matched ? matched.overallScore : 0,
      };
    })
    .filter((item) => item.score >= 50)
    .sort((a, b) => b.score - a.score);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      success('Link Copied', 'Property asset URL copied to clipboard.');
    }
  };

  const handleScrollToInquiries = () => {
    setActiveTab('inquiries');
    setTimeout(() => {
      const el = document.getElementById('property-tabs-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const getStatusBadgeVariant = (status: Property['status']) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'partially leased':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'under development':
      case 'fully leased':
      default:
        return 'bg-surface-muted text-foreground border-border';
    }
  };

  const monthlyYield = property.availableAreaSqFt * property.rentPerSqFtINR;

  return (
    <div className="w-full text-left space-y-6 pb-28 sm:pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* ================= TOP HEADER BAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0 shadow-xs mt-1 sm:mt-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono font-bold bg-slate-900 text-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg shadow-xs">
                {property.code}
              </span>
              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-foreground tracking-tight break-words">
                {property.name}
              </h1>
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5', getStatusBadgeVariant(property.status))}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{property.status}</span>
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1.5 flex-wrap">
              <MapPin className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
              <span className="font-medium text-foreground">{property.location}, {property.city}</span>
              <span>·</span>
              <span className="text-foreground-muted">{property.corridor}</span>
              <span>·</span>
              <span>Available: <strong className="text-foreground">{formatDate(property.availabilityDate)}</strong></span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNavigateToMap}
            leftIcon={<Compass className="w-3.5 h-3.5 text-fairway-600" />}
            className="rounded-xl text-xs font-semibold"
          >
            Locate on Map
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
            className="rounded-xl text-xs font-semibold"
          >
            Share
          </Button>

          {canEditProp && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              leftIcon={<Edit3 className="w-3.5 h-3.5 text-indigo-500" />}
              className="rounded-xl text-xs font-semibold"
            >
              Edit
            </Button>
          )}

          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              className="rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
            >
              Delete
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            className="rounded-xl text-xs font-semibold"
          >
            Back
          </Button>
        </div>
      </div>

      {/* ================= UNIFIED WAREHOUSE SPECIFICATIONS & COMMERCIALS ================= */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Property Specifications & Commercial Terms
              </h2>
              <p className="text-[11px] text-foreground-muted">
                Key spatial measurements, engineering parameters, and lease structure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center p-0.5 bg-surface-muted rounded-lg border border-border text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setAreaUnit('sqft')}
                className={cn(
                  'px-2.5 py-1 rounded transition-all cursor-pointer',
                  areaUnit === 'sqft' ? 'bg-surface text-foreground shadow-2xs font-extrabold' : 'text-foreground-muted hover:text-foreground'
                )}
              >
                Sq.Ft
              </button>
              <button
                type="button"
                onClick={() => setAreaUnit('sqm')}
                className={cn(
                  'px-2.5 py-1 rounded transition-all cursor-pointer',
                  areaUnit === 'sqm' ? 'bg-surface text-foreground shadow-2xs font-extrabold' : 'text-foreground-muted hover:text-foreground'
                )}
              >
                Sq.M
              </button>
            </div>

            <button
              type="button"
              onClick={handleScrollToInquiries}
              className="bg-fairway-600 hover:bg-fairway-700 active:bg-fairway-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Match Leads ({matchingInquiries.length})</span>
            </button>
          </div>
        </div>

        {/* 6 Primary Metric Cards (Single Unified Grid - No Duplication) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Available Area */}
          <div className="p-3.5 sm:p-4 bg-fairway-500/5 dark:bg-fairway-500/10 rounded-xl border border-fairway-500/20 space-y-1">
            <span className="text-[11px] font-semibold text-fairway-700 dark:text-fairway-300 block">
              Available Space
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight block">
              {areaUnit === 'sqft'
                ? formatSqFt(property.availableAreaSqFt)
                : `${Math.round(property.availableAreaSqFt / 10.764).toLocaleString()} sq.m`}
            </span>
            <span className="text-[11px] text-foreground-muted block truncate">
              Total: {formatSqFt(property.totalAreaSqFt)}
            </span>
          </div>

          {/* Asking Rent Rate */}
          <div className="p-3.5 sm:p-4 bg-surface-muted/50 rounded-xl border border-border space-y-1">
            <span className="text-[11px] font-semibold text-foreground-muted block">
              Base Asking Rent
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight block">
              ₹{property.rentPerSqFtINR}
              <span className="text-xs font-normal text-foreground-muted"> /sq.ft</span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
              ~ {formatINR(monthlyYield, true)}/mo
            </span>
          </div>

          {/* Clear Height */}
          <div className="p-3.5 sm:p-4 bg-surface-muted/50 rounded-xl border border-border space-y-1">
            <span className="text-[11px] font-semibold text-foreground-muted block">
              Clear Height
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight block">
              {property.clearHeightFt} <span className="text-xs font-normal text-foreground-muted">Meters</span>
            </span>
            <span className="text-[11px] text-foreground-muted block truncate">
              {(property.clearHeightFt * 3.28084).toFixed(1)} ft headroom
            </span>
          </div>

          {/* Floor Load */}
          <div className="p-3.5 sm:p-4 bg-surface-muted/50 rounded-xl border border-border space-y-1">
            <span className="text-[11px] font-semibold text-foreground-muted block">
              Floor Load
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight block">
              {property.flooringCapacityMT || 5} <span className="text-xs font-normal text-foreground-muted">MT/sq.m</span>
            </span>
            <span className="text-[11px] text-foreground-muted block truncate">
              FM2 Laser Screed
            </span>
          </div>

          {/* Loading Docks */}
          <div className="p-3.5 sm:p-4 bg-surface-muted/50 rounded-xl border border-border space-y-1">
            <span className="text-[11px] font-semibold text-foreground-muted block">
              Loading Docks
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight block">
              {property.docksCount} <span className="text-xs font-normal text-foreground-muted">Bays</span>
            </span>
            <span className="text-[11px] text-foreground-muted block truncate">
              Hydraulic Levelers
            </span>
          </div>

          {/* Power Capacity */}
          <div className="p-3.5 sm:p-4 bg-surface-muted/50 rounded-xl border border-border space-y-1">
            <span className="text-[11px] font-semibold text-foreground-muted block">
              Power HT
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight block truncate">
              {property.powerKVA && property.powerKVA > 0 ? `${property.powerKVA} kVA` : 'Standard / HT'}
            </span>
            <span className="text-[11px] text-foreground-muted block truncate">
              Dedicated Substation
            </span>
          </div>
        </div>

        {/* Commercial Terms & Facility Specifications Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-border/80 text-xs">
          <div className="p-2.5 rounded-xl bg-surface-muted/30 border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Security Deposit</span>
            <span className="font-bold text-foreground block mt-0.5">{property.depositMonths || 3} Months Rent</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-muted/30 border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Lease Lock-in</span>
            <span className="font-bold text-foreground block mt-0.5">{property.leaseTermsYears || 5} Years Min</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-muted/30 border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Annual Escalation</span>
            <span className="font-bold text-foreground block mt-0.5">5% to 7% p.a.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-muted/30 border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Facility Grade</span>
            <span className="font-bold text-fairway-600 dark:text-fairway-400 block mt-0.5 truncate">
              Grade A {property.greenBuildingCert && property.greenBuildingCert !== 'None' ? `· ${property.greenBuildingCert}` : ''}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-muted/30 border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Truck Apron</span>
            <span className="font-bold text-foreground block mt-0.5 truncate">
              {property.truckAccess || 'Multi-Axle Trailers'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-muted/30 border border-border/60">
            <span className="text-[10px] text-foreground-muted block">Staging Bays</span>
            <span className="font-bold text-foreground block mt-0.5 truncate">
              {property.parkingSlots ? `${property.parkingSlots} Bays` : '20+ Bays'}
            </span>
          </div>
        </div>
      </div>

      {/* ================= MAIN TABS: FACILITY DOSSIER vs MATCHING LEADS ================= */}
      <div id="property-tabs-section" className="flex items-center gap-1 sm:gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('facility')}
          className={cn(
            'px-4 sm:px-5 py-3 text-xs font-bold transition-all cursor-pointer rounded-none flex items-center gap-2 -mb-px',
            activeTab === 'facility'
              ? 'text-fairway-600 dark:text-fairway-400 border-b-2 border-fairway-600 dark:border-fairway-400 bg-fairway-500/5'
              : 'text-foreground-muted hover:text-foreground border-b-2 border-transparent hover:bg-surface-muted/50'
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Facility Specifications & Amenities</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inquiries')}
          className={cn(
            'px-4 sm:px-5 py-3 text-xs font-bold transition-all cursor-pointer rounded-none flex items-center gap-2 -mb-px',
            activeTab === 'inquiries'
              ? 'text-fairway-600 dark:text-fairway-400 border-b-2 border-fairway-600 dark:border-fairway-400 bg-fairway-500/5'
              : 'text-foreground-muted hover:text-foreground border-b-2 border-transparent hover:bg-surface-muted/50'
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Compatible CRM Leads ({matchingInquiries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prospects')}
          className={cn(
            'px-4 sm:px-5 py-3 text-xs font-bold transition-all cursor-pointer rounded-none flex items-center gap-2 -mb-px',
            activeTab === 'prospects'
              ? 'text-fairway-600 dark:text-fairway-400 border-b-2 border-fairway-600 dark:border-fairway-400 bg-fairway-500/5'
              : 'text-foreground-muted hover:text-foreground border-b-2 border-transparent hover:bg-surface-muted/50'
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Prospects</span>
        </button>
      </div>

      {/* ================= TAB 1: CONSOLIDATED FACILITY DOSSIER ================= */}
      {activeTab === 'facility' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* Left 7 Cols: About Park & Infrastructure Amenities */}
          <div className="lg:col-span-7 space-y-6">
            {/* Overview & Description */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-fairway-600" />
                <span>Warehouse Park Overview</span>
              </h2>
              <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
                {property.description && property.description.trim().length > 10
                  ? property.description
                  : 'World-class Grade-A industrial facility designed for high-throughput 3PL logistics, FMCG distribution, and automotive engineering operations with state-of-the-art infrastructure.'}
              </p>
            </div>

            {/* Park Amenities & Features */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-fairway-600" />
                  <span>Infrastructure & Logistical Amenities</span>
                </h2>
                <span className="text-[11px] text-foreground-muted">24/7 Security & Maintenance</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {property.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-muted/40 border border-border text-xs text-foreground font-medium"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Approved Industry Sectors */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-fairway-600" />
                  <span>Approved Industry Verticals</span>
                </h2>
                <span className="text-[11px] text-foreground-muted">Industrial Zoning Approved</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {property.suitableIndustries.map((ind, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-surface-muted border border-border text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-fairway-500" />
                    <span>{ind}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Location & Fire Safety */}
          <div className="lg:col-span-5 space-y-6">
            {/* Location & Corridor */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-fairway-600" />
                  <span>Corridor & Connectivity</span>
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToMap}
                  leftIcon={<Compass className="w-3.5 h-3.5 text-fairway-600" />}
                  className="rounded-xl text-xs font-semibold h-8"
                >
                  GIS Map
                </Button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-surface-muted/50 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
                    Industrial Corridor
                  </span>
                  <span className="text-sm font-bold text-foreground block">
                    {property.corridor}
                  </span>
                  <p className="text-[11px] text-foreground-muted">
                    Situated in the {property.location} hub with direct highway connectivity.
                  </p>
                </div>

                <div className="p-3 bg-surface-muted/50 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
                    Geo Coordinates
                  </span>
                  <span className="text-xs font-mono font-bold text-fairway-600 dark:text-fairway-400 block">
                    {property.latitude?.toFixed(4)}° N, {property.longitude?.toFixed(4)}° E
                  </span>
                  <span className="text-[11px] text-foreground-muted block">
                    PIN: {property.pincode || '382110'} · State: {property.state || 'Gujarat'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fire & Life Safety Standard (Professional Compliance Theme) */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Fire & Life Safety Certified</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  NBC Part IV
                </span>
              </div>

              <div className="p-3.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl border border-rose-500/20 space-y-2">
                <p className="text-xs text-foreground font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                  <span>{property.fireSystems || 'NFPA Compliant Hydrant & Sprinkler Systems'}</span>
                </p>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  Compliant with National Building Code (NBC) Part IV standards featuring ESFR ceiling sprinklers, external hydrants ring, and dedicated dual water storage reservoirs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MATCHING CLIENT INQUIRIES ================= */}
      {activeTab === 'inquiries' && (
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-fairway-600" />
                <span>Compatible CRM Inquiries ({matchingInquiries.length})</span>
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Active pipeline buyers & tenants with matching area, corridor, and specifications
              </p>
            </div>
          </div>

          {matchingInquiries.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-surface-muted text-foreground-muted flex items-center justify-center mx-auto border border-border">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-xs text-foreground-muted">
                No active inquiries currently match this property's specs and leasable area.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchingInquiries.map(({ inquiry, score }, idx) => (
                <div
                  key={inquiry.id}
                  onClick={() => onNavigateToInquiry(inquiry.id)}
                  className="p-4 bg-surface-muted/30 border border-border hover:border-fairway-400/80 rounded-2xl cursor-pointer transition-all shadow-2xs hover:shadow-xs space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground-muted" title={`Inquiry ${inquiry.inquiryNumber}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{score}% Fit</span>
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-foreground text-sm group-hover:text-fairway-600 transition-colors">
                      {inquiry.companyName}
                    </h4>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                      {inquiry.requirement}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2.5 border-t border-border">
                    <div>
                      <span className="text-foreground-muted block text-[10px]">Required Area</span>
                      <span className="font-bold text-foreground">{formatSqFt(inquiry.requiredAreaSqFt)}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted block text-[10px]">Monthly Budget</span>
                      <span className="font-bold text-foreground">{formatINR(inquiry.budgetMonthlyINR, true)}/mo</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-fairway-600 font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>Open Inquiry Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: AI-DISCOVERED PROSPECTS ================= */}
      {activeTab === 'prospects' && <AiProspectsPanel property={property} />}

      {/* ================= MOBILE STICKY BOTTOM BAR ================= */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur-lg border-t border-border z-30 shadow-lg flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-foreground-muted block">Available Area</span>
          <span className="text-sm font-extrabold text-foreground">
            {formatSqFt(property.availableAreaSqFt)}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block">
            ₹{property.rentPerSqFtINR}/sq.ft
          </span>
        </div>

        <button
          type="button"
          onClick={handleScrollToInquiries}
          className="bg-fairway-600 hover:bg-fairway-700 active:bg-fairway-800 text-white font-bold text-xs rounded-xl shadow-xs px-4 py-2.5 flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Match ({matchingInquiries.length} Leads)</span>
        </button>
      </div>
    </div>
  );
};

export const PropertyDetailPage = PropertyDetailView;
export default PropertyDetailPage;
