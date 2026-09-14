import React, { useState, useEffect } from 'react';
import { Call } from '@/modules/core/types';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { TimePicker } from '@/modules/core/components/ui/TimePicker';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { CallService } from '@/modules/core/services/callService';

export interface EditCallModalProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditCallModal: React.FC<EditCallModalProps> = ({
  call,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { users, currentUser } = useAuth();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    subject: '',
    callStatus: 'Scheduled',
    callType: 'Outbound',
    callStartDate: new Date().toISOString().split('T')[0],
    callStartTime: '06:00 PM',
    callDuration: '00:15',
    callOwnerId: '',
    callOwnerName: '',
    callPurpose: 'Prospecting',
    agenda: '',
    callResult: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (call) {
      setFormData({
        subject: call.subject || '',
        callStatus: call.callStatus || 'Scheduled',
        callType: call.callType || 'Outbound',
        callStartDate: call.callStartDate || new Date().toISOString().split('T')[0],
        callStartTime: call.callStartTime || '06:00 PM',
        callDuration: call.callDuration || '00:15',
        callOwnerId: call.callOwnerId || currentUser.id,
        callOwnerName: call.callOwnerName || currentUser.name,
        callPurpose: call.callPurpose || 'Prospecting',
        agenda: call.agenda || '',
        callResult: call.callResult || '',
      });
    }
  }, [call, currentUser]);

  if (!call) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      error('Validation Error', 'Subject is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const owner = users.find((u) => u.id === formData.callOwnerId) || currentUser;
      const res = await CallService.updateCall(call.id, {
        subject: formData.subject.trim(),
        callStatus: formData.callStatus as any,
        callType: formData.callType as any,
        callStartDate: formData.callStartDate,
        callStartTime: formData.callStartTime,
        callDuration: formData.callDuration,
        callOwnerId: formData.callOwnerId,
        callOwnerName: owner.name,
        callPurpose: formData.callPurpose,
        agenda: formData.agenda,
        callResult: formData.callResult,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update call');
      }

      success('Call Updated', 'Call details updated successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not update call');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Call Details"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-call-form"
            variant="primary"
            disabled={isSubmitting}
            className="bg-fairway-600 hover:bg-fairway-700 text-white font-bold text-xs"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <form id="edit-call-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Subject */}
        <div className="space-y-1">
          <label className="font-semibold text-foreground">Subject *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full bg-surface-muted/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-fairway-600 focus:outline-none"
            placeholder="Call subject"
            required
          />
        </div>

        {/* Call Type & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Call Type</label>
            <select
              value={formData.callType}
              onChange={(e) => setFormData({ ...formData, callType: e.target.value as any })}
              className="w-full bg-surface-muted/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-fairway-600 focus:outline-none"
            >
              <option value="Outbound">Outbound</option>
              <option value="Inbound">Inbound</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Status</label>
            <select
              value={formData.callStatus}
              onChange={(e) => setFormData({ ...formData, callStatus: e.target.value as any })}
              className="w-full bg-surface-muted/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-fairway-600 focus:outline-none"
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Call Start Date</label>
            <DatePicker
              value={formData.callStartDate}
              onChange={(val) => setFormData({ ...formData, callStartDate: val })}
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Call Start Time</label>
            <TimePicker
              value={formData.callStartTime}
              onChange={(val) => setFormData({ ...formData, callStartTime: val })}
            />
          </div>
        </div>

        {/* Duration & Owner */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Duration (HH:MM)</label>
            <input
              type="text"
              value={formData.callDuration}
              onChange={(e) => setFormData({ ...formData, callDuration: e.target.value })}
              className="w-full bg-surface-muted/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-fairway-600 focus:outline-none font-mono"
              placeholder="e.g. 00:15"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Call Owner</label>
            <select
              value={formData.callOwnerId}
              onChange={(e) => {
                const u = users.find((usr) => usr.id === e.target.value);
                setFormData({
                  ...formData,
                  callOwnerId: e.target.value,
                  callOwnerName: u ? u.name : formData.callOwnerName,
                });
              }}
              className="w-full bg-surface-muted/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-fairway-600 focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Agenda & Notes */}
        <div className="space-y-1">
          <label className="font-semibold text-foreground">Discussion Notes / Agenda</label>
          <textarea
            rows={3}
            value={formData.agenda}
            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
            className="w-full bg-surface-muted/50 border border-border rounded-xl p-2.5 text-xs text-foreground focus:border-fairway-600 focus:outline-none"
            placeholder="Key discussion points, customer feedback, and next steps..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditCallModal;
