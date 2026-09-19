import React from 'react';
import {
  Warehouse,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { SiteVisit } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';

export interface SiteVisitsCardProps {
  visits: SiteVisit[];
  canEdit: boolean;
  formatDate: (dateStr: string) => string;
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
  onUpdateVisitStatus: (id: string, status: 'Completed' | 'Cancelled' | 'Scheduled', notes?: string) => void;
}

export const SiteVisitsCard: React.FC<SiteVisitsCardProps> = ({
  visits,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
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
            className="bg-surface rounded-2xl border border-border p-5 shadow-xs hover:border-fairway-500/50 hover:shadow-sm transition-all flex flex-col justify-between gap-3.5"
          >
            {/* Header: Company & Status */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                {hasValidInquiry ? (
                  <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-muted text-foreground-muted border border-border">
                    {sv.inquiryNumber}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${getStatusBadge(
                    sv.status
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>{sv.status}</span>
                </span>
              </div>

              <h3
                onClick={() => onNavigateToCompany(sv.companyId)}
                className="font-bold text-base text-foreground hover:text-fairway-600 transition-colors cursor-pointer"
              >
                {sv.companyName}
              </h3>

              <div className="text-xs text-foreground-muted flex items-center gap-1.5 pt-0.5">
                <Warehouse className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                <span className="font-medium text-foreground truncate">{sv.propertyName}</span>
                {hasDistinctLocation && <span>· {sv.propertyLocation}</span>}
              </div>
            </div>

            {/* Visit Details */}
            <div className="text-xs text-foreground-muted space-y-1.5 pt-2.5 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span>
                  Date: <strong className="text-foreground">{formatDate(sv.visitDate)} at {sv.visitTime}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span>
                  Host: <strong className="text-foreground">{formatHost(sv.assignedSalespersonName)}</strong>
                </span>
              </div>
              {sv.contactPhone && (
                <div className="flex items-center gap-1.5">
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
                </div>
              )}
            </div>

            {/* Notes & Client Feedback (Clean minimal layout, no loud green/dark boxes) */}
            {(sv.notes || sv.clientFeedback) && (
              <div className="space-y-1 pl-3 border-l-2 border-border text-xs">
                {sv.notes && (
                  <p className="text-foreground-muted">
                    <span className="font-semibold text-foreground">Notes: </span>
                    {sv.notes}
                  </p>
                )}
                {sv.clientFeedback && (
                  <p className="text-foreground-muted">
                    <span className="font-semibold text-foreground">Feedback: </span>
                    <span className="text-foreground">{sv.clientFeedback}</span>
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              {canEdit && sv.status === 'Scheduled' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateVisitStatus(sv.id, 'Completed', 'Client satisfied with tour.')}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" />}
                  className="rounded-xl text-xs font-semibold"
                >
                  Mark Completed
                </Button>
              ) : (
                <span className="text-xs text-foreground-muted">
                  {sv.outcome ? `Outcome: ${sv.outcome}` : 'Tour Recorded'}
                </span>
              )}
              {sv.inquiryId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateToInquiry(sv.inquiryId)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="rounded-xl text-xs font-semibold"
                >
                  Inquiry
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
