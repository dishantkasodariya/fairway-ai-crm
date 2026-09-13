import React, { useState, useRef, useEffect } from 'react';
import {
  Kanban,
  Plus,
  Search,
  User,
  Clock,
  MapPin,
  AlertTriangle,
  Trophy,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  Layers,
  ArrowUpRight,
  Building2,
  Warehouse,
  X,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Inquiry, PipelineStageKey, PipelineStageConfig, PriorityLevel } from '@/modules/core/types';
import { formatINR, formatSqFt, formatRelativeDate, getPriorityBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Modal } from '@/modules/core/components/ui/Modal';
import { LostReasonModal } from '@/modules/core/components/LostReasonModal';
import { WonCelebrationModal } from '@/modules/core/components/WonCelebrationModal';
import { EditInquiryModal } from '@/modules/inquiries/components/EditInquiryModal';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { Combobox } from '@/modules/core/components/ui/combobox-1';

export interface PipelineKanbanViewProps {
  onSelectInquiry: (id: string) => void;
  onOpenNewInquiry: () => void;
}

export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  onSelectInquiry,
  onOpenNewInquiry,
}) => {
  const { canEdit, currentUser, users, isSales } = useAuth();
  const { success, error } = useToast();

  const [inquiries, setInquiries] = useState<Inquiry[]>(() => StorageService.getInquiries());
  const stages = StorageService.getPipelineStages();

  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag-and-drop state
  const [draggedInquiryId, setDraggedInquiryId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStageKey | null>(null);

  // 3-dot Card Actions Popover
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Modals state
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [lostTargetInquiry, setLostTargetInquiry] = useState<Inquiry | null>(null);
  const [wonTargetInquiry, setWonTargetInquiry] = useState<Inquiry | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<Inquiry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Board Horizontal Scroll Ref
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const refreshData = async () => {
    const local = StorageService.getInquiries();
    if (local && local.length > 0) {
      setInquiries(local);
    }
    try {
      const res = await InquiryService.getInquiries({ pageSize: 500 });
      if (res && res.data && res.data.length > 0) {
        setInquiries(res.data);
        StorageService.saveInquiries(res.data);
      }
    } catch {
      // StorageService fallback active
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Close card popover on click outside or escape
  useEffect(() => {
    const handleGlobalClick = () => setActiveCardMenuId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCardMenuId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inq.inquiryNumber.toLowerCase().includes(q) ||
      inq.companyName.toLowerCase().includes(q) ||
      inq.location.toLowerCase().includes(q);

    const matchesOwner = ownerFilter === 'all' || inq.salespersonId === ownerFilter;
    const matchesPriority = priorityFilter === 'all' || inq.priority === priorityFilter;
    const matchesCorridor =
      corridorFilter === 'all' || inq.targetCorridor === corridorFilter || inq.location === corridorFilter;

    return matchesQuery && matchesOwner && matchesPriority && matchesCorridor;
  });

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (canEdit === false) return;
    setDraggedInquiryId(id);
    setActiveCardMenuId(null);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Auto-scroll board horizontally when dragging card near left or right edges
  const handleBoardDragOver = (e: React.DragEvent) => {
    if (!boardContainerRef.current) return;
    const container = boardContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const edgeZone = 140; // 140px threshold from left or right edge

    if (x < edgeZone && x >= 0) {
      const speed = Math.max(8, Math.round((edgeZone - x) / 4));
      container.scrollLeft -= speed;
    } else if (x > rect.width - edgeZone && x <= rect.width) {
      const speed = Math.max(8, Math.round((x - (rect.width - edgeZone)) / 4));
      container.scrollLeft += speed;
    }
  };

  const handleDragOver = (e: React.DragEvent, stageKey: PipelineStageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
    handleBoardDragOver(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column boundary
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: PipelineStageKey) => {
    e.preventDefault();
    setDragOverStage(null);
    const inqId = e.dataTransfer.getData('text/plain') || draggedInquiryId;
    if (!inqId) return;

    const targetInq = inquiries.find((i) => i.id === inqId) || StorageService.getInquiryById(inqId);
    if (!targetInq || targetInq.stage === targetStage) {
      setDraggedInquiryId(null);
      return;
    }

    if (targetStage === 'lost') {
      setLostTargetInquiry(targetInq);
      setDraggedInquiryId(null);
      return;
    }

    if (targetStage === 'won') {
      setWonTargetInquiry(targetInq);
      setDraggedInquiryId(null);
      return;
    }

    // 1. Optimistic UI update so card moves immediately
    setInquiries((prev) =>
      prev.map((i) => (i.id === inqId ? { ...i, stage: targetStage } : i))
    );
    setDraggedInquiryId(null);

    // 2. Persist locally to StorageService
    StorageService.changeInquiryStage(inqId, targetStage);

    // 3. Persist to Backend database via API
    try {
      await InquiryService.updateInquiry(inqId, { stage: targetStage });
    } catch (err) {
      console.warn('Backend stage update notice:', err);
    }

    success('Stage Updated', `Moved ${targetInq.inquiryNumber} to ${targetStage.replace(/_/g, ' ').toUpperCase()}`);
  };

  // Move stage programmatically from 3-dot menu
  const handleMoveStage = async (inq: Inquiry, targetStage: PipelineStageKey) => {
    setActiveCardMenuId(null);
    if (inq.stage === targetStage) return;

    if (targetStage === 'lost') {
      setLostTargetInquiry(inq);
      return;
    }

    if (targetStage === 'won') {
      setWonTargetInquiry(inq);
      return;
    }

    // 1. Optimistic UI update
    setInquiries((prev) =>
      prev.map((i) => (i.id === inq.id ? { ...i, stage: targetStage } : i))
    );

    // 2. Local StorageService
    StorageService.changeInquiryStage(inq.id, targetStage);

    // 3. Backend API
    try {
      await InquiryService.updateInquiry(inq.id, { stage: targetStage });
    } catch (err) {
      console.warn('Backend stage update notice:', err);
    }

    success('Stage Updated', `Moved ${inq.inquiryNumber} to ${targetStage.replace(/_/g, ' ').toUpperCase()}`);
  };

  // Prompt delete inquiry from 3-dot menu using custom project Modal
  const promptDeleteInquiry = (inq: Inquiry) => {
    setActiveCardMenuId(null);
    setInquiryToDelete(inq);
    setIsDeleteModalOpen(true);
  };

  const executeDeleteInquiry = async () => {
    if (!inquiryToDelete) return;
    setIsDeleting(true);
    try {
      await InquiryService.deleteInquiry(inquiryToDelete.id);
      StorageService.deleteInquiry(inquiryToDelete.id);
      success('Inquiry Deleted', `Removed ${inquiryToDelete.inquiryNumber} (${inquiryToDelete.companyName}) from CRM pipeline.`);
      setIsDeleteModalOpen(false);
      setInquiryToDelete(null);
      await refreshData();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete inquiry');
    } finally {
      setIsDeleting(false);
    }
  };

  // Horizontal scroll controls
  const scrollBoard = (direction: 'left' | 'right') => {
    if (boardContainerRef.current) {
      const scrollAmount = 340;
      boardContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const totalBoardValue = filteredInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden text-left space-y-3">
      {/* 1. Header Bar (Shrink-0) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <span className="text-[11px] font-bold text-fairway-700 dark:text-fairway-400 uppercase tracking-wider flex items-center gap-1.5">
            <Kanban className="w-3.5 h-3.5" />
            CRM / Visual Pipeline
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <span>Sales Pipeline Kanban</span>
            {isSales && (
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                My Leads
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
              Filtered Value ({filteredInquiries.length} leads)
            </span>
            <span className="text-sm font-black text-foreground">{formatINR(totalBoardValue, true)} / mo</span>
          </div>

          {canEdit && (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenNewInquiry}
              leftIcon={<Plus className="w-4 h-4" />}
              className="rounded-xl px-3.5 py-1.5 font-bold shadow-xs shrink-0"
            >
              New Inquiry
            </Button>
          )}
        </div>
      </div>

      {/* 2. Compact Filters & Horizontal Scroll Bar (Shrink-0) */}
      <div className="shrink-0 bg-surface p-2.5 rounded-xl border border-border shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Left: Quick Search */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-sm">
          <div className="relative w-full flex items-center">
            <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search company, inquiry #, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-muted/70 pl-8 pr-8 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:border-fairway-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-foreground-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Center: Dropdown Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <div className="w-44">
            <Combobox
              options={[
                { value: 'all', label: 'All Owners' },
                ...users.map((u) => ({ value: u.id, label: u.name })),
              ]}
              value={ownerFilter}
              onChange={(val) => setOwnerFilter(val || 'all')}
              placeholder="All Owners"
            />
          </div>

          <div className="w-40">
            <Combobox
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'High', label: 'High Priority' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Low', label: 'Low' },
              ]}
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val || 'all')}
              placeholder="All Priorities"
            />
          </div>

          {(searchQuery || ownerFilter !== (isSales ? currentUser.id : 'all') || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setOwnerFilter(isSales ? currentUser.id : 'all');
                setPriorityFilter('all');
              }}
              className="text-fairway-700 dark:text-fairway-400 font-bold text-xs whitespace-nowrap px-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Right: Board Horizontal Navigation Scroll Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
          <span className="text-[11px] text-foreground-muted mr-1 hidden lg:inline">Scroll Board:</span>
          <button
            type="button"
            onClick={() => scrollBoard('left')}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition-colors cursor-pointer shadow-2xs"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBoard('right')}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition-colors cursor-pointer shadow-2xs"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Screen-Height-Fit Kanban Board (Fills remaining height, horizontally scrolls) */}
      <div
        ref={boardContainerRef}
        onDragOver={handleBoardDragOver}
        className="flex-1 min-h-0 flex gap-3 overflow-x-auto overflow-y-hidden pb-2.5 pt-0.5 select-none scroll-smooth"
      >
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
              className={`w-72 sm:w-80 shrink-0 h-full flex flex-col rounded-2xl border transition-all duration-150 ${
                isDropTarget
                  ? 'border-fairway-600 bg-fairway-500/5 ring-2 ring-fairway-500/30 scale-[1.01]'
                  : 'border-border bg-surface-muted/40'
              }`}
            >
              {/* Column Header (Fixed) */}
              <div className="shrink-0 p-3 border-b border-border bg-surface rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-border"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-bold text-foreground truncate">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold bg-surface-muted text-foreground px-2 py-0.5 rounded-full border border-border">
                    {columnInquiries.length}
                  </span>
                </div>
              </div>

              {/* Column Value Strip (Fixed) */}
              <div className="shrink-0 px-3 py-1 bg-surface-muted/60 border-b border-border/60 text-[10px] text-foreground-muted flex items-center justify-between">
                <span>Value:</span>
                <span className="font-mono font-bold text-foreground">
                  {columnTotalValue > 0 ? formatINR(columnTotalValue, true) : '₹0'}
                </span>
              </div>

              {/* Inquiries Cards Stack (Vertical Scroll inside column only!) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2.5">
                {columnInquiries.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center text-[11px] text-foreground-muted border border-dashed border-border rounded-xl bg-surface/50 gap-1">
                    <Layers className="w-4 h-4 opacity-40" />
                    <span>Drop opportunities here</span>
                  </div>
                ) : (
                  columnInquiries.map((inq) => {
                    const prio = getPriorityBadge(inq.priority);
                    const isOverdue =
                      inq.nextFollowUpDate &&
                      inq.status === 'Active' &&
                      new Date(inq.nextFollowUpDate) < new Date(new Date().toDateString());

                    const isMenuOpen = activeCardMenuId === inq.id;

                    return (
                      <div
                        key={inq.id}
                        draggable={canEdit !== false}
                        onDragStart={(e) => handleDragStart(e, inq.id)}
                        onClick={() => {
                          StorageService.upsertInquiry(inq);
                          onSelectInquiry(inq.id);
                        }}
                        className={`group relative bg-surface p-3.5 rounded-xl border border-border shadow-2xs hover:border-fairway-500/60 hover:shadow-md cursor-pointer transition-all duration-150 select-none ${
                          draggedInquiryId === inq.id ? 'opacity-40 scale-95 ring-2 ring-fairway-400' : ''
                        }`}
                      >
                        {/* Top: Inquiry Number, Priority, and Vertical 3-Dot Actions */}
                        <div className="flex items-center justify-between gap-1.5 pb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-white dark:border-primary/40 shrink-0">
                              {inq.inquiryNumber}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${prio?.bg || 'bg-slate-100 text-slate-700'}`}>
                              {inq.priority || 'Normal'}
                            </span>
                          </div>

                          {/* 3-Dot Card Action Trigger */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCardMenuId(isMenuOpen ? null : inq.id);
                              }}
                              className={`p-1 rounded-md transition-all cursor-pointer ${
                                isMenuOpen
                                  ? 'text-foreground bg-surface-muted ring-1 ring-border opacity-100'
                                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted opacity-70 sm:opacity-0 group-hover:opacity-100'
                              }`}
                              title="Card Actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu on 3-Dot Click */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-52 bg-surface rounded-xl border border-border shadow-2xl p-1.5 z-50 animate-scale-in text-left space-y-0.5"
                              >
                                <div className="px-2.5 py-1 text-[10px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border/60 mb-1">
                                  Inquiry Actions
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCardMenuId(null);
                                    StorageService.upsertInquiry(inq);
                                    onSelectInquiry(inq.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-surface-muted transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-fairway-600" />
                                  <span>View Details</span>
                                </button>

                                {canEdit && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveCardMenuId(null);
                                        setEditingInquiry(inq);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Edit Inquiry</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => promptDeleteInquiry(inq)}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Delete Inquiry</span>
                                    </button>
                                  </>
                                )}

                                <div className="border-t border-border/60 my-1" />

                                <div className="px-2.5 py-0.5 text-[9px] font-bold text-foreground-muted uppercase tracking-wider">
                                  Quick Move Stage
                                </div>

                                <div className="max-h-36 overflow-y-auto space-y-0.5 pt-0.5">
                                  {stages
                                    .filter((s) => s.key !== inq.stage)
                                    .map((s) => (
                                      <button
                                        key={s.key}
                                        type="button"
                                        onClick={() => handleMoveStage(inq, s.key)}
                                        className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                                      >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                        <span className="truncate">{s.label}</span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Company Name */}
                        <h4 className="text-xs font-bold text-foreground hover:text-fairway-700 dark:hover:text-fairway-400 leading-tight truncate">
                          {inq.companyName}
                        </h4>

                        {/* Specs */}
                        <div className="text-[11px] text-foreground-muted mt-1.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <Warehouse className="w-3 h-3 text-foreground-muted shrink-0" />
                              {formatSqFt(inq.requiredAreaSqFt)}
                            </span>
                            <span className="font-mono text-foreground font-bold">
                              {formatINR(inq.budgetMonthlyINR, true)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{inq.location}</span>
                          </div>
                        </div>

                        {/* Follow-up & Owner Footer */}
                        <div className="pt-2 mt-2 border-t border-border/70 flex items-center justify-between text-[10px]">
                          {inq.nextFollowUpDate ? (
                            <div className="flex items-center gap-1">
                              <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                              <span className={isOverdue ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-foreground-muted'}>
                                {formatRelativeDate(inq.nextFollowUpDate)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-foreground-muted font-mono text-[9px]">No follow-up</span>
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

      {/* Backdrop for 3-Dot Card Menu (dismisses popover when clicking anywhere outside) */}
      {activeCardMenuId && (
        <div
          className="fixed inset-0 z-40 bg-transparent cursor-default"
          onClick={(e) => {
            e.stopPropagation();
            setActiveCardMenuId(null);
          }}
        />
      )}

      {/* Edit Inquiry Modal */}
      {editingInquiry && (
        <EditInquiryModal
          isOpen={!!editingInquiry}
          onClose={() => setEditingInquiry(null)}
          inquiry={editingInquiry}
          onSuccess={() => {
            refreshData();
            setEditingInquiry(null);
          }}
        />
      )}

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

      {/* Delete Confirmation Modal (Custom Project UI Modal) */}
      {isDeleteModalOpen && inquiryToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
              setInquiryToDelete(null);
            }
          }}
          title={
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">Delete Inquiry</span>
            </div>
          }
          description="Are you sure you want to permanently delete this inquiry record from the pipeline?"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-1.5 text-foreground">
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                You are deleting: <span className="font-bold underline">{inquiryToDelete.inquiryNumber}</span> ({inquiryToDelete.companyName})
              </p>
              <p className="text-[11px] text-foreground-muted">
                This will remove the inquiry record ({inquiryToDelete.requirement}) from the active pipeline and CRM database. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setInquiryToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={executeDeleteInquiry}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Inquiry'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const PipelinePage = PipelineKanbanView;
export default PipelinePage;

