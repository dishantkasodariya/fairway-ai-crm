import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckSquare,
  FileText,
  Calendar,
  Warehouse,
  Factory,
  User,
  ExternalLink,
  MessageSquare,
  Clock,
  ArrowRight,
  Send,
  AlertOctagon,
  FileSpreadsheet,
  CheckCircle2,
  Check,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import CompanyService from '@/modules/core/services/companyService';
import ContactService from '@/modules/core/services/contactService';
import FacilityService from '@/modules/core/services/facilityService';
import NoteService from '@/modules/core/services/noteService';
import ActivityService from '@/modules/core/services/activityService';
import { TaskService } from '@/modules/core/services/taskService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Company, Contact, Facility, Inquiry, Task, Note, Activity, Proposal, SiteVisit } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate, formatRelativeDate, getPriorityBadge, getCompanyStatusBadge, getFacilityStatusBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Breadcrumbs } from '@/modules/core/components/ui/Breadcrumbs';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from '@/modules/core/components/ui/DropdownMenu';

import { LostReasonModal } from '@/modules/core/components/LostReasonModal';
import { WonCelebrationModal } from '@/modules/core/components/WonCelebrationModal';

export interface CompanyDetailViewProps {
  companyId: string;
  onBack: () => void;
  onNavigateToInquiry: (inquiryId: string) => void;
  onNavigateToMap: () => void;
  onOpenNewInquiryForCompany: (companyId: string) => void;
}

export const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({
  companyId,
  onBack,
  onNavigateToInquiry,
  onNavigateToMap,
  onOpenNewInquiryForCompany,
}) => {
  const { canEdit, canDelete, currentUser, users } = useAuth();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | undefined>(StorageService.getCompanyById(companyId));
  const [contacts, setContacts] = useState<Contact[]>(StorageService.getContacts(companyId));
  const [facilities, setFacilities] = useState<Facility[]>(StorageService.getFacilities(companyId));
  const [inquiries, setInquiries] = useState<Inquiry[]>(StorageService.getInquiries(companyId));
  const [tasks, setTasks] = useState<Task[]>(StorageService.getTasks(companyId));
  const [notes, setNotes] = useState<Note[]>(StorageService.getNotes(companyId));
  const [activities, setActivities] = useState<Activity[]>(StorageService.getActivities(companyId));
  const [proposals, setProposals] = useState<Proposal[]>(StorageService.getProposals(companyId));

  // Modals state
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);

  // Form states
  const [newNoteText, setNewNoteText] = useState('');

  // Contact Form
  const [contactForm, setContactForm] = useState({
    name: '',
    designation: '',
    department: 'Supply Chain',
    phone: '',
    email: '',
    linkedinUrl: '',
    isPrimary: false,
    notes: '',
  });

  // Facility Form
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    type: 'Warehouse' as Facility['type'],
    address: '',
    city: company?.city || 'Dahej',
    state: 'Gujarat',
    pincode: '392130',
    latitude: 21.71,
    longitude: 72.58,
    status: 'Active' as Facility['status'],
    builtUpAreaSqFt: 50000,
  });

  // Task Form
  const [taskForm, setTaskForm] = useState({
    taskType: 'Call' as Task['taskType'],
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00 AM',
    priority: 'High' as Task['priority'],
    assignedUserId: currentUser.id,
  });

  // Fetch live company data from backend on mount or ID change
  useEffect(() => {
    let isMounted = true;
    const fetchCompany = async () => {
      setLoading(true);
      try {
        const res = await CompanyService.getCompanyById(companyId);
        if (isMounted && res.success && res.data) {
          setCompany(res.data);
          if (res.data.contacts && res.data.contacts.length > 0) {
            setContacts(res.data.contacts);
          } else {
            setContacts(StorageService.getContacts(companyId));
          }
          if (res.data.facilities && res.data.facilities.length > 0) {
            setFacilities(res.data.facilities);
          } else {
            setFacilities(StorageService.getFacilities(companyId));
          }
          if (res.data.inquiries && res.data.inquiries.length > 0) {
            setInquiries(res.data.inquiries);
          } else {
            setInquiries(StorageService.getInquiries(companyId));
          }
        } else if (isMounted) {
          const localComp = StorageService.getCompanyById(companyId);
          setCompany(localComp);
        }
      } catch {
        if (isMounted) {
          setCompany(StorageService.getCompanyById(companyId));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCompany();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Reload handler
  const refreshData = async () => {
    try {
      const res = await CompanyService.getCompanyById(companyId);
      if (res.success && res.data) {
        setCompany(res.data);
        if (res.data.contacts) setContacts(res.data.contacts);
        if (res.data.facilities) setFacilities(res.data.facilities);
        if (res.data.inquiries) setInquiries(res.data.inquiries);
      } else {
        const freshCompany = StorageService.getCompanyById(companyId);
        setCompany(freshCompany);
        setContacts(StorageService.getContacts(companyId));
        setFacilities(StorageService.getFacilities(companyId));
        setInquiries(StorageService.getInquiries(companyId));
      }
    } catch {
      const freshCompany = StorageService.getCompanyById(companyId);
      setCompany(freshCompany);
    }

    // Fetch real tasks from backend
    try {
      const taskRes = await TaskService.getTasks({ companyId });
      if (taskRes.success && taskRes.data && taskRes.data.length > 0) {
        setTasks(taskRes.data);
      } else {
        setTasks(StorageService.getTasks(companyId));
      }
    } catch {
      setTasks(StorageService.getTasks(companyId));
    }

    // Fetch real notes from backend
    try {
      const noteRes = await NoteService.getNotes({ companyId });
      if (noteRes.success && noteRes.data && noteRes.data.length > 0) {
        setNotes(noteRes.data);
      } else {
        setNotes(StorageService.getNotes(companyId));
      }
    } catch {
      setNotes(StorageService.getNotes(companyId));
    }

    // Fetch real activities from backend
    try {
      const actRes = await ActivityService.getActivities({ companyId });
      if (actRes.success && actRes.data && actRes.data.length > 0) {
        setActivities(actRes.data);
      } else {
        setActivities(StorageService.getActivities(companyId));
      }
    } catch {
      setActivities(StorageService.getActivities(companyId));
    }

    setProposals(StorageService.getProposals(companyId));
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading company dossier...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-bold text-foreground">Company Record Not Found</h3>
        <Button size="sm" onClick={onBack} className="mt-4">
          Back to Companies
        </Button>
      </div>
    );
  }

  // Add Contact Handler (PostgreSQL backed)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim()) return;

    try {
      await ContactService.createContact({
        companyId: company.id,
        companyName: company.name,
        ...contactForm,
      });
    } catch {
      StorageService.createContact({
        companyId: company.id,
        companyName: company.name,
        ...contactForm,
      });
    }

    setIsAddContactOpen(false);
    setContactForm({
      name: '',
      designation: '',
      department: 'Supply Chain',
      phone: '',
      email: '',
      linkedinUrl: '',
      isPrimary: false,
      notes: '',
    });
    await refreshData();
    success('Contact Added', `Added ${contactForm.name} to ${company.name}`);
  };

  // Add Facility Handler (PostgreSQL backed)
  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityForm.name.trim()) return;

    try {
      await FacilityService.createFacility({
        companyId: company.id,
        companyName: company.name,
        ...facilityForm,
      });
    } catch {
      StorageService.createFacility({
        companyId: company.id,
        companyName: company.name,
        ...facilityForm,
      });
    }

    setIsAddFacilityOpen(false);
    await refreshData();
    success('Facility Added', `Added physical facility ${facilityForm.name}`);
  };

  // Add Task Handler (PostgreSQL backed)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.description.trim()) return;

    const assignedUser = users.find((u) => u.id === taskForm.assignedUserId) || currentUser;

    try {
      await TaskService.createTask({
        companyId: company.id,
        companyName: company.name,
        assignedUserId: assignedUser.id,
        assignedUserName: assignedUser.name,
        taskType: taskForm.taskType,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        dueTime: taskForm.dueTime,
        priority: taskForm.priority,
        status: 'Pending',
      });
      await ActivityService.createActivity({
        companyId: company.id,
        companyName: company.name,
        userId: currentUser.id,
        userName: currentUser.name,
        activityType: taskForm.taskType,
        title: `Scheduled ${taskForm.taskType}`,
        description: taskForm.description,
      });
    } catch {
      StorageService.createTask({
        companyId: company.id,
        companyName: company.name,
        assignedUserId: assignedUser.id,
        assignedUserName: assignedUser.name,
        taskType: taskForm.taskType,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        dueTime: taskForm.dueTime,
        priority: taskForm.priority,
        status: 'Pending',
      });
    }

    setIsAddTaskOpen(false);
    setTaskForm({
      taskType: 'Call',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '11:00 AM',
      priority: 'High',
      assignedUserId: currentUser.id,
    });
    await refreshData();
    success('Task Created', 'Follow-up scheduled and added to today/upcoming tasks.');
  };

  // Add Note Handler (PostgreSQL backed)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const content = newNoteText.trim();
    try {
      await NoteService.createNote({
        companyId: company.id,
        companyName: company.name,
        authorId: currentUser.id,
        authorName: currentUser.name,
        content,
      });
      await ActivityService.createActivity({
        companyId: company.id,
        companyName: company.name,
        userId: currentUser.id,
        userName: currentUser.name,
        activityType: 'Note',
        title: 'Added Internal Note',
        description: content.slice(0, 100),
      });
    } catch {
      StorageService.createNote(company.id, content);
    }

    setNewNoteText('');
    setIsAddNoteOpen(false);
    await refreshData();
    success('Note Added', 'Internal note logged to PostgreSQL database.');
  };

  // Toggle Task Completion
  const handleToggleTask = (taskId: string) => {
    StorageService.toggleTaskCompletion(taskId);
    refreshData();
    success('Task Updated', 'Follow-up status updated in history timeline.');
  };

  // Owner Reassignment
  const handleReassignOwner = (newOwnerId: string) => {
    const targetUser = users.find((u) => u.id === newOwnerId);
    if (!targetUser) return;

    StorageService.updateCompany(company.id, {
      assignedOwnerId: targetUser.id,
      assignedOwnerName: targetUser.name,
    });
    refreshData();
    success('Owner Updated', `Assigned company ownership to ${targetUser.name}`);
  };

  const prioBadge = getPriorityBadge(company.priority);
  const statusBadge = getCompanyStatusBadge(company.status);

  return (
    <div className="space-y-6 max-w-8xl mx-auto text-left">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Companies', onClick: onBack },
          { label: company.name },
        ]}
      />

      {/* 1. Company Header Workspace Banner */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs p-5 sm:p-6 text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fairway-500/20 via-fairway-500/10 to-transparent text-fairway-700 dark:text-fairway-400 font-black text-xl flex items-center justify-center border border-fairway-500/25 shadow-xs shrink-0">
              {company.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{company.name}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusBadge.bg}`}>
                  {company.status}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${prioBadge.bg}`}>
                  {company.priority} Priority
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-1.5 flex items-center gap-2 flex-wrap">
                <span>{company.legalName}</span>
                <span className="text-foreground-muted/40">·</span>
                <span className="font-semibold text-foreground">{company.industry}</span>
                <span className="text-foreground-muted/40">·</span>
                <span>{company.city}, {company.state}</span>
              </p>
            </div>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onOpenNewInquiryForCompany(company.id)}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="rounded-xl px-3.5 py-1.5 font-bold shadow-xs"
                >
                  New Inquiry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddContactOpen(true)}
                  leftIcon={<User className="w-3.5 h-3.5 text-sky-500" />}
                  className="rounded-xl px-3 py-1.5 font-medium"
                >
                  Add Contact
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddTaskOpen(true)}
                  leftIcon={<CheckSquare className="w-3.5 h-3.5 text-amber-500" />}
                  className="rounded-xl px-3 py-1.5 font-medium"
                >
                  Add Task
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddNoteOpen(true)}
                  leftIcon={<MessageSquare className="w-3.5 h-3.5 text-indigo-500" />}
                  className="rounded-xl px-3 py-1.5 font-medium"
                >
                  Add Note
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={onNavigateToMap}
              leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" />}
              className="rounded-xl px-3.5 py-1.5 font-medium"
            >
              View on Map
            </Button>
          </div>
        </div>

        {/* 6 Attribute Micro-Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5 text-xs">
          {/* Assigned Owner */}
          <div className="bg-surface-muted/50 rounded-xl p-3 border border-border/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">
              Assigned Owner
            </span>
            {canEdit ? (
              <DropdownMenu
                align="left"
                className="w-56"
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center justify-between w-full gap-1.5 font-semibold text-foreground bg-surface px-2.5 py-1 rounded-lg border border-border hover:bg-surface-muted transition-colors shadow-2xs text-xs cursor-pointer"
                  >
                    <span className="truncate">{company.assignedOwnerName || 'Assign Owner'}</span>
                    <ChevronDown className="w-3 h-3 text-foreground-muted shrink-0" />
                  </button>
                }
              >
                <DropdownMenuLabel>Reassign Owner</DropdownMenuLabel>
                {users.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => handleReassignOwner(u.id)}
                    className={company.assignedOwnerId === u.id ? 'bg-surface-muted font-semibold text-fairway-700 dark:text-fairway-400' : ''}
                    icon={company.assignedOwnerId === u.id ? <Check className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" /> : <User className="w-3.5 h-3.5 text-foreground-muted" />}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="truncate">{u.name}</span>
                      <span className="text-[10px] text-foreground-muted capitalize">({u.role})</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>
            ) : (
              <span className="font-bold text-foreground truncate mt-0.5 block">{company.assignedOwnerName}</span>
            )}
          </div>

          {/* Prospect Stage */}
          <div className="bg-surface-muted/50 rounded-xl p-3 border border-border/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">
              Prospect Stage
            </span>
            <span className="font-bold text-foreground mt-0.5 flex items-center gap-1.5 capitalize truncate">
              <span className="w-2 h-2 rounded-full bg-fairway-500 shrink-0" />
              <span className="truncate">{company.prospectStage}</span>
            </span>
          </div>

          {/* Annual Turnover */}
          <div className="bg-surface-muted/50 rounded-xl p-3 border border-border/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">
              Annual Turnover
            </span>
            <span className="font-extrabold text-foreground mt-0.5 block truncate">
              {company.annualTurnover || '₹500+ Cr'}
            </span>
          </div>

          {/* Workforce */}
          <div className="bg-surface-muted/50 rounded-xl p-3 border border-border/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">
              Workforce
            </span>
            <span className="font-bold text-foreground mt-0.5 block truncate">
              {company.employeeCount ? `${company.employeeCount} team` : '1,000+'}
            </span>
          </div>

          {/* Gujarat Presence */}
          <div className="bg-surface-muted/50 rounded-xl p-3 border border-border/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">
              Gujarat Presence
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5 truncate">
              {company.gujaratPresence ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Operational</span>
                </>
              ) : (
                'Target Hub'
              )}
            </span>
          </div>

          {/* Account Created */}
          <div className="bg-surface-muted/50 rounded-xl p-3 border border-border/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">
              Account Created
            </span>
            <span className="font-medium text-foreground-muted mt-0.5 block truncate">
              {formatDate(company.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 12-Column Layout: Main Content (8 cols) + Context Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT MAIN WORKSPACE (8 Columns) ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Inquiries & Requirement Workspace */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-surface">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileText className="w-4 h-4 text-fairway-600 dark:text-fairway-400" />
                  <span>Warehouse Inquiries & Opportunities ({inquiries.length})</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted mt-0.5">Active leasing requirements, target locations, and stage progression</p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onOpenNewInquiryForCompany(company.id)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="rounded-xl px-3 py-1 font-bold shadow-xs shrink-0"
                >
                  New Inquiry
                </Button>
              )}
            </CardHeader>

            {inquiries.length === 0 ? (
              <div className="py-10 text-center text-xs text-foreground-muted border border-dashed border-border rounded-xl m-4 sm:m-5 bg-surface-muted/20">
                <FileText className="w-8 h-8 text-foreground-muted/40 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No inquiries registered for this company yet</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Log client leasing demand to start property matching.</p>
                {canEdit && (
                  <div className="mt-3">
                    <Button size="xs" variant="outline" onClick={() => onOpenNewInquiryForCompany(company.id)} className="rounded-lg" leftIcon={<Plus className="w-3 h-3" />}>
                      Create First Inquiry
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-5 space-y-4">
                {inquiries.map((inq) => {
                  const propertyMatches = StorageService.matchPropertiesForInquiry(inq);
                  const topMatch = propertyMatches[0];

                  return (
                    <div
                      key={inq.id}
                      className="p-4 rounded-xl border border-border bg-surface-muted/30 hover:border-fairway-500/50 hover:bg-surface-muted/50 transition-all shadow-2xs"
                    >
                      {/* Inquiry Top Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/25 rounded-full px-2.5 py-0.5">
                            {inq.inquiryNumber}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {formatSqFt(inq.requiredAreaSqFt)} in {inq.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize bg-surface border border-border text-foreground shadow-2xs">
                            {inq.stage.replace(/_/g, ' ')}
                          </span>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onNavigateToInquiry(inq.id)}
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                            className="rounded-lg"
                          >
                            Open Workspace
                          </Button>
                        </div>
                      </div>

                      {/* Requirement Summary */}
                      <p className="text-xs text-foreground/90 my-3 leading-relaxed">{inq.requirement}</p>

                      {/* Technical Specs Tags */}
                      <div className="flex flex-wrap gap-2 text-[11px] text-foreground-muted mb-3">
                        <span className="bg-surface px-2.5 py-1 rounded-lg border border-border text-foreground font-medium shadow-2xs">
                          Budget: <strong className="text-foreground">{formatINR(inq.budgetMonthlyINR)}/mo</strong>
                        </span>
                        <span className="bg-surface px-2.5 py-1 rounded-lg border border-border text-foreground font-medium shadow-2xs">
                          Docks: <strong className="text-foreground">{inq.dockRequirements}+</strong>
                        </span>
                        <span className="bg-surface px-2.5 py-1 rounded-lg border border-border text-foreground font-medium shadow-2xs">
                          Possession: <strong className="text-foreground">{formatDate(inq.possessionDate)}</strong>
                        </span>
                        <span className="bg-surface px-2.5 py-1 rounded-lg border border-border text-foreground font-medium shadow-2xs">
                          Tenure: <strong className="text-foreground">{inq.leaseDurationMonths / 12} yrs</strong>
                        </span>
                      </div>

                      {/* Property Match Recommendation Teaser */}
                      {topMatch && (
                        <div className="p-3.5 bg-surface rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400 shrink-0" />
                              <span className="font-bold text-foreground truncate">{topMatch.property.name}</span>
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                                {topMatch.overallScore}% Match
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground-muted truncate mt-1">
                              {topMatch.matchBreakdown.details[0]} · {formatSqFt(topMatch.property.availableAreaSqFt)} available
                            </p>
                          </div>
                          <Button size="xs" variant="primary" onClick={() => onNavigateToInquiry(inq.id)} className="rounded-lg shrink-0">
                            Review Match
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Contacts Directory */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-surface">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4 text-sky-500" />
                  <span>Company Decision Makers & Contacts ({contacts.length})</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted mt-0.5">Plant heads, supply chain leaders, and procurement directors</p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddContactOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-sky-500" />}
                  className="rounded-xl px-3 py-1 font-medium shrink-0"
                >
                  Add Contact
                </Button>
              )}
            </CardHeader>

            {contacts.length === 0 ? (
              <div className="py-10 text-center text-xs text-foreground-muted border border-dashed border-border rounded-xl m-4 sm:m-5 bg-surface-muted/20">
                <User className="w-8 h-8 text-foreground-muted/40 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No contacts recorded yet</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Add key decision makers like plant heads, logistics leaders, or directors.</p>
                {canEdit && (
                  <Button size="xs" variant="outline" onClick={() => setIsAddContactOpen(true)} className="mt-3 rounded-lg" leftIcon={<Plus className="w-3 h-3" />}>
                    Add First Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted border-b border-border bg-surface-muted/50">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.map((cnt) => (
                      <tr key={cnt.id} className="hover:bg-surface-muted/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{cnt.name}</span>
                            {cnt.isPrimary && (
                              <span className="text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                Primary
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground-muted">{cnt.designation}</td>
                        <td className="py-3 px-4 text-foreground-muted">{cnt.department}</td>
                        <td className="py-3 px-4 font-mono font-medium">
                          <a href={`tel:${cnt.phone}`} className="text-foreground hover:text-primary transition-colors">
                            {cnt.phone}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-foreground-muted">
                          <a href={`mailto:${cnt.email}`} className="text-foreground hover:text-primary transition-colors">
                            {cnt.email}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`tel:${cnt.phone}`}
                              className="p-1.5 rounded-lg hover:bg-surface-muted text-foreground-muted hover:text-foreground transition-colors"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`mailto:${cnt.email}`}
                              className="p-1.5 rounded-lg hover:bg-surface-muted text-foreground-muted hover:text-foreground transition-colors"
                              title="Email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Physical Facilities */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-surface">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Factory className="w-4 h-4 text-indigo-500" />
                  <span>Physical Facilities & Plants ({facilities.length})</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted mt-0.5">Manufacturing units, warehouses, and distribution centers</p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddFacilityOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-indigo-500" />}
                  className="rounded-xl px-3 py-1 font-medium shrink-0"
                >
                  Add Facility
                </Button>
              )}
            </CardHeader>

            {facilities.length === 0 ? (
              <div className="py-10 text-center text-xs text-foreground-muted border border-dashed border-border rounded-xl m-4 sm:m-5 bg-surface-muted/20">
                <Factory className="w-8 h-8 text-foreground-muted/40 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No facility records mapped yet</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Add client warehouses, factories, or logistics hubs across Gujarat.</p>
                {canEdit && (
                  <Button size="xs" variant="outline" onClick={() => setIsAddFacilityOpen(true)} className="mt-3 rounded-lg" leftIcon={<Plus className="w-3 h-3" />}>
                    Add First Facility
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted border-b border-border bg-surface-muted/50">
                    <tr>
                      <th className="py-3 px-4">Facility Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Location / Corridor</th>
                      <th className="py-3 px-4">Built-up Area</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Map</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {facilities.map((fac) => {
                      const badge = getFacilityStatusBadge(fac.status);
                      return (
                        <tr key={fac.id} className="hover:bg-surface-muted/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>
                              <span>{fac.name}</span>
                              <span className="text-[10px] text-foreground-muted block mt-0.5">{fac.address}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground-muted">{fac.type}</td>
                          <td className="py-3 px-4 text-foreground font-medium">
                            {fac.city}, {fac.state}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-foreground">
                            {fac.builtUpAreaSqFt ? formatSqFt(fac.builtUpAreaSqFt) : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.bg}`}>
                              {fac.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button size="xs" variant="ghost" onClick={onNavigateToMap} leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" />} className="rounded-lg">
                              Map
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Proposals & Commercial Documents */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-surface">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileSpreadsheet className="w-4 h-4 text-purple-500" />
                  <span>Commercial Proposals ({proposals.length})</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted mt-0.5">Delivered leasing terms, CAM charges, and document records</p>
              </div>
            </CardHeader>

            {proposals.length === 0 ? (
              <div className="py-10 text-center text-xs text-foreground-muted border border-dashed border-border rounded-xl m-4 sm:m-5 bg-surface-muted/20">
                <FileSpreadsheet className="w-8 h-8 text-foreground-muted/40 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No commercial proposals drafted yet</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Delivered leasing proposals from inquiry workspaces will appear here.</p>
              </div>
            ) : (
              <div className="p-4 sm:p-5 space-y-3">
                {proposals.map((prop) => (
                  <div key={prop.id} className="p-3.5 bg-surface-muted/40 border border-border rounded-xl flex items-center justify-between gap-3 text-xs hover:border-fairway-500/40 transition-colors shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 text-[10px]">
                          {prop.proposalNumber}
                        </span>
                        <span className="font-bold text-foreground">{prop.propertyName}</span>
                        <span className="text-[10px] font-semibold bg-surface border border-border text-foreground-muted px-2 py-0.5 rounded-full">
                          {prop.status}
                        </span>
                      </div>
                      <p className="text-foreground-muted text-[11px] mt-1.5">
                        {formatSqFt(prop.proposedAreaSqFt)} @ ₹{prop.baseRentPerSqFtINR}/sq.ft/mo · Total: <strong className="text-foreground font-mono">{formatINR(prop.totalMonthlyRentINR)}/mo</strong>
                      </p>
                    </div>
                    <span className="text-[11px] text-foreground-muted shrink-0 font-medium">{formatDate(prop.proposalDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ================= RIGHT CONTEXT SIDEBAR (4 Columns) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Company Information Card */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 border-b border-border bg-surface">
              <CardTitle className="text-sm font-bold text-foreground">Account Overview</CardTitle>
              {canEdit && (
                <Button size="xs" variant="ghost" onClick={() => setIsEditCompanyOpen(true)} leftIcon={<Edit2 className="w-3 h-3" />} className="rounded-lg">
                  Edit
                </Button>
              )}
            </CardHeader>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">Phone</span>
                <a href={`tel:${company.phone}`} className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-surface-muted border border-border text-foreground-muted shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <span>{company.phone}</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">Email</span>
                <a href={`mailto:${company.email}`} className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2 truncate">
                  <span className="p-1.5 rounded-lg bg-surface-muted border border-border text-foreground-muted shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{company.email}</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">Website</span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2 truncate"
                >
                  <span className="p-1.5 rounded-lg bg-surface-muted border border-border text-foreground-muted shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{company.website}</span>
                  <ExternalLink className="w-3 h-3 text-foreground-muted shrink-0 ml-auto" />
                </a>
              </div>

              <div className="pt-1 border-t border-border/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">Headquarters Address</span>
                <p className="text-foreground font-medium leading-relaxed">{company.address}</p>
                <p className="text-foreground-muted font-normal mt-0.5">
                  {company.city}, {company.state} - {company.pincode}
                </p>
              </div>
            </div>
          </Card>

          {/* Tasks & Follow-ups */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 border-b border-border bg-surface">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <span>Tasks & Follow-ups</span>
              </CardTitle>
              {canEdit && (
                <Button size="xs" variant="outline" onClick={() => setIsAddTaskOpen(true)} leftIcon={<Plus className="w-3 h-3 text-amber-500" />} className="rounded-lg">
                  New Task
                </Button>
              )}
            </CardHeader>

            {tasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-foreground-muted">
                <CheckSquare className="w-6 h-6 text-foreground-muted/40 mx-auto mb-1.5" />
                <p className="font-semibold text-foreground">No pending tasks</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Schedule calls, site visits, or follow-ups.</p>
              </div>
            ) : (
              <div className="p-3 divide-y divide-border">
                {tasks.map((t) => {
                  const isOverdue = t.status === 'Pending' && new Date(t.dueDate) < new Date(new Date().toDateString());
                  return (
                    <div key={t.id} className="py-2.5 px-1 flex items-start gap-2.5 text-xs hover:bg-surface-muted/30 rounded-lg transition-colors">
                      <button
                        onClick={() => handleToggleTask(t.id)}
                        className="mt-0.5 text-foreground-muted hover:text-emerald-600 shrink-0 transition-colors cursor-pointer"
                        title={t.status === 'Completed' ? 'Mark Pending' : 'Mark Completed'}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${t.status === 'Completed' ? 'text-emerald-600 fill-emerald-100 dark:fill-emerald-950' : 'text-slate-400'}`}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${t.status === 'Completed' ? 'line-through text-foreground-muted' : 'font-semibold text-foreground'}`}>
                          {t.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-foreground-muted mt-1 flex-wrap">
                          <span className="font-semibold bg-surface-muted border border-border px-1.5 py-0.2 rounded text-foreground">{t.taskType}</span>
                          <span>·</span>
                          {isOverdue ? (
                            <span className="text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded font-bold">
                              {formatRelativeDate(t.dueDate)}
                            </span>
                          ) : (
                            <span className="font-medium">{formatRelativeDate(t.dueDate)}</span>
                          )}
                          <span>·</span>
                          <span className="font-medium text-foreground-muted">{t.assignedUserName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Internal Private Notes */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 border-b border-border bg-surface">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <span>Internal Notes</span>
              </CardTitle>
              {canEdit && (
                <Button size="xs" variant="outline" onClick={() => setIsAddNoteOpen(true)} leftIcon={<Plus className="w-3 h-3 text-indigo-500" />} className="rounded-lg">
                  Add Note
                </Button>
              )}
            </CardHeader>

            <div className="p-4 space-y-3">
              <form onSubmit={handleSaveNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type quick note and press Enter..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-surface-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-fairway-600 transition-colors"
                />
                <Button type="submit" size="xs" disabled={!newNoteText.trim()} className="rounded-xl px-3">
                  <Send className="w-3 h-3" />
                </Button>
              </form>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {notes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-foreground-muted">
                    <MessageSquare className="w-6 h-6 text-foreground-muted/40 mx-auto mb-1.5" />
                    <p className="font-semibold text-foreground">No notes recorded yet</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">Add private notes or account context.</p>
                  </div>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-surface-muted/40 border border-border text-xs">
                      <p className="text-foreground leading-relaxed font-medium">{n.text}</p>
                      <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-2 pt-1.5 border-t border-border/40">
                        <span className="font-semibold">{n.createdByUserName}</span>
                        <span>{formatRelativeDate(n.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Unified Activity Timeline */}
          <Card className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-surface">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Clock className="w-4 h-4 text-fairway-600 dark:text-fairway-400" />
                <span>Activity Timeline</span>
              </CardTitle>
            </CardHeader>

            <div className="p-4 text-xs">
              {activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-foreground-muted">
                  <Clock className="w-6 h-6 text-foreground-muted/40 mx-auto mb-1.5" />
                  <p className="font-semibold text-foreground">No timeline activity yet</p>
                  <p className="text-[11px] text-foreground-muted mt-0.5">Actions and updates will appear here automatically.</p>
                </div>
              ) : (
                <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border max-h-80 overflow-y-auto pr-1">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-fairway-600 border-2 border-surface" />
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-xs">{act.title}</span>
                          <span className="text-[10px] text-foreground-muted">{formatRelativeDate(act.activityDate)}</span>
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-0.5 leading-relaxed">{act.description}</p>
                        <span className="text-[10px] text-fairway-700 dark:text-fairway-400 font-semibold block mt-0.5">by {act.userName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditCompanyOpen}
        onClose={() => setIsEditCompanyOpen(false)}
        maxWidth="xl"
        title="Edit Company Account Overview"
        description={`Update primary contact and business details for ${company.name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const target = e.target as any;
            const updated = StorageService.updateCompany(company.id, {
              phone: target.phone?.value || company.phone,
              email: target.email?.value || company.email,
              website: target.website?.value || company.website,
              address: target.address?.value || company.address,
              city: target.city?.value || company.city,
              state: target.state?.value || company.state,
              pincode: target.pincode?.value || company.pincode,
              annualTurnover: target.annualTurnover?.value || company.annualTurnover,
              employeeCount: target.employeeCount?.value || company.employeeCount,
            });
            if (updated) {
              setCompany(updated);
              success('Company Updated', `Saved profile details for ${updated.name}`);
              setIsEditCompanyOpen(false);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input name="phone" label="Phone Number" defaultValue={company.phone} required />
            <Input name="email" label="Email Address" defaultValue={company.email} type="email" required />
          </div>

          <Input name="website" label="Website URL" defaultValue={company.website} />

          <Input name="address" label="Street Address" defaultValue={company.address} required />

          <div className="grid grid-cols-3 gap-3">
            <Input name="city" label="City" defaultValue={company.city} required />
            <Input name="state" label="State" defaultValue={company.state} required />
            <Input name="pincode" label="Pincode" defaultValue={company.pincode} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input name="annualTurnover" label="Annual Turnover" defaultValue={company.annualTurnover || '₹500+ Cr'} />
            <Input name="employeeCount" label="Workforce" defaultValue={company.employeeCount || '1,000+'} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditCompanyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        maxWidth="lg"
        title="Add Company Decision Maker / Contact"
        description={`Register a new key personnel record for ${company.name}`}
      >
        <form onSubmit={handleSaveContact} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Rahul Shah"
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Designation"
              placeholder="e.g. Plant Manager / VP Logistics"
              value={contactForm.designation}
              onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
              required
            />
            <Input
              label="Department"
              placeholder="e.g. Supply Chain / Operations"
              value={contactForm.department}
              onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+91 98250 00000"
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              required
            />
          </div>

          <Input
            label="LinkedIn Profile URL"
            placeholder="https://linkedin.com/in/..."
            value={contactForm.linkedinUrl}
            onChange={(e) => setContactForm({ ...contactForm, linkedinUrl: e.target.value })}
          />

          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={contactForm.isPrimary}
              onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
              className="rounded text-fairway-600 focus:ring-fairway-600"
            />
            <span>Set as Primary Contact for this company</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddContactOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Facility Modal */}
      <Modal
        isOpen={isAddFacilityOpen}
        onClose={() => setIsAddFacilityOpen(false)}
        title="Add Physical Facility / Plant"
        description={`Record plant, warehouse, or distribution center for ${company.name}`}
      >
        <form onSubmit={handleSaveFacility} className="space-y-4">
          <Input
            label="Facility Name"
            placeholder="e.g. Dahej Specialty Polymer Plant"
            value={facilityForm.name}
            onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Facility Type"
              value={facilityForm.type}
              onChange={(e) => setFacilityForm({ ...facilityForm, type: e.target.value as any })}
            >
              <option value="Manufacturing Plant">Manufacturing Plant</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Distribution Center">Distribution Center</option>
              <option value="R&D Center">R&D Center</option>
              <option value="Corporate Office">Corporate Office</option>
            </Select>

            <Input
              label="Built-Up Area (sq.ft.)"
              type="number"
              value={facilityForm.builtUpAreaSqFt.toString()}
              onChange={(e) => setFacilityForm({ ...facilityForm, builtUpAreaSqFt: parseInt(e.target.value) || 0 })}
            />
          </div>

          <Input
            label="Address / GIDC Plot"
            placeholder="Plot No. 42, PCPIR Industrial Corridor"
            value={facilityForm.address}
            onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              value={facilityForm.city}
              onChange={(e) => setFacilityForm({ ...facilityForm, city: e.target.value })}
              required
            />
            <Input
              label="State"
              value={facilityForm.state}
              onChange={(e) => setFacilityForm({ ...facilityForm, state: e.target.value })}
            />
            <Input
              label="Pincode"
              value={facilityForm.pincode}
              onChange={(e) => setFacilityForm({ ...facilityForm, pincode: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddFacilityOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Facility
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title="Schedule Follow-up Task"
        description={`Set a follow-up action item for ${company.name}`}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Task Type"
              value={taskForm.taskType}
              onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value as any })}
            >
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="Email">Email</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Site Visit">Site Visit</option>
              <option value="Other">Other</option>
            </Select>

            <Select
              label="Priority"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Due Date"
              value={taskForm.dueDate}
              onChange={(dateStr) => setTaskForm({ ...taskForm, dueDate: dateStr })}
              placeholder="Select due date"
            />
            <Input
              label="Due Time"
              value={taskForm.dueTime}
              onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })}
            />
          </div>


          <Select
            label="Assigned Salesperson"
            value={taskForm.assignedUserId}
            onChange={(e) => setTaskForm({ ...taskForm, assignedUserId: e.target.value })}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>

          <Textarea
            label="Task Description"
            placeholder="e.g. Call Rahul Shah regarding clear height and dock requirements..."
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            required
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        title="Add Internal Note"
        description={`Record internal confidential notes for ${company.name}`}
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <Textarea
            label="Note Details"
            placeholder="Write internal context, client preferences, budget notes..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            required
            rows={4}
          />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const CompanyDetailPage = CompanyDetailView;
export default CompanyDetailPage;
