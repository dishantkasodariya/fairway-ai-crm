import React from 'react';
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
  FileText,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { Property, Inquiry } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Breadcrumbs } from '@/modules/core/components/ui/Breadcrumbs';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';

export interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
  onNavigateToInquiry: (inquiryId: string) => void;
  onNavigateToMap: () => void;
}

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  onBack,
  onNavigateToInquiry,
  onNavigateToMap,
}) => {
  const property = StorageService.getPropertyById(propertyId);
  const allInquiries = StorageService.getInquiries();

  if (!property) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-bold text-foreground">Property Not Found</h3>
        <Button size="sm" onClick={onBack} className="mt-4">
          Back to Properties
        </Button>
      </div>
    );
  }

  // Find inquiries that match this property
  const matchingInquiries = allInquiries.filter((inq) => {
    const matches = StorageService.matchPropertiesForInquiry(inq);
    return matches.some((m) => m.property.id === property.id && m.overallScore >= 70);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Warehouse Properties', onClick: onBack },
          { label: property.code },
        ]}
      />

      {/* Header Banner */}
      <div className="bg-surface rounded-card border border-border shadow-subtle p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded">
                {property.code}
              </span>
              <h1 className="text-2xl font-black text-foreground tracking-tight">{property.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                {property.status}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-1.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{property.location}, {property.city} · {property.corridor}</span>
              <span>·</span>
              <span>Available from: <strong>{formatDate(property.availabilityDate)}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onNavigateToMap} leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-700" />}>
              Locate on Map
            </Button>
          </div>
        </div>

        {/* Commercial Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div className="p-3 bg-surface-muted/50 rounded-lg border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Available Area</span>
            <span className="text-xl font-black text-fairway-800 mt-1 block">{formatSqFt(property.availableAreaSqFt)}</span>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-lg border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Base Rent</span>
            <span className="text-xl font-black text-foreground mt-1 block">₹{property.rentPerSqFtINR} / sq.ft/mo</span>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-lg border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Total Park Built-up</span>
            <span className="text-xl font-black text-foreground mt-1 block">{formatSqFt(property.totalAreaSqFt)}</span>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-lg border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Green Certification</span>
            <span className="text-sm font-bold text-emerald-800 mt-1 block">{property.greenBuildingCert}</span>
          </div>
        </div>
      </div>

      {/* Main Specifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Photos & Technical Specs (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Photo Gallery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {property.photos.map((photo, i) => (
              <div key={i} className="h-56 rounded-card border border-border overflow-hidden bg-slate-100 shadow-subtle">
                <img src={photo} alt={property.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          {/* Description & Amenities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Warehouse Park Overview</CardTitle>
            </CardHeader>
            <p className="text-xs text-foreground leading-relaxed">{property.description}</p>

            <div className="mt-4 pt-4 border-t border-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block mb-2">
                Park Infrastructure & Amenities
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {property.amenities.map((am, idx) => (
                  <span key={idx} className="bg-fairway-50 text-fairway-900 px-2.5 py-1 rounded-md border border-fairway-200 font-medium">
                    ✓ {am}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* Technical Specifications Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Engineering & Technical Specifications</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-surface-muted/40 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block">Clear Height</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">{property.clearHeightFt} Meters (39.3 ft)</span>
              </div>

              <div className="p-3 bg-surface-muted/40 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block">Dock Doors</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">{property.docksCount} Pneumatic Dock Levelers</span>
              </div>

              <div className="p-3 bg-surface-muted/40 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block">Floor Load Capacity</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">{property.flooringCapacityMT} MT/sq.m (FM2 Laser Screed)</span>
              </div>

              <div className="p-3 bg-surface-muted/40 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block">Connected Power</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">{property.powerKVA} KVA Dedicated HT Substation</span>
              </div>

              <div className="p-3 bg-surface-muted/40 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block">Trailer Parking</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">{property.parkingSlots} Staging Bays</span>
              </div>

              <div className="p-3 bg-surface-muted/40 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block">Truck Access Apron</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">{property.truckAccess}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-surface-muted/50 rounded-lg border border-border text-xs">
              <span className="text-[10px] uppercase font-bold text-foreground-muted block">Fire Suppression System</span>
              <p className="font-semibold text-foreground mt-0.5">{property.fireSystems}</p>
            </div>
          </Card>
        </div>

        {/* Sidebar: Active Matching Inquiries (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-fairway-600" />
                  <span>Matching Inquiries ({matchingInquiries.length})</span>
                </CardTitle>
                <p className="text-[11px] text-foreground-muted">Live pipeline opportunities compatible with this park</p>
              </div>
            </CardHeader>

            <div className="space-y-3 text-xs">
              {matchingInquiries.length === 0 ? (
                <div className="py-6 text-center text-foreground-muted">No active inquiries matched.</div>
              ) : (
                matchingInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    onClick={() => onNavigateToInquiry(inq.id)}
                    className="p-3 bg-surface border border-border hover:border-fairway-300 rounded-lg cursor-pointer transition-all shadow-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold bg-fairway-50 text-fairway-800 px-1.5 py-0.2 rounded border border-fairway-200">
                        {inq.inquiryNumber}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                        High Fit
                      </span>
                    </div>
                    <h4 className="font-bold text-foreground mt-1.5">{inq.companyName}</h4>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      Needs {formatSqFt(inq.requiredAreaSqFt)} · Budget: {formatINR(inq.budgetMonthlyINR, true)}/mo
                    </p>
                    <div className="pt-2 mt-2 border-t border-border flex items-center justify-between text-[11px] text-fairway-800 font-semibold">
                      <span>Review in Inquiry Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Suitable Industries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Approved Industries</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {property.suitableIndustries.map((ind, i) => (
                <span key={i} className="bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                  {ind}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const PropertyDetailPage = PropertyDetailView;
export default PropertyDetailPage;
