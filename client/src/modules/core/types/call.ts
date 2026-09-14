export type CallType = 'Inbound' | 'Outbound';
export type CallStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Overdue';
export type CallForType = 'Contact' | 'Lead';
export type RelatedToType = 'Account' | 'Deal' | 'Campaign';
export type CallPurpose =
  | 'Prospecting'
  | 'Administrative'
  | 'Negotiation'
  | 'Project Demo'
  | 'Follow-up'
  | 'Cold Outreach'
  | 'Support';

export interface Call {
  id: string;
  callForType: CallForType;
  callForId?: string;
  callForName?: string;
  relatedToType: RelatedToType;
  relatedToId?: string;
  relatedToName?: string;
  callType: CallType;
  callStatus: CallStatus;
  callStartDate: string; // e.g. '2026-08-23'
  callStartTime: string; // e.g. '01:59 PM'
  callDuration: string;  // e.g. '00:15'
  callOwnerId: string;
  callOwnerName: string;
  subject: string;
  callPurpose: string;
  agenda?: string;
  callResult?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallStats {
  total: number;
  scheduled: number;
  completed: number;
  inbound: number;
  outbound: number;
}
