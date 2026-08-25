import { PriorityLevel, PipelineStageKey, CompanyStatus, ProposalStatus, TaskStatus, FacilityStatus } from '@/modules/core/types';

// Format Indian Currency
export function formatINR(amount: number | undefined | null, compact = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';

  if (compact) {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)} K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format Sq.Ft. Area
export function formatSqFt(area: number | undefined | null): string {
  if (!area || isNaN(area)) return '0 sq.ft.';
  return `${new Intl.NumberFormat('en-IN').format(area)} sq.ft.`;
}

// Format Dates
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatRelativeDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const target = new Date(dateString);
    const today = new Date();
    const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = targetDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

// Status Badges Config
export function getPriorityBadge(priority: PriorityLevel) {
  switch (priority) {
    case 'High':
      return {
        label: 'High Priority',
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
      };
    case 'Medium':
      return {
        label: 'Medium Priority',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'Low':
      return {
        label: 'Low Priority',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
}

export function getCompanyStatusBadge(status: CompanyStatus) {
  switch (status) {
    case 'Active':
      return { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Prospect':
      return { label: 'Prospect', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'Inactive':
      return { label: 'Inactive', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    case 'Archived':
      return { label: 'Archived', bg: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
  }
}

export function getFacilityStatusBadge(status: FacilityStatus) {
  switch (status) {
    case 'Active':
      return { label: 'Active Facility', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Under Construction':
      return { label: 'Under Construction', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'Planned':
      return { label: 'Planned', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'Inactive':
      return { label: 'Inactive', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
}

export function getTaskStatusBadge(status: TaskStatus) {
  switch (status) {
    case 'Pending':
      return { label: 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'Completed':
      return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Cancelled':
      return { label: 'Cancelled', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
}

export function getProposalStatusBadge(status: ProposalStatus) {
  switch (status) {
    case 'Draft':
      return { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'Sent':
      return { label: 'Sent', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'Viewed':
      return { label: 'Viewed', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'Negotiation':
      return { label: 'Negotiation', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'Accepted':
      return { label: 'Accepted', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Rejected':
      return { label: 'Rejected', bg: 'bg-red-50 text-red-700 border-red-200' };
    case 'Expired':
      return { label: 'Expired', bg: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
  }
}

export const STAGE_CONFIGS: Record<PipelineStageKey, { label: string; order: number; bg: string; text: string; border: string }> = {
  new: { label: 'New', order: 1, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
  contacted: { label: 'Contacted', order: 2, bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' },
  requirement_confirmed: { label: 'Req Confirmed', order: 3, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' },
  property_matched: { label: 'Property Matched', order: 4, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  property_shared: { label: 'Property Shared', order: 5, bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
  proposal: { label: 'Proposal', order: 6, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  site_visit: { label: 'Site Visit', order: 7, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  negotiation: { label: 'Negotiation', order: 8, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  won: { label: 'Won', order: 9, bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400' },
  lost: { label: 'Lost', order: 10, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
};
