import {
  User,
  Company,
  Facility,
  Contact,
  Inquiry,
  Property,
  PropertyMatchResult,
  Proposal,
  ProposalStatus,
  Task,
  Activity,
  Note,
  SiteVisit,
  Notification,
  AuditLog,
  PipelineStageConfig,
  PipelineStageKey,
  ImportResult,
} from '@/modules/core/types';
import {
  INITIAL_USERS,
  INITIAL_COMPANIES,
  INITIAL_FACILITIES,
  INITIAL_CONTACTS,
  INITIAL_INQUIRIES,
  INITIAL_PROPERTIES,
  INITIAL_PROPOSALS,
  INITIAL_TASKS,
  INITIAL_ACTIVITIES,
  INITIAL_NOTES,
  INITIAL_SITE_VISITS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  PIPELINE_STAGES,
} from '@/modules/core/data/seedData';

const STORAGE_KEYS = {
  USERS: 'fw_crm_users',
  CURRENT_USER: 'fw_crm_current_user',
  COMPANIES: 'fw_crm_companies',
  FACILITIES: 'fw_crm_facilities',
  CONTACTS: 'fw_crm_contacts',
  INQUIRIES: 'fw_crm_inquiries',
  PROPERTIES: 'fw_crm_properties',
  PROPOSALS: 'fw_crm_proposals',
  TASKS: 'fw_crm_tasks',
  ACTIVITIES: 'fw_crm_activities',
  NOTES: 'fw_crm_notes',
  SITE_VISITS: 'fw_crm_site_visits',
  NOTIFICATIONS: 'fw_crm_notifications',
  AUDIT_LOGS: 'fw_crm_audit_logs',
  PIPELINE_STAGES: 'fw_crm_pipeline_stages',
  INITIALIZED: 'fw_crm_v1_initialized_state',
};

// Helper: safe JSON get/set
function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Dispatch custom storage event for in-tab reactive syncing
    window.dispatchEvent(new CustomEvent('fw_storage_change', { detail: { key } }));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

function isCleanCompanyName(name?: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.includes('\uFFFD') || trimmed.includes('\u0000')) return false;
  if (/[\x00-\x08\x0E-\x1F]/.test(trimmed)) return false;
  const strangeChars = trimmed.match(/[^\x20-\x7E\u00A0-\u024F\u0900-\u097F]/g);
  if (strangeChars && strangeChars.length > 1) return false;
  return true;
}

export function normalizeCompanyName(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp|inc\.?|corp\.?|corporation|co\.?)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

export class StorageService {
  public static init() {
    // Purge legacy mock data cache once so live backend PostgreSQL records take precedence
    const MOCK_PURGE_KEY = 'fw_crm_live_pg_synced_v3';
    if (!localStorage.getItem(MOCK_PURGE_KEY)) {
      localStorage.removeItem(STORAGE_KEYS.COMPANIES);
      localStorage.removeItem(STORAGE_KEYS.INQUIRIES);
      localStorage.removeItem(STORAGE_KEYS.PROPERTIES);
      localStorage.removeItem(STORAGE_KEYS.FACILITIES);
      localStorage.removeItem(STORAGE_KEYS.CONTACTS);
      localStorage.removeItem(STORAGE_KEYS.PROPOSALS);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
      localStorage.removeItem(STORAGE_KEYS.NOTES);
      localStorage.removeItem(STORAGE_KEYS.SITE_VISITS);
      localStorage.setItem(MOCK_PURGE_KEY, 'true');
    }

    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.resetToDefaults();
    }
  }

  public static resetToDefaults() {
    setStorageItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStorageItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    setStorageItem(STORAGE_KEYS.COMPANIES, []);
    setStorageItem(STORAGE_KEYS.FACILITIES, []);
    setStorageItem(STORAGE_KEYS.CONTACTS, []);
    setStorageItem(STORAGE_KEYS.INQUIRIES, []);
    setStorageItem(STORAGE_KEYS.PROPERTIES, []);
    setStorageItem(STORAGE_KEYS.PROPOSALS, []);
    setStorageItem(STORAGE_KEYS.TASKS, []);
    setStorageItem(STORAGE_KEYS.ACTIVITIES, []);
    setStorageItem(STORAGE_KEYS.NOTES, []);
    setStorageItem(STORAGE_KEYS.SITE_VISITS, []);
    setStorageItem(STORAGE_KEYS.NOTIFICATIONS, []);
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, []);
    setStorageItem(STORAGE_KEYS.PIPELINE_STAGES, PIPELINE_STAGES);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // --- Auth & Users ---
  public static getCurrentUser(): User {
    this.init();
    return getStorageItem<User>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
  }

  public static setCurrentUser(user: User): void {
    setStorageItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  public static getUsers(): User[] {
    this.init();
    return getStorageItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public static saveUsers(users: User[]): void {
    setStorageItem(STORAGE_KEYS.USERS, users);
  }


  public static getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public static updateUserRole(userId: string, newRole: User['role']): void {
    const users = this.getUsers().map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setStorageItem(STORAGE_KEYS.USERS, users);
    this.logAudit({
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      fieldName: 'role',
      newValue: newRole,
      details: `Changed user role to ${newRole}`,
    });
  }

  public static toggleUserStatus(userId: string): void {
    const users = this.getUsers().map((u) =>
      u.id === userId ? { ...u, status: (u.status === 'Active' ? 'Inactive' : 'Active') as 'Active' | 'Inactive' } : u
    );
    setStorageItem(STORAGE_KEYS.USERS, users);
  }

  // --- Companies ---
  public static getCompanies(): Company[] {
    this.init();
    const raw = getStorageItem<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    const valid = raw.filter((c) => isCleanCompanyName(c?.name));

    // Deduplicate companies in memory & storage by normalized name
    const seen = new Map<string, Company>();
    const deduplicated: Company[] = [];
    for (const c of valid) {
      const key = normalizeCompanyName(c.name);
      if (!seen.has(key)) {
        seen.set(key, c);
        deduplicated.push(c);
      } else {
        const existing = seen.get(key)!;
        existing.inquiriesCount = Math.max(existing.inquiriesCount || 0, c.inquiriesCount || 0);
        existing.facilitiesCount = Math.max(existing.facilitiesCount || 0, c.facilitiesCount || 0);
      }
    }

    if (deduplicated.length !== raw.length) {
      setStorageItem(STORAGE_KEYS.COMPANIES, deduplicated);
    }
    return deduplicated;
  }

  public static getCompanyById(id: string): Company | undefined {
    return this.getCompanies().find((c) => c.id === id);
  }

  public static checkCompanyDuplicates(name: string, email?: string, phone?: string): Company[] {
    const cleanName = name.trim().toLowerCase();
    const companies = this.getCompanies();
    return companies.filter((c) => {
      const matchName = c.name.toLowerCase().includes(cleanName) || cleanName.includes(c.name.toLowerCase());
      const matchEmail = email && c.email.toLowerCase() === email.trim().toLowerCase();
      const matchPhone = phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '');
      return matchName || matchEmail || matchPhone;
    });
  }

  public static createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Company {
    const companies = this.getCompanies();
    const newCompany: Company = {
      ...data,
      id: `comp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.COMPANIES, [newCompany, ...companies]);

    this.logAudit({
      action: 'CREATE',
      entityType: 'Company',
      entityId: newCompany.id,
      entityName: newCompany.name,
      details: `Created new company record for ${newCompany.name}`,
    });

    this.createActivity({
      companyId: newCompany.id,
      activityType: 'Note',
      title: 'Company Created',
      description: `Company profile ${newCompany.name} registered in Fairway CRM.`,
    });

    return newCompany;
  }

  public static updateCompany(id: string, updates: Partial<Company>): Company | undefined {
    const companies = this.getCompanies();
    let updatedCompany: Company | undefined;
    const updated = companies.map((c) => {
      if (c.id === id) {
        updatedCompany = { ...c, ...updates, updatedAt: new Date().toISOString() };
        return updatedCompany;
      }
      return c;
    });
    if (updatedCompany) {
      setStorageItem(STORAGE_KEYS.COMPANIES, updated);
      this.logAudit({
        action: 'UPDATE',
        entityType: 'Company',
        entityId: id,
        entityName: updatedCompany.name,
        details: `Updated company details for ${updatedCompany.name}`,
      });
    }
    return updatedCompany;
  }

  public static deleteCompany(id: string): void {
    const companies = this.getCompanies().filter((c) => c.id !== id);
    setStorageItem(STORAGE_KEYS.COMPANIES, companies);
    this.logAudit({
      action: 'DELETE',
      entityType: 'Company',
      entityId: id,
      details: `Archived/Deleted company record`,
    });
  }

  // --- Facilities ---
  public static getFacilities(companyId?: string): Facility[] {
    this.init();
    const facilities = getStorageItem<Facility[]>(STORAGE_KEYS.FACILITIES, INITIAL_FACILITIES);
    return companyId ? facilities.filter((f) => f.companyId === companyId) : facilities;
  }

  public static getFacilityById(id: string): Facility | undefined {
    return this.getFacilities().find((f) => f.id === id);
  }

  public static createFacility(data: Omit<Facility, 'id' | 'createdAt' | 'updatedAt'>): Facility {
    const facilities = this.getFacilities();
    const newFacility: Facility = {
      ...data,
      id: `fac_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.FACILITIES, [newFacility, ...facilities]);

    // Update facilities count on company
    const company = this.getCompanyById(data.companyId);
    if (company) {
      this.updateCompany(company.id, { facilitiesCount: (company.facilitiesCount || 0) + 1 });
    }

    this.createActivity({
      companyId: data.companyId,
      activityType: 'Note',
      title: 'Facility Added',
      description: `Added physical facility: ${newFacility.name} (${newFacility.city}, ${newFacility.state}).`,
    });

    return newFacility;
  }

  public static updateFacility(id: string, updates: Partial<Facility>): Facility | undefined {
    const facilities = this.getFacilities();
    let updatedFacility: Facility | undefined;
    const updated = facilities.map((f) => {
      if (f.id === id) {
        updatedFacility = { ...f, ...updates, updatedAt: new Date().toISOString() };
        return updatedFacility;
      }
      return f;
    });
    if (updatedFacility) {
      setStorageItem(STORAGE_KEYS.FACILITIES, updated);
    }
    return updatedFacility;
  }

  public static deleteFacility(id: string): void {
    const facilities = this.getFacilities().filter((f) => f.id !== id);
    setStorageItem(STORAGE_KEYS.FACILITIES, facilities);
  }

  // --- Contacts ---
  public static getContacts(companyId?: string): Contact[] {
    this.init();
    const contacts = getStorageItem<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
    return companyId ? contacts.filter((c) => c.companyId === companyId) : contacts;
  }

  public static getContactById(id: string): Contact | undefined {
    return this.getContacts().find((c) => c.id === id);
  }

  public static createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
    const contacts = this.getContacts();
    // If marked primary, reset others for same company
    let cleanContacts = contacts;
    if (data.isPrimary) {
      cleanContacts = contacts.map((c) => (c.companyId === data.companyId ? { ...c, isPrimary: false } : c));
    }

    const newContact: Contact = {
      ...data,
      id: `cnt_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.CONTACTS, [newContact, ...cleanContacts]);

    this.createActivity({
      companyId: data.companyId,
      contactId: newContact.id,
      contactName: newContact.name,
      activityType: 'Note',
      title: 'Contact Added',
      description: `Added ${newContact.name} (${newContact.designation}) to company contacts.`,
    });

    return newContact;
  }

  public static updateContact(id: string, updates: Partial<Contact>): Contact | undefined {
    const contacts = this.getContacts();
    let updatedContact: Contact | undefined;
    const target = contacts.find((c) => c.id === id);
    if (!target) return undefined;

    let cleanContacts = contacts;
    if (updates.isPrimary) {
      cleanContacts = contacts.map((c) => (c.companyId === target.companyId ? { ...c, isPrimary: false } : c));
    }

    const updated = cleanContacts.map((c) => {
      if (c.id === id) {
        updatedContact = { ...c, ...updates, updatedAt: new Date().toISOString() };
        return updatedContact;
      }
      return c;
    });
    if (updatedContact) {
      setStorageItem(STORAGE_KEYS.CONTACTS, updated);
    }
    return updatedContact;
  }

  public static deleteContact(id: string): void {
    const contacts = this.getContacts().filter((c) => c.id !== id);
    setStorageItem(STORAGE_KEYS.CONTACTS, contacts);
  }

  // --- Inquiries ---
  public static getInquiries(companyId?: string): Inquiry[] {
    this.init();
    let inquiries = getStorageItem<Inquiry[]>(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    // Ensure newly added seed inquiries are seamlessly merged into existing localStorage sessions
    const existingIds = new Set(inquiries.map((i) => i.inquiryNumber || i.id));
    const missingSeed = INITIAL_INQUIRIES.filter((i) => !existingIds.has(i.inquiryNumber) && !existingIds.has(i.id));
    if (missingSeed.length > 0) {
      inquiries = [...inquiries, ...missingSeed];
      setStorageItem(STORAGE_KEYS.INQUIRIES, inquiries);
    }
    return companyId ? inquiries.filter((i) => i.companyId === companyId) : inquiries;
  }

  public static saveInquiries(inquiries: Inquiry[]): void {
    if (!inquiries || !Array.isArray(inquiries)) return;
    setStorageItem(STORAGE_KEYS.INQUIRIES, inquiries);
  }

  public static upsertInquiry(inquiry: Inquiry): void {
    if (!inquiry || (!inquiry.id && !inquiry.inquiryNumber)) return;
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex(
      (i) =>
        (inquiry.id && i.id === inquiry.id) ||
        (inquiry.inquiryNumber && i.inquiryNumber === inquiry.inquiryNumber)
    );
    if (idx >= 0) {
      inquiries[idx] = { ...inquiries[idx], ...inquiry };
    } else {
      inquiries.unshift(inquiry);
    }
    setStorageItem(STORAGE_KEYS.INQUIRIES, inquiries);
  }

  public static getInquiryById(id: string): Inquiry | undefined {
    if (!id) return undefined;
    const cleanId = id.trim().toLowerCase();
    const inquiries = this.getInquiries();
    return inquiries.find(
      (i) =>
        (i.id && i.id.toLowerCase() === cleanId) ||
        (i.inquiryNumber && i.inquiryNumber.toLowerCase() === cleanId) ||
        i.id === id ||
        i.inquiryNumber === id
    );
  }

  public static createInquiry(data: Omit<Inquiry, 'id' | 'inquiryNumber' | 'createdAt' | 'updatedAt'>): Inquiry {
    const inquiries = this.getInquiries();
    const nextNumber = 1048 + inquiries.length + 1;
    const inquiryNumber = `INQ-${nextNumber}`;
    const newInquiry: Inquiry = {
      ...data,
      id: `inq_${Date.now()}`,
      inquiryNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityDate: new Date().toISOString(),
    };

    setStorageItem(STORAGE_KEYS.INQUIRIES, [newInquiry, ...inquiries]);

    // Update company inquiry count
    const company = this.getCompanyById(data.companyId);
    if (company) {
      this.updateCompany(company.id, {
        inquiriesCount: (company.inquiriesCount || 0) + 1,
        prospectStage: data.stage,
      });
    }

    this.logAudit({
      action: 'CREATE',
      entityType: 'Inquiry',
      entityId: newInquiry.id,
      entityName: `${inquiryNumber} (${data.companyName})`,
      details: `Created new warehouse leasing inquiry for ${data.requiredAreaSqFt.toLocaleString()} sq.ft in ${data.location}`,
    });

    this.createActivity({
      companyId: data.companyId,
      inquiryId: newInquiry.id,
      inquiryNumber,
      activityType: 'Note',
      title: `Inquiry Created (${inquiryNumber})`,
      description: `New inquiry created: ${data.requirement} (${data.requiredAreaSqFt.toLocaleString()} sq.ft, ${data.location}).`,
    });

    // Auto-create initial follow-up task
    if (data.nextFollowUpDate) {
      this.createTask({
        companyId: data.companyId,
        companyName: data.companyName,
        inquiryId: newInquiry.id,
        inquiryNumber,
        assignedUserId: data.salespersonId,
        assignedUserName: data.salespersonName,
        taskType: 'Follow-up',
        description: data.nextAction || `Follow up on initial inquiry ${inquiryNumber}`,
        dueDate: data.nextFollowUpDate,
        priority: data.priority,
        status: 'Pending',
      });
    }

    return newInquiry;
  }

  public static updateInquiry(id: string, updates: Partial<Inquiry>): Inquiry | undefined {
    const inquiries = this.getInquiries();
    let updatedInquiry: Inquiry | undefined;
    const updated = inquiries.map((inq) => {
      if (inq.id === id) {
        updatedInquiry = {
          ...inq,
          ...updates,
          updatedAt: new Date().toISOString(),
          lastActivityDate: new Date().toISOString(),
        };
        return updatedInquiry;
      }
      return inq;
    });
    if (updatedInquiry) {
      setStorageItem(STORAGE_KEYS.INQUIRIES, updated);
      this.logAudit({
        action: 'UPDATE',
        entityType: 'Inquiry',
        entityId: id,
        entityName: updatedInquiry.inquiryNumber,
        details: `Updated inquiry details for ${updatedInquiry.inquiryNumber}`,
      });
    }
    return updatedInquiry;
  }

  public static deleteInquiry(id: string): boolean {
    const inquiries = this.getInquiries();
    const target = inquiries.find((i) => i.id === id || i.inquiryNumber === id);
    if (!target) return false;

    const remaining = inquiries.filter((i) => i.id !== target.id);
    setStorageItem(STORAGE_KEYS.INQUIRIES, remaining);

    this.logAudit({
      action: 'DELETE',
      entityType: 'Inquiry',
      entityId: target.id,
      entityName: target.inquiryNumber,
      details: `Deleted inquiry ${target.inquiryNumber} (${target.companyName})`,
    });

    return true;
  }

  public static changeInquiryStage(id: string, newStage: PipelineStageKey): Inquiry | undefined {
    const inquiry = this.getInquiryById(id);
    if (!inquiry) return undefined;

    const oldStage = inquiry.stage;
    const updated = this.updateInquiry(id, { stage: newStage });

    this.logAudit({
      action: 'STAGE_CHANGE',
      entityType: 'Inquiry',
      entityId: id,
      entityName: inquiry.inquiryNumber,
      fieldName: 'stage',
      oldValue: oldStage,
      newValue: newStage,
      details: `Moved ${inquiry.inquiryNumber} from ${oldStage} to ${newStage}`,
    });

    this.createActivity({
      companyId: inquiry.companyId,
      inquiryId: inquiry.id,
      inquiryNumber: inquiry.inquiryNumber,
      activityType: 'Stage Change',
      title: `Stage Changed: ${newStage.replace(/_/g, ' ').toUpperCase()}`,
      description: `Inquiry ${inquiry.inquiryNumber} progressed from ${oldStage} → ${newStage}`,
    });

    return updated;
  }

  public static markInquiryLost(
    id: string,
    lostData: { lostReason: string; lostComments: string; lostDate: string; closedByUserId: string }
  ): Inquiry | undefined {
    const inquiry = this.getInquiryById(id);
    if (!inquiry) return undefined;

    const updated = this.updateInquiry(id, {
      stage: 'lost',
      status: 'Lost',
      lostReason: lostData.lostReason,
      lostComments: lostData.lostComments,
      lostDate: lostData.lostDate,
      closedByUserId: lostData.closedByUserId,
    });

    this.logAudit({
      action: 'STAGE_CHANGE',
      entityType: 'Inquiry',
      entityId: id,
      entityName: inquiry.inquiryNumber,
      fieldName: 'status',
      oldValue: 'Active',
      newValue: 'Lost',
      details: `Marked opportunity as Lost. Reason: ${lostData.lostReason}. Notes: ${lostData.lostComments}`,
    });

    this.createActivity({
      companyId: inquiry.companyId,
      inquiryId: inquiry.id,
      inquiryNumber: inquiry.inquiryNumber,
      activityType: 'Stage Change',
      title: 'Opportunity Closed as Lost',
      description: `Reason: ${lostData.lostReason}. Comments: ${lostData.lostComments}`,
    });

    return updated;
  }

  public static markInquiryWon(
    id: string,
    wonData: { wonPropertyId: string; wonPropertyName: string; wonFinalValueMonthlyINR: number; wonComments: string; wonDate: string }
  ): Inquiry | undefined {
    const inquiry = this.getInquiryById(id);
    if (!inquiry) return undefined;

    const updated = this.updateInquiry(id, {
      stage: 'won',
      status: 'Won',
      wonPropertyId: wonData.wonPropertyId,
      wonPropertyName: wonData.wonPropertyName,
      wonFinalValueMonthlyINR: wonData.wonFinalValueMonthlyINR,
      wonComments: wonData.wonComments,
      wonDate: wonData.wonDate,
    });

    this.logAudit({
      action: 'STAGE_CHANGE',
      entityType: 'Inquiry',
      entityId: id,
      entityName: inquiry.inquiryNumber,
      fieldName: 'status',
      oldValue: 'Active',
      newValue: 'Won',
      details: `Won opportunity! Property: ${wonData.wonPropertyName}, Monthly Value: ₹${wonData.wonFinalValueMonthlyINR.toLocaleString()}`,
    });

    this.createActivity({
      companyId: inquiry.companyId,
      inquiryId: inquiry.id,
      inquiryNumber: inquiry.inquiryNumber,
      activityType: 'Stage Change',
      title: '🎉 Deal Closed as Won!',
      description: `Lease finalized for ${wonData.wonPropertyName} at ₹${wonData.wonFinalValueMonthlyINR.toLocaleString()}/mo. Notes: ${wonData.wonComments}`,
    });

    return updated;
  }

  public static assignInquiryOwner(id: string, newOwnerId: string, newOwnerName: string): Inquiry | undefined {
    const inquiry = this.getInquiryById(id);
    if (!inquiry) return undefined;

    const oldOwner = inquiry.salespersonName;
    const updated = this.updateInquiry(id, {
      salespersonId: newOwnerId,
      salespersonName: newOwnerName,
    });

    this.logAudit({
      action: 'ASSIGN',
      entityType: 'Inquiry',
      entityId: id,
      entityName: inquiry.inquiryNumber,
      fieldName: 'salesperson',
      oldValue: oldOwner,
      newValue: newOwnerName,
      details: `Reassigned inquiry ${inquiry.inquiryNumber} to ${newOwnerName}`,
    });

    this.createNotification({
      type: 'inquiry_assigned',
      title: 'Inquiry Assigned to You',
      message: `You were assigned inquiry ${inquiry.inquiryNumber} (${inquiry.companyName}).`,
      entityType: 'inquiry',
      entityId: inquiry.id,
    });

    return updated;
  }

  // --- Pipeline Stages Configuration ---
  public static getPipelineStages(): PipelineStageConfig[] {
    this.init();
    return getStorageItem<PipelineStageConfig[]>(STORAGE_KEYS.PIPELINE_STAGES, PIPELINE_STAGES).sort(
      (a, b) => a.order - b.order
    );
  }

  public static updatePipelineStages(stages: PipelineStageConfig[]): void {
    setStorageItem(STORAGE_KEYS.PIPELINE_STAGES, stages);
  }

  // --- Properties & Matching Engine ---
  public static getProperties(): Property[] {
    this.init();
    const stored = getStorageItem<Property[]>(STORAGE_KEYS.PROPERTIES, []);
    // Ensure any previously cached mock dummy properties (prop_1..prop_6) are purged
    const cleaned = stored.filter((p) => p && p.id && !['prop_1', 'prop_2', 'prop_3', 'prop_4', 'prop_5', 'prop_6'].includes(p.id));
    return cleaned;
  }

  public static setProperties(properties: Property[]): void {
    setStorageItem(STORAGE_KEYS.PROPERTIES, properties);
  }

  public static getPropertyById(id: string): Property | undefined {
    return this.getProperties().find((p) => p.id === id || p.code === id);
  }

  public static createProperty(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
    const properties = this.getProperties();
    const newProperty: Property = {
      ...data,
      id: `prop_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.PROPERTIES, [newProperty, ...properties]);
    return newProperty;
  }

  public static updateProperty(id: string, updates: Partial<Property>): Property | undefined {
    const properties = this.getProperties();
    let updatedProp: Property | undefined;
    const updated = properties.map((p) => {
      if (p.id === id) {
        updatedProp = { ...p, ...updates, updatedAt: new Date().toISOString() };
        return updatedProp;
      }
      return p;
    });
    if (updatedProp) {
      setStorageItem(STORAGE_KEYS.PROPERTIES, updated);
    }
    return updatedProp;
  }

  // Rule-based Explainable Matching Engine (as specified in PRD Section 13)
  public static matchPropertiesForInquiry(inquiry?: Inquiry): PropertyMatchResult[] {
    if (!inquiry) return [];
    const properties = this.getProperties();
    const results: PropertyMatchResult[] = [];

    const inqLocation = (inquiry.location || '').trim();
    const inqCorridor = (inquiry.targetCorridor || '').trim();
    const inqIndustry = (inquiry.industry || '').trim().toLowerCase();
    const inqArea = Number(inquiry.requiredAreaSqFt) || 0;
    const inqDocks = Number(inquiry.dockRequirements) || 0;

    for (const prop of properties) {
      if (prop.status === 'Fully Leased') continue;

      let score = 0;
      const details: string[] = [];

      // 1. Location / Corridor Match (Weight: 30%)
      const reqLoc = (inqLocation + ' ' + inqCorridor).toLowerCase();
      const propLoc = ((prop.location || '') + ' ' + (prop.corridor || '') + ' ' + (prop.city || '')).toLowerCase();
      const locationMatch = Boolean(
        (prop.city && reqLoc.includes(prop.city.toLowerCase())) ||
        (inqLocation && propLoc.includes(inqLocation.toLowerCase())) ||
        (inqCorridor && prop.corridor && prop.corridor.toLowerCase().includes(inqCorridor.toLowerCase()))
      );

      if (locationMatch) {
        score += 30;
        details.push(`✓ Location Match: Situated in ${prop.city || 'Gujarat'} (${prop.corridor || 'Industrial Park'})`);
      } else {
        details.push(`✕ Location: Located in ${prop.city || 'Gujarat'}, outside primary target`);
      }

      // 2. Area Compatibility (Weight: 30%)
      // Available area should accommodate requirement (allow +/- 25% tolerance)
      const propAvailArea = Number(prop.availableAreaSqFt) || 0;
      const areaRatio = inqArea > 0 ? propAvailArea / inqArea : 1;
      let areaMatch = false;
      if (inqArea === 0 || propAvailArea >= inqArea) {
        score += 30;
        areaMatch = true;
        details.push(
          `✓ Area Match: ${propAvailArea.toLocaleString()} sq.ft available ${inqArea > 0 ? `(Needs ${inqArea.toLocaleString()} sq.ft)` : ''}`
        );
      } else if (areaRatio >= 0.75) {
        score += 20;
        areaMatch = true;
        details.push(
          `~ Partial Area: ${propAvailArea.toLocaleString()} sq.ft available (${Math.round(areaRatio * 100)}% of requirement)`
        );
      } else {
        details.push(
          `✕ Area Insufficient: ${propAvailArea.toLocaleString()} sq.ft available (<75% of requirement)`
        );
      }

      // 3. Docks Compatibility (Weight: 15%)
      const propDocks = Number(prop.docksCount) || 0;
      const docksMatch = propDocks >= inqDocks;
      if (docksMatch) {
        score += 15;
        details.push(`✓ Docks Match: ${propDocks} docks available (Needs ${inqDocks})`);
      } else {
        const dockScore = Math.max(0, Math.round((propDocks / (inqDocks || 1)) * 15));
        score += dockScore;
        details.push(`~ Docks: ${propDocks} docks available (Requested ${inqDocks})`);
      }

      // 4. Timeline / Availability (Weight: 15%)
      const possessionTarget = new Date(inquiry.possessionDate || '2026-12-31');
      const propAvail = new Date(prop.availabilityDate || '2026-01-01');
      const timelineMatch = propAvail <= possessionTarget;
      if (timelineMatch) {
        score += 15;
        details.push(`✓ Timeline Match: Ready by ${prop.availabilityDate || 'Immediate'} (Requested ${inquiry.possessionDate || '2026'})`);
      } else {
        score += 5;
        details.push(`~ Possession Timeline: Available ${prop.availabilityDate || 'TBD'}`);
      }

      // 5. Industry & Technical Suitability (Weight: 10%)
      const suitableList = Array.isArray(prop.suitableIndustries) ? prop.suitableIndustries : [];
      const industryMatch = suitableList.some((ind) => {
        if (!ind) return false;
        const indStr = String(ind).toLowerCase();
        return !inqIndustry || indStr.includes(inqIndustry) || inqIndustry.includes(indStr);
      });

      if (industryMatch) {
        score += 10;
        details.push(`✓ Industry Fit: Certified for ${inquiry.industry || 'Industrial Warehousing'}`);
      } else {
        score += 5;
        details.push(`~ Multi-purpose Grade A specification`);
      }

      const isShared = inquiry.matchedPropertyIds?.includes(prop.id);

      results.push({
        property: prop,
        overallScore: Math.min(100, score),
        matchBreakdown: {
          locationMatch,
          areaMatch,
          docksMatch,
          timelineMatch,
          industryMatch,
          details,
        },
        isShared,
      });
    }

    return results.sort((a, b) => b.overallScore - a.overallScore);
  }

  // --- Tasks & Follow-ups ---
  public static getTasks(companyId?: string): Task[] {
    this.init();
    const tasks = getStorageItem<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    return companyId ? tasks.filter((t) => t.companyId === companyId) : tasks;
  }

  public static setTasks(tasks: Task[]): void {
    setStorageItem(STORAGE_KEYS.TASKS, tasks);
  }

  public static getTaskById(id: string): Task | undefined {
    return this.getTasks().find((t) => t.id === id);
  }

  public static createTask(data: Omit<Task, 'id' | 'createdAt'>): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      ...data,
      id: `tsk_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.TASKS, [newTask, ...tasks]);

    if (data.companyId) {
      this.createActivity({
        companyId: data.companyId,
        inquiryId: data.inquiryId,
        inquiryNumber: data.inquiryNumber,
        activityType: 'Follow-up',
        title: `Task Scheduled: ${data.taskType}`,
        description: `${data.description} (Due: ${data.dueDate}${data.dueTime ? ' ' + data.dueTime : ''})`,
      });
    }

    return newTask;
  }

  public static updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const tasks = this.getTasks();
    let updatedTask: Task | undefined;
    const updated = tasks.map((t) => {
      if (t.id === id) {
        updatedTask = { ...t, ...updates };
        return updatedTask;
      }
      return t;
    });
    if (updatedTask) {
      setStorageItem(STORAGE_KEYS.TASKS, updated);
    }
    return updatedTask;
  }

  public static toggleTaskCompletion(id: string, notes?: string): Task | undefined {
    const task = this.getTaskById(id);
    if (!task) return undefined;

    const newStatus: Task['status'] = task.status === 'Completed' ? 'Pending' : 'Completed';
    const completedAt = newStatus === 'Completed' ? new Date().toISOString() : undefined;

    const updated = this.updateTask(id, {
      status: newStatus,
      completedAt,
      completedNotes: notes || task.completedNotes,
    });

    if (updated && newStatus === 'Completed' && task.companyId) {
      this.createActivity({
        companyId: task.companyId,
        inquiryId: task.inquiryId,
        inquiryNumber: task.inquiryNumber,
        activityType: 'Follow-up',
        title: `Task Completed: ${task.taskType}`,
        description: `Completed: ${task.description}${notes ? ` — Notes: ${notes}` : ''}`,
      });
    }

    return updated;
  }

  public static deleteTask(id: string): void {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    setStorageItem(STORAGE_KEYS.TASKS, tasks);
  }

  // --- Activities ---
  public static getActivities(companyId?: string): Activity[] {
    this.init();
    const activities = getStorageItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    const sorted = [...activities].sort(
      (a, b) => new Date(b.activityDate || b.createdAt).getTime() - new Date(a.activityDate || a.createdAt).getTime()
    );
    return companyId ? sorted.filter((a) => a.companyId === companyId) : sorted;
  }

  public static createActivity(
    data: Omit<Activity, 'id' | 'userId' | 'userName' | 'activityDate' | 'createdAt'> & {
      userId?: string;
      userName?: string;
      activityDate?: string;
    }
  ): Activity {
    const activities = this.getActivities();
    const currentUser = this.getCurrentUser();
    const newActivity: Activity = {
      ...data,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: data.userId || currentUser.id,
      userName: data.userName || currentUser.name,
      activityDate: data.activityDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.ACTIVITIES, [newActivity, ...activities]);
    return newActivity;
  }

  // --- Notes ---
  public static getNotes(companyId: string): Note[] {
    this.init();
    const notes = getStorageItem<Note[]>(STORAGE_KEYS.NOTES, INITIAL_NOTES);
    return notes
      .filter((n) => n.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static createNote(companyId: string, text: string, inquiryId?: string): Note {
    const notes = getStorageItem<Note[]>(STORAGE_KEYS.NOTES, INITIAL_NOTES);
    const currentUser = this.getCurrentUser();
    const newNote: Note = {
      id: `not_${Date.now()}`,
      companyId,
      inquiryId,
      text,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.NOTES, [newNote, ...notes]);

    // Increment notes count on company
    const company = this.getCompanyById(companyId);
    if (company) {
      this.updateCompany(company.id, { notesCount: (company.notesCount || 0) + 1 });
    }

    this.createActivity({
      companyId,
      inquiryId,
      activityType: 'Note',
      title: 'Internal Note Added',
      description: text,
    });

    return newNote;
  }

  public static deleteNote(id: string): void {
    const notes = getStorageItem<Note[]>(STORAGE_KEYS.NOTES, INITIAL_NOTES).filter((n) => n.id !== id);
    setStorageItem(STORAGE_KEYS.NOTES, notes);
  }

  // --- Proposals ---
  public static getProposals(companyId?: string): Proposal[] {
    this.init();
    const proposals = getStorageItem<Proposal[]>(STORAGE_KEYS.PROPOSALS, INITIAL_PROPOSALS);
    return companyId ? proposals.filter((p) => p.companyId === companyId) : proposals;
  }

  public static getProposalById(id: string): Proposal | undefined {
    return this.getProposals().find((p) => p.id === id || p.proposalNumber === id);
  }

  public static createProposal(data: Omit<Proposal, 'id' | 'proposalNumber' | 'createdAt' | 'updatedAt'>): Proposal {
    const proposals = this.getProposals();
    const proposalNumber = `PR-${1043 + proposals.length + 1}`;
    const newProposal: Proposal = {
      ...data,
      id: `prop_doc_${Date.now()}`,
      proposalNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.PROPOSALS, [newProposal, ...proposals]);

    this.logAudit({
      action: 'CREATE',
      entityType: 'Proposal',
      entityId: newProposal.id,
      entityName: `${proposalNumber} (${data.companyName})`,
      details: `Generated proposal for ${data.proposedAreaSqFt.toLocaleString()} sq.ft at ${data.propertyName}`,
    });

    this.createActivity({
      companyId: data.companyId,
      inquiryId: data.inquiryId,
      inquiryNumber: data.inquiryNumber,
      activityType: 'Proposal',
      title: `Proposal Drafted (${proposalNumber})`,
      description: `Drafted proposal for ${data.propertyName}: ${data.proposedAreaSqFt.toLocaleString()} sq.ft @ ₹${data.baseRentPerSqFtINR}/sq.ft/mo.`,
    });

    return newProposal;
  }

  public static updateProposalStatus(id: string, newStatus: ProposalStatus): Proposal | undefined {
    const proposals = this.getProposals();
    let updatedProposal: Proposal | undefined;
    const updated = proposals.map((p) => {
      if (p.id === id) {
        updatedProposal = { ...p, status: newStatus, updatedAt: new Date().toISOString() };
        return updatedProposal;
      }
      return p;
    });
    if (updatedProposal) {
      setStorageItem(STORAGE_KEYS.PROPOSALS, updated);
      this.createActivity({
        companyId: updatedProposal.companyId,
        inquiryId: updatedProposal.inquiryId,
        activityType: 'Proposal',
        title: `Proposal Status: ${newStatus}`,
        description: `Proposal ${updatedProposal.proposalNumber} status changed to ${newStatus}.`,
      });
    }
    return updatedProposal;
  }

  // --- Site Visits ---
  public static getSiteVisits(companyId?: string): SiteVisit[] {
    this.init();
    const visits = getStorageItem<SiteVisit[]>(STORAGE_KEYS.SITE_VISITS, INITIAL_SITE_VISITS);
    return companyId ? visits.filter((v) => v.companyId === companyId) : visits;
  }

  public static createSiteVisit(data: Omit<SiteVisit, 'id' | 'createdAt'>): SiteVisit {
    const visits = this.getSiteVisits();
    const newVisit: SiteVisit = {
      ...data,
      id: `sv_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.SITE_VISITS, [newVisit, ...visits]);

    this.createActivity({
      companyId: data.companyId,
      inquiryId: data.inquiryId,
      inquiryNumber: data.inquiryNumber,
      activityType: 'Site Visit',
      title: `Site Visit Scheduled (${data.propertyName})`,
      description: `Site visit arranged for ${data.visitDate} at ${data.visitTime} at ${data.propertyName}.`,
    });

    return newVisit;
  }

  public static updateSiteVisit(id: string, updates: Partial<SiteVisit>): SiteVisit | undefined {
    const visits = this.getSiteVisits();
    let updatedVisit: SiteVisit | undefined;
    const updated = visits.map((v) => {
      if (v.id === id) {
        updatedVisit = { ...v, ...updates };
        return updatedVisit;
      }
      return v;
    });
    if (updatedVisit) {
      setStorageItem(STORAGE_KEYS.SITE_VISITS, updated);
    }
    return updatedVisit;
  }

  // --- Notifications ---
  public static getNotifications(): Notification[] {
    this.init();
    return getStorageItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  public static markNotificationRead(id: string): void {
    const notifs = this.getNotifications().map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setStorageItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  public static markAllNotificationsRead(): void {
    const notifs = this.getNotifications().map((n) => ({ ...n, isRead: true }));
    setStorageItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  public static createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification {
    const notifs = this.getNotifications();
    const newNotif: Notification = {
      ...data,
      id: `notif_${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifs]);
    return newNotif;
  }

  // --- Audit Logs ---
  public static getAuditLogs(): AuditLog[] {
    this.init();
    return getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  public static logAudit(data: Omit<AuditLog, 'id' | 'userId' | 'userName' | 'userRole' | 'timestamp'>): AuditLog {
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const newLog: AuditLog = {
      ...data,
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin' : 'Sales',
      timestamp: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs]);
    return newLog;
  }

  // --- Excel / CSV Import Parser ---
  public static importFromParsedData(
    rows: any[],
    mapping: Record<string, string>
  ): ImportResult {
    let importedCount = 0;
    let skippedCount = 0;
    const errors: ImportResult['errors'] = [];
    const importedCompanies: string[] = [];
    const importedInquiries: string[] = [];
    const currentUser = this.getCurrentUser();

    const getVal = (row: any, ...keys: (string | undefined)[]) => {
      for (const k of keys) {
        if (k && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      return '';
    };

    const batchCompanies = new Map<string, Company>();
    const batchSeenInquiries = new Set<string>();

    rows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      const rawCompanyName = getVal(rawRow, mapping.companyName, mapping.company, 'Company', 'Company Name');
      const companyName = rawCompanyName.trim();
      const industry = getVal(rawRow, mapping.industry, 'Industry') || 'General Industrial';
      const city = getVal(rawRow, mapping.siteName, mapping.city, 'Site Name', 'City', 'Location') || 'Dahej';
      const comments = getVal(rawRow, mapping.comments, mapping.requirement, 'Comments', 'Requirement Description') || 'Warehouse requirement';
      const areaStr = getVal(rawRow, mapping.requiredAreaSqFt, mapping.areaRequired, 'Area Required (sq. ft.)', 'Required Area').replace(/,/g, '').trim();
      const area = parseInt(areaStr, 10);
      const contactName = getVal(rawRow, mapping.contactName, mapping.contactPerson, 'Contact Person', 'Contact');
      const phone = getVal(rawRow, mapping.phone, mapping.contactNumber, 'Contact Number', 'Phone');
      const email = getVal(rawRow, mapping.email, 'Email');
      const enteredBy = getVal(rawRow, mapping.enteredBy, mapping.salespersonName, 'Entered By', 'Salesperson') || currentUser.name;
      const remark1Status = getVal(rawRow, mapping.remark1CurrentStatus, mapping.currentStatus, 'Remark 1 – Current Status');
      const remark2NextAction = getVal(rawRow, mapping.remark2NextAction, mapping.nextAction, 'Remark 2 – Next Action') || 'Initial discovery review';
      const remark3FollowUp = getVal(rawRow, mapping.remark3FollowUpPlan, mapping.followUpPlan, 'Remark 3 – Follow-up Plan');

      if (!companyName) {
        skippedCount++;
        errors.push({ row: rowNum, field: 'Company Name', error: 'Required field is missing', data: rawRow });
        return;
      }

      if (isNaN(area) || area <= 0) {
        skippedCount++;
        errors.push({ row: rowNum, field: 'Required Area', error: 'Area must be a valid positive number', data: rawRow });
        return;
      }

      const normComp = normalizeCompanyName(companyName) || companyName.toLowerCase().replace(/[^a-z0-9]/gi, '');

      // Check within-batch duplicate inquiry
      const inqKey = `${normComp}::${area}::${city.toLowerCase().trim()}::${comments.toLowerCase().trim()}`;
      if (batchSeenInquiries.has(inqKey)) {
        skippedCount++;
        errors.push({
          row: rowNum,
          field: 'Duplicate Entry',
          error: `Duplicate row in file for ${companyName} (${city}, ${area} sq.ft) - skipped.`,
          data: rawRow,
        });
        return;
      }

      // Check if company already exists (using normalized matching against name and legalName)
      let company = this.getCompanies().find((c) => {
        return normalizeCompanyName(c.name) === normComp || (c.legalName && normalizeCompanyName(c.legalName) === normComp);
      });

      if (!company && batchCompanies.has(normComp)) {
        company = batchCompanies.get(normComp);
      }

      if (!company) {
        company = this.createCompany({
          name: companyName,
          legalName: `${companyName} Ltd`,
          website: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.example.com`,
          industry,
          status: 'Active',
          address: `${city} Industrial Zone`,
          city,
          state: 'Gujarat',
          pincode: '392130',
          phone: phone || '+91 98000 00000',
          email: email || `info@${companyName.toLowerCase().replace(/\s+/g, '')}.example.com`,
          assignedOwnerId: currentUser.id,
          assignedOwnerName: enteredBy,
          prospectStage: 'New',
          priority: 'Medium',
          facilitiesCount: 1,
          inquiriesCount: 1,
        });
        importedCompanies.push(company.name);
        batchCompanies.set(normComp, company);

        // Add contact if present
        if (contactName) {
          this.createContact({
            companyId: company.id,
            companyName: company.name,
            name: contactName,
            designation: 'Supply Chain Manager',
            department: 'Logistics',
            phone: phone || '+91 98000 00000',
            email: email || `contact@${companyName.toLowerCase().replace(/\s+/g, '')}.example.com`,
            isPrimary: true,
          });
        }

        // Add default facility
        this.createFacility({
          companyId: company.id,
          companyName: company.name,
          name: `${companyName} ${city} Unit`,
          type: 'Warehouse',
          address: `${city} Industrial GIDC`,
          city,
          state: 'Gujarat',
          pincode: '392130',
          latitude: 21.71,
          longitude: 72.58,
          status: 'Active',
          builtUpAreaSqFt: area,
        });
      }

      // Check if this inquiry already exists in CRM (cross-file / previous imports deduplication)
      const existingInquiries = this.getInquiries();
      const duplicateInquiry = existingInquiries.find((inq) => {
        const sameComp = inq.companyId === company!.id || normalizeCompanyName(inq.companyName) === normComp;
        if (!sameComp) return false;
        const sameAreaAndLoc = inq.requiredAreaSqFt === area && (inq.location.toLowerCase().trim() === city.toLowerCase().trim() || !city);
        const samePhoneAndArea = Boolean(phone && inq.contactPhone && inq.contactPhone.replace(/\D/g, '') === phone.replace(/\D/g, '') && inq.requiredAreaSqFt === area);
        const sameRequirement = Boolean(comments && inq.requirement && inq.requirement.toLowerCase().trim() === comments.toLowerCase().trim());
        return sameAreaAndLoc || samePhoneAndArea || sameRequirement;
      });

      if (duplicateInquiry) {
        batchSeenInquiries.add(inqKey);
        skippedCount++;
        errors.push({
          row: rowNum,
          field: 'Duplicate Entry',
          error: `Duplicate inquiry: already exists in CRM (${duplicateInquiry.inquiryNumber}) for ${company.name} - skipped.`,
          data: rawRow,
        });
        return;
      }

      batchSeenInquiries.add(inqKey);

      // Create Inquiry
      const inquiry = this.createInquiry({
        companyId: company.id,
        companyName: company.name,
        contactName: contactName || 'Plant Operations Incharge',
        contactPhone: phone || company.phone,
        contactEmail: email || company.email,
        source: 'Direct',
        inquiryDate: new Date().toISOString().split('T')[0],
        salespersonId: currentUser.id,
        salespersonName: enteredBy,
        requirement: comments,
        requiredAreaSqFt: area,
        location: city,
        targetCorridor: `${city} Corridor`,
        industry,
        possessionDate: '2026-11-01',
        leaseDurationMonths: 60,
        budgetMonthlyINR: area * 22,
        dockRequirements: Math.max(2, Math.round(area / 10000)),
        fireSystemsRequired: true,
        priority: area >= 50000 ? 'High' : 'Medium',
        leadScore: 80,
        opportunityScore: 85,
        stage: 'requirement_confirmed',
        status: 'Active',
        nextAction: remark2NextAction,
        nextFollowUpDate: remark3FollowUp || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });

      importedInquiries.push(inquiry.inquiryNumber);
      importedCount++;
    });

    this.logAudit({
      action: 'IMPORT',
      entityType: 'Inquiry',
      entityId: `batch_${Date.now()}`,
      details: `Imported ${importedCount} records successfully (${skippedCount} skipped due to validation errors).`,
    });

    return {
      totalRows: rows.length,
      importedCount,
      skippedCount,
      errors,
      importedCompanies,
      importedInquiries,
    };
  }
}
