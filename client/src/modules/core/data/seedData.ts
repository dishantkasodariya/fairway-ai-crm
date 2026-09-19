import {
  User,
  Company,
  Facility,
  Contact,
  Inquiry,
  Property,
  Proposal,
  Task,
  Activity,
  Note,
  SiteVisit,
  Notification,
  AuditLog,
  PipelineStageConfig,
} from '@/modules/core/types';

// Live PostgreSQL Integration: No hardcoded or static dummy records
export const INITIAL_USERS: User[] = [];
export const PIPELINE_STAGES: PipelineStageConfig[] = [];
export const INITIAL_PROPERTIES: Property[] = [];
export const INITIAL_COMPANIES: Company[] = [];
export const INITIAL_FACILITIES: Facility[] = [];
export const INITIAL_CONTACTS: Contact[] = [];
export const INITIAL_INQUIRIES: Inquiry[] = [];
export const INITIAL_PROPOSALS: Proposal[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_NOTES: Note[] = [];
export const INITIAL_SITE_VISITS: SiteVisit[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
