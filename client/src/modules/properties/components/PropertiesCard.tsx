import React, { useState } from 'react';
import { Warehouse, MapPin, ChevronRight, MoreHorizontal, Eye, Edit3, Trash2 } from 'lucide-react';
import { Property } from '@/modules/core/types';
import { formatSqFt } from '@/modules/core/utils/formatters';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';

export const PropertyCardBanner: React.FC<{
  photoSrc?: string;
  code: string;
  serialNo?: number;
  status: string;
  isAvail: boolean;
  rentPerSqFtINR: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}> = ({ photoSrc, code, serialNo, status, isAvail, rentPerSqFtINR, onEdit, onDelete, onView }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative h-44 sm:h-48 w-full bg-slate-900 overflow-hidden shrink-0 select-none">
      {!hasError && photoSrc ? (
        <img
          src={photoSrc}
          alt=""
          onError={() => setHasError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-linear-to-br from-slate-900 via-slate-800 to-fairway-950 text-white relative">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <Warehouse className="w-10 h-10 text-fairway-400/70 mb-1 z-1" />
          <span className="text-[11px] font-medium text-slate-300 z-1">Grade-A Logistics Facility</span>
        </div>
      )}

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-1.5 flex-wrap max-w-[70%] z-10">
        <span
          className="text-[11px] sm:text-xs font-bold bg-slate-950/85 text-white backdrop-blur-md px-2.5 py-0.5 rounded shadow-xs border border-white/10"
          title={`Code: ${code}`}
        >
          #{serialNo ?? code}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md shadow-xs ${
            isAvail ? 'bg-emerald-600/90 text-white' : 'bg-amber-600/90 text-white'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Top Right Action Dropdown */}
      {(onEdit || onDelete || onView) && (
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center border border-white/20 transition-colors cursor-pointer shadow-xs"
                title="Actions"
                aria-label="Actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-surface border border-border shadow-dialog z-50">
              {onView && (
                <DropdownMenuItem onClick={onView} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Eye className="w-3.5 h-3.5 text-foreground-muted" />
                  <span>View Warehouse</span>
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
                  <span>Edit Warehouse</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Warehouse</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Rent Badge */}
      <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-slate-950/85 text-white backdrop-blur-md px-2.5 py-1 rounded text-xs font-black border border-white/10 shadow-xs z-10">
        ₹{rentPerSqFtINR} <span className="text-[10px] font-normal text-slate-300">/ sq.ft</span>
      </div>
    </div>
  );
};

export interface PropertiesCardProps {
  properties: Property[];
  onSelectProperty: (id: string) => void;
  onEditProperty?: (property: Property) => void;
  onDeleteProperty?: (property: Property) => void;
}

export const PropertiesCard: React.FC<PropertiesCardProps> = ({
  properties,
  onSelectProperty,
  onEditProperty,
  onDeleteProperty,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {properties.map((p, idx) => {
        const isAvail = p.status?.toLowerCase() === 'available';
        return (
          <div
            key={p.id}
            onClick={() => onSelectProperty(p.id)}
            className="group bg-surface rounded-card border border-border hover:border-fairway-500/60 transition-all duration-200 shadow-2xs hover:shadow-card flex flex-col overflow-hidden text-left cursor-pointer"
          >
            <PropertyCardBanner
              photoSrc={p.photos?.[0]}
              code={p.code}
              serialNo={idx + 1}
              status={p.status || 'Available'}
              isAvail={isAvail}
              rentPerSqFtINR={p.rentPerSqFtINR}
              onView={() => onSelectProperty(p.id)}
              onEdit={onEditProperty ? () => onEditProperty(p) : undefined}
              onDelete={onDeleteProperty ? () => onDeleteProperty(p) : undefined}
            />

            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <h3 className="font-bold text-foreground text-sm group-hover:text-fairway-700 dark:group-hover:text-fairway-400 transition-colors line-clamp-2">
                  {p.name}
                </h3>
                <p className="text-xs text-foreground-muted flex items-center gap-1 line-clamp-1">
                  <MapPin className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                  <span>{p.city || 'Gujarat'}, {p.corridor || p.location || 'Industrial Belt'}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/70 text-xs">
                <div>
                  <span className="text-[11px] text-foreground-muted block">Available Space</span>
                  <span className="font-bold text-fairway-900 dark:text-fairway-300">{formatSqFt(p.availableAreaSqFt)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-foreground-muted block">Total Area</span>
                  <span className="font-medium text-foreground">{formatSqFt(p.totalAreaSqFt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-border/70 text-[11px] text-foreground-muted flex-wrap">
                {p.clearHeightFt && (
                  <span className="bg-surface-muted px-2 py-0.5 rounded border border-border/60">
                    {p.clearHeightFt}m Height
                  </span>
                )}
                {p.docksCount && (
                  <span className="bg-surface-muted px-2 py-0.5 rounded border border-border/60">
                    {p.docksCount} Docks
                  </span>
                )}
                {p.flooringCapacityMT && (
                  <span className="bg-surface-muted px-2 py-0.5 rounded border border-border/60">
                    {p.flooringCapacityMT} MT Flooring
                  </span>
                )}
              </div>

              {/* View Details Action Footer */}
              <div className="pt-2.5 border-t border-border/70 flex items-center justify-between text-xs font-semibold text-fairway-700 dark:text-fairway-400 group-hover:text-fairway-800 dark:group-hover:text-fairway-300">
                <span>View Warehouse Details</span>
                <span className="inline-flex items-center justify-center size-6 rounded-full bg-fairway-50 dark:bg-fairway-950/60 group-hover:bg-fairway-600 group-hover:text-white transition-all">
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PropertiesCard;
