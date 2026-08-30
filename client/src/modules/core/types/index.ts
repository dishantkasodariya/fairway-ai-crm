export type UserRole = 'super_admin' | 'admin' | 'sales' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  assignedLeadsCount: number;
  lastActive: string;
  avatar?: string;
  phone?: string;
  department?: string;
  timezone?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  twoFactorEnabled?: boolean;
  birthDate?: string;
}



export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type CompanyStatus = 'Active' | 'Prospect' | 'Inactive' | 'Archived';

export interface Company {
  id: string;
  name: string;
  legalName: string;
  website: string;
  industry: string;
  status: CompanyStatus;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  assignedOwnerId: string;
  assignedOwnerName: string;
  prospectStage: string;
  priority: PriorityLevel;
  annualTurnover?: string;
  employeeCount?: string;
  gujaratPresence?: boolean;
  notesCount?: number;
  facilitiesCount?: number;
  inquiriesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type FacilityType =
  | 'Manufacturing Plant'
  | 'Warehouse'
  | 'Distribution Center'
  | 'R&D Center'
  | 'Corporate Office';

export type FacilityStatus = 'Active' | 'Under Construction' | 'Planned' | 'Inactive';

export interface Facility {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  type: FacilityType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  status: FacilityStatus;
  contactInfo?: string;
  builtUpAreaSqFt?: number;
  corridor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  linkedinUrl?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PipelineStageKey =
  | 'new'
  | 'contacted'
  | 'requirement_confirmed'
  | 'property_matched'
  | 'property_shared'
  | 'proposal'
  | 'site_visit'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface PipelineStageConfig {
  id: string;
  key: PipelineStageKey;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
  order: number;
  isSystem: boolean;
}

export type InquirySource =
  | 'Direct'
  | 'Broker'
  | 'Website'
  | 'LinkedIn'
  | 'Expo'
  | 'Referral'
  | 'Government Tender'
  | 'Inbound Call';

export type InquiryStatus = 'Active' | 'Won' | 'Lost' | 'Archived';

export interface Inquiry {
  id: string;
  inquiryNumber: string; // e.g. "INQ-1048"
  companyId: string;
  companyName: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsapp?: string;
  linkedin?: string;
  source: InquirySource;
  inquiryDate: string;
  salespersonId: string;
  salespersonName: string;
  requirement: string;
  requiredAreaSqFt: number;
  location: string;
  targetCorridor: string;
  industry: string;
  possessionDate: string;
  leaseDurationMonths: number;
  budgetMonthlyINR: number;
  dockRequirements: number;
  clearHeightFt?: number;
  floorLoadCapacity?: string;
  powerKVA?: number;
  fireSystemsRequired: boolean;
  specialRequirements?: string;
  brokerName?: string;
  brokerCommission?: string;
  priority: PriorityLevel;
  leadScore: number;
  opportunityScore: number;
  stage: PipelineStageKey;
  status: InquiryStatus;
  nextAction?: string;
  nextFollowUpDate?: string;
  // Lost fields
  lostReason?: string;
  lostDate?: string;
  lostComments?: string;
  closedByUserId?: string;
  // Won fields
  wonDate?: string;
  wonFinalValueMonthlyINR?: number;
  wonPropertyId?: string;
  wonPropertyName?: string;
  wonComments?: string;
  // Metadata
  matchedPropertyIds?: string[];
  lastActivityDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskType = 'Call' | 'Meeting' | 'Email' | 'Follow-up' | 'Site Visit' | 'Other';
export type TaskStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface Task {
  id: string;
  companyId?: string;
  companyName?: string;
  inquiryId?: string;
  inquiryNumber?: string;
  facilityId?: string;
  assignedUserId: string;
  assignedUserName: string;
  taskType: TaskType;
  description: string;
  dueDate: string;
  dueTime?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  completedAt?: string;
  completedNotes?: string;
  createdAt: string;
}

export type ActivityType =
  | 'Call'
  | 'Meeting'
  | 'Note'
  | 'Email'
  | 'Follow-up'
  | 'Stage Change'
  | 'Site Visit'
  | 'Proposal'
  | 'System';

export interface Activity {
  id: string;
  companyId: string;
  companyName?: string;
  inquiryId?: string;
  inquiryNumber?: string;
  contactId?: string;
  contactName?: string;
  userId: string;
  userName: string;
  activityType: ActivityType;
  title: string;
  description: string;
  activityDate: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Note {
  id: string;
  companyId: string;
  inquiryId?: string;
  text: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyStatus =
  | 'Available'
  | 'Partially Leased'
  | 'Fully Leased'
  | 'Under Development';

export interface Property {
  id: string;
  code: string;
  name: string;
  location: string;
  corridor: string;
  city: string;
  state: string;
  pincode: string;
  totalAreaSqFt: number;
  availableAreaSqFt: number;
  rentPerSqFtINR: number;
  depositMonths: number;
  leaseTermsYears: number;
  availabilityDate: string;
  clearHeightFt: number;
  docksCount: number;
  fireSystems: string;
  powerKVA: number;
  parkingSlots: number;
  truckAccess: string;
  flooringCapacityMT: number;
  cctvSecurity: boolean;
  greenBuildingCert: string;
  latitude: number;
  longitude: number;
  photos: string[];
  brochureUrl?: string;
  status: PropertyStatus;
  amenities: string[];
  suitableIndustries: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyMatchResult {
  property: Property;
  overallScore: number;
  matchBreakdown: {
    locationMatch: boolean;
    areaMatch: boolean;
    docksMatch: boolean;
    timelineMatch: boolean;
    industryMatch: boolean;
    details: string[];
  };
  isShared?: boolean;
}

export type ProposalStatus =
  | 'Draft'
  | 'Sent'
  | 'Viewed'
  | 'Negotiation'
  | 'Accepted'
  | 'Rejected'
  | 'Expired';

export interface Proposal {
  id: string;
  proposalNumber: string; // e.g. "PR-1043"
  inquiryId: string;
  inquiryNumber: string;
  companyId: string;
  companyName: string;
  contactId?: string;
  contactName?: string;
  propertyId: string;
  propertyName: string;
  proposedAreaSqFt: number;
  baseRentPerSqFtINR: number;
  maintenancePerSqFtINR: number;
  totalMonthlyRentINR: number;
  securityDepositMonths: number;
  totalDepositINR: number;
  leaseTenureYears: number;
  lockInMonths: number;
  escalationPercentPerYear: number;
  possessionDate: string;
  commercialTerms: string;
  proposalDate: string;
  expiryDate: string;
  status: ProposalStatus;
  documentName: string;
  documentSize: string;
  notes?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
}

export type SiteVisitOutcome = 'Positive' | 'Neutral' | 'Needs Changes' | 'Rejected';
export type SiteVisitStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';

export interface SiteVisit {
  id: string;
  inquiryId: string;
  inquiryNumber: string;
  companyId: string;
  companyName: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  propertyId: string;
  propertyName: string;
  propertyLocation: string;
  visitDate: string;
  visitTime: string;
  assignedSalespersonId: string;
  assignedSalespersonName: string;
  status: SiteVisitStatus;
  notes?: string;
  clientFeedback?: string;
  outcome?: SiteVisitOutcome;
  followUpTaskId?: string;
  createdAt: string;
}

export type NotificationType =
  | 'inquiry_assigned'
  | 'followup_due'
  | 'followup_overdue'
  | 'task_assigned'
  | 'stage_changed'
  | 'proposal_updated'
  | 'site_visit_upcoming'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: 'inquiry' | 'company' | 'task' | 'proposal' | 'property' | 'user';
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STAGE_CHANGE' | 'ASSIGN' | 'IMPORT' | 'EXPORT';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
  timestamp: string;
}

export interface ImportResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: { row: number; field: string; error: string; data: any }[];
  importedCompanies: string[];
  importedInquiries: string[];
}
