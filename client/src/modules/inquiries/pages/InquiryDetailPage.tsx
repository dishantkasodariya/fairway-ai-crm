import React, { useState, useEffect } from 'react';
import {
  FileText,
  Building2,
  MapPin,
  Clock,
  Sparkles,
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
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { TaskService } from '@/modules/core/services/taskService';
import { ProposalService } from '@/modules/core/services/proposalService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Inquiry, PropertyMatchResult, Proposal, SiteVisit, PipelineStageKey, Task, Activity } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate, formatRelativeDate, getPriorityBadge, getPipelineStageBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Breadcrumbs } from '@/modules/core/components/ui/Breadcrumbs';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { LostReasonModal } from '@/modules/core/components/LostReasonModal';

import { WonCelebrationModal } from '@/modules/core/components/WonCelebrationModal';

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
  const [inquiry, setInquiry] = useState<Inquiry | undefined>(StorageService.getInquiryById(inquiryId));
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatchResult[]>(
    inquiry ? StorageService.matchPropertiesForInquiry(inquiry) : []
  );
  const [proposals, setProposals] = useState<Proposal[]>(
    inquiry ? StorageService.getProposals().filter((p) => p.inquiryId === inquiry.id) : []
  );
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>(
    inquiry ? StorageService.getSiteVisits().filter((s) => s.inquiryId === inquiry.id) : []
  );
  const [tasks, setTasks] = useState<Task[]>(
    inquiry ? StorageService.getTasks().filter((t) => t.inquiryId === inquiry.id) : []
  );
  const [activities, setActivities] = useState<Activity[]>(
    inquiry ? StorageService.getActivities(inquiry.companyId).filter((a) => !a.inquiryId || a.inquiryId === inquiry.id) : []
  );

  useEffect(() => {
    let isMounted = true;
    const fetchInquiry = async () => {
      setLoading(true);
      try {
        const res = await InquiryService.getInquiryById(inquiryId);
        if (isMounted && res.success && res.data) {
          setInquiry(res.data);
          setPropertyMatches(StorageService.matchPropertiesForInquiry(res.data));
          setProposals(StorageService.getProposals().filter((p) => p.inquiryId === res.data!.id));
          setSiteVisits(StorageService.getSiteVisits().filter((s) => s.inquiryId === res.data!.id));
          setTasks(StorageService.getTasks().filter((t) => t.inquiryId === res.data!.id));
          setActivities(
            StorageService.getActivities(res.data!.companyId).filter((a) => !a.inquiryId || a.inquiryId === res.data!.id)
          );
        } else if (isMounted) {
          const localInq = StorageService.getInquiryById(inquiryId);
          setInquiry(localInq);
          if (localInq) {
            setPropertyMatches(StorageService.matchPropertiesForInquiry(localInq));
            setProposals(StorageService.getProposals().filter((p) => p.inquiryId === localInq.id));
            setSiteVisits(StorageService.getSiteVisits().filter((s) => s.inquiryId === localInq.id));
            setTasks(StorageService.getTasks().filter((t) => t.inquiryId === localInq.id));
            setActivities(
              StorageService.getActivities(localInq.companyId).filter((a) => !a.inquiryId || a.inquiryId === localInq.id)
            );
          }
        }
      } catch {
        if (isMounted) {
          const localInq = StorageService.getInquiryById(inquiryId);
          setInquiry(localInq);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInquiry();
    return () => {
      isMounted = false;
    };
  }, [inquiryId]);

  const pipelineStages = StorageService.getPipelineStages();

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
  });

  // Task form
  const [taskForm, setTaskForm] = useState({
    taskType: 'Follow-up' as Task['taskType'],
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00 AM',
    priority: 'High' as Task['priority'],
  });

  const refreshData = () => {
    const updated = StorageService.getInquiryById(inquiryId);
    if (updated) {
      setInquiry(updated);
      setPropertyMatches(StorageService.matchPropertiesForInquiry(updated));
      setProposals(StorageService.getProposals().filter((p) => p.inquiryId === updated.id));
      setSiteVisits(StorageService.getSiteVisits().filter((s) => s.inquiryId === updated.id));
      setTasks(StorageService.getTasks().filter((t) => t.inquiryId === updated.id));
      setActivities(
        StorageService.getActivities(updated.companyId).filter((a) => !a.inquiryId || a.inquiryId === updated.id)
      );
    }
  };

  if (!inquiry) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-bold text-foreground">Inquiry Record Not Found</h3>
        <Button size="sm" onClick={onBack} className="mt-4">
          Back to Inquiries
        </Button>
      </div>
    );
  }

  // Stage change handler
  const handleStageChange = (newStage: PipelineStageKey) => {
    if (newStage === 'lost') {
      setIsLostModalOpen(true);
      return;
    }
    if (newStage === 'won') {
      setIsWonModalOpen(true);
      return;
    }

    StorageService.changeInquiryStage(inquiry.id, newStage);
    refreshData();
    success('Stage Updated', `Inquiry advanced to ${newStage.replace(/_/g, ' ').toUpperCase()}`);
  };

  // Lost Confirmation
  const handleConfirmLost = (data: { lostReason: string; lostComments: string; lostDate: string; closedByUserId: string }) => {
    StorageService.markInquiryLost(inquiry.id, data);
    refreshData();
    success('Opportunity Marked Lost', `Reason recorded: ${data.lostReason}`);
  };

  // Won Confirmation
  const handleConfirmWon = (data: { wonPropertyId: string; wonPropertyName: string; wonFinalValueMonthlyINR: number; wonComments: string; wonDate: string }) => {
    StorageService.markInquiryWon(inquiry.id, data);
    refreshData();
    success('Deal Won!', `Lease finalized for ${data.wonPropertyName}`);
  };

  // Proposal Creation
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const prop = StorageService.getPropertyById(proposalForm.propertyId) || propertyMatches[0]?.property;
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

      if (res.success && res.data) {
        try {
          StorageService.createProposal(res.data);
        } catch {}
      } else {
        StorageService.createProposal({
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
      }
    } catch {
      StorageService.createProposal({
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
    }

    // Advance stage to proposal if earlier
    if (inquiry.stage !== 'proposal' && inquiry.stage !== 'negotiation' && inquiry.stage !== 'won') {
      StorageService.changeInquiryStage(inquiry.id, 'proposal');
    }

    setIsProposalModalOpen(false);
    refreshData();
    success('Proposal Created & Sent', `Delivered commercial proposal for ${prop.name}`);
  };

  // Site Visit Creation
  const handleCreateSiteVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = StorageService.getPropertyById(siteVisitForm.propertyId) || propertyMatches[0]?.property;
    if (!prop) return;

    StorageService.createSiteVisit({
      inquiryId: inquiry.id,
      inquiryNumber: inquiry.inquiryNumber,
      companyId: inquiry.companyId,
      companyName: inquiry.companyName,
      contactName: inquiry.contactName,
      contactPhone: inquiry.contactPhone,
      propertyId: prop.id,
      propertyName: prop.name,
      propertyLocation: prop.location,
      visitDate: siteVisitForm.visitDate,
      visitTime: siteVisitForm.visitTime,
      assignedSalespersonId: inquiry.salespersonId,
      assignedSalespersonName: inquiry.salespersonName,
      status: 'Scheduled',
      notes: siteVisitForm.notes,
    });

    // Advance stage to site_visit if earlier
    if (inquiry.stage !== 'site_visit' && inquiry.stage !== 'negotiation' && inquiry.stage !== 'won') {
      StorageService.changeInquiryStage(inquiry.id, 'site_visit');
    }

    setIsSiteVisitModalOpen(false);
    refreshData();
    success('Site Visit Scheduled', `Visit confirmed for ${siteVisitForm.visitDate} at ${prop.name}`);
  };

  // Task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.description.trim()) return;

    try {
      const res = await TaskService.createTask({
        companyId: inquiry.companyId,
        companyName: inquiry.companyName,
        inquiryId: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        assignedUserId: inquiry.salespersonId,
        assignedUserName: inquiry.salespersonName,
        taskType: taskForm.taskType,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        dueTime: taskForm.dueTime,
        priority: taskForm.priority,
        status: 'Pending',
      });

      if (res.success && res.data) {
        try {
          StorageService.createTask(res.data);
        } catch {}
      } else {
        StorageService.createTask({
          companyId: inquiry.companyId,
          companyName: inquiry.companyName,
          inquiryId: inquiry.id,
          inquiryNumber: inquiry.inquiryNumber,
          assignedUserId: inquiry.salespersonId,
          assignedUserName: inquiry.salespersonName,
          taskType: taskForm.taskType,
          description: taskForm.description,
          dueDate: taskForm.dueDate,
          dueTime: taskForm.dueTime,
          priority: taskForm.priority,
          status: 'Pending',
        });
      }
    } catch {
      StorageService.createTask({
        companyId: inquiry.companyId,
        companyName: inquiry.companyName,
        inquiryId: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        assignedUserId: inquiry.salespersonId,
        assignedUserName: inquiry.salespersonName,
        taskType: taskForm.taskType,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        dueTime: taskForm.dueTime,
        priority: taskForm.priority,
        status: 'Pending',
      });
    }

    setIsTaskModalOpen(false);
    setTaskForm({
      taskType: 'Follow-up',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '11:00 AM',
      priority: 'High',
    });
    refreshData();
    success('Task Scheduled', 'Follow-up task logged for inquiry.');
  };

  const prioBadge = getPriorityBadge(inquiry.priority);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Inquiries', onClick: onBack },
          { label: inquiry.companyName, onClick: () => onNavigateToCompany(inquiry.companyId) },
          { label: inquiry.inquiryNumber },
        ]}
      />

      {/* 1. Header Operational Workspace Banner */}
      <div className="bg-surface rounded-card border border-border shadow-subtle p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-base font-mono font-bold bg-fairway-100 text-fairway-800 dark:bg-fairway-950/70 dark:text-fairway-200 dark:border-fairway-700/60 px-2.5 py-1 rounded border border-fairway-200">
                {inquiry.inquiryNumber}
              </span>
              <h1
                onClick={() => onNavigateToCompany(inquiry.companyId)}
                className="text-2xl font-black text-foreground tracking-tight hover:text-fairway-800 dark:hover:text-fairway-400 cursor-pointer"
              >
                {inquiry.companyName}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${prioBadge.bg}`}>
                {inquiry.priority} Priority
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize border ${getPipelineStageBadge(inquiry.stage).className}`}>
                {inquiry.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-1.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{inquiry.location} ({inquiry.targetCorridor})</span>
              <span>·</span>
              <span>Inquiry Date: {formatDate(inquiry.inquiryDate)}</span>
              <span>·</span>
              <span>Owner: <strong>{inquiry.salespersonName}</strong></span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <Button size="xs" variant="outline" onClick={() => setIsProposalModalOpen(true)} leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />}>
                  Draft Proposal
                </Button>
                <Button size="xs" variant="outline" onClick={() => setIsSiteVisitModalOpen(true)} leftIcon={<Calendar className="w-3.5 h-3.5 text-orange-600" />}>
                  Schedule Site Visit
                </Button>
                <Button size="xs" variant="outline" onClick={() => setIsTaskModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5 text-amber-600" />}>
                  Add Task
                </Button>
              </>
            )}
            <Button size="xs" variant="secondary" onClick={onNavigateToMap} leftIcon={<MapPin className="w-3.5 h-3.5 text-fairway-700" />}>
              Corridor Map
            </Button>
          </div>
        </div>

        {/* 2. Interactive Pipeline Stages Stepper */}
        <div className="pt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-2">
            Pipeline Progression Workflow
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
            {pipelineStages.map((stage) => {
              const isCurrent = inquiry.stage === stage.key;
              const currentStageOrder = pipelineStages.find((s) => s.key === inquiry.stage)?.order || 1;
              const isPassed = stage.order < currentStageOrder;

              return (
                <button
                  key={stage.id}
                  disabled={!canEdit}
                  onClick={() => handleStageChange(stage.key)}
                  className={`p-2 rounded-md border text-center transition-all text-xs select-none ${
                    isCurrent
                      ? 'bg-fairway-700 text-white font-bold border-fairway-800 shadow-subtle scale-102'
                      : isPassed
                      ? 'bg-fairway-100/70 text-fairway-900 font-semibold border-fairway-300'
                      : 'bg-surface-muted/60 text-foreground-muted border-border hover:border-slate-300'
                  }`}
                  title={stage.description}
                >
                  <span className="text-[10px] block font-mono">0{stage.order}</span>
                  <span className="truncate block font-medium leading-tight mt-0.5">{stage.label}</span>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-fairway-600" />
                <span>Customer Requirement Summary</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 text-xs">
              <p className="text-sm text-foreground font-medium leading-relaxed bg-surface-muted/40 p-3.5 rounded-lg border border-border">
                &ldquo;{inquiry.requirement}&rdquo;
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-surface border border-border rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Required Area</span>
                  <span className="text-lg font-black text-foreground mt-1 block">{formatSqFt(inquiry.requiredAreaSqFt)}</span>
                </div>

                <div className="p-3 bg-surface border border-border rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Monthly Budget</span>
                  <span className="text-lg font-black text-fairway-800 mt-1 block">{formatINR(inquiry.budgetMonthlyINR, true)}</span>
                  <span className="text-[10px] text-foreground-muted">~ ₹{(inquiry.budgetMonthlyINR / (inquiry.requiredAreaSqFt || 1)).toFixed(1)}/sq.ft</span>
                </div>

                <div className="p-3 bg-surface border border-border rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Dock Levelers</span>
                  <span className="text-lg font-black text-foreground mt-1 block">{inquiry.dockRequirements} Docks</span>
                </div>

                <div className="p-3 bg-surface border border-border rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Possession Date</span>
                  <span className="text-sm font-bold text-foreground mt-1 block">{formatDate(inquiry.possessionDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-foreground-muted">
                <span className="bg-surface-muted/60 p-2 rounded border border-border">
                  Clear Height: <strong className="text-foreground">{inquiry.clearHeightFt || 12} Meters</strong>
                </span>
                <span className="bg-surface-muted/60 p-2 rounded border border-border">
                  Floor Load: <strong className="text-foreground">{inquiry.floorLoadCapacity || '6 MT/sq.m'}</strong>
                </span>
                <span className="bg-surface-muted/60 p-2 rounded border border-border">
                  Power: <strong className="text-foreground">{inquiry.powerKVA || 1000} KVA</strong>
                </span>
              </div>

              {inquiry.specialRequirements && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-md text-amber-900 text-xs">
                  <strong>Special Conditions:</strong> {inquiry.specialRequirements}
                </div>
              )}
            </div>
          </Card>

          {/* Explainable Property Matching Engine (PRD Section 13 / Design Brief Section 13.12) */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-600" />
                  <span>Rule-Based Matching Warehouse Inventory</span>
                </CardTitle>
                <p className="text-xs text-foreground-muted">
                  Explainable multi-criteria compatibility ranking based on Area, Location, Docks & Timeline
                </p>
              </div>
            </CardHeader>

            <div className="space-y-4">
              {propertyMatches.map((match) => {
                const prop = match.property;
                return (
                  <div
                    key={prop.id}
                    className={`p-4 rounded-card border transition-all ${
                      match.overallScore >= 85
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-subtle'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-fairway-100 text-fairway-800 font-black text-xs flex items-center justify-center border border-fairway-200 shrink-0">
                          {prop.code.split('-')[1]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              onClick={() => onNavigateToProperty(prop.id)}
                              className="text-sm font-bold text-foreground hover:text-fairway-800 cursor-pointer"
                            >
                              {prop.name}
                            </h4>
                            <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                              {match.overallScore}% Match
                            </span>
                          </div>
                          <span className="text-[11px] text-foreground-muted block mt-0.5">
                            {prop.location} · {prop.city} ({prop.corridor})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                          >
                            Draft Proposal
                          </Button>
                        )}
                        <Button size="xs" variant="outline" onClick={() => onNavigateToProperty(prop.id)}>
                          View Specs
                        </Button>
                      </div>
                    </div>

                    {/* Explainability Badges (Mandated by Section 13.12) */}
                    <div className="py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1.5">
                        Matching Criteria Explainability:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {match.matchBreakdown.details.map((detail, idx) => (
                          <div
                            key={idx}
                            className={`p-1.5 rounded text-[11px] flex items-center gap-1.5 ${
                              detail.startsWith('✓')
                                ? 'bg-emerald-50 text-emerald-800 font-medium'
                                : detail.startsWith('~')
                                ? 'bg-amber-50 text-amber-800 font-medium'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key property commercial numbers */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/70 text-foreground-muted">
                      <span>
                        Available: <strong className="text-foreground">{formatSqFt(prop.availableAreaSqFt)}</strong>
                      </span>
                      <span>
                        Base Rent: <strong className="text-foreground">₹{prop.rentPerSqFtINR}/sq.ft/mo</strong>
                      </span>
                      <span>
                        Clear Height: <strong className="text-foreground">{prop.clearHeightFt}m</strong>
                      </span>
                      <span>
                        Docks: <strong className="text-foreground">{prop.docksCount}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Proposals & Commercial Deals */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>Proposals for this Inquiry ({proposals.length})</span>
                </CardTitle>
              </div>
              {canEdit && (
                <Button size="xs" variant="outline" onClick={() => setIsProposalModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  New Proposal
                </Button>
              )}
            </CardHeader>

            {proposals.length === 0 ? (
              <div className="py-6 text-center text-xs text-foreground-muted">No formal proposals generated yet.</div>
            ) : (
              <div className="space-y-3">
                {proposals.map((prp) => (
                  <div key={prp.id} className="p-3.5 bg-surface border border-border rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-purple-50 text-purple-900 px-2 py-0.5 rounded border border-purple-200">
                          {prp.proposalNumber}
                        </span>
                        <span className="font-bold text-foreground">{prp.propertyName}</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.2 rounded">
                          {prp.status}
                        </span>
                      </div>
                      <p className="text-foreground-muted text-[11px] mt-1">
                        {formatSqFt(prp.proposedAreaSqFt)} @ ₹{prp.baseRentPerSqFtINR}/sq.ft · Total Monthly: <strong>{formatINR(prp.totalMonthlyRentINR)}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => success('Proposal PDF', `Downloaded ${prp.documentName}`)}
                      >
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: CONTEXT & ACTIVITY (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Contact & Company Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Decision Maker Context</CardTitle>
            </CardHeader>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Contact Person</span>
                <span className="font-bold text-foreground text-sm block mt-0.5">{inquiry.contactName || 'Plant Operations Head'}</span>
              </div>

              {inquiry.contactPhone && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Direct Phone</span>
                  <a href={`tel:${inquiry.contactPhone}`} className="font-semibold text-fairway-800 hover:underline flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-fairway-600" />
                    <span>{inquiry.contactPhone}</span>
                  </a>
                </div>
              )}

              {inquiry.contactEmail && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Email</span>
                  <a href={`mailto:${inquiry.contactEmail}`} className="font-semibold text-fairway-800 hover:underline flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                    <span className="truncate">{inquiry.contactEmail}</span>
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <Button size="xs" variant="outline" className="w-full" onClick={() => onNavigateToCompany(inquiry.companyId)}>
                  Open Company Profile →
                </Button>
              </div>
            </div>
          </Card>

          {/* Follow-up Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Follow-ups ({tasks.length})</span>
              </CardTitle>
              {canEdit && (
                <Button size="xs" variant="outline" onClick={() => setIsTaskModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Task
                </Button>
              )}
            </CardHeader>

            <div className="space-y-2.5">
              {tasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-foreground-muted">No pending tasks for this inquiry.</div>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="p-2.5 bg-surface-muted/50 rounded-lg border border-border text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{t.taskType}</span>
                      <span className="text-[10px] font-bold text-amber-800">{formatRelativeDate(t.dueDate)}</span>
                    </div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">{t.description}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Site Visits Scheduled */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span>Site Inspections ({siteVisits.length})</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-2.5">
              {siteVisits.length === 0 ? (
                <div className="py-4 text-center text-xs text-foreground-muted">No site visits scheduled.</div>
              ) : (
                siteVisits.map((sv) => (
                  <div key={sv.id} className="p-2.5 bg-orange-50/40 rounded-lg border border-orange-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-950">{sv.propertyName}</span>
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded">
                        {sv.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted mt-1">
                      Date: <strong>{formatDate(sv.visitDate)} at {sv.visitTime}</strong>
                    </p>
                    {sv.clientFeedback && (
                      <p className="text-[11px] text-foreground mt-1 bg-surface p-1.5 rounded border border-border">
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
              const prop = StorageService.getPropertyById(e.target.value);
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

          <div className="p-3 bg-fairway-50 rounded-lg border border-fairway-200">
            <span className="text-[11px] font-bold text-fairway-900 block">Total Monthly Commercial Value:</span>
            <span className="text-base font-extrabold text-fairway-800">
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
