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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {proposals.map((prp) => {
        const badge = getProposalStatusBadge(prp.status);
        return (
          <div
            key={prp.id}
            onClick={() => onNavigateToInquiry(prp.inquiryId)}
            className="bg-surface rounded-card border border-border p-4 shadow-subtle hover:border-fairway-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {prp.proposalNumber}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
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
                  className="font-bold text-sm text-foreground hover:underline cursor-pointer line-clamp-1"
                >
                  {prp.companyName}
                </h3>
                <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5 line-clamp-1">
                  <Warehouse className="w-3 h-3 text-fairway-600 shrink-0" />
                  <span>{prp.propertyName}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-[10px] text-foreground-muted block">Proposed Space</span>
                  <span className="font-semibold text-foreground">{formatSqFt(prp.proposedAreaSqFt)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-foreground-muted block">Base Rate</span>
                  <span className="font-semibold text-foreground">₹{prp.baseRentPerSqFtINR}/sq.ft</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] text-foreground-muted block">Monthly Total</span>
                <span className="font-mono font-bold text-foreground text-sm">{formatINR(prp.totalMonthlyRentINR)}</span>
              </div>
              <Button
                size="xs"
                variant="outline"
                leftIcon={<Download className="w-3 h-3 text-primary" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadPdf(prp);
                }}
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
