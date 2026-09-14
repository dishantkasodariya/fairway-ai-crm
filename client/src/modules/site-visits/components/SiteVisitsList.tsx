import React from 'react';
import {
  Warehouse,
  CheckCircle2,
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
  return (
    <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden divide-y divide-border">
      {visits.map((sv) => (
        <div
          key={sv.id}
          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/40 transition-colors text-xs"
        >
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {columns.company && (
                <span
                  className="font-bold text-foreground text-sm hover:text-fairway-800 cursor-pointer"
                  onClick={() => onNavigateToCompany(sv.companyId)}
                >
                  {sv.companyName}
                </span>
              )}
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-white dark:border-primary/40">
                {sv.inquiryNumber}
              </span>
              {columns.status && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    sv.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
                  }`}
                >
                  {sv.status}
                </span>
              )}
              {sv.outcome && (
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                  Outcome: {sv.outcome}
                </span>
              )}
            </div>

            {columns.property && (
              <div className="flex items-center gap-2 text-foreground-muted">
                <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-foreground">{sv.propertyName}</span>
                <span>({sv.propertyLocation})</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-[11px] text-foreground-muted pt-1 flex-wrap">
              {columns.inspectionDate && (
                <span>
                  Inspection Date: <strong>{formatDate(sv.visitDate)} at {sv.visitTime}</strong>
                </span>
              )}
              {columns.host && (
                <span>
                  Host: <strong>{sv.assignedSalespersonName}</strong>
                </span>
              )}
              {sv.contactPhone && (
                <span>
                  Client Phone:{' '}
                  <a href={`tel:${sv.contactPhone}`} className="hover:underline text-fairway-800">
                    {sv.contactPhone}
                  </a>
                </span>
              )}
            </div>

            {sv.notes && (
              <p className="text-[11px] text-foreground-muted mt-1 bg-surface-muted p-2 rounded">
                Notes: {sv.notes}
              </p>
            )}
            {sv.clientFeedback && (
              <p className="text-[11px] text-emerald-900 mt-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                <strong>Client Feedback:</strong> {sv.clientFeedback}
              </p>
            )}
          </div>

          {columns.actions && (
            <div className="flex items-center gap-2 shrink-0">
              {canEdit && sv.status === 'Scheduled' && (
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() =>
                    onUpdateVisitStatus(
                      sv.id,
                      'Completed',
                      'Client satisfied with clear height and dock bays.'
                    )
                  }
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Mark Completed
                </Button>
              )}
              <Button size="xs" variant="outline" onClick={() => onNavigateToInquiry(sv.inquiryId)}>
                Inquiry Workspace →
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
