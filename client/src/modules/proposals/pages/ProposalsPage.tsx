import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Check,
  RefreshCw,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { ProposalService } from '@/modules/core/services/proposalService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Proposal, ProposalStatus } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate, getProposalStatusBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from '@/modules/core/components/ui/DropdownMenu';

import { DataTable7, ColumnConfig } from '@/modules/core/components/ui/data-table-7';
import { downloadProposalPDF } from '@/modules/core/utils/proposalPdfGenerator';

export interface ProposalListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const ProposalListView: React.FC<ProposalListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit, currentUser } = useAuth();
  const { success, error } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProposals = async () => {
    try {
      const res = await ProposalService.getProposals();
      if (res.success && res.data && res.data.length > 0) {
        setProposals(res.data);
      } else {
        setProposals(StorageService.getProposals());
      }
    } catch {
      setProposals(StorageService.getProposals());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: ProposalStatus) => {
    try {
      const res = await ProposalService.updateProposalStatus(id, newStatus);
      if (res.success && res.data) {
        setProposals((prev) => prev.map((p) => (p.id === id ? res.data! : p)));
        try {
          StorageService.updateProposalStatus(id, newStatus);
        } catch {}
      } else {
        StorageService.updateProposalStatus(id, newStatus);
        loadProposals();
      }
      success('Proposal Updated', `Status changed to ${newStatus}`);
    } catch {
      StorageService.updateProposalStatus(id, newStatus);
      loadProposals();
      success('Proposal Updated', `Status changed to ${newStatus}`);
    }
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

  const proposalColumns: ColumnConfig<Proposal>[] = [
    {
      key: 'proposalNumber',
      label: 'Proposal #',
      width: 140,
      render: (prp) => (
        <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {prp.proposalNumber}
        </span>
      ),
    },
    {
      key: 'companyName',
      label: 'Customer Company',
      width: 220,
      render: (prp) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToCompany(prp.companyId);
          }}
          className="font-bold text-foreground hover:text-fairway-800 hover:underline cursor-pointer"
        >
          {prp.companyName}
        </span>
      ),
    },
    {
      key: 'propertyName',
      label: 'Offered Property',
      width: 240,
      render: (prp) => (
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{prp.propertyName}</span>
        </div>
      ),
    },
    {
      key: 'proposedAreaSqFt',
      label: 'Proposed Area',
      width: 150,
      render: (prp) => <span className="font-bold text-foreground">{formatSqFt(prp.proposedAreaSqFt)}</span>,
    },
    {
      key: 'commercialTerms',
      label: 'Commercial Terms',
      width: 240,
      render: (prp) => (
        <span className="text-foreground-muted">
          Base: ₹{prp.baseRentPerSqFtINR} + CAM: ₹{prp.maintenancePerSqFtINR} ({prp.escalationPercentPerYear}% esc.)
        </span>
      ),
    },
    {
      key: 'totalMonthlyRentINR',
      label: 'Monthly Rent',
      width: 160,
      render: (prp) => <span className="font-mono font-bold text-fairway-900">{formatINR(prp.totalMonthlyRentINR)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 150,
      render: (prp) => {
        const badge = getProposalStatusBadge(prp.status);
        return canEdit ? (
          <DropdownMenu
            align="left"
            className="w-36"
            trigger={
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${badge.bg} focus:outline-none cursor-pointer`}
              >
                <span>{prp.status}</span>
                <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
              </button>
            }
          >
            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
            {(['Draft', 'Sent', 'Viewed', 'Negotiation', 'Accepted', 'Rejected'] as const).map((st) => (
              <DropdownMenuItem
                key={st}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateStatus(prp.id, st);
                }}
                className={prp.status === st ? 'bg-surface-muted font-semibold' : ''}
                icon={prp.status === st ? <Check className="w-3.5 h-3.5 text-fairway-600" /> : undefined}
              >
                {st}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        ) : (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
            {prp.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'PDF Document',
      width: 170,
      render: (prp) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              downloadProposalPDF(prp);
              success('Generating Proposal PDF', `Opening ${prp.documentName || 'Proposal.pdf'} for print/download`);
            }}
            className="p-1.5 text-fairway-700 dark:text-fairway-300 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/60 rounded-md transition-colors border border-transparent hover:border-purple-200 cursor-pointer shadow-2xs"
            title={`Download / Print ${prp.documentName || 'Commercial Proposal'}`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <span
            onClick={() => {
              downloadProposalPDF(prp);
              success('Generating Proposal PDF', `Opening ${prp.documentName || 'Proposal.pdf'} for print/download`);
            }}
            className="text-[11px] text-fairway-700 dark:text-fairway-300 hover:underline cursor-pointer font-medium truncate"
            title={`Click to view & download ${prp.documentName}`}
          >
            {prp.documentName}
          </span>
        </div>
      ),
    },
  ];

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

      {/* Pinned Columns Data Table (DataTable7) */}
      <DataTable7<Proposal>
        data={filteredProposals}
        columns={proposalColumns}
        keyExtractor={(p) => p.id}
        onRowClick={(p) => onNavigateToInquiry(p.inquiryId)}
      />
    </div>
  );
};

export const ProposalsPage = ProposalListView;
export default ProposalsPage;
