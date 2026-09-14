import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Search,
  Filter,
  Warehouse,
  Factory,
  Building2,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { PropertyService } from '@/modules/core/services/propertyService';
import { FacilityService } from '@/modules/core/services/facilityService';
import { Facility, Property } from '@/modules/core/types';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';

// Fix Leaflet Default Icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom HTML Icons for Fairway Properties and Client Facilities
const propertyIcon = L.divIcon({
  className: 'custom-property-marker',
  html: `<div style="background:var(--fw-600, #EB661F); color:white; width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/></svg></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

const facilityIcon = L.divIcon({
  className: 'custom-facility-marker',
  html: `<div style="background:var(--accent-500, #6BBF3E); color:var(--fw-950, #052F23); width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.25);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// Map Controller Helper for Pan & Zoom
const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

export interface IndiaMapViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToProperty: (propertyId: string) => void;
}

export const IndiaMapView: React.FC<IndiaMapViewProps> = ({
  onNavigateToCompany,
  onNavigateToProperty,
}) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchMapData = async () => {
      try {
        const [propRes, facRes] = await Promise.allSettled([
          PropertyService.getProperties(),
          FacilityService.getFacilities(),
        ]);
        if (isMounted) {
          if (propRes.status === 'fulfilled' && propRes.value.success && propRes.value.data) {
            setProperties(propRes.value.data);
          }
          if (facRes.status === 'fulfilled' && facRes.value.success && facRes.value.data) {
            setFacilities(facRes.value.data);
          }
        }
      } catch (err) {
        console.warn('Map live data load error:', err);
      }
    };
    fetchMapData();
    return () => { isMounted = false; };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCorridor, setSelectedCorridor] = useState('all');
  const [showProperties, setShowProperties] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);

  // Default Map center on Western India Industrial Corridor (Gujarat - Maharashtra)
  const [mapCenter, setMapCenter] = useState<[number, number]>([21.7125, 72.5855]); // Dahej PCPIR
  const [mapZoom, setMapZoom] = useState(7);

  const corridors = [
    { id: 'all', label: 'All Western Corridors' },
    { id: 'dahej', label: 'Dahej PCPIR Corridor', center: [21.7125, 72.5855] as [number, number], zoom: 11 },
    { id: 'sanand', label: 'Ahmedabad - Sanand Corridor', center: [22.985, 72.378] as [number, number], zoom: 11 },
    { id: 'vapi', label: 'Vapi - Surat Corridor', center: [20.372, 72.915] as [number, number], zoom: 10 },
    { id: 'bhiwandi', label: 'Mumbai - Bhiwandi Corridor', center: [19.296, 73.063] as [number, number], zoom: 11 },
    { id: 'chakan', label: 'Pune - Chakan MIDC', center: [18.756, 73.812] as [number, number], zoom: 11 },
  ];

  const handleSelectCorridor = (corridorId: string) => {
    setSelectedCorridor(corridorId);
    const target = corridors.find((c) => c.id === corridorId);
    if (target && target.center) {
      setMapCenter(target.center);
      setMapZoom(target.zoom || 11);
    }
  };

  const filteredFacilities = facilities.filter((f) => {
    if (!f.latitude || !f.longitude) return false;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.companyName.toLowerCase().includes(q) ||
      f.city.toLowerCase().includes(q);

    const matchesCorridor =
      selectedCorridor === 'all' ||
      (selectedCorridor === 'dahej' && f.city.toLowerCase().includes('dahej')) ||
      (selectedCorridor === 'sanand' && (f.city.toLowerCase().includes('sanand') || f.city.toLowerCase().includes('ahmedabad'))) ||
      (selectedCorridor === 'vapi' && (f.city.toLowerCase().includes('vapi') || f.city.toLowerCase().includes('surat'))) ||
      (selectedCorridor === 'bhiwandi' && f.city.toLowerCase().includes('bhiwandi')) ||
      (selectedCorridor === 'chakan' && (f.city.toLowerCase().includes('chakan') || f.city.toLowerCase().includes('pune')));

    return matchesQuery && matchesCorridor;
  });

  const filteredProperties = properties.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q);

    const matchesCorridor =
      selectedCorridor === 'all' ||
      (selectedCorridor === 'dahej' && p.city.toLowerCase().includes('dahej')) ||
      (selectedCorridor === 'sanand' && (p.city.toLowerCase().includes('sanand') || p.city.toLowerCase().includes('ahmedabad'))) ||
      (selectedCorridor === 'vapi' && (p.city.toLowerCase().includes('vapi') || p.city.toLowerCase().includes('surat'))) ||
      (selectedCorridor === 'bhiwandi' && p.city.toLowerCase().includes('bhiwandi')) ||
      (selectedCorridor === 'chakan' && (p.city.toLowerCase().includes('chakan') || p.city.toLowerCase().includes('pune')));

    return matchesQuery && matchesCorridor;
  });

  return (
    <div className="space-y-4 max-w-full text-left h-auto lg:h-[calc(100vh-110px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border shrink-0">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Industrial Map</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <MapPin className="w-6 h-6 text-fairway-600" />
            <span>India Industrial Corridors Map</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Geographic mapping of Fairway Warehouse Parks and client manufacturing plants across key freight corridors.
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-surface p-1.5 rounded-lg border border-border text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground px-2 py-1 rounded hover:bg-surface-muted">
            <input
              type="checkbox"
              checked={showProperties}
              onChange={(e) => setShowProperties(e.target.checked)}
              className="rounded text-fairway-600 focus:ring-fairway-600"
            />
            <span className="w-2.5 h-2.5 rounded bg-fairway-600 inline-block" />
            <span>Fairway Parks ({properties.length})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground px-2 py-1 rounded hover:bg-surface-muted">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
              className="rounded text-accent-600 focus:ring-accent-600"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-accent-500 inline-block" />
            <span>Client Plants ({facilities.length})</span>
          </label>
        </div>
      </div>

      {/* Main Split Map Container: Sidebar (Left) + Interactive Leaflet Map (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Interactive Sidebar (4 cols) */}
        <div className="order-2 lg:order-1 lg:col-span-4 bg-surface rounded-card border border-border shadow-subtle p-3 flex flex-col max-h-[380px] lg:max-h-none min-h-0 overflow-hidden">
          {/* Corridor Selection Pills */}
          <div className="space-y-2 pb-3 border-b border-border shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
              Quick Corridor Jump
            </span>
            <div className="flex flex-wrap gap-1.5">
              {corridors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCorridor(c.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                    selectedCorridor === c.id
                      ? 'bg-fairway-600 text-white shadow-subtle'
                      : 'bg-surface-muted text-foreground-muted hover:text-foreground hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search in Map */}
          <div className="py-2.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search pins on map..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface-muted/60 border border-border rounded-input text-xs focus:outline-none focus:border-fairway-600"
              />
            </div>
          </div>

          {/* List of pins */}
          <div className="flex-1 overflow-y-auto pt-2 space-y-2 pr-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block px-1">
              Active Map Pins ({filteredProperties.length + filteredFacilities.length})
            </span>

            {/* Fairway Properties List */}
            {showProperties && filteredProperties.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setMapCenter([p.latitude, p.longitude]);
                  setMapZoom(13);
                }}
                className="p-2.5 rounded-lg border border-border hover:border-fairway-400 bg-surface hover:bg-fairway-50/40 cursor-pointer transition-all shadow-subtle group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-fairway-600 shrink-0" />
                    <span className="font-bold text-foreground group-hover:text-fairway-800">{p.name}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 px-1 rounded text-foreground-muted">
                    {p.code}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted mt-1 break-words sm:truncate">
                  {formatSqFt(p.availableAreaSqFt)} avail @ ₹{p.rentPerSqFtINR}/sq.ft · {p.city}
                </p>
              </div>
            ))}

            {/* Client Facilities List */}
            {showFacilities && filteredFacilities.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  if (f.latitude && f.longitude) {
                    setMapCenter([f.latitude, f.longitude]);
                    setMapZoom(13);
                  }
                }}
                className="p-2.5 rounded-lg border border-border hover:border-accent-400 bg-surface hover:bg-accent-50/40 cursor-pointer transition-all shadow-subtle group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0" />
                    <span className="font-bold text-foreground group-hover:text-fairway-900">{f.name}</span>
                  </div>
                  <span className="text-[10px] text-foreground-muted font-medium">{f.type}</span>
                </div>
                <p className="text-[11px] text-foreground-muted mt-1 break-words sm:truncate">
                  {f.companyName} · {f.city}, {f.state}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Interactive Leaflet Map (8 cols) */}
        <div className="order-1 lg:order-2 lg:col-span-8 bg-surface rounded-card border border-border shadow-subtle overflow-hidden relative z-10 min-h-[360px] sm:min-h-[450px] lg:min-h-0 h-[360px] sm:h-[450px] lg:h-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapViewController center={mapCenter} zoom={mapZoom} />

            {/* CartoDB Positron Clean Minimalist Map Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Fairway Warehouse Properties Pins */}
            {showProperties &&
              filteredProperties.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]} icon={propertyIcon}>
                  <Popup>
                    <div className="p-3 max-w-xs text-left">
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-border">
                        <span className="font-mono font-bold text-xs text-fairway-900">{p.code}</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          {p.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground mt-1.5">{p.name}</h4>
                      <p className="text-[11px] text-foreground-muted mt-0.5">{p.location} · {p.city}</p>

                      <div className="grid grid-cols-2 gap-2 my-2 p-2 bg-slate-50 rounded border border-border text-[11px]">
                        <div>
                          <span className="text-[9px] text-foreground-muted uppercase block">Available</span>
                          <strong className="text-fairway-800 font-bold">{formatSqFt(p.availableAreaSqFt)}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-foreground-muted uppercase block">Rent Rate</span>
                          <strong className="text-foreground font-bold">₹{p.rentPerSqFtINR} / sq.ft</strong>
                        </div>
                      </div>

                      <div className="pt-1 flex gap-2">
                        <button
                          onClick={() => onNavigateToProperty(p.id)}
                          className="w-full text-center text-xs font-bold bg-fairway-600 hover:bg-fairway-700 text-white py-1 rounded transition-colors"
                        >
                          View Property Specs →
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Client Facilities Pins */}
            {showFacilities &&
              filteredFacilities.map((f) => {
                if (!f.latitude || !f.longitude) return null;
                return (
                  <Marker key={f.id} position={[f.latitude, f.longitude]} icon={facilityIcon}>
                    <Popup>
                      <div className="p-3 max-w-xs text-left">
                        <div className="flex items-center justify-between gap-2 pb-1 border-b border-border">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase">{f.type}</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                            {f.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground mt-1.5">{f.name}</h4>
                        <p className="text-[11px] text-foreground-muted font-semibold mt-0.5">{f.companyName}</p>
                        <p className="text-[10px] text-foreground-muted mt-0.5">{f.address} · {f.city}</p>

                        <div className="pt-2 mt-2 border-t border-border">
                          <button
                            onClick={() => onNavigateToCompany(f.companyId)}
                            className="w-full text-center text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white py-1 rounded transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Open Company CRM Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export const MapPage = IndiaMapView;
export default MapPage;
