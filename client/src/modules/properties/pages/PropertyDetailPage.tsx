import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  MapPin,
  Truck,
  Shield,
  Zap,
  Flame,
  CheckCircle2,
  Calendar,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  FileText,
  ExternalLink,
  Layers,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Share2,
  Download,
  Building2,
  Clock,
  Compass,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { PropertyService } from '@/modules/core/services/propertyService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { matchPropertiesForInquiry } from '@/modules/core/utils/propertyMatcher';
import { Property, Inquiry } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { cn } from '@/modules/core/lib/utils';
import { useToast } from '@/modules/core/providers/ToastContext';
import { useAuth } from '@/modules/core/providers/AuthContext';

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
  const { canDeleteModule } = useAuth();
  const canDelete = canDeleteModule('properties');
  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'connectivity' | 'inquiries'>('overview');
  const [areaUnit, setAreaUnit] = useState<'sqft' | 'sqm'>('sqft');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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
        <p className="text-xs text-foreground-muted font-medium">Loading live property asset dossier from backend...</p>
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
          The requested warehouse asset (ID: {propertyId}) could not be retrieved from the backend database.
        </p>
        <Button size="sm" variant="outline" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Warehouse Catalog
        </Button>
      </div>
    );
  }

  // Find inquiries that match this property
  const matchingInquiries = inquiries
    .map((inq) => {
      const matches = property ? matchPropertiesForInquiry(inq, [property]) : [];
      const matched = matches[0];
      return {
        inquiry: inq,
        score: matched ? matched.overallScore : 0,
      };
    })
    .filter((item) => item.score >= 50)
    .sort((a, b) => b.score - a.score);

  const photos = property.photos && property.photos.length > 0
    ? property.photos
    : [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=1200&auto=format&fit=crop&q=80',
      ];

  const currentPhoto = photos[activePhotoIdx] || photos[0];

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      success('Link Copied', 'Property asset URL copied to clipboard.');
    }
  };

  const getStatusBadgeVariant = (status: Property['status']) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      case 'partially leased':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      case 'under development':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
      case 'fully leased':
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
    }
  };

  const monthlyYield = (property.availableAreaSqFt * property.rentPerSqFtINR);

  return (
    <div className="w-full text-left space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0 shadow-xs">
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
              <span>Available from: <strong className="text-foreground">{formatDate(property.availabilityDate)}</strong></span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
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

      {/* Hero Showcase: Photo Gallery & Commercial Highlight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Main Display Photo with Overlay Badges */}
          <div className="relative h-64 sm:h-80 md:h-96 rounded-2xl border border-border bg-surface-muted overflow-hidden shadow-xs group">
            <img
              src={currentPhoto}
              alt={property.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102 cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
            />

            {/* Top Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap z-10">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/10 shadow-sm flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-fairway-400" />
                <span>Grade A Industrial Park</span>
              </span>
              {property.greenBuildingCert && (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-700/60 shadow-sm">
                  🌱 {property.greenBuildingCert}
                </span>
              )}
            </div>

            {/* Photo Counter & Enlarge CTA */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/10 shadow-sm">
                {activePhotoIdx + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white hover:bg-black/90 border border-white/10 transition-colors cursor-pointer"
                title="Fullscreen Preview"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Next / Prev Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Preview Strip */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
              {photos.map((ph, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIdx(idx)}
                  className={cn(
                    'w-20 h-14 rounded-xl border overflow-hidden shrink-0 transition-all cursor-pointer relative',
                    activePhotoIdx === idx
                      ? 'border-fairway-500 ring-2 ring-fairway-500/30 opacity-100 scale-102'
                      : 'border-border opacity-60 hover:opacity-100'
                  )}
                >
                  <img src={ph} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Commercial Metrics Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                Commercial Profile
              </span>
              <div className="flex items-center p-0.5 bg-surface-muted rounded-lg border border-border text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setAreaUnit('sqft')}
                  className={cn(
                    'px-2 py-0.5 rounded transition-all cursor-pointer',
                    areaUnit === 'sqft' ? 'bg-surface text-foreground shadow-2xs font-extrabold' : 'text-foreground-muted'
                  )}
                >
                  Sq.Ft
                </button>
                <button
                  type="button"
                  onClick={() => setAreaUnit('sqm')}
                  className={cn(
                    'px-2 py-0.5 rounded transition-all cursor-pointer',
                    areaUnit === 'sqm' ? 'bg-surface text-foreground shadow-2xs font-extrabold' : 'text-foreground-muted'
                  )}
                >
                  Sq.M
                </button>
              </div>
            </div>

            {/* 2x2 Commercial Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Available Area */}
              <div className="p-3.5 bg-fairway-500/5 dark:bg-fairway-500/10 rounded-xl border border-fairway-500/20">
                <span className="text-[11px] font-semibold text-fairway-700 dark:text-fairway-300 block">
                  Available Area
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1 block">
                  {areaUnit === 'sqft'
                    ? formatSqFt(property.availableAreaSqFt)
                    : `${Math.round(property.availableAreaSqFt / 10.764).toLocaleString()} sq.m`}
                </span>
                <span className="text-[10px] text-foreground-muted block mt-0.5">
                  of {formatSqFt(property.totalAreaSqFt)} total park
                </span>
              </div>

              {/* Base Rent Rate */}
              <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border">
                <span className="text-[11px] font-semibold text-foreground-muted block">
                  Base Asking Rent
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1 block">
                  ₹{property.rentPerSqFtINR}
                  <span className="text-xs font-normal text-foreground-muted"> /sq.ft</span>
                </span>
                <span className="text-[10px] text-foreground-muted block mt-0.5">
                  ~ {formatINR(monthlyYield, true)}/mo
                </span>
              </div>

              {/* Clear Height */}
              <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border">
                <span className="text-[11px] font-semibold text-foreground-muted block">
                  Clear Height
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1 block">
                  {property.clearHeightFt} <span className="text-xs font-normal text-foreground-muted">meters</span>
                </span>
                <span className="text-[10px] text-foreground-muted block mt-0.5">
                  {(property.clearHeightFt * 3.28084).toFixed(1)} ft headroom
                </span>
              </div>

              {/* Dock Levelers */}
              <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border">
                <span className="text-[11px] font-semibold text-foreground-muted block">
                  Dock Doors
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1 block">
                  {property.docksCount} <span className="text-xs font-normal text-foreground-muted">bays</span>
                </span>
                <span className="text-[10px] text-foreground-muted block mt-0.5">
                  Hydraulic / Pneumatic
                </span>
              </div>
            </div>

            {/* Commercial Terms Summary */}
            <div className="p-3.5 bg-surface-muted/40 rounded-xl border border-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-foreground">
                <span className="text-foreground-muted">Security Deposit:</span>
                <span className="font-bold">{property.depositMonths || 3} Months Gross Rent</span>
              </div>
              <div className="flex items-center justify-between text-foreground">
                <span className="text-foreground-muted">Lease Lock-in:</span>
                <span className="font-bold">{property.leaseTermsYears || 5} Years Minimum</span>
              </div>
              <div className="flex items-center justify-between text-foreground">
                <span className="text-foreground-muted">Annual Escalation:</span>
                <span className="font-bold">5% to 7% per annum</span>
              </div>
            </div>

            {/* Quick Inquiry Match CTA */}
            <Button
              variant="primary"
              onClick={() => {
                if (onOpenNewInquiryForProperty) {
                  onOpenNewInquiryForProperty(property.id);
                } else {
                  setActiveTab('inquiries');
                }
              }}
              className="w-full bg-fairway-600 hover:bg-fairway-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs"
              leftIcon={<Building2 className="w-4 h-4" />}
            >
              Match Inquiries ({matchingInquiries.length} Active Leads)
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-px no-scrollbar touch-pan-x">
        {[
          { id: 'overview', label: 'Park Overview & Amenities', icon: Building2 },
          { id: 'technical', label: 'Technical & Engineering Specs', icon: Layers },
          { id: 'connectivity', label: 'Corridor & Connectivity', icon: MapPin },
          {
            id: 'inquiries',
            label: `Matching Inquiries (${matchingInquiries.length})`,
            icon: FileText,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer',
                isActive
                  ? 'border-fairway-600 text-fairway-600 dark:text-fairway-400 bg-fairway-500/5'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-surface-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: OVERVIEW & AMENITIES */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Park Description */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Warehouse Park Overview
            </h2>
            <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
              {property.description}
            </p>
          </div>

          {/* Amenities & Infrastructure */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Infrastructure & Park Amenities
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  World-class industrial facility features and logistical conveniences
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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

          {/* Approved & Suitable Industries */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Approved Industry Sectors
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  GIDC zoning clearances and environmental compliance categories
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {property.suitableIndustries.map((ind, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-surface-muted border border-border text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-fairway-500" />
                  <span>{ind}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TECHNICAL & ENGINEERING SPECS */}
      {activeTab === 'technical' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Engineering & Technical Specifications
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Structural load parameters, building dimensions, and life safety installations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* Flooring */}
              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Layers className="w-4 h-4 text-fairway-600 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Flooring Capacity</span>
                </div>
                <span className="text-base font-bold text-foreground block">
                  {property.flooringCapacityMT} MT/sq.m
                </span>
                <span className="text-[11px] text-foreground-muted block">
                  FM2 Laser Screed compliant with heavy racking support
                </span>
              </div>

              {/* Power */}
              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Connected Power</span>
                </div>
                <span className="text-base font-bold text-foreground block">
                  {property.powerKVA} KVA HT Substation
                </span>
                <span className="text-[11px] text-foreground-muted block">
                  Dedicated high-tension power line with dual transformer feeds
                </span>
              </div>

              {/* Clear Height */}
              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Warehouse className="w-4 h-4 text-fairway-600 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Vertical Stacking Clearance</span>
                </div>
                <span className="text-base font-bold text-foreground block">
                  {property.clearHeightFt} Meters ({(property.clearHeightFt * 3.28).toFixed(1)} ft)
                </span>
                <span className="text-[11px] text-foreground-muted block">
                  Allows G+6 standard racking configurations
                </span>
              </div>

              {/* Docks */}
              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Truck className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Loading Docks</span>
                </div>
                <span className="text-base font-bold text-foreground block">
                  {property.docksCount} Dedicated Bays
                </span>
                <span className="text-[11px] text-foreground-muted block">
                  Fitted with canopy covers and heavy-duty dock bumpers
                </span>
              </div>

              {/* Truck Apron */}
              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Truck className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Truck Apron & Maneuvering</span>
                </div>
                <span className="text-base font-bold text-foreground block">
                  {property.truckAccess}
                </span>
                <span className="text-[11px] text-foreground-muted block">
                  Accommodates 40ft/55ft multi-axle articulated trailers
                </span>
              </div>

              {/* Parking */}
              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Staging Parking Bays</span>
                </div>
                <span className="text-base font-bold text-foreground block">
                  {property.parkingSlots} Dedicated Bays
                </span>
                <span className="text-[11px] text-foreground-muted block">
                  External vehicle holding yard with driver rest areas
                </span>
              </div>
            </div>

            {/* Fire Safety System Banner */}
            <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Fire Suppression & Life Safety Compliance</span>
              </div>
              <p className="text-xs text-foreground font-semibold">
                {property.fireSystems}
              </p>
              <p className="text-[11px] text-foreground-muted">
                Fully compliant with National Building Code (NBC) Part IV and international NFPA guidelines with overhead sprinklers, external hydrants, and dual water storage reservoirs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: CONNECTIVITY & CORRIDOR */}
      {activeTab === 'connectivity' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Corridor Positioning & Arterial Connectivity
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Strategic access to national highways, seaports, rail container depots, and airport hubs
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={onNavigateToMap}
                leftIcon={<Compass className="w-4 h-4" />}
                className="bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold shadow-xs"
              >
                Open GIS Corridor Map
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block">
                  Industrial Belt & Cluster
                </span>
                <span className="text-sm font-bold text-foreground block">
                  {property.corridor}
                </span>
                <p className="text-[11px] text-foreground-muted">
                  Situated in the high-growth {property.location} industrial development node with 4-lane divided highway connectivity.
                </p>
              </div>

              <div className="p-4 bg-surface-muted/50 rounded-2xl border border-border space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block">
                  Geo Coordinates
                </span>
                <span className="text-sm font-mono font-bold text-fairway-600 dark:text-fairway-400 block">
                  {property.latitude?.toFixed(4)}° N, {property.longitude?.toFixed(4)}° E
                </span>
                <p className="text-[11px] text-foreground-muted">
                  Postal Zone: {property.pincode || '392130'} · State: {property.state || 'Gujarat'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: MATCHING CLIENT INQUIRIES */}
      {activeTab === 'inquiries' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4 text-fairway-600" />
                  <span>Compatible CRM Inquiries ({matchingInquiries.length})</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Live pipeline leads with matching area, corridor, and technical criteria
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchingInquiries.map(({ inquiry, score }) => (
                  <div
                    key={inquiry.id}
                    onClick={() => onNavigateToInquiry(inquiry.id)}
                    className="p-4 bg-surface border border-border hover:border-fairway-400/80 rounded-2xl cursor-pointer transition-all shadow-2xs hover:shadow-xs space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 px-2 py-0.5 rounded-lg border border-fairway-500/20">
                        {inquiry.inquiryNumber}
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
        </div>
      )}

      {/* Lightbox Modal for Photo Gallery */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <img
              src={currentPhoto}
              alt={property.name}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 flex items-center justify-between w-full px-4 text-white text-xs font-semibold">
              <span>{property.name} - Photo {activePhotoIdx + 1} of {photos.length}</span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PropertyDetailPage = PropertyDetailView;
export default PropertyDetailPage;
