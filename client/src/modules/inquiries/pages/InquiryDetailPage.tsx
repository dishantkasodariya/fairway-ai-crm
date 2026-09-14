import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Calendar,
  Warehouse,
  ArrowRight,
  Trophy,
  AlertOctagon,
  FileSpreadsheet,
  Phone,
  Mail,
  Loader2,
  Download,
  IndianRupee,
  Layers,
  ExternalLink,
  User,
} from 'lucide-react';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { TaskService } from '@/modules/core/services/taskService';
import { ProposalService } from '@/modules/core/services/proposalService';
import { SiteVisitsService } from '@/modules/core/services/siteVisitsService';
import { PropertyService } from '@/modules/core/services/propertyService';
import { ActivityService } from '@/modules/core/services/activityService';
import { PipelineStageService } from '@/modules/core/services/pipelineStageService';
import { matchPropertiesForInquiry } from '@/modules/core/utils/propertyMatcher';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Inquiry, PropertyMatchResult, Proposal, SiteVisit, PipelineStageKey, PipelineStageConfig, Task, Activity, Property } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate, formatRelativeDate, getPriorityBadge, getPipelineStageBadge } from '@/modules/core/utils/formatters';
import { downloadProposalPDF } from '@/modules/core/utils/proposalPdfGenerator';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Breadcrumbs } from '@/modules/core/components/ui/Breadcrumbs';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { TimePicker } from '@/modules/core/components/ui/TimePicker';
import { LostReasonModal } from '@/modules/core/components/LostReasonModal';
import { WonCelebrationModal } from '@/modules/core/components/WonCelebrationModal';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';

export interface InquiryDetailViewProps {
  inquiryId: string;
  onBack: () => void;
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToMap: () => void;
  onNavigateToProperty: (propertyId: string) => void;
}

export const InquiryDetailView: React.FC<InquiryDetailViewProps> = ({
  inquiryId,
  onBack,
  onNavigateToCompany,
  onNavigateToMap,
  onNavigateToProperty,
}) => {
  const { canEdit, currentUser, users } = useAuth();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<Inquiry | undefined>(undefined);
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatchResult[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageConfig[]>([]);

  const refreshData = async () => {
    try {
      const [inqRes, propRes, visitRes, taskRes, actRes, catalogRes, stagesRes] = await Promise.allSettled([
        InquiryService.getInquiryById(inquiryId),
        ProposalService.getProposals({ inquiryId }),
        SiteVisitsService.getSiteVisits({ inquiryId }),
        TaskService.getTasks({ inquiryId }),
        ActivityService.getActivities({ inquiryId }),
        PropertyService.getProperties(),
        PipelineStageService.getPipelineStages(),
      ]);

      let loadedInquiry: Inquiry | undefined;
      let loadedProps: Property[] = [];

      if (inqRes.status === 'fulfilled' && inqRes.value.success && inqRes.value.data) {
        loadedInquiry = inqRes.value.data;
        setInquiry(loadedInquiry);
      }

      if (propRes.status === 'fulfilled' && propRes.value.success && propRes.value.data) {
        setProposals(propRes.value.data);
      }

      if (visitRes.status === 'fulfilled' && visitRes.value.success && visitRes.value.data) {
        setSiteVisits(visitRes.value.data);
      }

      if (taskRes.status === 'fulfilled' && taskRes.value.success && taskRes.value.data) {
        setTasks(taskRes.value.data);
      }

      if (actRes.status === 'fulfilled' && actRes.value.success && actRes.value.data) {
        setActivities(actRes.value.data);
      }

      if (catalogRes.status === 'fulfilled' && catalogRes.value.success && catalogRes.value.data) {
        loadedProps = catalogRes.value.data;
        setProperties(loadedProps);
      }

      if (stagesRes.status === 'fulfilled' && stagesRes.value.success && stagesRes.value.data) {
        setPipelineStages(stagesRes.value.data);
      }

      if (loadedInquiry) {
        setPropertyMatches(matchPropertiesForInquiry(loadedInquiry, loadedProps));
      }
    } catch (err) {
      console.error('Failed to load inquiry details from backend:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      setLoading(true);
      await refreshData();
      if (isMounted) setLoading(false);
    };

    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [inquiryId]);

  // Modals state
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Proposal form
  const [proposalForm, setProposalForm] = useState({
    propertyId: propertyMatches[0]?.property.id || '',
    proposedAreaSqFt: inquiry?.requiredAreaSqFt || 70000,
    baseRentPerSqFtINR: propertyMatches[0]?.property.rentPerSqFtINR || 22,
    maintenancePerSqFtINR: 2.5,
    securityDepositMonths: 6,
    leaseTenureYears: 5,
    lockInMonths: 36,
    escalationPercentPerYear: 5,
    possessionDate: inquiry?.possessionDate || '2026-10-01',
    commercialTerms: 'Standard Grade A leasing terms: 5-year tenure with 3-year lock-in, 5% annual escalation.',
    expiryDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
  });

  // Site visit form
  const [siteVisitForm, setSiteVisitForm] = useState({
    propertyId: propertyMatches[0]?.property.id || '',
    visitDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    visitTime: '11:00 AM',
    notes: 'Joint walkthrough with plant engineering lead and safety inspector.',
    hostUserId: '',
  });

  // Task form
  const [taskForm, setTaskForm] = useState({
    taskType: 'Follow-up' as Task['taskType'],
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00 AM',
    priority: 'High' as Task['priority'],
    assignedUserId: '',
  });

  const userComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return users.map((u) => ({
      value: u.id,
      label: u.name,
      description: u.role,
      avatar: u.avatar,
      initials: u.name?.slice(0, 2).toUpperCase(),
    }));
  }, [users]);

  if (loading && !inquiry) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-fairway-600 animate-spin" />
        <p className="text-sm font-medium text-foreground-muted">Loading inquiry details...</p>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-bold text-foreground">Inquiry Record Not Found</h3>
        <p className="text-xs text-foreground-muted mt-1">Inquiry ID: {inquiryId}</p>
        <Button size="sm" onClick={onBack} className="mt-4">
          Back to Inquiries
        </Button>
      </div>
    );
  }

  // Stage change handler
  const handleStageChange = async (newStage: PipelineStageKey) => {
    if (newStage === 'lost') {
      setIsLostModalOpen(true);
      return;
    }
    if (newStage === 'won') {
      setIsWonModalOpen(true);
      return;
    }

    try {
      await InquiryService.updateInquiry(inquiry.id, { stage: newStage });
      await refreshData();
      success('Stage Updated', `Inquiry advanced to ${newStage.replace(/_/g, ' ').toUpperCase()}`);
    } catch (err: any) {
      error('Stage Update Failed', err.message || 'Error updating stage');
    }
  };

  // Lost Confirmation
  const handleConfirmLost = async (data: { lostReason: string; lostComments: string; lostDate: string; closedByUserId: string }) => {
    try {
      await InquiryService.updateInquiry(inquiry.id, {
        stage: 'lost',
        specialRequirements: `Lost Reason: ${data.lostReason}. Notes: ${data.lostComments}`,
      });
      await refreshData();
      success('Opportunity Marked Lost', `Reason recorded: ${data.lostReason}`);
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not record lost deal');
    }
  };

  // Won Confirmation
  const handleConfirmWon = async (data: { wonPropertyId: string; wonPropertyName: string; wonFinalValueMonthlyINR: number; wonComments: string; wonDate: string }) => {
    try {
      await InquiryService.updateInquiry(inquiry.id, {
        stage: 'won',
        budgetMonthlyINR: data.wonFinalValueMonthlyINR,
      });
      await refreshData();
      success('Deal Won!', `Lease finalized for ${data.wonPropertyName}`);
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not record won deal');
    }
  };

  // Proposal Creation
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === proposalForm.propertyId) || propertyMatches[0]?.property;
    if (!prop) return;

    const totalMonthlyRentINR = proposalForm.proposedAreaSqFt * (proposalForm.baseRentPerSqFtINR + proposalForm.maintenancePerSqFtINR);
    const totalDepositINR = totalMonthlyRentINR * proposalForm.securityDepositMonths;

    try {
      const res = await ProposalService.createProposal({
        inquiryId: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        companyId: inquiry.companyId,
        companyName: inquiry.companyName,
        contactName: inquiry.contactName,
        propertyId: prop.id,
        propertyName: prop.name,
        proposedAreaSqFt: proposalForm.proposedAreaSqFt,
        baseRentPerSqFtINR: proposalForm.baseRentPerSqFtINR,
        maintenancePerSqFtINR: proposalForm.maintenancePerSqFtINR,
        totalMonthlyRentINR,
        securityDepositMonths: proposalForm.securityDepositMonths,
        totalDepositINR,
        leaseTenureYears: proposalForm.leaseTenureYears,
        lockInMonths: proposalForm.lockInMonths,
        escalationPercentPerYear: proposalForm.escalationPercentPerYear,
        possessionDate: proposalForm.possessionDate,
        commercialTerms: proposalForm.commercialTerms,
        proposalDate: new Date().toISOString().split('T')[0],
        expiryDate: proposalForm.expiryDate,
        status: 'Sent',
        documentName: `Fairway_Proposal_${inquiry.inquiryNumber}_${prop.code}.pdf`,
        documentSize: '2.8 MB',
        createdByUserId: currentUser.id,
        createdByUserName: currentUser.name,
      });

      if (!res.success) {
        error('Proposal Creation Failed', res.error || 'Server error creating proposal');
        return;
      }

      if (inquiry.stage !== 'proposal' && inquiry.stage !== 'negotiation' && inquiry.stage !== 'won') {
        await InquiryService.updateInquiry(inquiry.id, { stage: 'proposal' });
      }

      setIsProposalModalOpen(false);
      await refreshData();
      success('Proposal Created & Sent', `Delivered commercial proposal for ${prop.name}`);
    } catch (err: any) {
      error('Proposal Error', err.message || 'Failed communicating with backend');
    }
  };

  // Reassign Salesperson Handler
  const handleReassignSalesperson = async (newSalespersonId: string) => {
    if (!inquiry || !newSalespersonId || newSalespersonId === inquiry.salespersonId) return;
    const targetUser = users.find((u) => u.id === newSalespersonId);
    const newSalespersonName = targetUser ? targetUser.name : 'Unknown';
    try {
      const res = await InquiryService.updateInquiry(inquiry.id, {
        salespersonId: newSalespersonId,
        salespersonName: newSalespersonName,
      });
      if (res.success) {
        setInquiry((prev) => (prev ? { ...prev, salespersonId: newSalespersonId, salespersonName: newSalespersonName } : prev));
        success('Sales Owner Updated', `Inquiry assigned to ${newSalespersonName}`);
        refreshData();
      } else {
        error('Reassignment Failed', res.error || 'Could not reassign salesperson');
      }
    } catch (err: any) {
      error('Reassignment Failed', err.message || 'Error updating salesperson');
    }
  };

  // Site Visit Creation
  const handleCreateSiteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === siteVisitForm.propertyId) || propertyMatches[0]?.property;
    if (!prop) return;

    const hostUser = users.find((u) => u.id === (siteVisitForm.hostUserId || inquiry.salespersonId)) || currentUser;

    try {
      const res = await SiteVisitsService.createSiteVisit({
        inquiryId: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        companyId: inquiry.companyId,
        companyName: inquiry.companyName,
        visitorName: inquiry.contactName,
        visitorPhone: inquiry.contactPhone,
        propertyId: prop.id,
        propertyName: prop.name,
        scheduledDate: siteVisitForm.visitDate,
        scheduledTime: siteVisitForm.visitTime,
        hostUserId: hostUser?.id || inquiry.salespersonId,
        hostUserName: hostUser?.name || inquiry.salespersonName,
        status: 'Scheduled',
        followUpAction: siteVisitForm.notes,
      });

      if (!res.success) {
        error('Site Visit Failed', res.error || 'Server error creating site visit');
        return;
      }

      if (inquiry.stage !== 'site_visit' && inquiry.stage !== 'negotiation' && inquiry.stage !== 'won') {
        await InquiryService.updateInquiry(inquiry.id, { stage: 'site_visit' });
      }

      setIsSiteVisitModalOpen(false);
      setSiteVisitForm({
        propertyId: propertyMatches[0]?.property.id || '',
        visitDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        visitTime: '11:00 AM',
        notes: 'Joint walkthrough with plant engineering lead and safety inspector.',
        hostUserId: '',
      });
      await refreshData();
      success('Site Visit Scheduled', `Visit confirmed for ${siteVisitForm.visitDate} at ${prop.name}`);
    } catch (err: any) {
      error('Site Visit Error', err.message || 'Failed communicating with backend');
    }
  };

  // Task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.description.trim()) return;

    const assignedUser = users.find((u) => u.id === (taskForm.assignedUserId || inquiry.salespersonId)) || currentUser;

    try {
      const res = await TaskService.createTask({
        companyId: inquiry.companyId,
        companyName: inquiry.companyName,
        inquiryId: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        assignedUserId: assignedUser?.id || inquiry.salespersonId,
        assignedUserName: assignedUser?.name || inquiry.salespersonName,
        taskType: taskForm.taskType,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        dueTime: taskForm.dueTime,
        priority: taskForm.priority,
        status: 'Pending',
      });

      if (!res.success) {
        error('Task Creation Failed', res.error || 'Server error creating task');
        return;
      }

      setIsTaskModalOpen(false);
      setTaskForm({
        taskType: 'Follow-up',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: '11:00 AM',
        priority: 'High',
        assignedUserId: '',
      });
      await refreshData();
      success('Task Created', 'Follow-up task scheduled successfully.');
    } catch (err: any) {
      error('Task Error', err.message || 'Failed communicating with backend');
    }
  };

  const prioBadge = getPriorityBadge(inquiry.priority);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left pb-10">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Inquiries', onClick: onBack },
          { label: inquiry.companyName, onClick: () => onNavigateToCompany(inquiry.companyId) },
          { label: inquiry.inquiryNumber },
        ]}
      />

      {/* 1. Header Operational Workspace Banner */}
      <div className="bg-surface rounded-2xl border border-border shadow-subtle p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-sm font-mono font-bold bg-primary/10 text-primary dark:bg-primary/20 dark:text-white border border-primary/25 dark:border-primary/40 px-2.5 py-0.5 rounded-full">
                {inquiry.inquiryNumber}
              </span>
              <h1
                onClick={() => onNavigateToCompany(inquiry.companyId)}
                className="text-2xl sm:text-3xl font-black text-foreground tracking-tight hover:text-primary transition-colors cursor-pointer"
              >
                {inquiry.companyName}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${prioBadge?.bg || 'bg-slate-100 text-slate-700'}`}>
                {inquiry.priority || 'Normal'} Priority
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize border ${getPipelineStageBadge(inquiry.stage).className}`}>
                {inquiry.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-foreground-muted flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{inquiry.location} ({inquiry.targetCorridor})</span>
              </span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span>Inquiry Date: {formatDate(inquiry.inquiryDate)}</span>
              </span>
              {/* <span className="opacity-40">·</span> */}
              {/* <span>Owner: <strong className="text-foreground">{inquiry.salespersonName}</strong></span> */}
            </p>
          </div>

          {/* Assigned Sales Owner & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2 lg:pt-0">
            <div className="w-full sm:w-56 space-y-1">
              <label className="text-[11px] font-semibold text-foreground-muted block">
                Assigned Sales Owner
              </label>
              <Combobox
                options={userComboboxOptions}
                value={inquiry.salespersonId}
                onChange={handleReassignSalesperson}
                placeholder="Select deal owner..."
                searchPlaceholder="Search salesperson..."
                disabled={!canEdit}
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap pb-0.5">
              {canEdit && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsProposalModalOpen(true)} leftIcon={<FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />} className="text-xs">
                    Draft Proposal
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsSiteVisitModalOpen(true)} leftIcon={<Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />} className="text-xs">
                    Schedule Site Visit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsTaskModalOpen(true)} leftIcon={<Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />} className="text-xs">
                    Add Task
                  </Button>
                </>
              )}
              <Button size="sm" variant="secondary" onClick={onNavigateToMap} leftIcon={<MapPin className="w-4 h-4 text-primary" />} className="text-xs">
                Corridor Map
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Interactive Pipeline Stages Stepper (Responsive Horizontal Scroll Track - Zero Truncation) */}
        <div className="pt-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Pipeline Progression Workflow
            </span>
            <span className="text-xs text-foreground-muted">
              Current: <strong className="text-foreground capitalize">{inquiry.stage.replace(/_/g, ' ')}</strong>
            </span>
          </div>
          <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 touch-pan-x">
            {pipelineStages.map((stage) => {
              const isCurrent = inquiry.stage === stage.key;
              const currentStageOrder = pipelineStages.find((s) => s.key === inquiry.stage)?.order || 1;
              const isPassed = stage.order < currentStageOrder;

              return (
                <button
                  key={stage.id}
                  disabled={!canEdit}
                  onClick={() => handleStageChange(stage.key)}
                  className={`min-w-[125px] sm:min-w-[135px] flex-1 py-2 px-2.5 rounded-lg border text-center transition-all text-xs shrink-0 select-none relative cursor-pointer ${
                    isCurrent
                      ? 'bg-primary text-white font-bold border-primary shadow-sm ring-2 ring-primary/20 scale-[1.02]'
                      : isPassed
                      ? 'bg-primary/10 text-primary dark:text-fairway-300 font-semibold border-primary/25 hover:bg-primary/20'
                      : 'bg-surface-muted text-foreground-muted border-border hover:border-border-focus hover:text-foreground'
                  }`}
                  title={stage.description}
                >
                  <span className="text-[10px] block font-mono opacity-75">0{stage.order}</span>
                  <span className="block font-medium leading-tight mt-0.5 whitespace-nowrap">{stage.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 12-Column Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT COLUMN: SPECS & PROPERTY MATCHES (8 cols) ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Requirement Summary Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Customer Requirement Summary</span>
              </CardTitle>
            </CardHeader>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-muted/60 border border-border flex items-start gap-3">
                <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">
                    Client Requirement Note
                  </span>
                  <p className="text-sm text-foreground font-medium leading-relaxed italic">
                    &ldquo;{inquiry.requirement}&rdquo;
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 bg-surface rounded-xl border border-border shadow-subtle hover:border-border-focus transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-foreground-muted">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Required Area</span>
                    <Warehouse className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-black text-foreground block">{formatSqFt(inquiry.requiredAreaSqFt)}</span>
                    <span className="text-[10px] text-foreground-muted">Floor plate</span>
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-xl border border-border shadow-subtle hover:border-border-focus transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-foreground-muted">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Budget</span>
                    <IndianRupee className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-black text-primary block">{formatINR(inquiry.budgetMonthlyINR, true)}</span>
                    <span className="text-[10px] text-foreground-muted font-medium">~ ₹{(inquiry.budgetMonthlyINR / (inquiry.requiredAreaSqFt || 1)).toFixed(1)}/sq.ft/mo</span>
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-xl border border-border shadow-subtle hover:border-border-focus transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-foreground-muted">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Dock Levelers</span>
                    <Layers className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-black text-foreground block">{inquiry.dockRequirements} Docks</span>
                    <span className="text-[10px] text-foreground-muted">With hydraulic levelers</span>
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-xl border border-border shadow-subtle hover:border-border-focus transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-foreground-muted">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Possession Date</span>
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="mt-2">
                    <span className="text-base font-bold text-foreground block">{formatDate(inquiry.possessionDate)}</span>
                    <span className="text-[10px] text-foreground-muted">Target move-in</span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="bg-surface-muted/60 p-3 rounded-xl border border-border flex items-center justify-between">
                  <span className="text-foreground-muted text-[11px] font-medium">Clear Height:</span>
                  <strong className="text-foreground font-semibold">{inquiry.clearHeightFt || 12} Meters</strong>
                </div>
                <div className="bg-surface-muted/60 p-3 rounded-xl border border-border flex items-center justify-between">
                  <span className="text-foreground-muted text-[11px] font-medium">Floor Load:</span>
                  <strong className="text-foreground font-semibold">{inquiry.floorLoadCapacity || '6 MT/sq.m'}</strong>
                </div>
                <div className="bg-surface-muted/60 p-3 rounded-xl border border-border flex items-center justify-between">
                  <span className="text-foreground-muted text-[11px] font-medium">Power Infrastructure:</span>
                  <strong className="text-foreground font-semibold">{inquiry.powerKVA || 1000} KVA</strong>
                </div>
              </div>

              {inquiry.specialRequirements && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Special Conditions:</strong> {inquiry.specialRequirements}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Explainable Property Matching Engine */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-primary" />
                  <span>Rule-Based Matching Warehouse Inventory</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Explainable multi-criteria compatibility ranking based on Area, Location, Docks & Timeline
                </p>
              </div>
            </CardHeader>

            <div className="p-4 sm:p-5 space-y-4">
              {propertyMatches.map((match) => {
                const prop = match.property;
                const photoUrl = prop.photos?.[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';

                return (
                  <div
                    key={prop.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                      match.overallScore >= 85
                        ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-950/[0.12] shadow-sm'
                        : 'border-border bg-surface hover:border-border-focus'
                    }`}
                  >
                    {/* Top Row: Warehouse Image Thumbnail + Information + Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Property Warehouse Thumbnail with Code Badge */}
                        <div
                          className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden border border-border shrink-0 bg-surface-muted shadow-sm group cursor-pointer"
                          onClick={() => onNavigateToProperty(prop.id)}
                        >
                          <img
                            src={photoUrl}
                            alt={prop.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/75 text-white backdrop-blur-sm">
                            {prop.code.split('-')[1] || prop.code}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              onClick={() => onNavigateToProperty(prop.id)}
                              className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                            >
                              {prop.name}
                            </h4>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {match.overallScore}% Match
                            </span>
                          </div>
                          <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                            <span className="truncate">{prop.location} · {prop.city} ({prop.corridor})</span>
                          </p>

                          {/* Commercial Specs Pills */}
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-foreground font-medium border border-border text-[11px]">
                              <Warehouse className="w-3 h-3 text-primary" />
                              {formatSqFt(prop.availableAreaSqFt)} avail
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-foreground font-medium border border-border text-[11px]">
                              ₹{prop.rentPerSqFtINR}/sq.ft/mo
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-foreground font-medium border border-border text-[11px]">
                              {prop.clearHeightFt}m height
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-foreground font-medium border border-border text-[11px]">
                              {prop.docksCount} docks
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setProposalForm({
                                ...proposalForm,
                                propertyId: prop.id,
                                baseRentPerSqFtINR: prop.rentPerSqFtINR,
                              });
                              setIsProposalModalOpen(true);
                            }}
                          >
                            Draft Proposal
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => onNavigateToProperty(prop.id)}>
                          View Specs
                        </Button>
                      </div>
                    </div>

                    {/* Matching Criteria Explainability Badges */}
                    <div className="pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-2">
                        Matching Criteria Explainability:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {match.matchBreakdown.details.map((detail, idx) => {
                          const isSuccess = detail.startsWith('✓');
                          const isPartial = detail.startsWith('~');

                          return (
                            <div
                              key={idx}
                              className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 border transition-colors ${
                                isSuccess
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-medium'
                                  : isPartial
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-medium'
                                  : 'bg-surface-muted text-foreground-muted border-border font-medium'
                              }`}
                            >
                              <span>{detail}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Proposals & Commercial Deals */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Proposals for this Inquiry ({proposals.length})</span>
                </CardTitle>
              </div>
              {canEdit && (
                <Button size="xs" variant="outline" onClick={() => setIsProposalModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  New Proposal
                </Button>
              )}
            </CardHeader>

            <div className="p-4 sm:p-5">
              {proposals.length === 0 ? (
                <div className="py-8 text-center text-xs text-foreground-muted bg-surface-muted/30 rounded-xl border border-dashed border-border">
                  No formal proposals generated yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((prp) => (
                    <div key={prp.id} className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between gap-3 text-xs hover:border-border-focus transition-all shadow-subtle">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                            {prp.proposalNumber}
                          </span>
                          <span className="font-bold text-foreground text-sm">{prp.propertyName}</span>
                          <span className="text-[10px] font-bold bg-surface-muted text-foreground-muted border border-border px-2 py-0.5 rounded">
                            {prp.status}
                          </span>
                        </div>
                        <p className="text-foreground-muted text-xs mt-1.5">
                          {formatSqFt(prp.proposedAreaSqFt)} @ ₹{prp.baseRentPerSqFtINR}/sq.ft · Total Monthly: <strong className="text-foreground">{formatINR(prp.totalMonthlyRentINR)}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => {
                            downloadProposalPDF(prp);
                            success('Proposal PDF', `Opening ${prp.documentName || 'Proposal.pdf'} for print/download`);
                          }}
                        >
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: CONTEXT & ACTIVITY (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Contact & Company Details */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>Decision Maker Context</span>
              </CardTitle>
            </CardHeader>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary dark:text-fairway-300 font-black text-sm flex items-center justify-center border border-primary/20 shrink-0">
                  {(inquiry.contactName || inquiry.companyName).charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Contact Person</span>
                  <span className="font-bold text-foreground text-sm block mt-0.5">{inquiry.contactName || 'Plant Operations Head'}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/60">
                {inquiry.contactPhone && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Direct Phone</span>
                    <a href={`tel:${inquiry.contactPhone}`} className="font-semibold text-primary hover:underline flex items-center gap-2 mt-1">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{inquiry.contactPhone}</span>
                    </a>
                  </div>
                )}

                {inquiry.contactEmail && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Email Address</span>
                    <a href={`mailto:${inquiry.contactEmail}`} className="font-semibold text-primary hover:underline flex items-center gap-2 mt-1 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{inquiry.contactEmail}</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="w-full justify-center" onClick={() => onNavigateToCompany(inquiry.companyId)}>
                  Open Company Profile →
                </Button>
              </div>
            </div>
          </Card>

          {/* Follow-up Tasks */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Follow-ups ({tasks.length})</span>
              </CardTitle>
              {canEdit && (
                <Button size="xs" variant="outline" onClick={() => setIsTaskModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Task
                </Button>
              )}
            </CardHeader>

            <div className="p-4 sm:p-5 space-y-3">
              {tasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-foreground-muted bg-surface-muted/30 rounded-xl border border-dashed border-border">
                  No pending tasks for this inquiry.
                </div>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="p-3 bg-surface rounded-xl border border-border text-xs hover:border-border-focus transition-all shadow-subtle">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">{t.taskType}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        {formatRelativeDate(t.dueDate)}
                      </span>
                    </div>
                    <p className="text-foreground-muted text-xs mt-1.5 leading-relaxed">{t.description}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Site Visits Scheduled */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>Site Inspections ({siteVisits.length})</span>
              </CardTitle>
            </CardHeader>

            <div className="p-4 sm:p-5 space-y-3">
              {siteVisits.length === 0 ? (
                <div className="py-6 text-center text-xs text-foreground-muted bg-surface-muted/30 rounded-xl border border-dashed border-border">
                  No site visits scheduled.
                </div>
              ) : (
                siteVisits.map((sv) => (
                  <div key={sv.id} className="p-3.5 bg-surface rounded-xl border border-border text-xs hover:border-border-focus transition-all shadow-subtle">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">{sv.propertyName}</span>
                      <span className="text-[10px] font-bold bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20 px-2 py-0.5 rounded-full">
                        {sv.status}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1.5">
                      Date: <strong className="text-foreground">{formatDate(sv.visitDate)} at {sv.visitTime}</strong>
                    </p>
                    {sv.clientFeedback && (
                      <p className="text-xs text-foreground mt-2 bg-surface-muted/60 p-2.5 rounded-lg border border-border">
                        Feedback: {sv.clientFeedback}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* Lost Reason Modal (Mandatory from Flow F) */}
      <LostReasonModal
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        inquiryNumber={inquiry.inquiryNumber}
        companyName={inquiry.companyName}
        onConfirm={handleConfirmLost}
      />

      {/* Won Celebration Modal */}
      <WonCelebrationModal
        isOpen={isWonModalOpen}
        onClose={() => setIsWonModalOpen(false)}
        inquiryNumber={inquiry.inquiryNumber}
        companyName={inquiry.companyName}
        defaultPropertyId={propertyMatches[0]?.property.id}
        defaultMonthlyRent={inquiry.budgetMonthlyINR}
        onConfirm={handleConfirmWon}
      />

      {/* Draft Proposal Modal */}
      <Modal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        maxWidth="xl"
        title="Draft Commercial Proposal"
        description={`Create and deliver formal terms for ${inquiry.inquiryNumber} (${inquiry.companyName})`}
      >
        <form onSubmit={handleCreateProposal} className="space-y-4 text-xs text-left">
          <Select
            label="Select Warehouse Property"
            value={proposalForm.propertyId}
            onChange={(e) => {
              const prop = properties.find((p) => p.id === e.target.value);
              setProposalForm({
                ...proposalForm,
                propertyId: e.target.value,
                baseRentPerSqFtINR: prop?.rentPerSqFtINR || 22,
              });
            }}
            required
          >
            {propertyMatches.map((pm) => (
              <option key={pm.property.id} value={pm.property.id}>
                {pm.property.name} ({pm.overallScore}% match) — ₹{pm.property.rentPerSqFtINR}/sq.ft
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Proposed Area (sq.ft.)"
              value={proposalForm.proposedAreaSqFt.toString()}
              onChange={(e) => setProposalForm({ ...proposalForm, proposedAreaSqFt: parseInt(e.target.value) || 0 })}
              required
            />
            <Input
              type="number"
              label="Base Rent (₹/sq.ft/mo)"
              value={proposalForm.baseRentPerSqFtINR.toString()}
              onChange={(e) => setProposalForm({ ...proposalForm, baseRentPerSqFtINR: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              type="number"
              label="CAM Charges (₹/sq.ft)"
              value={proposalForm.maintenancePerSqFtINR.toString()}
              onChange={(e) => setProposalForm({ ...proposalForm, maintenancePerSqFtINR: parseFloat(e.target.value) || 0 })}
            />
            <Input
              type="number"
              label="Security Deposit (Months)"
              value={proposalForm.securityDepositMonths.toString()}
              onChange={(e) => setProposalForm({ ...proposalForm, securityDepositMonths: parseInt(e.target.value) || 6 })}
            />
            <Input
              type="number"
              label="Lease Tenure (Years)"
              value={proposalForm.leaseTenureYears.toString()}
              onChange={(e) => setProposalForm({ ...proposalForm, leaseTenureYears: parseInt(e.target.value) || 5 })}
            />
          </div>

          <Textarea
            label="Commercial Notes & Terms"
            value={proposalForm.commercialTerms}
            onChange={(e) => setProposalForm({ ...proposalForm, commercialTerms: e.target.value })}
            rows={2}
          />

          <div className="p-3.5 bg-primary/10 rounded-xl border border-primary/25">
            <span className="text-[11px] font-bold text-primary dark:text-fairway-300 block">Total Monthly Commercial Value:</span>
            <span className="text-base font-extrabold text-primary dark:text-fairway-300">
              {formatINR(proposalForm.proposedAreaSqFt * (proposalForm.baseRentPerSqFtINR + proposalForm.maintenancePerSqFtINR))} / month
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsProposalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" leftIcon={<Send className="w-3.5 h-3.5" />}>
              Save & Deliver Proposal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Site Visit Modal */}
      <Modal
        isOpen={isSiteVisitModalOpen}
        onClose={() => setIsSiteVisitModalOpen(false)}
        title="Schedule Warehouse Site Visit"
        description={`Plan an on-site physical tour for ${inquiry.companyName}`}
      >
        <form onSubmit={handleCreateSiteVisit} className="space-y-4 text-xs text-left">
          <Select
            label="Property Location"
            value={siteVisitForm.propertyId}
            onChange={(e) => setSiteVisitForm({ ...siteVisitForm, propertyId: e.target.value })}
          >
            {propertyMatches.map((pm) => (
              <option key={pm.property.id} value={pm.property.id}>
                {pm.property.name} ({pm.property.city})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Visit Date"
              value={siteVisitForm.visitDate}
              onChange={(dateStr) => setSiteVisitForm({ ...siteVisitForm, visitDate: dateStr })}
              placeholder="Select visit date"
            />
            <Input
              label="Visit Time"
              value={siteVisitForm.visitTime}
              onChange={(e) => setSiteVisitForm({ ...siteVisitForm, visitTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Host / Assigned Salesperson <span className="text-rose-500 font-bold">*</span>
            </label>
            <Combobox
              options={userComboboxOptions}
              value={siteVisitForm.hostUserId || inquiry.salespersonId}
              onChange={(val) => setSiteVisitForm({ ...siteVisitForm, hostUserId: val })}
              placeholder="Select host..."
              searchPlaceholder="Search salesperson..."
            />
          </div>

          <Textarea
            label="Visit Agenda / Team Instructions"
            value={siteVisitForm.notes}
            onChange={(e) => setSiteVisitForm({ ...siteVisitForm, notes: e.target.value })}
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSiteVisitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Site Visit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Follow-up Task"
        description={`Set an action item for ${inquiry.inquiryNumber}`}
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs text-left">
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Assigned Salesperson <span className="text-rose-500 font-bold">*</span>
            </label>
            <Combobox
              options={userComboboxOptions}
              value={taskForm.assignedUserId || inquiry.salespersonId}
              onChange={(val) => setTaskForm({ ...taskForm, assignedUserId: val })}
              placeholder="Select salesperson..."
              searchPlaceholder="Search salesperson..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Due Date"
              value={taskForm.dueDate}
              onChange={(dateStr) => setTaskForm({ ...taskForm, dueDate: dateStr })}
              placeholder="Select due date"
            />
            <TimePicker
              label="Due Time"
              value={taskForm.dueTime}
              onChange={(timeStr) => setTaskForm({ ...taskForm, dueTime: timeStr })}
              placeholder="Select due time"
            />
          </div>

          <Textarea
            label="Description"
            placeholder="e.g. Call Rahul Shah regarding dock leveler hydraulic specs..."
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            required
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const InquiryDetailPage = InquiryDetailView;
export default InquiryDetailPage;
