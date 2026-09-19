import React from 'react';
import {
  Warehouse,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { SiteVisit } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';

export interface SiteVisitsListProps {
  visits: SiteVisit[];
  columns: Record<string, boolean>;
  canEdit: boolean;
  formatDate: (dateStr: string) => string;
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
  onUpdateVisitStatus: (id: string, status: 'Completed' | 'Cancelled' | 'Scheduled', notes?: string) => void;
}

export const SiteVisitsList: React.FC<SiteVisitsListProps> = ({
  visits,
  columns,
  canEdit,
  formatDate,
  onNavigateToCompany,
  onNavigateToInquiry,
  onUpdateVisitStatus,
}) => {
  const formatHost = (host?: string) => {
    if (!host) return 'Sales Host';
    if (host.includes('@')) {
      const name = host.split('@')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return host;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'Scheduled':
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden divide-y divide-border">
      {visits.map((sv) => {
        const hasValidInquiry = sv.inquiryNumber && sv.inquiryNumber.trim() && sv.inquiryNumber !== '-';
        const hasDistinctLocation =
          sv.propertyLocation &&
          sv.propertyLocation.trim().length > 0 &&
          sv.propertyLocation.trim().toLowerCase() !== sv.propertyName.trim().toLowerCase() &&
          !sv.propertyName.toLowerCase().includes(sv.propertyLocation.toLowerCase());

        return (
          <div
            key={sv.id}
            className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-muted/30 transition-colors text-xs text-left"
          >
            <div className="space-y-2 flex-1 min-w-0">
              {/* Top Meta Line: Company, Inquiry badge, Status */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {columns.company && (
                  <span
                    className="font-bold text-foreground text-sm hover:text-fairway-600 transition-colors cursor-pointer"
                    onClick={() => onNavigateToCompany(sv.companyId)}
                  >
                    {sv.companyName}
                  </span>
                )}

                {hasValidInquiry && (
                  <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-muted text-foreground-muted border border-border">
                    {sv.inquiryNumber}
                  </span>
                )}

                {columns.status && (
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${getStatusBadge(
                      sv.status
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{sv.status}</span>
                  </span>
                )}

                {sv.outcome && (
                  <span className="text-[11px] font-medium text-foreground-muted bg-surface-muted px-2 py-0.5 rounded border border-border">
                    Outcome: {sv.outcome}
                  </span>
                )}
              </div>

              {/* Property & Location (No duplicate repeating in parentheses) */}
              {columns.property && (
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Warehouse className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                  <span className="font-semibold text-foreground">{sv.propertyName}</span>
                  {hasDistinctLocation && <span>· {sv.propertyLocation}</span>}
                </div>
              )}

              {/* Inspection Date, Host, Client contact */}
              <div className="flex items-center gap-3 sm:gap-4 text-xs text-foreground-muted pt-0.5 flex-wrap">
                {columns.inspectionDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    <span>
                      Date: <strong className="text-foreground">{formatDate(sv.visitDate)} at {sv.visitTime}</strong>
                    </span>
                  </span>
                )}

                {columns.host && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    <span>
                      Host: <strong className="text-foreground">{formatHost(sv.assignedSalespersonName)}</strong>
                    </span>
                  </span>
                )}

                {sv.contactPhone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    <span>
                      Client:{' '}
                      <a
                        href={`tel:${sv.contactPhone}`}
                        className="font-medium text-foreground hover:text-fairway-600 transition-colors"
                      >
                        {sv.contactPhone}
                      </a>
                    </span>
                  </span>
                )}
              </div>

              {/* Internal Notes & Client Feedback (Clean minimal layout, no loud green/dark boxes) */}
              {(sv.notes || sv.clientFeedback) && (
                <div className="mt-1 space-y-1 pl-3 border-l-2 border-border text-xs">
                  {sv.notes && (
                    <p className="text-foreground-muted">
                      <span className="font-semibold text-foreground">Notes: </span>
                      {sv.notes}
                    </p>
                  )}
                  {sv.clientFeedback && (
                    <p className="text-foreground-muted">
                      <span className="font-semibold text-foreground">Client Feedback: </span>
                      <span className="text-foreground">{sv.clientFeedback}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {columns.actions && (
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                {canEdit && sv.status === 'Scheduled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onUpdateVisitStatus(
                        sv.id,
                        'Completed',
                        'Client satisfied with clear height and dock bays.'
                      )
                    }
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" />}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Mark Completed
                  </Button>
                )}
                {sv.inquiryId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateToInquiry(sv.inquiryId)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Inquiry Workspace
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
