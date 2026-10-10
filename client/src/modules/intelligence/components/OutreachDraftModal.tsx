import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2, Send, CheckCircle2, RotateCcw } from 'lucide-react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { useToast } from '@/modules/core/providers/ToastContext';
import { IntelligenceService, DraftMessage } from '@/modules/core/services/intelligenceService';

export type OutreachChannel = 'linkedin' | 'email';

// LinkedIn caps a connection-request note at 300 characters.
const LINKEDIN_NOTE_LIMIT = 300;
const SUBJECT_LIMIT = 200;
const BODY_LIMIT = 5000;
// "[Your Name]", "[Phone Number]"... left in a draft would go to the prospect verbatim.
const PLACEHOLDER = /\[(?:your|insert|name|phone|company|title|date|email)[^\]\n]{0,40}\]/i;

export interface OutreachDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: { id: number; companyId: number; name: string; email: string | null; linkedinUrl: string | null } | null;
  companyName: string;
  channel: OutreachChannel;
}

/**
 * Drafts a LinkedIn note or email for a key person from the company's opportunity signals.
 * The draft is a starting point: subject and message are editable, and Copy / Send / Open
 * in email client all use the edited text.
 * Email can be sent for real, one message at a time, only after the person reviews it here
 * (via Resend — see backend/src/services/emailSender.ts). LinkedIn has no send button by
 * design: no outside app can message a LinkedIn member on someone's behalf without breaking
 * LinkedIn's terms, so that channel stays Copy + open the profile and send it yourself.
 */
export const OutreachDraftModal: React.FC<OutreachDraftModalProps> = ({ isOpen, onClose, contact, companyName, channel }) => {
  const { error: toastError, success } = useToast();
  const [draft, setDraft] = useState<DraftMessage | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  // What the user is about to send: starts as the AI draft, freely editable.
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!isOpen || !contact) return;
    let alive = true;
    setDraft(null);
    setSent(false);
    setIsDrafting(true);
    IntelligenceService.draftMessage(contact.id).then((res) => {
      if (!alive) return;
      setIsDrafting(false);
      if (!res.success || !res.data) {
        toastError('Draft Failed', res.error || 'Could not draft a message for this contact.');
        onClose();
        return;
      }
      setDraft(res.data);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contact?.id]);

  const active = draft ? (channel === 'linkedin' ? draft.linkedin : draft.email) : null;

  useEffect(() => {
    setSubject(active?.subject || '');
    setBody(active?.body || '');
  }, [active?.id, channel]);

  const edited = !!active && (body !== active.body || (channel === 'email' && subject !== (active.subject || '')));
  const resetToDraft = () => {
    setSubject(active?.subject || '');
    setBody(active?.body || '');
  };
  const overLimit = channel === 'linkedin' ? body.length > LINKEDIN_NOTE_LIMIT : body.length > BODY_LIMIT || subject.length > SUBJECT_LIMIT;
  const placeholder = (subject.match(PLACEHOLDER) || body.match(PLACEHOLDER))?.[0] || null;
  const canSend = !!contact?.email && !!subject.trim() && !!body.trim() && !overLimit && !placeholder;

  const handleCopy = async () => {
    if (!body.trim()) return;
    const text = channel === 'email' && subject.trim() ? `Subject: ${subject.trim()}\n\n${body}` : body;
    try {
      await navigator.clipboard.writeText(text);
      success('Copied', 'Draft copied to clipboard.');
    } catch {
      toastError('Copy failed', 'Select the text and copy it manually.');
    }
  };

  const handleOpenLinkedIn = () => {
    if (contact?.linkedinUrl) {
      window.open(contact.linkedinUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenEmailClient = () => {
    if (!contact?.email) return;
    const params = new URLSearchParams();
    if (subject.trim()) params.set('subject', subject.trim());
    if (body.trim()) params.set('body', body);
    window.location.href = `mailto:${contact.email}?${params.toString().replace(/\+/g, '%20')}`;
  };

  const handleSendEmail = async () => {
    if (!contact?.email || !canSend) return;
    setIsSending(true);
    const res = await IntelligenceService.sendEmail(contact.id, {
      to: contact.email,
      subject: subject.trim(),
      body: body.trim(),
      contactName: contact.name,
      intelligenceCompanyId: contact.companyId,
    });
    setIsSending(false);
    if (!res.success) {
      const err: any = res.error;
      toastError('Send Failed', (typeof err === 'string' ? err : err?.message) || 'Could not send the email. Use Copy and send it from your own email client instead.');
      return;
    }
    setSent(true);
    success('Email Sent', `Sent to ${contact.email}.`);
  };

  return (
    <Modal
      isOpen={isOpen && !!contact}
      onClose={onClose}
      title={contact ? `${channel === 'linkedin' ? 'LinkedIn' : 'Email'} draft for ${contact.name}` : ''}
      description={companyName}
      maxWidth="lg"
      footer={
        active && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!body.trim()} leftIcon={<Copy className="w-3.5 h-3.5" />}>
              Copy
            </Button>
            {channel === 'linkedin' ? (
              <Button
                type="button"
                size="sm"
                onClick={handleOpenLinkedIn}
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                disabled={!contact?.linkedinUrl}
              >
                Open LinkedIn Profile
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEmailClient}
                  leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  disabled={!contact?.email}
                >
                  Open in Email Client
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={!canSend || isSending}
                  leftIcon={
                    isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : sent ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isSending ? 'Sending…' : sent ? 'Sent — Send Again' : 'Send Email'}
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {isDrafting ? (
        <div className="py-10 text-center">
          <Loader2 className="w-6 h-6 text-fairway-600 animate-spin mx-auto" />
          <p className="text-xs text-foreground-muted mt-2">Drafting message…</p>
        </div>
      ) : active ? (
        <div className="space-y-3">
          {channel === 'email' && (
            <div className="space-y-1">
              <label htmlFor="outreach-subject" className="text-[11px] font-semibold text-foreground-muted">Subject</label>
              <input
                id="outreach-subject"
                type="text"
                value={subject}
                maxLength={SUBJECT_LIMIT}
                onChange={(e) => setSubject(e.target.value.replace(/[\r\n]+/g, ' '))}
                className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm font-semibold text-foreground h-9 px-3 focus:border-fairway-600 focus:outline-none"
              />
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="outreach-body" className="text-[11px] font-semibold text-foreground-muted">
                {channel === 'email' ? 'Message' : 'Connection note'}
              </label>
              <span className={`text-[11px] ${overLimit ? 'text-rose-600 font-semibold' : 'text-foreground-muted'}`}>
                {body.length} / {channel === 'linkedin' ? LINKEDIN_NOTE_LIMIT : BODY_LIMIT}
              </span>
            </div>
            <textarea
              id="outreach-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={channel === 'email' ? 12 : 5}
              className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-lg text-sm text-foreground px-3 py-2 leading-relaxed focus:border-fairway-600 focus:outline-none resize-y"
            />
            {placeholder && (
              <p className="text-[11px] text-rose-600">
                Replace “{placeholder}” before sending: it would go to {contact?.name || 'them'} exactly as written.
              </p>
            )}
            {channel === 'linkedin' && overLimit && (
              <p className="text-[11px] text-rose-600">LinkedIn only allows {LINKEDIN_NOTE_LIMIT} characters in a connection note. Shorten it before copying.</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-foreground-muted">
              {channel === 'email'
                ? sent
                  ? 'Sent. Log it on the deal with "I followed up" so the 5-day check-in is scheduled.'
                  : 'Edit anything you like, then click Send Email. After it sends, log it on the deal with "I followed up".'
                : 'Edit if you like, copy it, then send it from LinkedIn and log it on the deal with "I followed up".'}
            </p>
            {edited && (
              <button
                type="button"
                onClick={resetToDraft}
                className="shrink-0 text-[11px] font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset to AI draft
              </button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default OutreachDraftModal;
