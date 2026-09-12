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
export function getPriorityBadge(priority: any) {
  const p = (priority || '').toString().trim().toLowerCase();
  if (p === 'high') {
    return {
      label: 'High Priority',
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
      dot: 'bg-rose-500',
    };
  }
  if (p === 'medium') {
    return {
      label: 'Medium Priority',
      bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
      dot: 'bg-amber-500',
    };
  }
  if (p === 'low') {
    return {
      label: 'Low Priority',
      bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700',
      dot: 'bg-slate-400',
    };
  }
  return {
    label: priority ? `${priority} Priority` : 'Normal Priority',
    bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  };
}

export function getCompanyStatusBadge(status: any) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'active') {
    return { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60' };
  }
  if (s === 'prospect') {
    return { label: 'Prospect', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60' };
  }
  if (s === 'inactive') {
    return { label: 'Inactive', bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700' };
  }
  if (s === 'archived') {
    return { label: 'Archived', bg: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700' };
  }
  return { label: status || 'Active', bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700' };
}

export function getFacilityStatusBadge(status: any) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'active') {
    return { label: 'Active Facility', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60' };
  }
  if (s.includes('construction')) {
    return { label: 'Under Construction', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60' };
  }
  if (s === 'planned') {
    return { label: 'Planned', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/60' };
  }
  return { label: status || 'Active', bg: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700' };
}

export function getTaskStatusBadge(status: any) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'completed') {
    return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60' };
  }
  if (s === 'cancelled') {
    return { label: 'Cancelled', bg: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700' };
  }
  return { label: status || 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60' };
}

export function getProposalStatusBadge(status: any) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'accepted') {
    return { label: 'Accepted', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60' };
  }
  if (s === 'sent') {
    return { label: 'Sent', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60' };
  }
  if (s === 'viewed') {
    return { label: 'Viewed', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60' };
  }
  if (s === 'negotiation') {
    return { label: 'Negotiation', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60' };
  }
  if (s === 'rejected') {
    return { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60' };
  }
  return { label: status || 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700' };
}

export const STAGE_CONFIGS: Record<PipelineStageKey, { label: string; order: number; bg: string; text: string; border: string }> = {
  new: { label: 'New', order: 1, bg: 'bg-slate-100 dark:bg-slate-800/90', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  contacted: { label: 'Contacted', order: 2, bg: 'bg-sky-50 dark:bg-sky-950/70', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-800/60' },
  requirement_confirmed: { label: 'Req Confirmed', order: 3, bg: 'bg-indigo-50 dark:bg-indigo-950/70', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-800/60' },
  property_matched: { label: 'Property Matched', order: 4, bg: 'bg-emerald-50 dark:bg-emerald-950/70', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800/60' },
  property_shared: { label: 'Property Shared', order: 5, bg: 'bg-teal-50 dark:bg-teal-950/70', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-800/60' },
  proposal: { label: 'Proposal', order: 6, bg: 'bg-purple-50 dark:bg-purple-950/70', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800/60' },
  site_visit: { label: 'Site Visit', order: 7, bg: 'bg-orange-50 dark:bg-orange-950/70', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-800/60' },
  negotiation: { label: 'Negotiation', order: 8, bg: 'bg-amber-50 dark:bg-amber-950/70', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800/60' },
  won: { label: 'Won', order: 9, bg: 'bg-emerald-100 dark:bg-emerald-950/70', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-800/60' },
  lost: { label: 'Lost', order: 10, bg: 'bg-rose-50 dark:bg-rose-950/70', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800/60' },
};

export function getPipelineStageBadge(stageKey: string) {
  const config = STAGE_CONFIGS[stageKey as PipelineStageKey];
  if (!config) {
    return {
      className: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      label: stageKey,
    };
  }
  return {
    className: `${config.bg} ${config.text} ${config.border}`,
    label: config.label,
  };
}
