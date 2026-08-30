import React from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Warehouse,
  FileText,
  ChevronRight,
  User,
  ShieldCheck,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
} from 'lucide-react';
import { Company } from '@/modules/core/types';
import { cn } from '@/modules/core/lib/utils';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Skeleton } from '@/modules/core/components/ui/Skeleton';
import { StorageService } from '@/modules/core/services/storageService';
import { getPriorityBadge, getCompanyStatusBadge } from '@/modules/core/utils/formatters';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';

export interface CompanyCardProps {
  company: Company;
  onSelect: (id: string) => void;
  onEdit?: (company: Company) => void;
  onDelete?: (company: Company) => void;
}

/**
 * Modern Rich Grid Card for Companies Master
 */
export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onSelect, onEdit, onDelete }) => {
  const statusBadge = getCompanyStatusBadge(company.status);
  const prioBadge = getPriorityBadge(company.priority);
  const facilitiesCount = company.facilitiesCount ?? StorageService.getFacilities(company.id).length;
  const inquiriesCount = company.inquiriesCount ?? StorageService.getInquiries(company.id).length;

  return (
    <div
      onClick={() => onSelect(company.id)}
      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-card rounded-card p-4 transition-all cursor-pointer flex flex-col justify-between group text-xs select-none shadow-2xs relative"
    >
      <div>
        {/* Top Row: Company Initial Badge + Status Pill + 3-Dots Action */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-fairway-100 text-fairway-900 dark:bg-fairway-950/70 dark:text-fairway-200 dark:border-fairway-700/60 font-bold text-xs flex items-center justify-center shrink-0 border border-fairway-300 shadow-xs">
              {company.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-foreground group-hover:text-fairway-700 transition-colors truncate block">
                {company.name}
              </span>
              <span className="text-[10px] text-foreground-muted font-normal truncate block">
                {company.legalName || `${company.name} Pvt Ltd`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Badge
              variant={company.priority === 'High' ? 'danger' : company.priority === 'Medium' ? 'warning' : 'default'}
              size="sm"
              dot
            >
              {company.priority}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                  title="Actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-surface border border-border shadow-dialog z-50">
                <DropdownMenuItem onClick={() => onSelect(company.id)} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Eye className="w-3.5 h-3.5 text-fairway-600" />
                  <span>View Details</span>
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(company)} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Edit Company</span>
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(company)}
                      className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Company</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Industry & Location */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate max-w-[170px]">
              {company.industry || 'General Industrial'}
            </span>
            <div className="flex items-center gap-1 text-foreground-muted truncate">
              <MapPin className="w-3 h-3 text-fairway-600 shrink-0" />
              <span className="truncate">{company.city || 'Dahej'}, {company.state || 'Gujarat'}</span>
            </div>
          </div>
        </div>

        {/* Linked Nodes & Inquiries Metric Matrix */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-[11px]">
          <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-1 text-foreground-muted">
              <Warehouse className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-[10px]">Facilities</span>
            </div>
            <span className="font-bold text-foreground">{facilitiesCount} Sites</span>
          </div>

          <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-1 text-foreground-muted">
              <FileText className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
              <span className="text-[10px]">Inquiries</span>
            </div>
            <span className="font-bold text-fairway-700 dark:text-fairway-400">{inquiriesCount} Active</span>
          </div>
        </div>

        {/* Contact info: Phone & Email */}
        <div className="mt-3 space-y-1 text-[11px] text-foreground-muted">
          {company.phone && (
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="w-3 h-3 text-foreground-muted shrink-0" />
              <span className="truncate font-mono">{company.phone}</span>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 text-foreground-muted shrink-0" />
              <span className="truncate">{company.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Owner & Action */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-foreground-muted">
        <div className="flex items-center gap-1.5">
          {(() => {
            const users = StorageService.getUsers();
            const ownerUser = users.find(
              (u) => u.id === company.assignedOwnerId || (company.assignedOwnerName && u.name.toLowerCase() === company.assignedOwnerName.toLowerCase())
            );
            const ownerName = company.assignedOwnerName || ownerUser?.name || 'Admin';
            const avatarUrl = ownerUser?.avatar;

            return (
              <>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={ownerName}
                    className="w-5 h-5 rounded-full object-cover border border-fairway-300 dark:border-fairway-700/60 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-fairway-100 dark:bg-fairway-950/70 text-fairway-800 dark:text-fairway-300 font-bold text-[9px] items-center justify-center border border-fairway-300 shrink-0",
                    avatarUrl ? "hidden" : "flex"
                  )}
                >
                  {ownerName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-foreground truncate max-w-[130px]">
                  {ownerName}
                </span>
              </>
            );
          })()}
        </div>

        <div className="flex items-center gap-1 text-fairway-600 group-hover:text-fairway-700 font-semibold transition-colors">
          <span>Dossier</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};

/**
 * Single-line Dense Card for Company List View
 */
export const CompanyLineCard: React.FC<CompanyCardProps> = ({ company, onSelect, onEdit, onDelete }) => {
  return (
    <div
      onClick={() => onSelect(company.id)}
      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-subtle rounded-card px-4 py-3 transition-all cursor-pointer flex items-center justify-between gap-4 text-xs select-none shadow-2xs group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-fairway-100 text-fairway-900 dark:bg-fairway-950/70 dark:text-fairway-200 dark:border-fairway-700/60 font-bold text-xs flex items-center justify-center shrink-0 border border-fairway-300 shadow-xs">
          {company.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <span className="font-bold text-foreground group-hover:text-fairway-700 transition-colors truncate block">
            {company.name}
          </span>
          <span className="text-[10px] text-foreground-muted truncate block">
            {company.industry || 'General Industrial'} • {company.city}, {company.state}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Badge
          variant={company.priority === 'High' ? 'danger' : company.priority === 'Medium' ? 'warning' : 'default'}
          size="sm"
          dot
        >
          {company.priority}
        </Badge>

        <div className="flex items-center gap-2 text-foreground-muted" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                title="Actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-surface border border-border shadow-dialog z-50">
              <DropdownMenuItem onClick={() => onSelect(company.id)} className="flex items-center gap-2 text-xs cursor-pointer">
                <Eye className="w-3.5 h-3.5 text-fairway-600" />
                <span>View Details</span>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(company)} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Edit Company</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(company)}
                    className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Company</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Company Cards
 */
export const CompanyCardSkeleton: React.FC<{ mode?: 'grid' | 'line' }> = ({ mode = 'grid' }) => {
  if (mode === 'line') {
    return (
      <div className="bg-surface border border-border rounded-card px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1.5 flex-1 max-w-xs">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-card p-4 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
};

/**
 * Empty State component when no companies match filter criteria
 */
export const CompanyEmptyState: React.FC<{
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewCompany?: () => void;
}> = ({ hasFilters, onClearFilters, onNewCompany }) => {
  return (
    <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-fairway-50 text-fairway-600 dark:bg-fairway-950 dark:text-fairway-400 flex items-center justify-center mx-auto border border-fairway-200 dark:border-fairway-800">
        <Building2 className="w-7 h-7" />
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-bold text-foreground">No Corporate Accounts Found</h3>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {hasFilters
            ? 'No companies matched your active filter selections. Try clearing your filters or changing search keywords.'
            : 'No company accounts have been registered yet. Create your first industrial enterprise account or import existing records.'}
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        {hasFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-muted border border-border text-foreground hover:bg-surface-muted/80 transition-colors"
          >
            Clear Active Filters
          </button>
        ) : (
          onNewCompany && (
            <button
              type="button"
              onClick={onNewCompany}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-fairway-600 text-white hover:bg-fairway-700 transition-colors shadow-xs"
            >
              Add New Company
            </button>
          )
        )}
      </div>
    </div>
  );
};
