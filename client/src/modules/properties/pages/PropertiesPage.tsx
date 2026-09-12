import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Search,
  Filter,
  MapPin,
  ChevronRight,
  Shield,
  Zap,
  Truck,
  Flame,
  Plus,
  RefreshCw,
  List,
  LayoutGrid,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { PropertyService } from '@/modules/core/services/propertyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { Property, PropertyStatus } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';

import { DataTable7, ColumnConfig } from '@/modules/core/components/ui/data-table-7';

export interface PropertyListViewProps {
  onSelectProperty: (id: string) => void;
  onNavigateToMap: () => void;
  onOpenNewProperty?: () => void;
}

export const PropertyListView: React.FC<PropertyListViewProps> = ({
  onSelectProperty,
  onNavigateToMap,
  onOpenNewProperty,
}) => {
  const { canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProperties = async () => {
    try {
      const res = await PropertyService.getProperties();
      if (res.success && res.data && res.data.length > 0) {
        setProperties(res.data);
      } else {
        setProperties(StorageService.getProperties());
      }
    } catch {
      setProperties(StorageService.getProperties());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

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

  const propertyColumns: ColumnConfig<Property>[] = [
    {
      key: 'actions',
      label: 'Action',
      width: 70,
      render: (p) => (
        <button
          type="button"
          onClick={() => onSelectProperty(p.id)}
          className="size-7 rounded-md inline-flex items-center justify-center text-foreground-muted hover:text-fairway-700 hover:bg-fairway-50 dark:hover:bg-fairway-950/60 transition-colors cursor-pointer"
          title="View warehouse details"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      width: 140,
      render: (p) => (
        <span className="font-mono font-bold text-fairway-800 bg-fairway-50 px-2 py-0.5 rounded border border-fairway-200">
          {p.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Property Name',
      width: 260,
      render: (p) => <span className="font-bold text-foreground hover:text-fairway-800">{p.name}</span>,
    },
    {
      key: 'corridor',
      label: 'Corridor / City',
      width: 200,
      render: (p) => <span className="text-foreground-muted">{p.city} ({p.corridor})</span>,
    },
    {
      key: 'availableAreaSqFt',
      label: 'Available Space',
      width: 160,
      render: (p) => <span className="font-bold text-fairway-900">{formatSqFt(p.availableAreaSqFt)}</span>,
    },
    {
      key: 'rentPerSqFtINR',
      label: 'Base Rent',
      width: 130,
      render: (p) => <span className="font-mono font-semibold">₹{p.rentPerSqFtINR} / sq.ft</span>,
    },
    {
      key: 'docksCount',
      label: 'Docks',
      width: 100,
      render: (p) => <span>{p.docksCount} Docks</span>,
    },
    {
      key: 'clearHeightFt',
      label: 'Height',
      width: 100,
      render: (p) => <span>{p.clearHeightFt}m</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 140,
      render: (p) => (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
          {p.status}
        </span>
      ),
    },
  ];

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

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenNewProperty && (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenNewProperty}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold"
            >
              Add Warehouse
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onNavigateToMap} leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-700" />}>
            View Map
          </Button>
          <div className="flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`w-9 h-full flex items-center justify-center transition-all cursor-pointer ${viewMode === 'table' ? 'bg-fairway-600 text-white font-bold' : 'text-foreground hover:bg-surface-muted/60'
                }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`w-9 h-full flex items-center justify-center transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-fairway-600 text-white font-bold' : 'text-foreground hover:bg-surface-muted/60'
                }`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
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
                    className={`text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm ${prop.status === 'Available'
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-amber-600/90 text-white'
                      }`}
                  >
                    {prop.status}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-black text-foreground border border-border">
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
        /* Table View with Pinned Columns (DataTable7) */
        <DataTable7<Property>
          data={filteredProps}
          columns={propertyColumns}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => onSelectProperty(p.id)}
        />
      )}
    </div>
  );
};

export const PropertiesPage = PropertyListView;
export default PropertiesPage;
