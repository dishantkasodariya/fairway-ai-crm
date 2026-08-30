import React, { useState } from 'react';
import {
  Kanban,
  Plus,
  Filter,
  Search,
  User,
  Clock,
  MapPin,
  AlertTriangle,
  Trophy,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Inquiry, PipelineStageKey, PipelineStageConfig } from '@/modules/core/types';
import { formatINR, formatSqFt, formatRelativeDate, getPriorityBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { LostReasonModal } from '@/modules/core/components/LostReasonModal';
import { WonCelebrationModal } from '@/modules/core/components/WonCelebrationModal';

export interface PipelineKanbanViewProps {
  onSelectInquiry: (id: string) => void;
  onOpenNewInquiry: () => void;
}

export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  onSelectInquiry,
  onOpenNewInquiry,
}) => {
  const { canEdit, currentUser, users, isSales } = useAuth();
  const { success } = useToast();

  const [inquiries, setInquiries] = useState<Inquiry[]>(StorageService.getInquiries());
  const stages = StorageService.getPipelineStages();

  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag-and-drop state
  const [draggedInquiryId, setDraggedInquiryId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStageKey | null>(null);

  // Lost & Won modals
  const [lostTargetInquiry, setLostTargetInquiry] = useState<Inquiry | null>(null);
  const [wonTargetInquiry, setWonTargetInquiry] = useState<Inquiry | null>(null);

  const refreshData = () => {
    setInquiries(StorageService.getInquiries());
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inq.inquiryNumber.toLowerCase().includes(q) ||
      inq.companyName.toLowerCase().includes(q) ||
      inq.location.toLowerCase().includes(q);

    const matchesOwner = ownerFilter === 'all' || inq.salespersonId === ownerFilter;
    const matchesPriority = priorityFilter === 'all' || inq.priority === priorityFilter;
    const matchesCorridor = corridorFilter === 'all' || inq.targetCorridor === corridorFilter || inq.location === corridorFilter;

    return matchesQuery && matchesOwner && matchesPriority && matchesCorridor;
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canEdit) return;
    setDraggedInquiryId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: PipelineStageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStageKey) => {
    e.preventDefault();
    setDragOverStage(null);
    const inqId = e.dataTransfer.getData('text/plain') || draggedInquiryId;
    if (!inqId) return;

    const targetInq = StorageService.getInquiryById(inqId);
    if (!targetInq || targetInq.stage === targetStage) return;

    if (targetStage === 'lost') {
      setLostTargetInquiry(targetInq);
      return;
    }

    if (targetStage === 'won') {
      setWonTargetInquiry(targetInq);
      return;
    }

    StorageService.changeInquiryStage(inqId, targetStage);
    refreshData();
    success('Stage Updated', `Moved ${targetInq.inquiryNumber} to ${targetStage.replace(/_/g, ' ').toUpperCase()}`);
    setDraggedInquiryId(null);
  };

  const totalBoardValue = filteredInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

  return (
    <div className="space-y-4 max-w-full text-left">
      {/* Header Pattern */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Pipeline</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <Kanban className="w-6 h-6 text-fairway-600" />
            <span>Sales Pipeline Kanban</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Visual progression of active leasing opportunities across 10 defined operational stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Board Pipeline Value</span>
            <span className="text-sm font-extrabold text-fairway-800">{formatINR(totalBoardValue, true)} / month</span>
          </div>

          {canEdit && (
            <Button size="sm" variant="primary" onClick={onOpenNewInquiry} leftIcon={<Plus className="w-4 h-4" />}>
              New Inquiry
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Filters Bar */}
      <div className="bg-surface p-3 rounded-card border border-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted shrink-0" />
          <input
            type="text"
            placeholder="Search inquiries or companies in Kanban..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted/70 px-3 py-1.5 rounded-input border border-border text-xs focus:outline-none focus:border-fairway-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Owners</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {(searchQuery || ownerFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setOwnerFilter('all');
                setPriorityFilter('all');
              }}
              className="text-fairway-800 font-semibold text-xs whitespace-nowrap px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrollable Kanban Columns Container */}
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1 min-h-[calc(100vh-280px)] select-none">
        {stages.map((stage) => {
          const columnInquiries = filteredInquiries.filter((i) => i.stage === stage.key);
          const columnTotalValue = columnInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);
          const isDropTarget = dragOverStage === stage.key;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={`w-72 shrink-0 flex flex-col bg-surface-muted/40 rounded-card border transition-all duration-150 ${
                isDropTarget
                  ? 'border-fairway-600 bg-fairway-50/50 ring-2 ring-fairway-500/20'
                  : 'border-border'
              }`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border bg-surface rounded-t-card flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-bold text-foreground truncate">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold bg-surface-muted text-foreground-muted px-2 py-0.5 rounded-full border border-border">
                    {columnInquiries.length}
                  </span>
                </div>
              </div>

              {/* Column Aggregate Value */}
              <div className="px-3 py-1.5 bg-surface-muted/60 border-b border-border/60 text-[10px] text-foreground-muted flex items-center justify-between">
                <span>Value:</span>
                <span className="font-mono font-bold text-foreground">
                  {columnTotalValue > 0 ? formatINR(columnTotalValue, true) : '₹0'}
                </span>
              </div>

              {/* Inquiries Cards Stack */}
              <div className="p-2 flex-1 overflow-y-auto space-y-2.5 min-h-[150px]">
                {columnInquiries.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-[11px] text-foreground-muted border border-dashed border-border rounded-lg bg-surface-muted/40">
                    Drop opportunities here
                  </div>
                ) : (

                  columnInquiries.map((inq) => {
                    const prio = getPriorityBadge(inq.priority);
                    const isOverdue =
                      inq.nextFollowUpDate &&
                      inq.status === 'Active' &&
                      new Date(inq.nextFollowUpDate) < new Date(new Date().toDateString());

                    return (
                      <div
                        key={inq.id}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, inq.id)}
                        onClick={() => onSelectInquiry(inq.id)}
                        className={`bg-surface p-3.5 rounded-card border border-border shadow-subtle hover:border-fairway-400 hover:shadow-card cursor-pointer transition-all ${
                          draggedInquiryId === inq.id ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        {/* Card Top: Number & Priority */}
                        <div className="flex items-center justify-between pb-1.5">
                          <span className="text-[11px] font-mono font-bold text-fairway-800 bg-fairway-50 px-1.5 py-0.2 rounded border border-fairway-200 dark:bg-fairway-950/70 dark:text-fairway-200 dark:border-fairway-700/60">
                            {inq.inquiryNumber}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${prio.bg}`}>
                            {inq.priority}
                          </span>
                        </div>

                        {/* Company Name */}
                        <h4 className="text-xs font-bold text-foreground hover:text-fairway-800 dark:hover:text-fairway-400 leading-tight">
                          {inq.companyName}
                        </h4>

                        {/* Specs */}
                        <div className="text-[11px] text-foreground-muted mt-1.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{formatSqFt(inq.requiredAreaSqFt)}</span>
                            <span className="font-mono text-foreground font-bold">{formatINR(inq.budgetMonthlyINR, true)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{inq.location}</span>
                          </div>
                        </div>

                        {/* Follow-up & Owner Footer */}
                        <div className="pt-2.5 mt-2.5 border-t border-border flex items-center justify-between text-[10px]">
                          {inq.nextFollowUpDate ? (
                            <div className="flex items-center gap-1">
                              <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                              <span className={isOverdue ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-foreground-muted'}>
                                {formatRelativeDate(inq.nextFollowUpDate)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-foreground-muted">—</span>
                          )}
                          <span className="font-semibold text-foreground truncate max-w-[90px]">{inq.salespersonName}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lost Reason Modal (Enforces mandatory lost reason on drag) */}
      {lostTargetInquiry && (
        <LostReasonModal
          isOpen={!!lostTargetInquiry}
          onClose={() => setLostTargetInquiry(null)}
          inquiryNumber={lostTargetInquiry.inquiryNumber}
          companyName={lostTargetInquiry.companyName}
          onConfirm={(data) => {
            StorageService.markInquiryLost(lostTargetInquiry.id, data);
            refreshData();
            setLostTargetInquiry(null);
            success('Marked Lost', `Reason recorded for ${lostTargetInquiry.inquiryNumber}`);
          }}
        />
      )}

      {/* Won Celebration Modal */}
      {wonTargetInquiry && (
        <WonCelebrationModal
          isOpen={!!wonTargetInquiry}
          onClose={() => setWonTargetInquiry(null)}
          inquiryNumber={wonTargetInquiry.inquiryNumber}
          companyName={wonTargetInquiry.companyName}
          defaultMonthlyRent={wonTargetInquiry.budgetMonthlyINR}
          onConfirm={(data) => {
            StorageService.markInquiryWon(wonTargetInquiry.id, data);
            refreshData();
            setWonTargetInquiry(null);
            success('Deal Won!', `Congratulations on converting ${wonTargetInquiry.companyName}!`);
          }}
        />
      )}
    </div>
  );
};

export const PipelinePage = PipelineKanbanView;
export default PipelinePage;
