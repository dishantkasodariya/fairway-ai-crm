import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Search,
  Warehouse,
  ExternalLink,
  Radar,
  Loader2,
} from 'lucide-react';
import { PropertyService } from '@/modules/core/services/propertyService';
import { FacilityService } from '@/modules/core/services/facilityService';
import { Facility, Property } from '@/modules/core/types';
import { formatSqFt } from '@/modules/core/utils/formatters';
import { IntelligenceService, DiscoveredCompany } from '@/modules/core/services/intelligenceService';

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
  html: `<div style="background:#EB661F; color:white; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const facilityIcon = L.divIcon({
  className: 'custom-facility-marker',
  html: `<div style="background:#10B981; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.25);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Map Controller Helper for Pan & Zoom
const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// The warehouse a radius view is centred on: bigger, with a halo.
const selectedPropertyIcon = L.divIcon({
  className: 'custom-property-marker',
  html: `<div style="background:#EB661F; color:white; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:3px solid white; box-shadow:0 0 0 6px rgba(235,102,31,0.35), 0 4px 10px rgba(0,0,0,0.35);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Zoom to show a warehouse's whole search radius.
const FitRadius: React.FC<{ center: [number, number]; radiusKm: number }> = ({ center, radiusKm }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLng(center[0], center[1]).toBounds(radiusKm * 2000), { padding: [24, 24], animate: false });
  }, [center[0], center[1], radiusKm, map]);
  return null;
};

const hasLocation = (p: Property): p is Property & { latitude: number; longitude: number } =>
  p.latitude !== null && p.longitude !== null && Number.isFinite(p.latitude) && Number.isFinite(p.longitude);

const RADIUS_OPTIONS = [10, 20, 30, 50];
const HOT_SCORE = 50;
const prospectColor = (c: DiscoveredCompany) =>
  c.opportunityScore === null ? '#94a3b8' : c.opportunityScore >= HOT_SCORE ? '#dc2626' : '#f59e0b';

export interface IndiaMapViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToProperty: (propertyId: string) => void;
  onOpenProspect?: (prospectId: number) => void;
}

export const IndiaMapView: React.FC<IndiaMapViewProps> = ({
  onNavigateToCompany,
  onNavigateToProperty,
  onOpenProspect,
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

  // Prospects around one warehouse: its radius circle and every known company inside it.
  const [radiusWarehouseId, setRadiusWarehouseId] = useState('');
  const [radiusKm, setRadiusKm] = useState(30);
  const [prospects, setProspects] = useState<DiscoveredCompany[]>([]);
  const [prospectsTotal, setProspectsTotal] = useState(0);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const locatedProperties = useMemo(() => properties.filter(hasLocation), [properties]);
  const unlocatedCount = properties.length - locatedProperties.length;
  const radiusWarehouse = locatedProperties.find((p) => p.id === radiusWarehouseId) || null;

  useEffect(() => {
    if (!radiusWarehouse) {
      setProspects([]);
      setProspectsTotal(0);
      return;
    }
    let live = true;
    setLoadingProspects(true);
    IntelligenceService.listDiscoveredCompanies({
      near: { lat: radiusWarehouse.latitude, lng: radiusWarehouse.longitude, withinKm: radiusKm },
      sortBy: 'score',
      limit: 500,
    })
      .then((res) => {
        if (!live) return;
        setProspects((res.data?.items || []).filter((c) => c.lat !== null && c.lng !== null));
        setProspectsTotal(res.data?.total || 0);
      })
      .finally(() => live && setLoadingProspects(false));
    return () => {
      live = false;
    };
  }, [radiusWarehouse?.id, radiusWarehouse?.latitude, radiusWarehouse?.longitude, radiusKm]);

  const hotCount = prospects.filter((c) => (c.opportunityScore ?? 0) >= HOT_SCORE).length;
  const scoredCount = prospects.filter((c) => c.opportunityScore !== null).length;

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

  // Deduplicate and filter properties
  const uniqueProperties = useMemo(() => {
    const seen = new Set<string>();
    return locatedProperties
      .filter((p) => {
        const key = `${p.code || p.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((p) => {
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
  }, [locatedProperties, searchQuery, selectedCorridor]);

  // Deduplicate and filter facilities
  const uniqueFacilities = useMemo(() => {
    const seen = new Set<string>();
    return facilities
      .filter((f) => {
        if (!f.latitude || !f.longitude) return false;
        const key = `${f.companyId || ''}-${f.name.trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((f) => {
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
  }, [facilities, searchQuery, selectedCorridor]);

  return (
    <div className="space-y-4 max-w-full text-left h-auto lg:h-[calc(100vh-110px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border shrink-0">
        <div>
          <span className="text-xs font-semibold text-fairway-600 dark:text-fairway-400 uppercase tracking-wider">CRM / Industrial Map</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <MapPin className="w-6 h-6 text-fairway-600 dark:text-fairway-400" />
            <span>India Industrial Corridors Map</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Geographic mapping of Fairway Warehouse Parks and client manufacturing plants across key freight corridors.
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-surface p-1.5 rounded-xl border border-border text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground px-2 py-1 rounded-lg hover:bg-surface-muted transition-colors">
            <input
              type="checkbox"
              checked={showProperties}
              onChange={(e) => setShowProperties(e.target.checked)}
              className="rounded text-fairway-600 focus:ring-fairway-600"
            />
            <span className="w-2.5 h-2.5 rounded bg-fairway-600 inline-block shrink-0" />
            <span>Fairway Parks ({uniqueProperties.length})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground px-2 py-1 rounded-lg hover:bg-surface-muted transition-colors">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-600"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span>Client Plants ({uniqueFacilities.length})</span>
          </label>
        </div>
      </div>

      {/* Main Split Map Container: Sidebar (Left) + Interactive Leaflet Map (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Interactive Sidebar (4 cols) */}
        <div className="order-2 lg:order-1 lg:col-span-4 bg-surface rounded-2xl border border-border shadow-xs p-3.5 flex flex-col max-h-[380px] lg:max-h-none min-h-0 overflow-hidden">
          {/* Prospects around a warehouse */}
          <div className="space-y-2 pb-3 border-b border-border shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
              <Radar className="w-3 h-3 text-fairway-600" /> Prospects around a warehouse
            </span>
            <div className="flex gap-2">
              <select
                value={radiusWarehouseId}
                onChange={(e) => {
                  setRadiusWarehouseId(e.target.value);
                  // Client plants would bury the prospect dots; they can be switched back on.
                  if (e.target.value) setShowFacilities(false);
                }}
                className="flex-1 min-w-0 bg-surface-muted/50 border border-border rounded-lg text-xs text-foreground h-8 px-2 focus:outline-none focus:border-fairway-600"
              >
                <option value="">Choose a warehouse…</option>
                {locatedProperties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-20 bg-surface-muted/50 border border-border rounded-lg text-xs text-foreground h-8 px-2 focus:outline-none focus:border-fairway-600"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </div>
            {radiusWarehouse && (
              <div className="text-[11px] text-foreground-muted space-y-1">
                <p className="flex items-center gap-1.5 text-foreground font-semibold">
                  {loadingProspects && <Loader2 className="w-3 h-3 animate-spin" />}
                  {prospectsTotal} companies within {radiusKm} km
                  {prospectsTotal > prospects.length && <span className="font-normal text-foreground-muted">(top {prospects.length} by score shown)</span>}
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Hot ≥{HOT_SCORE} ({hotCount})</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Scored ({scoredCount - hotCount})</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Not scored yet ({prospects.length - scoredCount})</span>
                </div>
              </div>
            )}
            {unlocatedCount > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {unlocatedCount} warehouse{unlocatedCount === 1 ? ' has' : 's have'} no map location. Edit {unlocatedCount === 1 ? 'it' : 'them'} to pin the exact spot.
              </p>
            )}
          </div>

          {/* Corridor Selection Pills */}
          <div className="space-y-2 pb-3 border-b border-border shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
              Quick Corridor Jump
            </span>
            <div className="flex flex-wrap gap-1.5">
              {corridors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCorridor(c.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedCorridor === c.id
                      ? 'bg-fairway-600 text-white shadow-2xs'
                      : 'bg-surface-muted text-foreground-muted hover:text-foreground hover:bg-surface-muted/80'
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
                className="w-full pl-9 pr-3 py-1.5 bg-surface-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-fairway-600 transition-colors"
              />
            </div>
          </div>

          {/* List of pins */}
          <div className="flex-1 overflow-y-auto pt-2 space-y-2 pr-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block px-1">
              Active Map Pins ({uniqueProperties.length + uniqueFacilities.length})
            </span>

            {/* Fairway Properties List */}
            {showProperties && uniqueProperties.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setRadiusWarehouseId('');
                  setMapCenter([p.latitude, p.longitude]);
                  setMapZoom(13);
                }}
                className="p-2.5 rounded-xl border border-border hover:border-fairway-400/80 bg-surface hover:bg-surface-muted/50 cursor-pointer transition-all shadow-2xs group text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded bg-fairway-600 shrink-0" />
                    <span className="font-bold text-foreground group-hover:text-fairway-600 transition-colors truncate">{p.name}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-surface-muted border border-border px-1.5 py-0.5 rounded text-foreground-muted shrink-0">
                    {p.code}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted mt-1 truncate">
                  {formatSqFt(p.availableAreaSqFt)} avail @ ₹{p.rentPerSqFtINR}/sq.ft · {p.city}
                </p>
              </div>
            ))}

            {/* Client Facilities List */}
            {showFacilities && uniqueFacilities.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  if (f.latitude && f.longitude) {
                    setMapCenter([f.latitude, f.longitude]);
                    setMapZoom(13);
                  }
                }}
                className="p-2.5 rounded-xl border border-border hover:border-emerald-400/80 bg-surface hover:bg-surface-muted/50 cursor-pointer transition-all shadow-2xs group text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-foreground group-hover:text-emerald-600 transition-colors truncate">{f.name}</span>
                  </div>
                  <span className="text-[10px] text-foreground-muted bg-surface-muted px-1.5 py-0.5 rounded border border-border font-medium shrink-0">
                    {f.type}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted mt-1 truncate">
                  {f.companyName} · {f.city}, {f.state}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Interactive Leaflet Map (8 cols) */}
        <div className="order-1 lg:order-2 lg:col-span-8 bg-surface rounded-2xl border border-border shadow-xs overflow-hidden relative z-10 min-h-[360px] sm:min-h-[450px] lg:min-h-0 h-[360px] sm:h-[450px] lg:h-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            preferCanvas
            style={{ height: '100%', width: '100%' }}
          >
            {/* One view controller at a time: the radius view owns the zoom while it's open. */}
            {!radiusWarehouse && <MapViewController center={mapCenter} zoom={mapZoom} />}
            {radiusWarehouse && (
              <>
                <FitRadius center={[radiusWarehouse.latitude, radiusWarehouse.longitude]} radiusKm={radiusKm} />
                <Circle
                  center={[radiusWarehouse.latitude, radiusWarehouse.longitude]}
                  radius={radiusKm * 1000}
                  pathOptions={{ color: '#EB661F', weight: 2, dashArray: '6 6', fillColor: '#EB661F', fillOpacity: 0.06 }}
                />
                {prospects.map((c) => (
                  <CircleMarker
                    key={c.id}
                    center={[c.lat as number, c.lng as number]}
                    radius={c.opportunityScore !== null && c.opportunityScore >= HOT_SCORE ? 7 : 5}
                    pathOptions={{ color: '#ffffff', weight: 1, fillColor: prospectColor(c), fillOpacity: 0.9 }}
                  >
                    <Popup>
                      <div className="p-3 min-w-[200px] max-w-xs text-left bg-white text-slate-900 rounded-xl">
                        <h4 className="text-sm font-bold leading-snug">{c.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{c.businessType || 'Business type unknown'}</p>
                        <div className="grid grid-cols-3 gap-1.5 my-2 p-2 bg-slate-100 rounded-lg text-[11px]">
                          <div><span className="block text-[9px] uppercase text-slate-500 font-semibold">Distance</span><strong>{c.distanceKm !== null ? `${c.distanceKm.toFixed(1)} km` : '—'}</strong></div>
                          <div><span className="block text-[9px] uppercase text-slate-500 font-semibold">Revenue</span><strong>{c.latestRevenueCr !== null ? `₹${Math.round(c.latestRevenueCr).toLocaleString('en-IN')} Cr` : '—'}</strong></div>
                          <div><span className="block text-[9px] uppercase text-slate-500 font-semibold">Score</span><strong>{c.opportunityScore ?? '—'}</strong></div>
                        </div>
                        {onOpenProspect && (
                          <button
                            type="button"
                            onClick={() => onOpenProspect(c.id)}
                            className="w-full text-center text-xs font-bold bg-fairway-600 hover:bg-fairway-700 text-white py-1.5 rounded-lg cursor-pointer"
                          >
                            Open prospect →
                          </button>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </>
            )}

            {/* Clean OpenStreetMap Tiles (Zero Watermarks, No API Key Required) */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fairway Warehouse Properties Pins */}
            {showProperties &&
              uniqueProperties.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.latitude, p.longitude]}
                  icon={p.id === radiusWarehouseId ? selectedPropertyIcon : propertyIcon}
                  zIndexOffset={p.id === radiusWarehouseId ? 1000 : 0}
                >
                  <Popup>
                    <div className="p-3.5 min-w-[220px] max-w-xs text-left bg-white text-slate-900 rounded-xl">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">{p.code}</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                          {p.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-2 leading-snug">{p.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-fairway-600 shrink-0" />
                        <span>{p.location}, {p.city}</span>
                      </p>

                      <div className="grid grid-cols-2 gap-2 my-2.5 p-2 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Available</span>
                          <strong className="text-slate-900 font-bold text-sm">{formatSqFt(p.availableAreaSqFt)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Rent Rate</span>
                          <strong className="text-emerald-700 font-bold text-sm">₹{p.rentPerSqFtINR} <span className="text-[10px] font-normal text-slate-500">/sq.ft</span></strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateToProperty(p.id)}
                        className="w-full text-center text-xs font-bold bg-fairway-600 hover:bg-fairway-700 text-white py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        View Property Specs →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Client Facilities Pins */}
            {showFacilities &&
              uniqueFacilities.map((f) => {
                if (!f.latitude || !f.longitude) return null;
                return (
                  <Marker key={f.id} position={[f.latitude, f.longitude]} icon={facilityIcon}>
                    <Popup>
                      <div className="p-3.5 min-w-[220px] max-w-xs text-left bg-white text-slate-900 rounded-xl">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 uppercase">
                            {f.type}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">{f.status}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-2 leading-snug">{f.name}</h4>
                        <p className="text-xs font-semibold text-fairway-700 mt-0.5">{f.companyName}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{f.city}, {f.state}</span>
                        </p>

                        <div className="pt-2.5 mt-2.5 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => onNavigateToCompany(f.companyId)}
                            className="w-full text-center text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <span>Open Company Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
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
