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
  ArrowLeft,
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
  UserCheck,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';
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
import { CapacityCheckPanel } from '../components/CapacityCheckPanel';

const getMatchChipInfo = (detail: string) => {
  const isCheck = detail.startsWith('✓');
  const isPartial = detail.startsWith('~');
  const isCross = detail.startsWith('✕');

  let label = detail;
  if (detail.includes('Location Match')) label = '✓ Location Match';
  else if (detail.includes('outside primary target')) label = '✕ Outside Corridor';
  else if (detail.includes('Area Match')) label = '✓ Area Fits';
  else if (detail.includes('Partial Area')) label = '~ Partial Area';
  else if (detail.includes('Area Insufficient')) label = '✕ Area Insufficient';
  else if (detail.includes('Docks') && isCheck) label = '✓ Docks Suitable';
  else if (detail.includes('Docks') && isPartial) label = '~ Fewer Docks';
  else if (detail.includes('Availability')) label = '✓ Immediate Occupancy';
  else if (detail.includes('Industry') && isCheck) label = '✓ Zoned For Industry';
  else if (detail.includes('Industry') && isCross) label = '✕ Different Zoning';

  let colorCls = 'bg-surface-muted text-foreground-muted border-border';
  if (isCheck) {
    colorCls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 font-medium';
  } else if (isPartial) {
    colorCls = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 font-medium';
  } else if (isCross) {
    colorCls = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 font-medium';
  }

  return { label, colorCls, fullText: detail };
};

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
  const { canEditModule, currentUser, users } = useAuth();
  const canEdit = canEditModule('inquiries');
  const { success, error, toast } = useToast();

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

  // Active Tab for Right-hand Activity Hub
  const [activityTab, setActivityTab] = useState<'tasks' | 'visits' | 'proposals'>('tasks');

  // Clean 1-line owner options with 2-letter uppercase initials in a circular badge (identical to CompanyDetailPage)
  const ownerComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return users.map((u) => ({
      value: u.id,
      label: u.name,
      icon: (
        <span className="w-5 h-5 rounded-full bg-surface-muted border border-border text-[10px] font-bold text-foreground flex items-center justify-center shrink-0">
          {u.name?.slice(0, 2).toUpperCase()}
        </span>
      ),
    }));
  }, [users]);

  const userComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return users.map((u) => ({
      value: u.id,
      label: u.name,
      description: u.role,
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
  // Same fields the Pipeline saves — the reason used to be stuffed into specialRequirements.
  const handleConfirmLost = async (data: { lostReason: string; lostComments: string; lostDate: string; closedByUserId: string }) => {
    try {
      const res = await InquiryService.updateInquiry(inquiry.id, {
        stage: 'lost',
        status: 'Lost',
        lostReason: data.lostReason,
        lostComments: data.lostComments,
        lostDate: data.lostDate,
        closedByUserId: data.closedByUserId,
      } as any);
      if (res && res.success === false) throw new Error(res.error || 'Could not record lost deal');
      await refreshData();
      success('Opportunity Marked Lost', `Reason recorded: ${data.lostReason}`);
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not record lost deal');
    }
  };

  // Won: the modal records the lease on the server itself; just refresh here.
  const handleWon = async (result: { propertyName: string; areaSqFt: number }) => {
    await refreshData();
    success('Deal Won!', `${result.areaSqFt.toLocaleString('en-IN')} sq ft leased at ${result.propertyName}.`);
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

      // The server moves the deal to 'proposal' (never backwards) and holds the space.
      setIsProposalModalOpen(false);
      await refreshData();
      const hold = (res as { hold?: { held: boolean; areaSqFt: number; message?: string } | null }).hold;
      if (hold && !hold.held && hold.message) {
        toast('Proposal sent — space NOT on hold', { message: hold.message, type: 'warning' });
      } else {
        success('Proposal Created & Sent', `${formatSqFt(proposalForm.proposedAreaSqFt)} at ${prop.name} is now on hold for this deal.`);
      }
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
    <div className="space-y-6 max-w-8xl mx-auto text-left pb-10">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Inquiries', onClick: onBack },
          { label: inquiry.companyName, onClick: () => onNavigateToCompany(inquiry.companyId) },
          { label: inquiry.inquiryNumber },
        ]}
      />

      {/* 1. Header Operational Workspace Banner */}
      <div className="bg-surface rounded-2xl border border-border shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold bg-surface-muted text-foreground border border-border px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
                {inquiry.inquiryNumber}
              </span>
              <h1
                onClick={() => onNavigateToCompany(inquiry.companyId)}
                className="text-xl sm:text-2xl font-bold text-foreground tracking-tight hover:text-primary transition-colors cursor-pointer truncate"
              >
                {inquiry.companyName}
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium border bg-surface-muted text-foreground border-border whitespace-nowrap shrink-0">
                {inquiry.priority || 'Normal'} Priority
              </span>
              <span className={cn(
                "text-[11px] px-2.5 py-0.5 rounded-full font-medium border whitespace-nowrap shrink-0",
                inquiry.stage === 'won'
                  ? "bg-primary/10 text-primary border-primary/30 font-bold"
                  : "bg-surface-muted text-foreground border-border"
              )}>
                {inquiry.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-foreground-muted flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span className="truncate">{inquiry.location} ({inquiry.targetCorridor})</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span>Inquiry Date: {formatDate(inquiry.inquiryDate)}</span>
              </span>
            </p>
          </div>

          {/* Assigned Sales Owner & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1 lg:pt-0 shrink-0">
            <div className="w-full sm:w-48">
              <Combobox
                options={ownerComboboxOptions}
                value={inquiry.salespersonId}
                onChange={handleReassignSalesperson}
                placeholder="Select deal owner..."
                searchPlaceholder="Search salesperson..."
                disabled={!canEdit}
                triggerClassName="h-9 text-xs py-1 px-2.5 rounded-xl bg-surface border-border hover:border-foreground/30 transition-colors"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsProposalModalOpen(true)}
                    leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                    className="flex-1 sm:flex-initial h-9 text-xs font-bold rounded-xl shadow-xs whitespace-nowrap justify-center"
                  >
                    Draft Proposal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsSiteVisitModalOpen(true)}
                    leftIcon={<Calendar className="w-3.5 h-3.5 text-foreground" />}
                    className="flex-1 sm:flex-initial h-9 text-xs font-semibold rounded-xl whitespace-nowrap justify-center"
                  >
                    Visit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsTaskModalOpen(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5 text-foreground" />}
                    className="flex-1 sm:flex-initial h-9 text-xs font-semibold rounded-xl whitespace-nowrap justify-center"
                  >
                    Task
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onNavigateToMap}
                leftIcon={<MapPin className="w-3.5 h-3.5 text-foreground" />}
                className="flex-1 sm:flex-initial h-9 text-xs font-semibold rounded-xl whitespace-nowrap justify-center"
              >
                Map
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Interactive Pipeline Stages Stepper (Sleek Horizontal Segmented Stepper) */}
        <div className="pt-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Pipeline Stage
            </span>
            <span className="text-xs text-foreground-muted">
              Current: <strong className="text-foreground capitalize">{inquiry.stage.replace(/_/g, ' ')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full">
            {pipelineStages.map((stage) => {
              const isCurrent = inquiry.stage === stage.key;
              const currentStageOrder = pipelineStages.find((s) => s.key === inquiry.stage)?.order || 1;
              const isPassed = stage.order < currentStageOrder;

              return (
                <button
                  key={stage.id}
                  disabled={!canEdit}
                  onClick={() => handleStageChange(stage.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 cursor-pointer whitespace-nowrap flex items-center gap-1.5 select-none",
                    isCurrent
                      ? "bg-primary text-white font-bold border-primary shadow-xs ring-2 ring-primary/20"
                      : isPassed
                      ? "bg-surface-muted text-foreground font-semibold border-border hover:border-foreground/30"
                      : "bg-surface text-foreground-muted hover:text-foreground border-border"
                  )}
                  title={stage.description}
                >
                  {isPassed && <Check className="w-3 h-3 text-primary shrink-0" />}
                  {isCurrent && <span className="size-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                  <span>{stage.label}</span>
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
          <Card className="overflow-hidden rounded-2xl bg-surface border border-border shadow-2xs">
            <CardHeader className="pb-3 pt-4 px-5 border-b border-border bg-surface-muted/30">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-foreground" />
                <span>Customer Requirement Summary</span>
              </CardTitle>
            </CardHeader>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              {/* Client note quotation pill */}
              {inquiry.requirement && (
                <div className="p-3 rounded-xl bg-surface-muted border border-border flex items-start gap-2.5">
                  <span className="text-foreground-muted font-bold text-base leading-none select-none">“</span>
                  <p className="text-xs text-foreground font-medium leading-relaxed italic flex-1">
                    {inquiry.requirement}
                  </p>
                </div>
              )}

              {/* 4 Core Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3 sm:p-3.5 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block">
                    Required Area
                  </span>
                  <div className="text-base sm:text-lg font-bold text-foreground tabular-nums truncate mt-1">
                    {formatSqFt(inquiry.requiredAreaSqFt)}
                  </div>
                  <span className="text-[11px] text-foreground-muted">Floor plate</span>
                </div>

                <div className="p-3 sm:p-3.5 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block">
                    Monthly Budget
                  </span>
                  <div className="text-base sm:text-lg font-bold text-foreground tabular-nums truncate mt-1">
                    {formatINR(inquiry.budgetMonthlyINR, true)}
                  </div>
                  <span className="text-[11px] text-foreground-muted">
                    ~₹{(inquiry.budgetMonthlyINR / (inquiry.requiredAreaSqFt || 1)).toFixed(1)}/sq.ft/mo
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block">
                    Dock Levelers
                  </span>
                  <div className="text-base sm:text-lg font-bold text-foreground tabular-nums truncate mt-1">
                    {inquiry.dockRequirements} Docks
                  </div>
                  <span className="text-[11px] text-foreground-muted">Hydraulic docks</span>
                </div>

                <div className="p-3 sm:p-3.5 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block">
                    Target Date
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-foreground tabular-nums truncate mt-1.5">
                    {formatDate(inquiry.possessionDate)}
                  </div>
                  <span className="text-[11px] text-foreground-muted">Possession timeline</span>
                </div>
              </div>

              {/* Technical specs pill strip */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <div className="bg-surface-muted px-2.5 py-1 rounded-lg border border-border flex items-center gap-1.5">
                  <span className="text-foreground-muted text-[11px]">Clear Height:</span>
                  <span className="font-semibold text-foreground">{inquiry.clearHeightFt || 12} Meters</span>
                </div>
                <div className="bg-surface-muted px-2.5 py-1 rounded-lg border border-border flex items-center gap-1.5">
                  <span className="text-foreground-muted text-[11px]">Floor Load:</span>
                  <span className="font-semibold text-foreground">{inquiry.floorLoadCapacity || '6 MT/sq.m'}</span>
                </div>
                <div className="bg-surface-muted px-2.5 py-1 rounded-lg border border-border flex items-center gap-1.5">
                  <span className="text-foreground-muted text-[11px]">Power:</span>
                  <span className="font-semibold text-foreground">{inquiry.powerKVA || 1000} KVA</span>
                </div>
              </div>

              {inquiry.specialRequirements && (
                <div className="p-3 bg-surface-muted border border-border rounded-xl text-foreground text-xs flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-foreground-muted shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Special Conditions:</strong> {inquiry.specialRequirements}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Explainable Property Matching Engine */}
          <Card className="overflow-hidden rounded-2xl bg-surface border border-border shadow-2xs">
            <CardHeader className="pb-3 pt-4 px-5 border-b border-border bg-surface-muted/30">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-foreground" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Matching Warehouses ({propertyMatches.length})
                  </CardTitle>
                </div>
                <span className="text-[11px] text-foreground-muted">Ranked by Compatibility</span>
              </div>
            </CardHeader>

            <div className="p-3 sm:p-4 space-y-3">
              <CapacityCheckPanel areaSqFt={inquiry.requiredAreaSqFt} inquiryId={inquiry.id} refreshKey={proposals.length + inquiry.stage} />
              {propertyMatches.length === 0 ? (
                <div className="py-12 text-center text-xs text-foreground-muted">
                  No matching warehouse properties currently available for this requirement.
                </div>
              ) : (
                propertyMatches.map((match) => {
                  const prop = match.property;
                  const cleanMatchDetails = match.matchBreakdown.details.slice(0, 3).map(getMatchChipInfo);
                  const isHighMatch = match.overallScore >= 70;
                  const isMidMatch = match.overallScore >= 50;

                  return (
                    <div
                      key={prop.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface hover:border-foreground/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group shadow-2xs"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Warehouse Code / Icon Badge */}
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-surface-muted text-foreground border border-border flex flex-col items-center justify-center shrink-0 cursor-pointer shadow-2xs group-hover:border-primary/40 transition-colors"
                          onClick={() => onNavigateToProperty(prop.id)}
                          title={`View ${prop.name}`}
                        >
                          <Warehouse className="w-4 h-4 sm:w-5 sm:h-5 text-foreground-muted group-hover:text-primary transition-colors" />
                          <span className="text-[8px] sm:text-[9px] font-mono font-bold mt-0.5 tracking-tight text-foreground-muted">
                            {prop.code.split('-')[1] || prop.code}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              onClick={() => onNavigateToProperty(prop.id)}
                              className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                            >
                              {prop.name}
                            </h4>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap",
                                isHighMatch
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : isMidMatch
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                  : "bg-surface-muted text-foreground-muted border-border"
                              )}
                            >
                              {match.overallScore}% Match
                            </span>
                          </div>

                          <p className="text-[11px] text-foreground-muted mt-0.5 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-foreground-muted shrink-0" />
                            <span className="truncate">{prop.location} · {prop.city}</span>
                          </p>

                          {/* Commercial Specs Pills */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                            <span className="font-semibold text-foreground bg-surface-muted px-2 py-0.5 rounded border border-border whitespace-nowrap">
                              {formatSqFt(prop.availableAreaSqFt)} avail
                            </span>
                            <span className="font-mono text-foreground bg-surface-muted px-2 py-0.5 rounded border border-border whitespace-nowrap">
                              ₹{prop.rentPerSqFtINR}/sq.ft/mo
                            </span>
                            <span className="text-foreground-muted bg-surface-muted px-2 py-0.5 rounded border border-border whitespace-nowrap">
                              {prop.clearHeightFt}m ht
                            </span>
                            <span className="text-foreground-muted bg-surface-muted px-2 py-0.5 rounded border border-border whitespace-nowrap">
                              {prop.docksCount} docks
                            </span>
                          </div>

                          {/* Clean, non-overflowing Match Explainability chips */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {cleanMatchDetails.map((chip, idx) => (
                              <span
                                key={idx}
                                title={chip.fullText}
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded border font-medium whitespace-nowrap transition-colors",
                                  chip.colorCls
                                )}
                              >
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons - clean and responsive */}
                      <div className="flex items-center gap-2 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border/60 w-full sm:w-auto justify-end">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onNavigateToProperty(prop.id)}
                          className="flex-1 sm:flex-initial h-8 text-xs font-semibold rounded-lg justify-center whitespace-nowrap"
                        >
                          View Specs
                        </Button>
                        {canEdit && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => {
                              setProposalForm({
                                ...proposalForm,
                                propertyId: prop.id,
                                baseRentPerSqFtINR: prop.rentPerSqFtINR,
                              });
                              setIsProposalModalOpen(true);
                            }}
                            className="flex-1 sm:flex-initial h-8 text-xs font-bold rounded-lg shadow-xs justify-center whitespace-nowrap"
                          >
                            Draft Proposal
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: CONTEXT & UNIFIED ACTIVITY HUB (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Assigned Deal Owner Card (Matching Company Detail Page) */}
          <Card className="rounded-2xl bg-surface border border-border shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-5 border-b border-border bg-surface-muted/30">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-foreground" />
                <span>Assigned Deal Owner</span>
              </CardTitle>
            </CardHeader>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-foreground-muted">Sales Owner:</span>
                <span className="text-[10px] font-medium text-foreground-muted bg-surface-muted border border-border px-2 py-0.5 rounded-md">
                  {users.find((u) => u.id === inquiry.salespersonId)?.role?.replace('_', ' ') || 'Sales Executive'}
                </span>
              </div>
              {canEdit ? (
                <div className="w-full pt-1">
                  <Combobox
                    options={ownerComboboxOptions}
                    value={inquiry.salespersonId}
                    onChange={handleReassignSalesperson}
                    placeholder="Assign deal owner..."
                    searchPlaceholder="Search salesperson..."
                    triggerClassName="h-9 text-xs py-1 px-3 rounded-xl bg-surface border-border hover:border-foreground/30 transition-colors"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-muted border border-border">
                  <span className="w-5 h-5 rounded-full bg-surface border border-border text-[10px] font-bold text-foreground flex items-center justify-center shrink-0">
                    {(inquiry.salespersonName || 'U').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-semibold text-foreground text-xs">{inquiry.salespersonName || 'Unassigned'}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Decision Maker Card */}
          <Card className="rounded-2xl bg-surface border border-border shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-5 border-b border-border bg-surface-muted/30">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-foreground" />
                <span>Decision Maker Context</span>
              </CardTitle>
            </CardHeader>

            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-muted text-foreground font-bold text-xs flex items-center justify-center border border-border shrink-0">
                  {(inquiry.contactName || inquiry.companyName).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block">
                    Contact Person
                  </span>
                  <span className="font-bold text-foreground text-xs sm:text-sm block truncate">
                    {inquiry.contactName || 'Primary Coordinator'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                {inquiry.contactPhone && (
                  <div>
                    <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block">
                      Direct Phone
                    </span>
                    <a
                      href={`tel:${inquiry.contactPhone}`}
                      className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 mt-0.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                      <span>{inquiry.contactPhone}</span>
                    </a>
                  </div>
                )}

                {inquiry.contactEmail && (
                  <div>
                    <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block">
                      Email Address
                    </span>
                    <a
                      href={`mailto:${inquiry.contactEmail}`}
                      className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 mt-0.5 truncate"
                    >
                      <Mail className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                      <span className="truncate">{inquiry.contactEmail}</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  size="xs"
                  variant="outline"
                  className="w-full justify-center h-8 text-xs font-semibold rounded-lg"
                  onClick={() => onNavigateToCompany(inquiry.companyId)}
                >
                  Open Company Profile →
                </Button>
              </div>
            </div>
          </Card>

          {/* Unified Deal Activity Hub (Tabs: Tasks | Site Visits | Proposals) */}
          <Card className="rounded-2xl bg-surface border border-border shadow-2xs overflow-hidden flex flex-col">
            {/* Tab Bar Header */}
            <div className="flex items-center border-b border-border bg-surface-muted/40 p-1 gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActivityTab('tasks')}
                className={cn(
                  "flex-1 min-w-0 py-1.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all text-center cursor-pointer select-none whitespace-nowrap truncate",
                  activityTab === 'tasks'
                    ? "bg-surface text-foreground shadow-xs border border-border"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                Follow-ups ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('visits')}
                className={cn(
                  "flex-1 min-w-0 py-1.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all text-center cursor-pointer select-none whitespace-nowrap truncate",
                  activityTab === 'visits'
                    ? "bg-surface text-foreground shadow-xs border border-border"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                Visits ({siteVisits.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('proposals')}
                className={cn(
                  "flex-1 min-w-0 py-1.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all text-center cursor-pointer select-none whitespace-nowrap truncate",
                  activityTab === 'proposals'
                    ? "bg-surface text-foreground shadow-xs border border-border"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                Proposals ({proposals.length})
              </button>
            </div>

            {/* Tab 1: Tasks / Follow-ups */}
            {activityTab === 'tasks' && (
              <div className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Action Desk</span>
                  {canEdit && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setIsTaskModalOpen(true)}
                      leftIcon={<Plus className="w-3 h-3 text-foreground" />}
                      className="h-7 text-xs font-semibold rounded-lg"
                    >
                      Add Task
                    </Button>
                  )}
                </div>

                {tasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-foreground-muted bg-surface-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1.5">
                    <Clock className="w-5 h-5 text-foreground-muted" />
                    <span>No pending tasks for this inquiry.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-surface rounded-xl border border-border text-xs hover:border-foreground/30 transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground">{t.taskType}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-foreground border border-border">
                            {formatRelativeDate(t.dueDate)}
                          </span>
                        </div>
                        <p className="text-foreground-muted text-xs mt-1 leading-snug">{t.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Site Visits */}
            {activityTab === 'visits' && (
              <div className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Site Inspections</span>
                  {canEdit && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setIsSiteVisitModalOpen(true)}
                      leftIcon={<Plus className="w-3 h-3 text-foreground" />}
                      className="h-7 text-xs font-semibold rounded-lg"
                    >
                      Schedule Visit
                    </Button>
                  )}
                </div>

                {siteVisits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-foreground-muted bg-surface-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1.5">
                    <Calendar className="w-5 h-5 text-foreground-muted" />
                    <span>No site visits scheduled yet.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {siteVisits.map((sv) => (
                      <div
                        key={sv.id}
                        className="p-3 bg-surface rounded-xl border border-border text-xs hover:border-foreground/30 transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground truncate">{sv.propertyName}</span>
                          <span className="text-[10px] font-semibold bg-surface-muted text-foreground border border-border px-2 py-0.5 rounded-full shrink-0">
                            {sv.status}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-muted mt-1">
                          {formatDate(sv.visitDate)} at {sv.visitTime}
                        </p>
                        {sv.clientFeedback && (
                          <p className="text-[11px] text-foreground mt-1.5 bg-surface-muted p-2 rounded-lg border border-border">
                            Feedback: {sv.clientFeedback}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Proposals */}
            {activityTab === 'proposals' && (
              <div className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Commercial Proposals</span>
                  {canEdit && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setIsProposalModalOpen(true)}
                      leftIcon={<Plus className="w-3 h-3 text-foreground" />}
                      className="h-7 text-xs font-semibold rounded-lg"
                    >
                      New Proposal
                    </Button>
                  )}
                </div>

                {proposals.length === 0 ? (
                  <div className="py-8 text-center text-xs text-foreground-muted bg-surface-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1.5">
                    <FileSpreadsheet className="w-5 h-5 text-foreground-muted" />
                    <span>No formal proposals generated yet.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {proposals.map((prp) => (
                      <div
                        key={prp.id}
                        className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between gap-2 text-xs hover:border-foreground/30 transition-all shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold bg-surface-muted text-foreground px-1.5 py-0.2 rounded border border-border text-[10px]">
                              {prp.proposalNumber}
                            </span>
                            <span className="font-bold text-foreground truncate">{prp.propertyName}</span>
                          </div>
                          <p className="text-foreground-muted text-[11px] mt-1 truncate">
                            {formatSqFt(prp.proposedAreaSqFt)} · <strong className="text-foreground font-mono">{formatINR(prp.totalMonthlyRentINR)}/mo</strong>
                          </p>
                        </div>
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={<Download className="w-3 h-3 text-foreground" />}
                          className="h-7 text-xs font-semibold rounded-lg shrink-0"
                          onClick={() => {
                            downloadProposalPDF(prp);
                            success('Proposal PDF', `Opening ${prp.documentName || 'Proposal.pdf'} for print/download`);
                          }}
                        >
                          PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
        inquiry={inquiry}
        defaultPropertyId={propertyMatches[0]?.property.id}
        onWon={handleWon}
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
              Host / Assigned Salesperson <span className="text-primary font-bold">*</span>
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
              Assigned Salesperson <span className="text-primary font-bold">*</span>
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
