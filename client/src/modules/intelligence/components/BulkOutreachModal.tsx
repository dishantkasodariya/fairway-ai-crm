import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Clock, Send, AlertCircle, CheckCircle2, ChevronDown, Layers } from 'lucide-react';
import { Modal, ModalFooter } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { useToast } from '@/modules/core/providers/ToastContext';
import { OutreachService, OutreachCampaign, LeadPayload } from '@/modules/core/services/outreachService';

export interface BulkOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: Array<{
    id: number | string;
    companyId?: number | string;
    name: string;
    email: string | null;
    companyName: string;
  }>;
  onEnrolled?: () => void;
}

export const BulkOutreachModal: React.FC<BulkOutreachModalProps> = ({
  isOpen,
  onClose,
  selectedContacts,
  onEnrolled,
}) => {
  const { error: toastError, success: toastSuccess } = useToast();

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // New sequence form
  const [name, setName] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('Industrial space requirement for {{company}}');
  const [bodyTemplate, setBodyTemplate] = useState(
    `Hi {{firstName}},\n\nI noticed {{company}} has active operations in the region. We currently have Grade-A industrial and warehousing space available with 12m clear height and round-the-clock security.\n\nWould you be open to a quick 5-minute call this week to explore if this fits your supply chain roadmap?\n\nBest regards,\nFairway Team`
  );

  // Follow-up 1
  const [enableFollowUp1, setEnableFollowUp1] = useState(true);
  const [followUpDelayDays, setFollowUpDelayDays] = useState(7);
  const [followUpSubject, setFollowUpSubject] = useState('');
  const [followUpBody, setFollowUpBody] = useState(
    `Hi {{firstName}},\n\nJust bumping this to the top of your inbox in case you missed my earlier email regarding warehousing options for {{company}}.\n\nLet me know if you would like me to share our latest site layout and spec sheet.\n\nBest regards.`
  );

  // Follow-up 2
  const [enableFollowUp2, setEnableFollowUp2] = useState(false);
  const [followUp2DelayDays, setFollowUp2DelayDays] = useState(4);
  const [followUp2Subject, setFollowUp2Subject] = useState('');
  const [followUp2Body, setFollowUp2Body] = useState(
    `Hi {{firstName}},\n\nCircling back one final time regarding warehouse space for {{company}}. If your current logistics facilities are already locked in, no worries at all!\n\nFeel free to keep my details handy for future requirement cycles.`
  );

  const [sendFirstBatchNow, setSendFirstBatchNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter contacts with valid emails
  const validContacts = selectedContacts.filter((c) => c.email && c.email.includes('@'));
  const missingEmailCount = selectedContacts.length - validContacts.length;

  useEffect(() => {
    if (!isOpen) return;
    setLoadingCampaigns(true);
    OutreachService.listCampaigns().then((res) => {
      setLoadingCampaigns(false);
      if (res.success && res.data) {
        setCampaigns(res.data);
        if (res.data.length > 0) {
          setSelectedCampaignId(res.data[0].id);
        }
      }
    });

    // Default sequence name
    const compName = selectedContacts[0]?.companyName || 'Industrial';
    setName(`${compName} Outreach Sequence - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
  }, [isOpen, selectedContacts]);

  const handleSubmit = async () => {
    if (validContacts.length === 0) {
      toastError('No valid contacts', 'None of the selected contacts have an email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      let targetCampaignId = selectedCampaignId;

      if (mode === 'new') {
        if (!name.trim()) {
          toastError('Sequence Name Required', 'Please enter a name for this outreach campaign.');
          setIsSubmitting(false);
          return;
        }
        if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
          toastError('Template Required', 'Initial email subject and body are required.');
          setIsSubmitting(false);
          return;
        }

        const createRes = await OutreachService.createCampaign({
          name: name.trim(),
          subjectTemplate: subjectTemplate.trim(),
          bodyTemplate: bodyTemplate.trim(),
          followUpDelayDays: enableFollowUp1 ? followUpDelayDays : undefined,
          followUpSubjectTemplate: enableFollowUp1 && followUpSubject.trim() ? followUpSubject.trim() : undefined,
          followUpBodyTemplate: enableFollowUp1 && followUpBody.trim() ? followUpBody.trim() : undefined,
          followUp2DelayDays: enableFollowUp2 ? followUp2DelayDays : undefined,
          followUp2SubjectTemplate: enableFollowUp2 && followUp2Subject.trim() ? followUp2Subject.trim() : undefined,
          followUp2BodyTemplate: enableFollowUp2 && followUp2Body.trim() ? followUp2Body.trim() : undefined,
        });

        if (!createRes.success || !createRes.data) {
          toastError('Failed to create campaign', createRes.error || 'Server error creating sequence.');
          setIsSubmitting(false);
          return;
        }
        targetCampaignId = createRes.data.id;
      }

      // Convert contacts to leads
      const leads: LeadPayload[] = validContacts.map((c) => ({
        contactId: c.id,
        companyId: c.companyId,
        email: c.email!,
        name: c.name,
        companyName: c.companyName,
      }));

      const enrollRes = await OutreachService.enrollContacts(targetCampaignId, leads);
      if (!enrollRes.success) {
        toastError('Failed to enroll contacts', enrollRes.error || 'Could not enroll contacts.');
        setIsSubmitting(false);
        return;
      }

      // Trigger first run if requested
      if (sendFirstBatchNow) {
        OutreachService.runBatchNow(targetCampaignId).then((batchRes) => {
          if (batchRes.success && batchRes.data) {
            console.info('[outreach] Batch execution started:', batchRes.data);
          }
        });
      }

      toastSuccess(
        'Campaign Started',
        `Successfully enrolled ${enrollRes.data?.enrolledCount || leads.length} contacts into sequence.`
      );
      onEnrolled?.();
      onClose();
    } catch (err: any) {
      toastError('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fairway-600" />
          <span>Automated Bulk Outreach Sequence</span>
        </div>
      }
      description="Enroll contacts into an automated drip campaign with intelligent follow-up sequencing."
    >
      <div className="space-y-5 text-xs text-foreground">
        {/* Recipient summary banner */}
        <div className="p-3 bg-surface-muted border border-border rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-fairway-600" />
            <span>
              <strong>{validContacts.length}</strong> contacts ready to enroll
              {missingEmailCount > 0 && (
                <span className="text-amber-600 font-medium ml-1">
                  ({missingEmailCount} skipped due to missing email)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
            <Clock className="w-3.5 h-3.5 text-fairway-600" />
            <span>Safe Drip Engine: ~30-50/day</span>
          </div>
        </div>

        {/* Campaign Mode Switcher */}
        {campaigns.length > 0 && (
          <div className="flex rounded-lg border border-border p-0.5 bg-surface-muted max-w-xs">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'new' ? 'bg-surface text-foreground shadow-xs' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              New Sequence
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'existing' ? 'bg-surface text-foreground shadow-xs' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Add to Existing
            </button>
          </div>
        )}

        {mode === 'existing' && campaigns.length > 0 ? (
          <div className="space-y-3">
            <label className="block font-semibold text-foreground">Select Campaign</label>
            <div className="space-y-2">
              {campaigns.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCampaignId === c.id ? 'border-fairway-600 bg-fairway-50/20' : 'border-border hover:bg-surface-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="campaign"
                      checked={selectedCampaignId === c.id}
                      onChange={() => setSelectedCampaignId(c.id)}
                      className="text-fairway-600 focus:ring-fairway-600"
                    />
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-[11px] text-foreground-muted line-clamp-1">Subj: {c.subjectTemplate}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-foreground-muted">
                    {c.stats?.total || 0} enrolled · {c.stats?.replied || 0} replied
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          /* New Sequence Form */
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-foreground mb-1">Sequence Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q4 Logistics Decision Makers"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-fairway-600"
              />
            </div>

            {/* Step 1 Card */}
            <div className="border border-border rounded-lg p-3.5 space-y-3 bg-surface">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-fairway-100 text-fairway-800 flex items-center justify-center font-bold text-[10px]">
                    1
                  </span>
                  <span className="font-bold text-foreground">Step 1: Initial Pitch</span>
                </div>
                <span className="text-[11px] text-foreground-muted">Day 1</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground-muted mb-1">Subject</label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  placeholder="Subject line... support tags like {{company}}"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs focus:outline-none focus:border-fairway-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                  Email Body (supports {'{{firstName}}'}, {'{{name}}'}, {'{{company}}'})
                </label>
                <textarea
                  rows={5}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs focus:outline-none focus:border-fairway-600 font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Step 2 Card (Follow-up 1) */}
            <div className="border border-border rounded-lg p-3.5 space-y-3 bg-surface">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                  <span className="font-bold text-foreground">Step 2: Automated Follow-Up (If No Reply)</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFollowUp1}
                    onChange={(e) => setEnableFollowUp1(e.target.checked)}
                    className="rounded text-fairway-600 focus:ring-fairway-600"
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {enableFollowUp1 && (
                <>
                  <div className="flex items-center gap-2 text-foreground-muted text-[11px]">
                    <span>Wait</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={followUpDelayDays}
                      onChange={(e) => setFollowUpDelayDays(parseInt(e.target.value, 10) || 7)}
                      className="w-14 px-2 py-1 bg-surface border border-border rounded text-center text-xs font-semibold text-foreground focus:outline-none focus:border-fairway-600"
                    />
                    <span>days after Step 1. If prospect hasn't replied, send automatically:</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Subject (Leave blank to thread as Re: previous email)
                    </label>
                    <input
                      type="text"
                      value={followUpSubject}
                      onChange={(e) => setFollowUpSubject(e.target.value)}
                      placeholder="e.g. Re: {{company}} warehouse discussion (or leave empty)"
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs focus:outline-none focus:border-fairway-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">Follow-up Message</label>
                    <textarea
                      rows={4}
                      value={followUpBody}
                      onChange={(e) => setFollowUpBody(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs focus:outline-none focus:border-fairway-600 font-mono leading-relaxed"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Step 3 Card (Optional Follow-up 2) */}
            <div className="border border-border rounded-lg p-3.5 space-y-3 bg-surface">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">
                    3
                  </span>
                  <span className="font-bold text-foreground">Step 3: Final Break-up / Check-in</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFollowUp2}
                    onChange={(e) => setEnableFollowUp2(e.target.checked)}
                    className="rounded text-fairway-600 focus:ring-fairway-600"
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {enableFollowUp2 && (
                <>
                  <div className="flex items-center gap-2 text-foreground-muted text-[11px]">
                    <span>Wait</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={followUp2DelayDays}
                      onChange={(e) => setFollowUp2DelayDays(parseInt(e.target.value, 10) || 4)}
                      className="w-14 px-2 py-1 bg-surface border border-border rounded text-center text-xs font-semibold text-foreground focus:outline-none focus:border-fairway-600"
                    />
                    <span>days after Step 2 if still no reply:</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">Final Follow-up Message</label>
                    <textarea
                      rows={3}
                      value={followUp2Body}
                      onChange={(e) => setFollowUp2Body(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs focus:outline-none focus:border-fairway-600 font-mono leading-relaxed"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Immediate send checkbox */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={sendFirstBatchNow}
              onChange={(e) => setSendFirstBatchNow(e.target.checked)}
              className="rounded text-fairway-600 focus:ring-fairway-600"
            />
            <span className="font-semibold text-foreground">
              Trigger first batch dispatch immediately
            </span>
            <span className="text-foreground-muted">
              (subsequent steps will trigger on schedule via the cron job)
            </span>
          </label>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || validContacts.length === 0}
          className="gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {isSubmitting ? 'Starting Sequence…' : `Start Sequence (${validContacts.length} Contacts)`}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default BulkOutreachModal;
