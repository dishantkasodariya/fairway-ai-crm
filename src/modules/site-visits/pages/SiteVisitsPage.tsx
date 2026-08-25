import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Clock,
  Warehouse,
  Building2,
  CheckCircle2,
  User,
  Phone,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { SiteVisit, SiteVisitStatus } from '@/modules/core/types';
import { formatDate, formatRelativeDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';

export interface SiteVisitListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const SiteVisitListView: React.FC<SiteVisitListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit, currentUser, users } = useAuth();
  const { success } = useToast();
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>(StorageService.getSiteVisits());
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = () => {
    setSiteVisits(StorageService.getSiteVisits());
  };

  const handleUpdateVisitStatus = (id: string, newStatus: SiteVisitStatus, feedback?: string) => {
    StorageService.updateSiteVisit(id, { status: newStatus, clientFeedback: feedback });
    refreshData();
    success('Site Visit Updated', `Status marked as ${newStatus}`);
  };

  const filteredVisits = siteVisits.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      v.companyName.toLowerCase().includes(q) ||
      v.propertyName.toLowerCase().includes(q) ||
      v.inquiryNumber.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Site Visits</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <Calendar className="w-6 h-6 text-orange-600" />
            <span>Warehouse Site Inspections</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Physical on-site tours, engineer walkthroughs, technical client feedback, and conversion outcomes.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-3 rounded-card border border-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search inspections by company, property, or inquiry..."
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
            <option value="all">All Inspection Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* High density Site Visits List */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden divide-y divide-border">
        {filteredVisits.length === 0 ? (
          <div className="py-12 text-center text-xs text-foreground-muted">No site inspections found.</div>
        ) : (
          filteredVisits.map((sv) => (
            <div key={sv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/40 transition-colors text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground text-sm hover:text-fairway-800 cursor-pointer" onClick={() => onNavigateToCompany(sv.companyId)}>
                    {sv.companyName}
                  </span>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-border">
                    {sv.inquiryNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      sv.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-orange-50 text-orange-800 border-orange-200'
                    }`}
                  >
                    {sv.status}
                  </span>
                  {sv.outcome && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      Outcome: {sv.outcome}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-foreground-muted">
                  <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-foreground">{sv.propertyName}</span>
                  <span>({sv.propertyLocation})</span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-foreground-muted pt-1">
                  <span>
                    Inspection Date: <strong>{formatDate(sv.visitDate)} at {sv.visitTime}</strong>
                  </span>
                  <span>
                    Host: <strong>{sv.assignedSalespersonName}</strong>
                  </span>
                  {sv.contactPhone && (
                    <span>
                      Client Phone: <a href={`tel:${sv.contactPhone}`} className="hover:underline text-fairway-800">{sv.contactPhone}</a>
                    </span>
                  )}
                </div>

                {sv.notes && <p className="text-[11px] text-foreground-muted mt-1 bg-surface-muted p-2 rounded">Notes: {sv.notes}</p>}
                {sv.clientFeedback && (
                  <p className="text-[11px] text-emerald-900 mt-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                    <strong>Client Feedback:</strong> {sv.clientFeedback}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canEdit && sv.status === 'Scheduled' && (
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => handleUpdateVisitStatus(sv.id, 'Completed', 'Client satisfied with clear height and dock bays.')}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Mark Completed
                  </Button>
                )}
                <Button size="xs" variant="outline" onClick={() => onNavigateToInquiry(sv.inquiryId)}>
                  Inquiry Workspace →
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const SiteVisitsPage = SiteVisitListView;
export default SiteVisitsPage;
