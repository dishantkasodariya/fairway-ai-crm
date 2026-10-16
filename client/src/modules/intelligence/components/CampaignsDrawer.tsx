import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  RotateCw,
  CheckCircle2,
  Mail,
  Clock,
  MessageSquare,
  AlertCircle,
  X,
  ChevronRight,
  ArrowLeft,
  UserCheck,
  Ban,
  Trash2,
  Send,
} from 'lucide-react';
import { Modal, ModalFooter } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { useToast } from '@/modules/core/providers/ToastContext';
import {
  OutreachService,
  OutreachCampaign,
  OutreachEnrollment,
} from '@/modules/core/services/outreachService';

export interface CampaignsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignsDrawer: React.FC<CampaignsDrawerProps> = ({ isOpen, onClose }) => {
  const { error: toastError, success: toastSuccess } = useToast();

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<OutreachCampaign | null>(null);
  const [enrollments, setEnrollments] = useState<OutreachEnrollment[]>([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);
  const [isRunningBatch, setIsRunningBatch] = useState(false);

  const loadCampaigns = async () => {
    setIsLoading(true);
    const res = await OutreachService.listCampaigns();
    setIsLoading(false);
    if (res.success && res.data) {
      setCampaigns(res.data);
    } else {
      toastError('Failed to load campaigns', res.error || 'Server error loading campaigns');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
      setSelectedCampaign(null);
    }
  }, [isOpen]);

  const openCampaignDetails = async (c: OutreachCampaign) => {
    setSelectedCampaign(c);
    setIsLoadingEnrollments(true);
    const res = await OutreachService.getCampaign(c.id);
    setIsLoadingEnrollments(false);
    if (res.success && res.data) {
      setEnrollments(res.data.enrollments);
    }
  };

  const handleRunBatchNow = async (campaignId?: string) => {
    setIsRunningBatch(true);
    try {
      const res = await OutreachService.runBatchNow(campaignId);
      if (res.success && res.data) {
        toastSuccess(
          'Batch Run Finished',
          `Processed ${res.data.processed} leads. Sent: ${res.data.sent}, Completed: ${res.data.completed}${
            res.data.dailyLimitReached ? ' (Daily limit reached)' : ''
          }`
        );
        loadCampaigns();
        if (selectedCampaign) {
          openCampaignDetails(selectedCampaign);
        }
      } else {
        toastError('Batch Run Notice', res.error || 'Could not run batch');
      }
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsRunningBatch(false);
    }
  };

  const handleMarkReplied = async (enrollmentId: string) => {
    const res = await OutreachService.markReplied(enrollmentId);
    if (res.success) {
      toastSuccess('Updated', 'Contact marked as replied. Future follow-ups halted.');
      if (selectedCampaign) openCampaignDetails(selectedCampaign);
      loadCampaigns();
    } else {
      toastError('Failed', res.error || 'Could not update status');
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    const res = await OutreachService.deleteEnrollment(enrollmentId);
    if (res.success) {
      toastSuccess('Removed', 'Lead removed from sequence.');
      if (selectedCampaign) openCampaignDetails(selectedCampaign);
      loadCampaigns();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'replied':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Replied 💬</span>;
      case 'sent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Awaiting Reply ⏳</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Queued 📥</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Completed ✓</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Failed ⚠️</span>;
      case 'unsubscribed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">Unsubscribed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-fairway-600" />
            <span>Outreach Sequences & Campaigns</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRunBatchNow(selectedCampaign?.id)}
            disabled={isRunningBatch}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 text-fairway-600 ${isRunningBatch ? 'animate-spin' : ''}`} />
            {isRunningBatch ? 'Processing…' : 'Run Due Sequences Now'}
          </Button>
        </div>
      }
      description="Automated multi-step cold reachouts. Sequences automatically halt whenever a prospect replies."
    >
      <div className="space-y-4">
        {selectedCampaign ? (
          /* View Details for Selected Campaign */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedCampaign(null)}
              className="text-xs font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to all campaigns
            </button>

            <div className="p-3.5 bg-surface border border-border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">{selectedCampaign.name}</h3>
                <span className="text-[11px] text-foreground-muted">
                  Follow-up interval: {selectedCampaign.followUpDelayDays || 7} days
                </span>
              </div>
              <div className="text-[11px] text-foreground-muted bg-surface-muted p-2 rounded border border-border">
                <strong>Initial Subject:</strong> {selectedCampaign.subjectTemplate}
              </div>
            </div>

            {/* Enrollments Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-surface">
              <div className="p-3 bg-surface-muted border-b border-border font-semibold text-xs text-foreground flex items-center justify-between">
                <span>Enrolled Leads ({enrollments.length})</span>
                <span className="text-[11px] text-foreground-muted font-normal">
                  Cron checks and sends due steps automatically
                </span>
              </div>

              {isLoadingEnrollments ? (
                <div className="py-10 text-center text-xs text-foreground-muted">Loading leads…</div>
              ) : enrollments.length === 0 ? (
                <div className="py-10 text-center text-xs text-foreground-muted">No contacts enrolled yet.</div>
              ) : (
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted/50 border-b border-border text-[11px] text-foreground-muted">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Lead</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Step</th>
                        <th className="py-2 px-3 font-semibold">Last Sent</th>
                        <th className="py-2 px-3 font-semibold">Next Scheduled</th>
                        <th className="py-2 px-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enrollments.map((e) => (
                        <tr key={e.id} className="hover:bg-surface-muted/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground">{e.recipientName || '—'}</div>
                            <div className="text-[11px] text-foreground-muted">{e.recipientEmail}</div>
                            {e.companyName && (
                              <div className="text-[10px] text-fairway-700">{e.companyName}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">{getStatusBadge(e.status)}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-foreground">Step {e.currentStep}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-foreground-muted">
                            {e.lastSentAt ? new Date(e.lastSentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Not yet'}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-foreground-muted">
                            {e.status === 'replied' || e.status === 'completed'
                              ? '—'
                              : e.nextSendAt
                              ? new Date(e.nextSendAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                              : 'Pending'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {e.status !== 'replied' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkReplied(e.id)}
                                  title="Mark as Replied (halts future follow-ups)"
                                  className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                                >
                                  Mark Replied
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteEnrollment(e.id)}
                                title="Remove lead"
                                className="p-1 text-foreground-muted hover:text-rose-600 rounded cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List of Campaigns */
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-foreground-muted">Loading campaigns…</div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-xs text-foreground-muted">
                No outreach sequences created yet. Select contacts in AI Connections and click "Bulk Outreach" to begin!
              </div>
            ) : (
              <div className="space-y-2.5">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => openCampaignDetails(c)}
                    className="p-3.5 bg-surface border border-border hover:border-fairway-600/50 rounded-lg cursor-pointer transition-all hover:shadow-xs flex items-center justify-between"
                  >
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">{c.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-fairway-50 text-fairway-700 font-semibold border border-fairway-200">
                          Active
                        </span>
                      </div>
                      <div className="text-[11px] text-foreground-muted truncate">
                        Subj: {c.subjectTemplate}
                      </div>
                      {/* Metric pills */}
                      <div className="flex items-center gap-2 pt-1 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-surface-muted text-foreground-muted">
                          <strong>{c.stats?.total || 0}</strong> Enrolled
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                          <strong>{c.stats?.pending || 0}</strong> Queued
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                          <strong>{c.stats?.sent || 0}</strong> Awaiting Reply
                        </span>
                        <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-semibold">
                          <strong>{c.stats?.replied || 0}</strong> Replied!
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                          <strong>{c.stats?.completed || 0}</strong> Completed
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-foreground-muted">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CampaignsDrawer;
