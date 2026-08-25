import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  UploadCloud,
  MapPin,
  Clock,
  ChevronRight,
  ArrowRight,
  Sparkles,
  LayoutList,
  LayoutGrid,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { Inquiry, PipelineStageKey } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import {
  formatINR,
  formatSqFt,
  formatDate,
  formatRelativeDate,
  getPriorityBadge,
  STAGE_CONFIGS,
} from '@/modules/core/utils/formatters';

export interface InquiryListViewProps {
  onSelectInquiry: (id: string) => void;
  onOpenNewInquiry: () => void;
  onOpenImport: () => void;
}

export const InquiryListView: React.FC<InquiryListViewProps> = ({
  onSelectInquiry,
  onOpenNewInquiry,
  onOpenImport,
}) => {
  const { canEdit, currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'line' | 'grid'>('line');

  const inquiries = StorageService.getInquiries();
  const users = StorageService.getUsers();
  const pipelineStages = StorageService.getPipelineStages();

  const uniqueCorridors = Array.from(new Set(inquiries.map((i) => i.targetCorridor || i.location))).filter(Boolean);

  // Filter inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inq.inquiryNumber.toLowerCase().includes(q) ||
      inq.companyName.toLowerCase().includes(q) ||
      inq.location.toLowerCase().includes(q) ||
      inq.requirement.toLowerCase().includes(q) ||
      (inq.contactName && inq.contactName.toLowerCase().includes(q));

    const matchesStage = stageFilter === 'all' || inq.stage === stageFilter;
    const matchesPriority = priorityFilter === 'all' || inq.priority === priorityFilter;
    const matchesOwner = ownerFilter === 'all' || inq.salespersonId === ownerFilter;
    const matchesCorridor = corridorFilter === 'all' || (inq.targetCorridor || inq.location) === corridorFilter;

    return matchesQuery && matchesStage && matchesPriority && matchesOwner && matchesCorridor;
  });

  // Calculate high-level KPIs
  const totalPipelineValue = inquiries
    .filter((i) => i.status === 'Active')
    .reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

  const highPriorityCount = inquiries.filter((i) => i.priority === 'High' && i.status === 'Active').length;

  const overdueCount = inquiries.filter((i) => {
    if (!i.nextFollowUpDate || i.status !== 'Active') return false;
    return new Date(i.nextFollowUpDate) < new Date(new Date().toDateString());
  }).length;

  const exportCSV = () => {
    const headers = [
      'Inquiry Number',
      'Company Name',
      'Requirement',
      'Required Area (sq.ft)',
      'Location',
      'Corridor',
      'Stage',
      'Owner',
      'Monthly Budget (INR)',
      'Priority',
      'Next Follow-up',
    ];
    const rows = filteredInquiries.map((i) => [
      `"${i.inquiryNumber}"`,
      `"${i.companyName}"`,
      `"${i.requirement.replace(/"/g, '""')}"`,
      `"${i.requiredAreaSqFt}"`,
      `"${i.location}"`,
      `"${i.targetCorridor || ''}"`,
      `"${i.stage}"`,
      `"${i.salespersonName}"`,
      `"${i.budgetMonthlyINR}"`,
      `"${i.priority}"`,
      `"${i.nextFollowUpDate || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fairway_CRM_Inquiries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStageBadgeStyle = (stageKey: string) => {
    const config = STAGE_CONFIGS[stageKey as PipelineStageKey];
    if (!config) return { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: stageKey };
    return {
      bg: config.bg,
      label: config.label,
    };
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header Pattern with Actions & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Opportunities</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <FileText className="w-6 h-6 text-fairway-600" />
            <span>Warehouse Inquiries & Leads</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Track industrial leasing requirements, deal sizes, corridor locations, and conversion stages.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 shadow-subtle">
            <button
              onClick={() => setViewMode('line')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'line'
                  ? 'bg-fairway-600 text-white shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
              title="Single-line Compact Card View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Single Line</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-fairway-600 text-white shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
              title="Rich Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Grid</span>
            </button>
          </div>

          <Button size="sm" variant="outline" onClick={exportCSV} leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenImport} leftIcon={<UploadCloud className="w-3.5 h-3.5" />}>
            Import
          </Button>
          {canEdit && (
            <Button size="sm" variant="primary" onClick={onOpenNewInquiry} leftIcon={<Plus className="w-4 h-4" />}>
              New Inquiry
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border p-3.5 rounded-card shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Total Active Leads</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-extrabold text-foreground">{inquiries.length}</span>
            <Layers className="w-4 h-4 text-fairway-600" />
          </div>
        </div>

        <div className="bg-surface border border-border p-3.5 rounded-card shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Active Pipeline Value</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-extrabold text-fairway-800">{formatINR(totalPipelineValue, true)}/mo</span>
            <TrendingUp className="w-4 h-4 text-fairway-600" />
          </div>
        </div>

        <div className="bg-surface border border-border p-3.5 rounded-card shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">High Priority Deals</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-extrabold text-rose-700">{highPriorityCount}</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
        </div>

        <div className="bg-surface border border-border p-3.5 rounded-card shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Overdue Follow-ups</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-extrabold text-amber-700">{overdueCount}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Combinable Search & Multi-Filter Bar */}
      <div className="bg-surface p-3.5 rounded-card border border-border shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by INQ-1048, company name, requirement, city, contact person..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-surface-muted/60 border border-border rounded-input focus:border-fairway-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Stages</option>
              {pipelineStages.map((stg) => (
                <option key={stg.id} value={stg.key}>
                  {stg.label}
                </option>
              ))}
            </select>

            {/* Corridor Filter */}
            <select
              value={corridorFilter}
              onChange={(e) => setCorridorFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Corridors</option>
              {uniqueCorridors.map((cor) => (
                <option key={cor} value={cor}>
                  {cor}
                </option>
              ))}
            </select>

            {/* Owner Filter */}
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Owners</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Status Strip */}
        <div className="flex items-center justify-between text-[11px] text-foreground-muted pt-1 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{filteredInquiries.length}</strong> of {inquiries.length} leads
            </span>
          </div>

          {(searchQuery || stageFilter !== 'all' || priorityFilter !== 'all' || ownerFilter !== 'all' || corridorFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStageFilter('all');
                setPriorityFilter('all');
                setOwnerFilter('all');
                setCorridorFilter('all');
              }}
              className="text-fairway-700 hover:text-fairway-900 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= VIEW MODE 1: SINGLE-LINE DENSE CARDS ================= */}
      {viewMode === 'line' ? (
        <div className="space-y-2">
          {filteredInquiries.length === 0 ? (
            <div className="bg-surface rounded-card border border-border p-12 text-center text-xs text-foreground-muted">
              No warehouse inquiries matched your filter criteria.
            </div>
          ) : (
            filteredInquiries.map((inq) => {
              const stageStyle = getStageBadgeStyle(inq.stage);
              const isOverdue =
                inq.nextFollowUpDate &&
                inq.status === 'Active' &&
                new Date(inq.nextFollowUpDate) < new Date(new Date().toDateString());

              return (
                <div
                  key={inq.id}
                  onClick={() => onSelectInquiry(inq.id)}
                  className="bg-surface border border-border hover:border-fairway-400 hover:shadow-subtle rounded-xl p-3 sm:px-4 sm:py-3 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                >
                  {/* Left: Code Badge + Company Name + Requirement */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Inquiry Code Badge on One Line */}
                    <div className="shrink-0 font-mono text-xs font-bold bg-fairway-100 text-fairway-900 px-2.5 py-1 rounded-lg border border-fairway-300 flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                      <FileText className="w-3.5 h-3.5 text-fairway-700" />
                      <span>{inq.inquiryNumber}</span>
                    </div>

                    {/* Company & Core Requirement */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-sm text-foreground group-hover:text-fairway-800 transition-colors truncate">
                          {inq.companyName}
                        </span>
                        <span className="text-[11px] font-semibold text-fairway-700 bg-fairway-50 px-2 py-0.5 rounded border border-fairway-200 shrink-0">
                          {formatSqFt(inq.requiredAreaSqFt)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted truncate mt-0.5 max-w-xl">
                        {inq.requirement}
                      </p>
                    </div>
                  </div>

                  {/* Middle & Right: Clean Pills on One Single Line */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap md:flex-nowrap justify-between md:justify-end text-xs">
                    {/* Location Badge */}
                    <div className="flex items-center gap-1 text-[11px] text-foreground-muted bg-surface-muted px-2 py-1 rounded-md border border-border/80 whitespace-nowrap">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium">{inq.location}</span>
                    </div>

                    {/* Pipeline Stage Pill */}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${stageStyle.bg}`}>
                      {stageStyle.label}
                    </span>

                    {/* Assigned Salesperson */}
                    <div className="hidden lg:flex items-center gap-1 text-[11px] text-foreground-muted bg-surface-muted/60 px-2 py-1 rounded-md border border-border/60 whitespace-nowrap">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{inq.salespersonName}</span>
                    </div>

                    {/* Priority Badge */}
                    <Badge
                      variant={inq.priority === 'High' ? 'danger' : inq.priority === 'Medium' ? 'warning' : 'default'}
                      size="sm"
                      dot
                    >
                      {inq.priority}
                    </Badge>

                    {/* Follow-up Timer Pill */}
                    {inq.nextFollowUpDate && (
                      <div
                        className={`hidden xl:flex items-center gap-1 text-[11px] px-2 py-0.8 rounded-md font-medium whitespace-nowrap ${
                          isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeDate(inq.nextFollowUpDate)}</span>
                      </div>
                    )}

                    {/* Monthly Budget Value */}
                    <div className="text-right min-w-[90px] whitespace-nowrap">
                      <span className="font-mono font-bold text-fairway-900 text-xs">
                        {formatINR(inq.budgetMonthlyINR, true)}
                      </span>
                      <span className="text-[10px] text-foreground-muted block leading-none">/ month</span>
                    </div>

                    {/* Action Arrow */}
                    <div className="w-7 h-7 rounded-lg bg-surface group-hover:bg-fairway-600 group-hover:text-white text-foreground-muted flex items-center justify-center border border-border group-hover:border-fairway-600 transition-all shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ================= VIEW MODE 2: RICH GRID CARDS ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.length === 0 ? (
            <div className="col-span-full bg-surface rounded-card border border-border p-12 text-center text-xs text-foreground-muted">
              No warehouse inquiries matched your filter criteria.
            </div>
          ) : (
            filteredInquiries.map((inq) => {
              const stageStyle = getStageBadgeStyle(inq.stage);
              const isOverdue =
                inq.nextFollowUpDate &&
                inq.status === 'Active' &&
                new Date(inq.nextFollowUpDate) < new Date(new Date().toDateString());

              return (
                <div
                  key={inq.id}
                  onClick={() => onSelectInquiry(inq.id)}
                  className="bg-surface border border-border hover:border-fairway-400 hover:shadow-card rounded-card p-4 transition-all cursor-pointer flex flex-col justify-between group text-xs select-none"
                >
                  <div>
                    {/* Top Row: Code Badge + Stage Pill */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
                      <span className="font-mono text-xs font-bold bg-fairway-100 text-fairway-900 px-2.5 py-0.5 rounded border border-fairway-300">
                        {inq.inquiryNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageStyle.bg}`}>
                        {stageStyle.label}
                      </span>
                    </div>

                    {/* Company Name & Requirement */}
                    <div className="mt-3">
                      <h3 className="text-base font-bold text-foreground group-hover:text-fairway-800 transition-colors truncate">
                        {inq.companyName}
                      </h3>
                      <p className="text-xs text-foreground-muted line-clamp-2 mt-1 min-h-[32px]">
                        {inq.requirement}
                      </p>
                    </div>

                    {/* Key Specs Matrix */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-[11px]">
                      <div className="bg-surface-muted/60 p-2 rounded-lg border border-border/50">
                        <span className="text-[10px] text-foreground-muted block">Required Area</span>
                        <span className="font-bold text-foreground">{formatSqFt(inq.requiredAreaSqFt)}</span>
                      </div>
                      <div className="bg-surface-muted/60 p-2 rounded-lg border border-border/50">
                        <span className="text-[10px] text-foreground-muted block">Monthly Budget</span>
                        <span className="font-mono font-bold text-fairway-800">{formatINR(inq.budgetMonthlyINR, true)}</span>
                      </div>
                    </div>

                    {/* Location & Priority */}
                    <div className="flex items-center justify-between gap-2 mt-3 text-[11px] text-foreground-muted">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                        <span className="truncate">{inq.location}</span>
                      </div>
                      <Badge
                        variant={inq.priority === 'High' ? 'danger' : inq.priority === 'Medium' ? 'warning' : 'default'}
                        size="sm"
                        dot
                      >
                        {inq.priority}
                      </Badge>
                    </div>
                  </div>

                  {/* Bottom Footer: Owner & Follow-up Action */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-muted">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-fairway-100 text-fairway-800 font-bold text-[10px] flex items-center justify-center border border-fairway-300">
                        {inq.salespersonName?.charAt(0) || 'U'}
                      </div>
                      <span className="truncate max-w-[100px]">{inq.salespersonName}</span>
                    </div>

                    {inq.nextFollowUpDate ? (
                      <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-700 font-bold' : ''}`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeDate(inq.nextFollowUpDate)}</span>
                      </div>
                    ) : (
                      <span className="text-fairway-700 group-hover:underline flex items-center gap-0.5 font-semibold">
                        <span>View Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const InquiriesPage = InquiryListView;
export default InquiriesPage;
