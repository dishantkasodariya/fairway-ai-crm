import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, ExternalLink, Loader2, MapPin } from 'lucide-react';
import { PropertyService } from '@/modules/core/services/propertyService';

const pinIcon = L.divIcon({
  className: 'custom-property-marker',
  html: `<div style="background:#EB661F;color:white;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const Recenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 14), { animate: true });
  }, [center[0], center[1]]);
  return null;
};

interface LocationPickerProps {
  latitude: number | '';
  longitude: number | '';
  onChange: (lat: number, lng: number) => void;
  error?: string;
}

/**
 * Warehouse location: paste a Google Maps link (full or maps.app.goo.gl) or coordinates,
 * confirm on the preview map, and drag the pin to fine-tune. No location is ever assumed.
 */
const LocationPicker: React.FC<LocationPickerProps> = ({ latitude, longitude, onChange, error }) => {
  const [input, setInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const hasPoint = latitude !== '' && longitude !== '' && latitude !== null && longitude !== null;
  const center = useMemo<[number, number] | null>(
    () => (hasPoint ? [Number(latitude), Number(longitude)] : null),
    [latitude, longitude, hasPoint]
  );

  const locate = async () => {
    if (!input.trim()) return;
    setResolving(true);
    setMessage(null);
    try {
      const res = await PropertyService.resolveLocation(input.trim());
      if (res.success && res.data) {
        onChange(res.data.lat, res.data.lng);
        setMessage({ kind: 'ok', text: 'Pinned. Check the map and drag the pin if it is not exactly on the warehouse.' });
      } else {
        setMessage({ kind: 'error', text: (typeof res.error === 'string' ? res.error : res.error?.message) || 'Could not read that location.' });
      }
    } catch (e: any) {
      setMessage({ kind: 'error', text: e?.message || 'Could not read that location.' });
    } finally {
      setResolving(false);
    }
  };

  const inputClass =
    'w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-xl text-sm text-foreground h-10 px-3.5 focus:border-fairway-600 focus:outline-none';

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
        <span>Map Location</span>
        <span className="text-rose-500 font-bold">*</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste a Google Maps link (or maps.app.goo.gl) or coordinates, e.g. 21.4779, 72.7234"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              locate();
            }
          }}
          className={`${inputClass} ${error && !hasPoint ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
        />
        <button
          type="button"
          onClick={locate}
          disabled={resolving || !input.trim()}
          className="shrink-0 h-10 px-4 rounded-xl bg-fairway-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          Locate
        </button>
      </div>
      <p className="text-[11px] text-foreground-muted">
        In Google Maps, right-click the warehouse to copy its coordinates, or drop a pin and use Share → Copy link.
      </p>
      {message && (
        <p className={`text-[11px] font-medium ${message.kind === 'ok' ? 'text-emerald-600' : 'text-rose-500'}`}>{message.text}</p>
      )}
      {error && !hasPoint && !message && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}

      {center ? (
        <div className="rounded-xl overflow-hidden border border-border">
          <div className="h-64">
            <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Recenter center={center} />
              <Marker
                position={center}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const p = (e.target as L.Marker).getLatLng();
                    onChange(Number(p.lat.toFixed(7)), Number(p.lng.toFixed(7)));
                  },
                }}
              />
            </MapContainer>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-muted/40 text-[11px]">
            <span className="flex items-center gap-1.5 font-mono text-foreground">
              <MapPin className="w-3 h-3 text-fairway-600" />
              {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-fairway-600 font-semibold hover:underline"
            >
              Check in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="h-24 rounded-xl border border-dashed border-border flex items-center justify-center text-[11px] text-foreground-muted">
          No location yet. Discovery searches and the map use this exact point.
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
