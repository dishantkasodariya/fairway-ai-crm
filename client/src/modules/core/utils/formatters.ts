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
    return { label: 'Active', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  }
  if (s === 'prospect') {
    return { label: 'Prospect', bg: 'bg-surface-muted text-foreground border-border' };
  }
  if (s === 'inactive') {
    return { label: 'Inactive', bg: 'bg-surface-muted text-foreground-muted border-border' };
  }
  if (s === 'archived') {
    return { label: 'Archived', bg: 'bg-surface-muted text-foreground-muted border-border' };
  }
  return { label: status || 'Active', bg: 'bg-surface-muted text-foreground border-border' };
}

export function getFacilityStatusBadge(status: any) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'active') {
    return { label: 'Active Facility', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  }
  if (s.includes('construction')) {
    return { label: 'Under Construction', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
  }
  if (s === 'planned') {
    return { label: 'Planned', bg: 'bg-surface-muted text-foreground border-border' };
  }
  return { label: status || 'Active', bg: 'bg-surface-muted text-foreground border-border' };
}

export function getTaskStatusBadge(status: any) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'completed') {
    return { label: 'Completed', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  }
  if (s === 'cancelled') {
    return { label: 'Cancelled', bg: 'bg-surface-muted text-foreground-muted border-border' };
  }
  return { label: status || 'Pending', bg: 'bg-surface-muted text-foreground border-border' };
}

export function getProposalStatusBadge(status: any) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'accepted') {
    return { label: 'Accepted', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  }
  if (s === 'sent') {
    return { label: 'Sent', bg: 'bg-surface-muted text-foreground border-border' };
  }
  if (s === 'viewed') {
    return { label: 'Viewed', bg: 'bg-surface-muted text-foreground border-border' };
  }
  if (s === 'negotiation') {
    return { label: 'Negotiation', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
  }
  if (s === 'rejected') {
    return { label: 'Rejected', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
  }
  return { label: status || 'Draft', bg: 'bg-surface-muted text-foreground border-border' };
}

export const STAGE_CONFIGS: Record<PipelineStageKey, { label: string; order: number; bg: string; text: string; border: string }> = {
  new: { label: 'New', order: 1, bg: 'bg-surface-muted', text: 'text-foreground', border: 'border-border' },
  contacted: { label: 'Contacted', order: 2, bg: 'bg-surface-muted', text: 'text-foreground', border: 'border-border' },
  requirement_confirmed: { label: 'Req Confirmed', order: 3, bg: 'bg-surface-muted', text: 'text-foreground', border: 'border-border' },
  property_matched: { label: 'Property Matched', order: 4, bg: 'bg-surface-muted', text: 'text-foreground', border: 'border-border' },
  property_shared: { label: 'Property Shared', order: 5, bg: 'bg-surface-muted', text: 'text-foreground', border: 'border-border' },
  proposal: { label: 'Proposal', order: 6, bg: 'bg-surface-muted', text: 'text-foreground', border: 'border-border' },
  site_visit: { label: 'Site Visit', order: 7, bg: 'bg-surface-muted', text: 'text-foreground', border: 'border-border' },
  negotiation: { label: 'Negotiation', order: 8, bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  won: { label: 'Won', order: 9, bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  lost: { label: 'Lost', order: 10, bg: 'bg-surface-muted', text: 'text-foreground-muted', border: 'border-border' },
};

export function getPipelineStageBadge(stageKey: string) {
  const config = STAGE_CONFIGS[stageKey as PipelineStageKey];
  if (!config) {
    return {
      className: 'bg-surface-muted text-foreground border-border',
      label: stageKey,
    };
  }
  return {
    className: `${config.bg} ${config.text} ${config.border}`,
    label: config.label,
  };
}

export function normalizeCompanyName(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp|inc\.?|corp\.?|corporation|co\.?)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

