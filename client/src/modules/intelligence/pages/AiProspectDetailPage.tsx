import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Sparkles, TrendingUp, MapPin, Globe, Phone, Download, Plus, Loader2, Link2, Mail, Trash2,
  UserPlus, ArrowRight, Building2, Users,
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { Card } from '@/modules/core/components/ui/Card';
import { Badge } from '@/modules/core/components/ui/Badge';
import { useToast } from '@/modules/core/providers/ToastContext';
import { cn } from '@/modules/core/lib/utils';
import {
  IntelligenceService, DiscoveredCompany, DiscoveredCompanyDetail, Contact, CrmStatus,
} from '@/modules/core/services/intelligenceService';
import { PropertyService } from '@/modules/core/services/propertyService';
import { addProspectToCrm } from '../utils/addProspectToCrm';
import { exportProspectsCsv } from '../utils/exportProspectsCsv';
import { OutreachDraftModal, OutreachChannel } from '../components/OutreachDraftModal';

export interface AiProspectDetailPageProps {
  prospectId: number;
  onBack: () => void;
  onOpenInquiry: (inquiryId: string) => void;
}

const STAGE_LABEL: Record<string, string> = {
  new: 'New Lead', contacted: 'Contacted', requirement_confirmed: 'Req. Confirmed', property_matched: 'Property Matched',
  property_shared: 'Property Shared', proposal: 'Proposal Sent', site_visit: 'Site Visit', negotiation: 'Negotiation',
};

const inputCls =
  'w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-xs text-foreground h-9 px-3 focus:border-fairway-600 focus:outline-none';

const EMPTY_CONTACT = { name: '', title: '', email: '', phone: '', linkedinUrl: '' };

const scoreBadgeClass = (score: number | null | undefined) => {
  if (score === null || score === undefined) return 'bg-surface-muted text-foreground-muted border-border';
  if (score >= 70) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (score >= 40) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-surface-muted text-foreground-muted border-border';
};

export const AiProspectDetailPage: React.FC<AiProspectDetailPageProps> = ({ prospectId, onBack, onOpenInquiry }) => {
  const { success, error: toastError } = useToast();
  const [detail, setDetail] = useState<DiscoveredCompanyDetail | null>(null);
  const [crm, setCrm] = useState<CrmStatus | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dealContactId, setDealContactId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [contactError, setContactError] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [draftTarget, setDraftTarget] = useState<{ contact: Contact; channel: OutreachChannel } | null>(null);
  const [warehouseNames, setWarehouseNames] = useState<Record<string, string>>({});

  useEffect(() => {
    PropertyService.getProperties().then((res) => {
      if (res.success && res.data) setWarehouseNames(Object.fromEntries(res.data.map((p) => [p.id, p.name])));
    });
  }, []);

  const loadCrmAndContacts = async () => {
    const [crmRes, contactsRes] = await Promise.all([
      IntelligenceService.getCrmStatus(prospectId),
      IntelligenceService.getCompanyContacts(prospectId),
    ]);
    if (crmRes.success && crmRes.data) setCrm(crmRes.data);
    if (contactsRes.success && contactsRes.data) {
      const items = contactsRes.data.items;
      setContacts(items);
      setDealContactId((cur) => (cur && items.some((c) => c.id === cur) ? cur : items[0]?.id ?? null));
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      IntelligenceService.getDiscoveredCompany(prospectId).then((res) => {
        if (res.success && res.data) setDetail(res.data);
      }),
      loadCrmAndContacts(),
    ]).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId]);

  const handleSaveContact = async () => {
    setContactError('');
    if (!contactForm.name.trim()) return setContactError('Enter their name.');
    if (!contactForm.email.trim() && !contactForm.phone.trim() && !contactForm.linkedinUrl.trim()) {
      return setContactError('Add at least one way to reach them: email, phone or LinkedIn.');
    }
    setIsSavingContact(true);
    try {
      const res = await IntelligenceService.createManualContact(prospectId, {
        name: contactForm.name.trim(),
        title: contactForm.title.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
        linkedinUrl: contactForm.linkedinUrl.trim() || undefined,
      });
      if (!res.success || !res.data) {
        setContactError(typeof res.error === 'string' ? res.error : 'Could not save the contact.');
        return;
      }
      setContactForm(EMPTY_CONTACT);
      setShowContactForm(false);
      await loadCrmAndContacts();
      setDealContactId(res.data.id);
      success('Key person added', `${res.data.name} saved for ${detail?.name}.`);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (c: Contact) => {
    const res = await IntelligenceService.deleteContact(c.id);
    if (!res.success) {
      toastError('Delete failed', typeof res.error === 'string' ? res.error : 'Try again.');
      return;
    }
    await loadCrmAndContacts();
  };

  const asDiscoveredCompany = (d: DiscoveredCompanyDetail): DiscoveredCompany => ({
    id: d.id,
    name: d.name,
    businessType: d.businessType,
    address: d.address,
    distanceKm: d.distanceKm,
    siteCount: d.siteCount,
    latestRevenueCr: d.revenueSnapshots[0]?.revenueCr ?? null,
    opportunityScore: d.opportunityScore?.score ?? null,
    latestSignalFreshness: d.opportunityScore?.latestSignalFreshness ?? null,
    nearestPropertyId: d.warehouseLinks[0]?.propertyId ?? null,
    warehouseCount: d.warehouseLinks.length,
  });

  const handleAddToCrm = async () => {
    if (!detail) return;
    setIsAdding(true);
    try {
      const result = await addProspectToCrm({ companyId: detail.id, contactId: dealContactId ?? undefined });
      await loadCrmAndContacts();
      if (!result.success) {
        toastError(result.alreadyOpen ? 'Already in the CRM' : 'Add Failed', result.error || `Could not add ${detail.name} to the CRM.`);
        return;
      }
      const d = result.data!;
      success(
        'Added to CRM',
        `${d.inquiryNumber} is on the New Lead column${d.owner ? `, owned by ${d.owner.managerName}` : ''}${d.contactName ? ` with ${d.contactName} as the contact` : ''}.`
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!detail) return;
    exportProspectsCsv([{ company: asDiscoveredCompany(detail), detail }]);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-fairway-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 space-y-4">
        <Button type="button" variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={onBack}>
          Back
        </Button>
        <p className="text-sm text-foreground-muted">Prospect not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={onBack}>
          Back to AI Discovery
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsv} leftIcon={<Download className="w-3.5 h-3.5" />} className="rounded-lg text-xs font-semibold">
          Download CSV
        </Button>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fairway-600" />
              {detail.name}
            </h1>
            <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {detail.address || 'Address unavailable'}
            </p>
            {detail.warehouseLinks.length > 0 && (
              <p className="text-xs text-foreground-muted mt-1">
                Near{' '}
                {detail.warehouseLinks
                  .map((l) => `${warehouseNames[l.propertyId] ?? 'another warehouse'}${l.distanceKm !== null ? ` (${l.distanceKm.toFixed(1)} km)` : ''}`)
                  .join(' · ')}
              </p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border shrink-0 flex items-center gap-1 ${scoreBadgeClass(detail.opportunityScore?.score)}`}>
            <TrendingUp className="w-4 h-4" />
            {detail.opportunityScore ? Math.round(detail.opportunityScore.score) : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {detail.businessType && <Badge variant="outline">{detail.businessType}</Badge>}
          {detail.website && (
            <a href={detail.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-foreground-muted hover:text-primary">
              <Globe className="w-3 h-3" /> Website
            </a>
          )}
          {detail.phone && (
            <span className="flex items-center gap-1 text-foreground-muted">
              <Phone className="w-3 h-3" /> {detail.phone}
            </span>
          )}
        </div>
      </Card>

      {/* CRM status: one source of truth for "is this already a lead?" */}
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-fairway-600" />
          In the CRM
        </h2>
        {crm?.openInquiry ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <div className="text-xs">
              <p className="font-bold text-foreground">
                Open deal {crm.openInquiry.inquiryNumber} · {STAGE_LABEL[crm.openInquiry.stage] || crm.openInquiry.stage}
              </p>
              <p className="text-foreground-muted mt-0.5">
                Owner: {crm.openInquiry.ownerName || 'Unassigned'}
                {crm.company && crm.company.matchedBy !== 'link' && ` · matched to "${crm.company.name}" by ${crm.company.matchedBy}`}
              </p>
            </div>
            <Button type="button" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => onOpenInquiry(crm.openInquiry!.id)} className="rounded-lg text-xs font-semibold">
              Open deal
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-foreground">
                {crm?.inCrm ? `Company is in the CRM as "${crm.company?.name}", with no open deal` : 'Not in the CRM yet'}
              </p>
              <p className="text-foreground-muted">
                {crm?.suggestedOwner
                  ? `Owner will be ${crm.suggestedOwner.managerName} — manager of ${crm.suggestedOwner.propertyName} (${crm.suggestedOwner.distanceKm} km away).`
                  : 'No warehouse manager nearby — the deal will be Unassigned.'}
              </p>
              <p className="text-foreground-muted">
                Deal contact: {contacts.find((c) => c.id === dealContactId)?.name || 'none — add a key person below'}
              </p>
            </div>
            <Button type="button" size="sm" onClick={handleAddToCrm} isLoading={isAdding} leftIcon={<Plus className="w-3.5 h-3.5" />} className="rounded-lg text-xs font-semibold">
              {crm?.inCrm ? 'Start a new deal' : 'Add to CRM'}
            </Button>
          </div>
        )}
      </Card>

      {/* Key people: manual for now, Apollo once the plan is upgraded */}
      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-fairway-600" />
            Key people ({contacts.length})
          </h2>
          {!showContactForm && (
            <Button type="button" size="xs" variant="outline" leftIcon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setShowContactForm(true)} className="rounded-lg text-xs">
              Add key person
            </Button>
          )}
        </div>

        {contacts.length === 0 && !showContactForm && (
          <p className="text-xs text-foreground-muted">
            No one yet. Add the person you'll contact (e.g. head of supply chain or plant head). Automatic lookup via Apollo needs a paid plan.
          </p>
        )}

        {contacts.length > 0 && (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs',
                !crm?.openInquiry && dealContactId === c.id ? 'border-fairway-600/50 bg-fairway-600/5' : 'border-border')}>
                <label className="flex items-start gap-2.5 min-w-0 cursor-pointer" htmlFor={`deal-contact-${c.id}`}>
                  {!crm?.openInquiry && (
                    <input id={`deal-contact-${c.id}`} type="radio" name="deal-contact" className="mt-0.5"
                      checked={dealContactId === c.id} onChange={() => setDealContactId(c.id)} />
                  )}
                  <span className="min-w-0">
                    <span className="font-bold text-foreground">{c.name}</span>
                    {c.title && <span className="text-foreground-muted"> · {c.title}</span>}
                    <span className="block text-foreground-muted truncate">
                      {[c.email, c.phone].filter(Boolean).join(' · ') || (c.linkedinUrl ? 'LinkedIn only' : '')}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" size="sm">{c.source === 'manual' ? 'Added by hand' : c.source}</Badge>
                  <button type="button" title="Draft LinkedIn message" disabled={!c.linkedinUrl}
                    onClick={() => setDraftTarget({ contact: c, channel: 'linkedin' })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button type="button" title="Draft email" disabled={!c.email}
                    onClick={() => setDraftTarget({ contact: c, channel: 'email' })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                    <Mail className="w-4 h-4" />
                  </button>
                  {c.source === 'manual' && (
                    <button type="button" title="Remove" onClick={() => handleDeleteContact(c)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-rose-600 hover:bg-surface-muted cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {showContactForm && (
          <div className="rounded-xl border border-border p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="kp-name" className="text-[11px] font-semibold text-foreground">Name</label>
                <input id="kp-name" className={inputCls} value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="kp-title" className="text-[11px] font-semibold text-foreground">Title</label>
                <input id="kp-title" className={inputCls} placeholder="e.g. Head of Supply Chain" value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="kp-email" className="text-[11px] font-semibold text-foreground">Email</label>
                <input id="kp-email" type="email" className={inputCls} value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="kp-phone" className="text-[11px] font-semibold text-foreground">Phone</label>
                <input id="kp-phone" className={inputCls} value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="kp-linkedin" className="text-[11px] font-semibold text-foreground">LinkedIn profile URL</label>
                <input id="kp-linkedin" className={inputCls} placeholder="https://www.linkedin.com/in/…" value={contactForm.linkedinUrl} onChange={(e) => setContactForm({ ...contactForm, linkedinUrl: e.target.value })} />
              </div>
            </div>
            {contactError && <p className="text-xs text-rose-500 font-medium">{contactError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowContactForm(false); setContactError(''); }}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleSaveContact} isLoading={isSavingContact}>Save key person</Button>
            </div>
          </div>
        )}
      </Card>

      <OutreachDraftModal
        isOpen={!!draftTarget}
        onClose={() => setDraftTarget(null)}
        contact={draftTarget?.contact || null}
        companyName={detail.name}
        channel={draftTarget?.channel || 'linkedin'}
      />

      {detail.opportunityScore && (
        <Card className="p-5 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Opportunity Score Breakdown</h2>
          <p className="text-xs text-foreground-muted">{detail.opportunityScore.why}</p>
          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
            <div>
              <span className="text-foreground-muted">Estimated Requirement</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.estimatedRequirement || '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">Recommended Action</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.recommendedAction || '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">Confidence</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.confidence || '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">Latest Signal</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.latestSignalFreshness || '—'}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-2">
        <h2 className="text-sm font-bold text-foreground">Revenue History</h2>
        {detail.revenueSnapshots.length === 0 ? (
          <p className="text-xs text-foreground-muted">No revenue data yet.</p>
        ) : (
          <div className="space-y-2">
            {detail.revenueSnapshots.map((rs) => (
              <div key={rs.id} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                <div>
                  <p className="font-semibold text-foreground">{rs.revenue || `₹${rs.revenueCr} Cr`}</p>
                  <p className="text-foreground-muted">{rs.fiscalYear} · {rs.sourceName}</p>
                </div>
                <span className="text-foreground-muted">{rs.confidence}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="text-sm font-bold text-foreground">Signals Timeline</h2>
        {detail.signals.length === 0 ? (
          <p className="text-xs text-foreground-muted">No signals researched yet.</p>
        ) : (
          <div className="space-y-3">
            {detail.signals.map((s) => (
              <div key={s.id} className="text-xs border-b border-border pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">{s.type}</Badge>
                  <span className="text-foreground-muted">{s.date}</span>
                </div>
                <p className="text-foreground mt-1">{s.summary}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AiProspectDetailPage;
