import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Plus,
  Search,
  Filter,
  Paperclip,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  User,
  Loader2,
  Calendar,
  Share2,
  FileText,
  Download,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import CommunicationService, {
  CommunicationItem,
  CommunicationStats,
} from '@/modules/core/services/communicationService';
import CompanyService from '@/modules/core/services/companyService';
import ContactService from '@/modules/core/services/contactService';
import { Company, Contact } from '@/modules/core/types';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Card } from '@/modules/core/components/ui/Card';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Textarea } from '@/modules/core/components/ui/Input';

export const CommunicationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [stats, setStats] = useState<CommunicationStats>({
    total: 0,
    emails: 0,
    whatsApp: 0,
    linkedIn: 0,
    calls: 0,
    notes: 0,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Active channel filter tab
  const [activeChannel, setActiveChannel] = useState<'All' | 'Email' | 'WhatsApp' | 'LinkedIn' | 'Call' | 'Note'>('All');
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'Inbound' | 'Outbound'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');

  // Modals
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Email form
  const [emailForm, setEmailForm] = useState({
    companyId: '',
    recipientEmail: '',
    contactName: '',
    subject: '',
    message: '',
    template: 'custom',
    attachPdf: true,
  });

  // Call log form
  const [callForm, setCallForm] = useState({
    companyId: '',
    contactName: '',
    direction: 'Outbound' as 'Inbound' | 'Outbound',
    durationMinutes: 15,
    outcome: 'Positive - Requirement Confirmed',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [commRes, statsRes, compRes, contactRes] = await Promise.all([
        CommunicationService.getCommunications(),
        CommunicationService.getStats(),
        CompanyService.getCompanies({ pageSize: 100 }),
        ContactService.getContacts(),
      ]);

      if (commRes.success && commRes.data) {
        setCommunications(commRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (compRes.success && compRes.data) {
        setCompanies(compRes.data);
      }
      if (contactRes.success && contactRes.data) {
        setContacts(contactRes.data);
      }
    } catch (err: any) {
      error('Failed to load communications', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTemplateChange = (templateKey: string) => {
    let sub = '';
    let body = '';
    const comp = companies.find((c) => c.id === emailForm.companyId);
    const compName = comp?.name || 'Enterprise Client';

    if (templateKey === 'commercial_proposal') {
      sub = `Commercial Proposal — Grade A Warehouse Facility at Dahej PCPIR node [${compName}]`;
      body = `Dear Sir/Madam,\n\nFollowing our technical inquiry discussion, please find attached the formal commercial terms and NFPA layout specifications for your warehouse requirement.\n\nKey Parameters:\n- Clear Height: 12.0m\n- Flooring: 6 MT/sq.m Heavy-Duty Laser Screed\n- Availability: Immediate\n\nPlease let us know your availability for a joint technical site visit.\n\nWarm regards,\n${currentUser.name}\nFairway CRM Industrial Leasing Desk`;
    } else if (templateKey === 'site_visit_invite') {
      sub = `Invitation for Joint Site Inspection — Dahej Mega Logistics Park`;
      body = `Dear Sir/Madam,\n\nWe would like to invite your operations and supply chain team for a physical site walkthrough this upcoming Tuesday at 11:30 AM.\n\nGate passes and security clearances have been pre-arranged.\n\nBest regards,\n${currentUser.name}`;
    } else if (templateKey === 'follow_up_reminder') {
      sub = `Follow-up: Warehouse Leasing Proposal Status Check`;
      body = `Dear Sir/Madam,\n\nChecking in on the technical proposal shared last week for the Grade A distribution center in Gujarat.\n\nPlease let us know if your committee requires any additional layout drawings or lease term adjustments.\n\nBest regards,\n${currentUser.name}`;
    }

    setEmailForm((prev) => ({
      ...prev,
      template: templateKey,
      subject: sub || prev.subject,
      message: body || prev.message,
    }));
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.recipientEmail || !emailForm.message.trim()) {
      error('Validation Error', 'Recipient email and message body are required.');
      return;
    }

    setSubmitting(true);
    try {
      const comp = companies.find((c) => c.id === emailForm.companyId);
      const res = await CommunicationService.sendFollowUpEmail({
        companyId: emailForm.companyId || undefined,
        companyName: comp?.name || undefined,
        recipientEmail: emailForm.recipientEmail,
        contactName: emailForm.contactName || undefined,
        subject: emailForm.subject,
        message: emailForm.message,
        userId: currentUser.id,
        userName: currentUser.name,
      });

      if (res.success) {
        success('Email Dispatched', `Sent to ${emailForm.recipientEmail} with follow-up PDF attachment.`);
        setIsEmailModalOpen(false);
        setEmailForm({
          companyId: '',
          recipientEmail: '',
          contactName: '',
          subject: '',
          message: '',
          template: 'custom',
          attachPdf: true,
        });
        loadData();
      } else {
        error('Dispatch Failed', res.error || 'Failed to dispatch email.');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callForm.notes.trim()) {
      error('Validation Error', 'Call discussion notes are required.');
      return;
    }

    setSubmitting(true);
    try {
      const comp = companies.find((c) => c.id === callForm.companyId);
      const res = await CommunicationService.createCommunication({
        channel: 'Call',
        direction: callForm.direction,
        subject: `Phone Call: ${callForm.outcome}`,
        message: callForm.notes,
        companyId: callForm.companyId || undefined,
        companyName: comp?.name || undefined,
        contactName: callForm.contactName || undefined,
        userId: currentUser.id,
        userName: currentUser.name,
        status: 'Delivered',
        durationMinutes: callForm.durationMinutes,
        outcome: callForm.outcome,
      });

      if (res.success) {
        success('Call Logged', 'Logged phone interaction to client activity timeline.');
        setIsCallModalOpen(false);
        setCallForm({
          companyId: '',
          contactName: '',
          direction: 'Outbound',
          durationMinutes: 15,
          outcome: 'Positive - Requirement Confirmed',
          notes: '',
        });
        loadData();
      } else {
        error('Log Failed', res.error || 'Failed to log call.');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list
  const filteredComms = communications.filter((c) => {
    const matchesChannel = activeChannel === 'All' || c.channel === activeChannel;
    const matchesDirection = directionFilter === 'all' || c.direction === directionFilter;
    const matchesCompany = selectedCompanyId === 'all' || c.companyId === selectedCompanyId;
    const matchesSearch =
      !search ||
      c.subject?.toLowerCase().includes(search.toLowerCase()) ||
      c.message.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName?.toLowerCase().includes(search.toLowerCase());

    return matchesChannel && matchesDirection && matchesCompany && matchesSearch;
  });

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'Email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'WhatsApp':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'LinkedIn':
        return <Share2 className="w-4 h-4 text-indigo-600" />;
      case 'Call':
        return <Phone className="w-4 h-4 text-amber-600" />;
      default:
        return <FileText className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-primary" />
            <span>Global Communications Hub</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Omni-channel client touchpoints across Email, WhatsApp, LinkedIn, phone calls, and internal handover notes.
          </p>
        </div>
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsCallModalOpen(true)} className="gap-2 font-medium justify-center">
            <Phone className="w-4 h-4" />
            <span>Log Call</span>
          </Button>
          <Button onClick={() => setIsEmailModalOpen(true)} className="gap-2 shadow-sm font-medium justify-center">
            <Send className="w-4 h-4" />
            <span>Compose Email</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveChannel('All')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeChannel === 'All'
              ? 'bg-orange-50/70 border-primary shadow-xs'
              : 'bg-white border-border/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">All Channels</span>
          <span className="text-xl font-bold text-foreground mt-1 block">{stats.total}</span>
        </button>

        <button
          onClick={() => setActiveChannel('Email')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeChannel === 'Email'
              ? 'bg-blue-50/70 border-blue-500 shadow-xs'
              : 'bg-white border-border/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Email</span>
            <Mail className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xl font-bold text-foreground mt-1 block">{stats.emails}</span>
        </button>

        <button
          onClick={() => setActiveChannel('WhatsApp')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeChannel === 'WhatsApp'
              ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
              : 'bg-white border-border/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">WhatsApp</span>
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-foreground mt-1 block">{stats.whatsApp}</span>
        </button>

        <button
          onClick={() => setActiveChannel('LinkedIn')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeChannel === 'LinkedIn'
              ? 'bg-indigo-50/70 border-indigo-500 shadow-xs'
              : 'bg-white border-border/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">LinkedIn</span>
            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-xl font-bold text-foreground mt-1 block">{stats.linkedIn}</span>
        </button>

        <button
          onClick={() => setActiveChannel('Call')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeChannel === 'Call'
              ? 'bg-amber-50/70 border-amber-500 shadow-xs'
              : 'bg-white border-border/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Calls</span>
            <Phone className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-xl font-bold text-foreground mt-1 block">{stats.calls}</span>
        </button>

        <button
          onClick={() => setActiveChannel('Note')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeChannel === 'Note'
              ? 'bg-slate-100 border-slate-400 shadow-xs'
              : 'bg-white border-border/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Notes</span>
            <FileText className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <span className="text-xl font-bold text-foreground mt-1 block">{stats.notes}</span>
        </button>
      </div>

      {/* 3. Filter Bar */}
      <Card className="p-4 bg-white border border-border/80 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by subject, contact, company, or message body..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50/50 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All Directions</option>
              <option value="Outbound">Outbound (Sent)</option>
              <option value="Inbound">Inbound (Received)</option>
            </select>

            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 bg-slate-50/50 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-primary max-w-[200px] truncate"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 4. Timeline / Communications Table */}
      <Card className="bg-white border border-border/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading communication history...</p>
          </div>
        ) : filteredComms.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-muted-foreground flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No communication records</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {search || activeChannel !== 'All'
                ? 'Try clearing active channel tabs or search criteria.'
                : 'Send formal commercial emails or log client calls to start tracking interactions.'}
            </p>
            <Button size="sm" onClick={() => setIsEmailModalOpen(true)} className="mt-2 gap-1.5">
              <Send className="w-4 h-4" />
              <span>Compose First Email</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredComms.map((comm) => (
              <div key={comm.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Channel Icon & Direction */}
                <div className="flex items-center gap-2.5 sm:flex-col sm:items-center shrink-0">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0">
                    {getChannelIcon(comm.channel)}
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      comm.direction === 'Inbound'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {comm.direction === 'Inbound' ? (
                      <>
                        <ArrowDownLeft className="w-2.5 h-2.5" />
                        <span>IN</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        <span>OUT</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {comm.subject || `${comm.channel} Touchpoint`}
                      </span>
                      {Boolean(comm.durationMinutes && comm.durationMinutes > 0) && (
                        <span className="text-[11px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                          {comm.durationMinutes} mins
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(comm.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</span>
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 whitespace-pre-line line-clamp-3">
                    {comm.message}
                  </p>

                  {/* Attachments */}
                  {comm.attachments && comm.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {comm.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.downloadUrl || '/api/v1/follow-ups/fu_1/download-pdf'}
                          download={att.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors"
                        >
                          <Paperclip className="w-3 h-3 text-muted-foreground" />
                          <span>{att.name}</span>
                          <span className="text-[10px] text-muted-foreground">({att.size})</span>
                          <Download className="w-3 h-3 ml-1 text-primary" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1.5">
                    {comm.companyName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">{comm.companyName}</span>
                      </span>
                    )}
                    {comm.contactName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{comm.contactName}</span>
                      </span>
                    )}
                    <span>
                      Officer: <span className="font-medium text-foreground">{comm.userName || 'Pooja Hegde'}</span>
                    </span>
                    {comm.outcome && (
                      <span className="font-medium text-primary">
                        Outcome: {comm.outcome}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Compose Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Compose Official Lease Communication"
        description="Dispatch formal commercial proposals and follow-up updates with PDF attachment."
      >
        <form onSubmit={handleSendEmail} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Target Enterprise Company *
              </label>
              <select
                value={emailForm.companyId}
                onChange={(e) => {
                  const compId = e.target.value;
                  const comp = companies.find((c) => c.id === compId);
                  const defaultContact = contacts.find((c) => c.companyId === compId && c.isPrimary) || contacts.find((c) => c.companyId === compId);

                  setEmailForm({
                    ...emailForm,
                    companyId: compId,
                    recipientEmail: defaultContact?.email || comp?.email || emailForm.recipientEmail,
                    contactName: defaultContact?.name || '',
                  });
                }}
                required
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="" disabled>Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Recipient Email *
              </label>
              <Input
                type="email"
                placeholder="rajesh.patel@company.com"
                value={emailForm.recipientEmail}
                onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Industrial Email Template
            </label>
            <select
              value={emailForm.template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="custom">Custom Email Draft</option>
              <option value="commercial_proposal">Commercial Proposal & Technical Specs</option>
              <option value="site_visit_invite">Site Visit Formal Invitation</option>
              <option value="follow_up_reminder">Follow-up & Committee Decision Reminder</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Subject Line *
            </label>
            <Input
              placeholder="e.g. Commercial Proposal — Grade A Warehouse at Dahej PCPIR node"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Email Message Body *
            </label>
            <Textarea
              rows={6}
              placeholder="Type your commercial message or select an industrial template above..."
              value={emailForm.message}
              onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
              required
            />
          </div>

          <div className="p-3 bg-orange-50/60 border border-orange-200/80 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Attach Official Fairway Follow-up PDF Dossier
              </span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-primary">
              <input
                type="checkbox"
                checked={emailForm.attachPdf}
                onChange={(e) => setEmailForm({ ...emailForm, attachPdf: e.target.checked })}
                className="w-4 h-4 text-primary rounded border-border"
              />
              <span>Attach PDF</span>
            </label>
          </div>

          <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border w-full">
            <Button type="button" variant="outline" onClick={() => setIsEmailModalOpen(false)} className="w-full xs:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2 w-full xs:w-auto">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Email</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Log Call Modal */}
      <Modal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        title="Log Client Phone Interaction"
        description="Record telephone discussion points, duration, and agreed milestones."
      >
        <form onSubmit={handleLogCall} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Enterprise Company
              </label>
              <select
                value={callForm.companyId}
                onChange={(e) => setCallForm({ ...callForm, companyId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Contact Person
              </label>
              <Input
                placeholder="e.g. Rajesh Patel"
                value={callForm.contactName}
                onChange={(e) => setCallForm({ ...callForm, contactName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Call Direction
              </label>
              <select
                value={callForm.direction}
                onChange={(e) => setCallForm({ ...callForm, direction: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Outbound">Outbound (We Called)</option>
                <option value="Inbound">Inbound (Client Called)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Duration (Minutes)
              </label>
              <Input
                type="number"
                min="1"
                max="180"
                value={callForm.durationMinutes}
                onChange={(e) => setCallForm({ ...callForm, durationMinutes: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Call Outcome
              </label>
              <select
                value={callForm.outcome}
                onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Positive - Requirement Confirmed">Positive - Requirement Confirmed</option>
                <option value="Site Visit Scheduled">Site Visit Scheduled</option>
                <option value="Commercial Terms Negotiating">Commercial Terms Negotiating</option>
                <option value="Proposal Requested">Proposal Requested</option>
                <option value="Left Voicemail / Callback Later">Left Voicemail / Callback Later</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Discussion Summary & Next Steps *
            </label>
            <Textarea
              rows={4}
              placeholder="Discussed dock requirements, rent expectations, and delivery timeline..."
              value={callForm.notes}
              onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border w-full">
            <Button type="button" variant="outline" onClick={() => setIsCallModalOpen(false)} className="w-full xs:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2 w-full xs:w-auto">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              <span>Log Interaction</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CommunicationsPage;
