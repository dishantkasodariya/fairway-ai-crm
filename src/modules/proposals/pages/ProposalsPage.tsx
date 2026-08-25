import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  Building2,
  Warehouse,
  Send,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Proposal, ProposalStatus } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate, getProposalStatusBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';

export interface ProposalListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const ProposalListView: React.FC<ProposalListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit, currentUser } = useAuth();
  const { success } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [proposals, setProposals] = useState<Proposal[]>(StorageService.getProposals());

  const refreshData = () => {
    setProposals(StorageService.getProposals());
  };

  const handleUpdateStatus = (id: string, newStatus: ProposalStatus) => {
    StorageService.updateProposalStatus(id, newStatus);
    refreshData();
    success('Proposal Updated', `Status changed to ${newStatus}`);
  };

  const filteredProposals = proposals.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.proposalNumber.toLowerCase().includes(q) ||
      p.companyName.toLowerCase().includes(q) ||
      p.propertyName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalProposalsMonthlyValue = filteredProposals.reduce((acc, curr) => acc + curr.totalMonthlyRentINR, 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Proposals</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <FileSpreadsheet className="w-6 h-6 text-purple-600" />
            <span>Commercial Proposal Management</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Delivered commercial terms, escalation clauses, security deposits, and proposal acceptance status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Total Quoted Value</span>
            <span className="text-sm font-extrabold text-purple-900">{formatINR(totalProposalsMonthlyValue, true)} / month</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-3 rounded-card border border-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search proposals by number, company, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-surface-muted/60 border border-border rounded-input text-xs focus:outline-none focus:border-fairway-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* High density Proposals Table */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wider text-foreground-muted border-b border-border">
              <tr>
                <th className="py-3 px-4">Proposal #</th>
                <th className="py-3 px-4">Customer Company</th>
                <th className="py-3 px-4">Offered Property</th>
                <th className="py-3 px-4">Proposed Area</th>
                <th className="py-3 px-4">Commercial Terms</th>
                <th className="py-3 px-4">Monthly Rent</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-foreground-muted">
                    No proposals matched the search criteria.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((prp) => {
                  const badge = getProposalStatusBadge(prp.status);
                  return (
                    <tr key={prp.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                        <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {prp.proposalNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <span
                          onClick={() => onNavigateToCompany(prp.companyId)}
                          className="hover:text-fairway-800 hover:underline cursor-pointer"
                        >
                          {prp.companyName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{prp.propertyName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-foreground">{formatSqFt(prp.proposedAreaSqFt)}</td>

                      <td className="py-3.5 px-4 text-foreground-muted">
                        Base: ₹{prp.baseRentPerSqFtINR} + CAM: ₹{prp.maintenancePerSqFtINR} (Escalation: {prp.escalationPercentPerYear}%)
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-fairway-900">
                        {formatINR(prp.totalMonthlyRentINR)}
                      </td>

                      <td className="py-3.5 px-4">
                        {canEdit ? (
                          <select
                            value={prp.status}
                            onChange={(e) => handleUpdateStatus(prp.id, e.target.value as any)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border ${badge.bg} focus:outline-none cursor-pointer`}
                          >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Viewed">Viewed</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                            {prp.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => success('Proposal PDF', `Downloaded ${prp.documentName}`)}
                          >
                            PDF
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onNavigateToInquiry(prp.inquiryId)}
                          >
                            Inquiry →
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ProposalsPage = ProposalListView;
export default ProposalsPage;
