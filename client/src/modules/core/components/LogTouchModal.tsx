import React, { useEffect, useState } from 'react';
import { Phone, Mail, Link2, MessageCircle, Users, MessageSquareReply } from 'lucide-react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { InquiryService, TouchChannel, TouchOutcome, TouchResult } from '@/modules/core/services/inquiryService';
import { cn } from '@/modules/core/lib/utils';

const CHANNELS: { value: TouchChannel; label: string; icon: React.ReactNode }[] = [
  { value: 'Call', label: 'Call', icon: <Phone className="w-3.5 h-3.5" /> },
  { value: 'Email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
  { value: 'LinkedIn', label: 'LinkedIn', icon: <Link2 className="w-3.5 h-3.5" /> },
  { value: 'WhatsApp', label: 'WhatsApp', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { value: 'Meeting', label: 'Meeting', icon: <Users className="w-3.5 h-3.5" /> },
];

const OUTCOMES: { value: TouchOutcome; label: string; hint: string }[] = [
  { value: 'reached_out', label: 'Reached out', hint: "Sent a message / left a note. We'll ask for the update in 5 days." },
  { value: 'no_reply', label: 'No reply yet', hint: 'Try again in 5 days. After 3 unanswered follow-ups the lead is parked for 90 days.' },
  { value: 'interested', label: 'Interested', hint: 'Next: confirm area, timeline and budget within 3 days.' },
  { value: 'not_now', label: 'Not now', hint: 'Parked; we remind you in 90 days.' },
  { value: 'not_interested', label: 'Not interested', hint: 'Record why in the Lost form next.' },
];

export interface LogTouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: string;
  companyName: string;
  onLogged: (result: TouchResult) => void;
  /** The person said no — the caller should open its Lost-reason flow. */
  onSuggestLost?: () => void;
}

export const LogTouchModal: React.FC<LogTouchModalProps> = ({ isOpen, onClose, inquiryId, companyName, onLogged, onSuggestLost }) => {
  const [channel, setChannel] = useState<TouchChannel>('Call');
  const [outcome, setOutcome] = useState<TouchOutcome>('reached_out');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setChannel('Call');
    setOutcome('reached_out');
    setNote('');
    setError('');
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const res = await InquiryService.logTouch(inquiryId, { channel, outcome, note: note.trim() || undefined });
      if (!res.success || !res.data) {
        setError(typeof res.error === 'string' ? res.error : 'Could not save the follow-up.');
        return;
      }
      onLogged(res.data);
      onClose();
      if (res.data.suggestLost) onSuggestLost?.();
    } finally {
      setIsSaving(false);
    }
  };

  const selectedOutcome = OUTCOMES.find((o) => o.value === outcome)!;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <span className="flex items-center gap-2">
          <MessageSquareReply className="w-4 h-4 text-fairway-600" />
          I followed up
        </span>
      }
      description={companyName}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" onClick={handleSave} isLoading={isSaving}>Save follow-up</Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-foreground mb-1.5">How did you reach them?</legend>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={channel === c.value}
                onClick={() => setChannel(c.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
                  channel === c.value
                    ? 'border-fairway-600 bg-fairway-600/10 text-fairway-700 dark:text-fairway-300'
                    : 'border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted'
                )}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-foreground mb-1.5">What happened?</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={outcome === o.value}
                onClick={() => setOutcome(o.value)}
                className={cn(
                  'px-3 h-9 rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer',
                  outcome === o.value
                    ? o.value === 'not_interested'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      : 'border-fairway-600 bg-fairway-600/10 text-fairway-700 dark:text-fairway-300'
                    : 'border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-foreground-muted">{selectedOutcome.hint}</p>
        </fieldset>

        <div className="space-y-1">
          <label htmlFor="touch-note" className="text-xs font-semibold text-foreground">Note</label>
          <textarea
            id="touch-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Spoke to the supply-chain head; they're comparing two parks, call back after their board meeting."
            className="w-full bg-surface-muted/60 dark:bg-[#18202b] border border-border rounded-xl text-sm text-foreground px-3 py-2 focus:border-fairway-600 focus:outline-none"
          />
        </div>
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      </div>
    </Modal>
  );
};

export default LogTouchModal;
