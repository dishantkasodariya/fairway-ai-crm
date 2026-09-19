import React from 'react';
import { Warehouse, Download } from 'lucide-react';
import { Proposal } from '@/modules/core/types';
import { formatINR, formatSqFt, getProposalStatusBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';

export interface ProposalsCardProps {
  proposals: Proposal[];
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
  onDownloadPdf: (proposal: Proposal) => void;
}

export const ProposalsCard: React.FC<ProposalsCardProps> = ({
  proposals,
  onNavigateToCompany,
  onNavigateToInquiry,
  onDownloadPdf,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
      {proposals.map((prp, idx) => {
        const badge = getProposalStatusBadge(prp.status);
        return (
          <div
            key={prp.id}
            onClick={() => {
              if (prp.inquiryId) onNavigateToInquiry(prp.inquiryId);
              else if (prp.companyId) onNavigateToCompany(prp.companyId);
            }}
            className="bg-surface rounded-2xl border border-border p-4 shadow-2xs hover:border-fairway-500/60 hover:shadow-card transition-all flex flex-col justify-between gap-3 cursor-pointer group"
          >
            {/* Header: Sr. No. + Status */}
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
              <span className="font-mono text-xs font-bold text-foreground-muted bg-surface-muted px-2.5 py-0.5 rounded-md border border-border">
                #{idx + 1}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${badge.bg}`}>
                {prp.status}
              </span>
            </div>

            {/* Body */}
            <div className="space-y-2 flex-1">
              <div>
                <h3
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToCompany(prp.companyId);
                  }}
                  className="font-bold text-sm text-foreground group-hover:text-fairway-600 dark:group-hover:text-fairway-400 transition-colors cursor-pointer line-clamp-1"
                >
                  {prp.companyName}
                </h3>
                <p className="text-xs text-foreground-muted flex items-center gap-1.5 mt-1 line-clamp-1">
                  <Warehouse className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                  <span>{prp.propertyName}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border text-xs">
                <div className="bg-surface-muted/50 p-2 rounded-lg border border-border/50">
                  <span className="text-[10px] text-foreground-muted block font-medium">Proposed Space</span>
                  <span className="font-bold text-foreground mt-0.5 block">{formatSqFt(prp.proposedAreaSqFt)}</span>
                </div>
                <div className="bg-surface-muted/50 p-2 rounded-lg border border-border/50">
                  <span className="text-[10px] text-foreground-muted block font-medium">Base Rate</span>
                  <span className="font-bold text-foreground mt-0.5 block">₹{prp.baseRentPerSqFtINR}/sq.ft</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2.5 border-t border-border flex items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] text-foreground-muted block font-medium">Monthly Total</span>
                <span className="font-mono font-bold text-foreground dark:text-white text-sm">{formatINR(prp.totalMonthlyRentINR)}</span>
              </div>
              <Button
                size="xs"
                variant="outline"
                leftIcon={<Download className="w-3.5 h-3.5 text-fairway-600" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadPdf(prp);
                }}
                className="shadow-2xs hover:border-fairway-500/50"
              >
                PDF
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProposalsCard;
