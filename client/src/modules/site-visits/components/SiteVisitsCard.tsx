import React from 'react';
import {
  Warehouse,
  Clock,
  User,
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visits.map((sv) => (
        <div
          key={sv.id}
          className="bg-surface rounded-card border border-border p-4 shadow-subtle hover:border-fairway-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <span className="font-mono text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/25">
              {sv.inquiryNumber}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                sv.status === 'Completed'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
              }`}
            >
              {sv.status}
            </span>
          </div>

          <div className="space-y-2 flex-1">
            <div>
              <h3
                onClick={() => onNavigateToCompany(sv.companyId)}
                className="font-bold text-sm text-foreground hover:underline cursor-pointer"
              >
                {sv.companyName}
              </h3>
              <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5">
                <Warehouse className="w-3 h-3 text-fairway-600 shrink-0" />
                <span className="truncate">{sv.propertyName}</span>
              </p>
            </div>

            <div className="text-[11px] text-foreground-muted space-y-1 pt-1 border-t border-border/60">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{formatDate(sv.visitDate)} at {sv.visitTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Host: {sv.assignedSalespersonName}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
            {canEdit && sv.status === 'Scheduled' ? (
              <Button
                size="xs"
                variant="primary"
                onClick={() => onUpdateVisitStatus(sv.id, 'Completed', 'Client satisfied with tour.')}
              >
                Complete
              </Button>
            ) : (
              <span className="text-[10px] text-foreground-muted">
                {sv.outcome ? `Outcome: ${sv.outcome}` : 'Tour Recorded'}
              </span>
            )}
            <Button size="xs" variant="outline" onClick={() => onNavigateToInquiry(sv.inquiryId)}>
              Inquiry →
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
