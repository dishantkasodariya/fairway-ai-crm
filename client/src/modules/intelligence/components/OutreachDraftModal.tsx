import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { useToast } from '@/modules/core/providers/ToastContext';
import { IntelligenceService, DraftMessage } from '@/modules/core/services/intelligenceService';

export type OutreachChannel = 'linkedin' | 'email';

export interface OutreachDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: { id: number; companyId: number; name: string; email: string | null; linkedinUrl: string | null } | null;
  companyName: string;
  channel: OutreachChannel;
}

/**
 * Drafts a LinkedIn note or email for a key person from the company's opportunity signals.
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

  const handleCopy = async () => {
    if (!active) return;
    const text = channel === 'email' && active.subject ? `Subject: ${active.subject}\n\n${active.body}` : active.body;
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
    const subject = active?.subject ? `?subject=${encodeURIComponent(active.subject)}` : '';
    window.location.href = `mailto:${contact.email}${subject}`;
  };

  const handleSendEmail = async () => {
    if (!contact?.email || !active?.subject) return;
    setIsSending(true);
    const res = await IntelligenceService.sendEmail(contact.id, {
      to: contact.email,
      subject: active.subject,
      body: active.body,
      contactName: contact.name,
      intelligenceCompanyId: contact.companyId,
    });
    setIsSending(false);
    if (!res.success) {
      toastError('Send Failed', res.error || 'Could not send the email. Use Copy and send it from your own email client instead.');
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
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} leftIcon={<Copy className="w-3.5 h-3.5" />}>
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
                  disabled={!contact?.email || isSending}
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
        <div className="space-y-2">
          {channel === 'email' && active.subject && <p className="text-sm font-semibold text-foreground">Subject: {active.subject}</p>}
          <p className="text-sm text-foreground whitespace-pre-wrap">{active.body}</p>
          <p className="text-[11px] text-foreground-muted pt-2">
            {channel === 'email'
              ? sent
                ? 'Sent. Log it on the deal with "I followed up" so the 5-day check-in is scheduled.'
                : 'Review the draft above, then click Send Email. After it sends, log it on the deal with "I followed up" so the 5-day check-in is scheduled.'
              : 'After you send it, log it on the deal with "I followed up" so the 5-day check-in is scheduled.'}
          </p>
        </div>
      ) : null}
    </Modal>
  );
};

export default OutreachDraftModal;
