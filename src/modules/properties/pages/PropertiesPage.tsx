import React, { useState } from 'react';
import {
  Warehouse,
  Search,
  Filter,
  MapPin,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
  Truck,
  Flame,
  Plus,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { Property, PropertyStatus } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';

export interface PropertyListViewProps {
  onSelectProperty: (id: string) => void;
  onNavigateToMap: () => void;
}

export const PropertyListView: React.FC<PropertyListViewProps> = ({
  onSelectProperty,
  onNavigateToMap,
}) => {
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const properties = StorageService.getProperties();
  const uniqueCorridors = Array.from(new Set(properties.map((p) => p.corridor))).filter(Boolean);

  const filteredProps = properties.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.corridor.toLowerCase().includes(q);

    const matchesCorridor = corridorFilter === 'all' || p.corridor === corridorFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesQuery && matchesCorridor && matchesStatus;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Properties</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <Warehouse className="w-6 h-6 text-fairway-600" />
            <span>Warehouse Property Master</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Grade-A industrial warehouse inventory, clear heights, FM2 flooring, dock configurations and leasing terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onNavigateToMap} leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-700" />}>
            View Map
          </Button>
          <div className="flex bg-surface border border-border rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded font-medium ${viewMode === 'grid' ? 'bg-fairway-600 text-white' : 'text-foreground-muted'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded font-medium ${viewMode === 'table' ? 'bg-fairway-600 text-white' : 'text-foreground-muted'}`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-3 rounded-card border border-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search warehouse parks, codes, cities, or corridors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-surface-muted/60 border border-border rounded-input text-xs focus:outline-none focus:border-fairway-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={corridorFilter}
            onChange={(e) => setCorridorFilter(e.target.value)}
            className="bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Corridors</option>
            {uniqueCorridors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Partially Leased">Partially Leased</option>
            <option value="Fully Leased">Fully Leased</option>
          </select>
        </div>
      </div>

      {/* Grid Cards View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProps.map((prop) => (
            <div
              key={prop.id}
              onClick={() => onSelectProperty(prop.id)}
              className="bg-surface rounded-card border border-border hover:border-fairway-400 shadow-subtle hover:shadow-card cursor-pointer transition-all overflow-hidden group flex flex-col"
            >
              {/* Photo Banner */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                <img
                  src={prop.photos[0]}
                  alt={prop.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-900/80 text-white backdrop-blur-sm px-2 py-0.5 rounded">
                    {prop.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm ${
                      prop.status === 'Available'
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-amber-600/90 text-white'
                    }`}
                  >
                    {prop.status}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-black text-fairway-900 border border-border">
                  ₹{prop.rentPerSqFtINR} / sq.ft
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-fairway-800 leading-snug">
                    {prop.name}
                  </h3>
                  <p className="text-xs text-foreground-muted flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prop.city}, {prop.state} ({prop.corridor})</span>
                  </p>

                  {/* Area Metric */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-surface-muted/50 rounded-lg border border-border text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-foreground-muted block">Available Area</span>
                      <span className="font-black text-fairway-800 text-sm">{formatSqFt(prop.availableAreaSqFt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-foreground-muted block">Total Park Area</span>
                      <span className="font-bold text-foreground text-sm">{formatSqFt(prop.totalAreaSqFt)}</span>
                    </div>
                  </div>

                  {/* Tech Specs Icons */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-foreground-muted">
                    <span className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded border border-border">
                      <Truck className="w-3 h-3 text-fairway-600" />
                      <span>{prop.docksCount} Docks</span>
                    </span>
                    <span className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded border border-border">
                      <span>{prop.clearHeightFt}m Height</span>
                    </span>
                    <span className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded border border-border">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>{prop.powerKVA} KVA</span>
                    </span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs text-fairway-800 font-semibold">
                  <span>View Specifications & Inquiries</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wider text-foreground-muted border-b border-border">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Property Name</th>
                  <th className="py-3 px-4">Corridor / City</th>
                  <th className="py-3 px-4">Available Space</th>
                  <th className="py-3 px-4">Base Rent</th>
                  <th className="py-3 px-4">Docks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProps.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProperty(p.id)}
                    className="hover:bg-fairway-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-fairway-800">{p.code}</td>
                    <td className="py-3 px-4 font-bold text-foreground">{p.name}</td>
                    <td className="py-3 px-4 text-foreground-muted">{p.city} ({p.corridor})</td>
                    <td className="py-3 px-4 font-bold text-fairway-900">{formatSqFt(p.availableAreaSqFt)}</td>
                    <td className="py-3 px-4 font-mono font-semibold">₹{p.rentPerSqFtINR}/sq.ft</td>
                    <td className="py-3 px-4">{p.docksCount}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-foreground-muted inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const PropertiesPage = PropertyListView;
export default PropertiesPage;
