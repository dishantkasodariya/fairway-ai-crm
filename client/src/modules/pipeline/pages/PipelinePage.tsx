import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Kanban,
  Plus,
  Search,
  Clock,
  MapPin,
  AlertTriangle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  Warehouse,
  Layers,
  MessageSquareReply,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import { PipelineStageService } from '@/modules/core/services/pipelineStageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Inquiry, PipelineStageKey, PipelineStageConfig } from '@/modules/core/types';
import { formatINR, formatSqFt, formatRelativeDate, getPriorityBadge } from '@/modules/core/utils/formatters';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Button } from '@/modules/core/components/ui/Button';
import { Modal } from '@/modules/core/components/ui/Modal';
import { LostReasonModal } from '@/modules/core/components/LostReasonModal';
import { WonCelebrationModal } from '@/modules/core/components/WonCelebrationModal';
import { LogTouchModal } from '@/modules/core/components/LogTouchModal';
import { EditInquiryModal } from '@/modules/inquiries/components/EditInquiryModal';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';

// ==========================================
// 1. Static Card Representation (Used in DragOverlay)
// ==========================================
interface PipelineCardStaticProps {
  inquiry: Inquiry;
  isOverlay?: boolean;
}

const PipelineCardStatic: React.FC<PipelineCardStaticProps> = ({ inquiry, isOverlay = false }) => {
  const prio = getPriorityBadge(inquiry.priority);
  const isOverdue =
    inquiry.nextFollowUpDate &&
    inquiry.status === 'Active' &&
    new Date(inquiry.nextFollowUpDate) < new Date(new Date().toDateString());

  return (
    <div
      className={`bg-surface p-3 rounded-xl border border-border space-y-2 select-none text-left transition-all ${
        isOverlay
          ? 'shadow-2xl ring-2 ring-primary/50 rotate-2 cursor-grabbing scale-102 bg-surface max-w-[320px]'
          : 'shadow-2xs'
      }`}
    >
      {/* Line 1: Priority Badge */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${prio?.bg || 'bg-surface-muted text-foreground'}`}>
            {inquiry.priority || 'Normal'}
          </span>
        </div>
      </div>

      {/* Line 2: Company Name */}
      <h4 className="text-xs font-bold text-foreground leading-snug flex items-center gap-1 min-w-0">
        <span className="truncate min-w-0">{inquiry.companyName}</span>
        {inquiry.source === 'AI Discovery' && <Badge variant="primary" size="sm" className="shrink-0">AI</Badge>}
      </h4>

      {/* Line 3: Commercial Specs */}
      <div className="text-[11px] text-foreground-muted space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Warehouse className="w-3 h-3 text-foreground-muted shrink-0" />
            {inquiry.requiredAreaSqFt > 0 ? formatSqFt(inquiry.requiredAreaSqFt) : 'Area TBA'}
          </span>
          <span className="font-mono text-foreground font-bold">
            {inquiry.budgetMonthlyINR > 0 ? formatINR(inquiry.budgetMonthlyINR, true) : 'Budget TBA'}
          </span>
        </div>
        {inquiry.location && (
          <div className="flex items-center gap-1 text-[10px] text-foreground-muted truncate">
            <MapPin className="w-3 h-3 opacity-60 shrink-0" />
            <span className="truncate">{inquiry.location}</span>
          </div>
        )}
      </div>

      {/* Line 4: Footer */}
      <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[10px]">
        {inquiry.nextFollowUpDate ? (
          <div className="flex items-center gap-1">
            <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-500' : 'text-foreground-muted'}`} />
            <span className={isOverdue ? 'font-bold text-rose-500' : 'text-foreground-muted'}>
              {formatRelativeDate(inquiry.nextFollowUpDate)}
            </span>
          </div>
        ) : (
          <span className="text-foreground-muted font-mono text-[9px]">No follow-up</span>
        )}
        <div className="flex items-center gap-1.5 shrink-0 max-w-[120px]">
          <span className="w-4 h-4 rounded-full bg-surface-muted border border-border text-[8px] font-bold text-foreground flex items-center justify-center shrink-0">
            {(inquiry.salespersonName || 'U').slice(0, 2).toUpperCase()}
          </span>
          <span className="font-medium text-foreground truncate text-[10px]">
            {inquiry.salespersonName || 'Unassigned'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. Draggable Card Component
// ==========================================
interface DraggablePipelineCardProps {
  inquiry: Inquiry;
  canEdit: boolean;
  canDrag: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (id: string | null) => void;
  onSelectInquiry: (id: string) => void;
  onEditInquiry: (inq: Inquiry) => void;
  onDeleteInquiry: (inq: Inquiry) => void;
  onMoveStage: (inq: Inquiry, stageKey: PipelineStageKey) => void;
  onLogTouch: (inq: Inquiry) => void;
  stages: PipelineStageConfig[];
}

const DraggablePipelineCard: React.FC<DraggablePipelineCardProps> = ({
  inquiry,
  canEdit,
  canDrag,
  isMenuOpen,
  onToggleMenu,
  onSelectInquiry,
  onEditInquiry,
  onDeleteInquiry,
  onMoveStage,
  onLogTouch,
  stages,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: inquiry.id,
    disabled: !canDrag,
    data: {
      type: 'inquiry',
      inquiry,
    },
  });

  const prio = getPriorityBadge(inquiry.priority);
  const isOverdue =
    inquiry.nextFollowUpDate &&
    inquiry.status === 'Active' &&
    new Date(inquiry.nextFollowUpDate) < new Date(new Date().toDateString());

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelectInquiry(inquiry.id)}
      className={`group relative bg-surface p-3 rounded-xl border border-border shadow-2xs hover:border-foreground/30 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all duration-150 select-none space-y-2 text-left ${
        isDragging ? 'opacity-30 border-dashed border-primary/50 scale-[0.98]' : ''
      }`}
    >
      {/* Line 1: Priority Badge & 3-Dot Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${prio?.bg || 'bg-surface-muted text-foreground'}`}>
            {inquiry.priority || 'Normal'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 3-Dot Card Action Trigger */}
          <div className="relative">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu(isMenuOpen ? null : inquiry.id);
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
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-52 bg-surface rounded-xl border border-border shadow-2xl p-1.5 z-50 animate-scale-in text-left space-y-0.5"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border/60 mb-1">
                  Inquiry Actions
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onToggleMenu(null);
                    onSelectInquiry(inquiry.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-foreground" />
                  <span>View Details</span>
                </button>

                {canEdit && (
                  <>
                    {inquiry.stage !== 'won' && inquiry.stage !== 'lost' && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleMenu(null);
                          onLogTouch(inquiry);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-fairway-700 dark:text-fairway-300 hover:bg-surface-muted transition-colors cursor-pointer"
                      >
                        <MessageSquareReply className="w-3.5 h-3.5" />
                        <span>I followed up</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onToggleMenu(null);
                        onEditInquiry(inquiry);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-foreground" />
                      <span>Edit Inquiry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onToggleMenu(null);
                        onDeleteInquiry(inquiry);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition-colors font-medium cursor-pointer"
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
                    .filter((s) => s.key !== inquiry.stage)
                    .map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          onToggleMenu(null);
                          onMoveStage(inquiry, s.key);
                        }}
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
      </div>

      {/* Line 2: Company Name */}
      <h4 className="text-xs font-bold text-foreground leading-snug flex items-center gap-1 min-w-0">
        <span className="truncate min-w-0">{inquiry.companyName}</span>
        {inquiry.source === 'AI Discovery' && <Badge variant="primary" size="sm" className="shrink-0">AI</Badge>}
      </h4>

      {/* Line 3: Commercial Specs */}
      <div className="text-[11px] text-foreground-muted space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Warehouse className="w-3 h-3 text-foreground-muted shrink-0" />
            {inquiry.requiredAreaSqFt > 0 ? formatSqFt(inquiry.requiredAreaSqFt) : 'Area TBA'}
          </span>
          <span className="font-mono text-foreground font-bold">
            {inquiry.budgetMonthlyINR > 0 ? formatINR(inquiry.budgetMonthlyINR, true) : 'Budget TBA'}
          </span>
        </div>
        {inquiry.location && (
          <div className="flex items-center gap-1 text-[10px] text-foreground-muted truncate">
            <MapPin className="w-3 h-3 opacity-60 shrink-0" />
            <span className="truncate">{inquiry.location}</span>
          </div>
        )}
      </div>

      {/* Line 4: Footer with Follow-up & Owner */}
      <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[10px]">
        {inquiry.nextFollowUpDate ? (
          <div className="flex items-center gap-1">
            <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-500' : 'text-foreground-muted'}`} />
            <span className={isOverdue ? 'font-bold text-rose-500' : 'text-foreground-muted'}>
              {formatRelativeDate(inquiry.nextFollowUpDate)}
            </span>
          </div>
        ) : (
          <span className="text-foreground-muted font-mono text-[9px]">No follow-up</span>
        )}
        <div className="flex items-center gap-1.5 shrink-0 max-w-[120px]">
          <span className="w-4 h-4 rounded-full bg-surface-muted border border-border text-[8px] font-bold text-foreground flex items-center justify-center shrink-0">
            {(inquiry.salespersonName || 'U').slice(0, 2).toUpperCase()}
          </span>
          <span className="font-medium text-foreground truncate text-[10px]">
            {inquiry.salespersonName || 'Unassigned'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. Droppable Column Component
// ==========================================
interface DroppablePipelineColumnProps {
  stage: PipelineStageConfig;
  inquiries: Inquiry[];
  canEdit: boolean;
  canDrag: boolean;
  activeCardMenuId: string | null;
  onToggleMenu: (id: string | null) => void;
  onSelectInquiry: (id: string) => void;
  onEditInquiry: (inq: Inquiry) => void;
  onDeleteInquiry: (inq: Inquiry) => void;
  onMoveStage: (inq: Inquiry, stageKey: PipelineStageKey) => void;
  onLogTouch: (inq: Inquiry) => void;
  stages: PipelineStageConfig[];
}

const DroppablePipelineColumn: React.FC<DroppablePipelineColumnProps> = ({
  stage,
  inquiries,
  canEdit,
  canDrag,
  activeCardMenuId,
  onToggleMenu,
  onSelectInquiry,
  onEditInquiry,
  onDeleteInquiry,
  onMoveStage,
  onLogTouch,
  stages,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.key,
    data: {
      type: 'stage',
      stage,
    },
  });

  const columnTotalValue = inquiries.reduce(
    (acc, curr) => acc + (curr.budgetMonthlyINR && curr.budgetMonthlyINR > 0 ? curr.budgetMonthlyINR : 0),
    0
  );

  return (
    <div
      ref={setNodeRef}
      data-stage-key={stage.key}
      className={`w-[85vw] xs:w-[75vw] sm:w-76 md:w-80 shrink-0 h-full flex flex-col rounded-2xl border transition-all duration-150 snap-start sm:snap-align-none ${
        isOver
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5 scale-[1.01]'
          : 'border-border bg-surface-muted/40'
      }`}
    >
      {/* Column Header */}
      <div className="shrink-0 px-3.5 py-2.5 border-b border-border bg-surface rounded-t-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-border"
            style={{ backgroundColor: stage.color }}
          />
          <span className="text-xs font-bold text-foreground truncate">{stage.label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono font-bold text-foreground-muted px-2 py-0.5 rounded-lg bg-surface-muted border border-border">
            {inquiries.length} · {columnTotalValue > 0 ? formatINR(columnTotalValue, true) : '₹0'}
          </span>
        </div>
      </div>

      {/* Cards Stack */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {inquiries.length === 0 ? (
          <div
            className={`h-28 flex flex-col items-center justify-center text-[11px] border border-dashed rounded-xl gap-1 transition-colors ${
              isOver
                ? 'border-primary/60 bg-primary/10 text-primary font-semibold'
                : 'border-border bg-surface/50 text-foreground-muted'
            }`}
          >
            <Layers className="w-4 h-4 opacity-40" />
            <span>Drop opportunities here</span>
          </div>
        ) : (
          inquiries.map((inq) => (
            <DraggablePipelineCard
              key={inq.id}
              inquiry={inq}
              canEdit={canEdit}
              canDrag={canDrag}
              isMenuOpen={activeCardMenuId === inq.id}
              onToggleMenu={onToggleMenu}
              onSelectInquiry={onSelectInquiry}
              onEditInquiry={onEditInquiry}
              onDeleteInquiry={onDeleteInquiry}
              onMoveStage={onMoveStage}
              onLogTouch={onLogTouch}
              stages={stages}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. Main Pipeline Page
// ==========================================
export interface PipelineKanbanViewProps {
  onSelectInquiry: (id: string) => void;
  onOpenNewInquiry: () => void;
}

export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  onSelectInquiry,
  onOpenNewInquiry,
}) => {
  const { canEditModule, currentUser, users, isSales } = useAuth();
  const canEdit = canEditModule('inquiries');
  // Allow all logged-in CRM users with edit/sales/admin access to drag cards between pipeline stages
  const canDrag = true;
  const { success, error } = useToast();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active dragged card for DragOverlay
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);

  // 3-dot Card Actions Popover
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Modals state
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [lostTargetInquiry, setLostTargetInquiry] = useState<Inquiry | null>(null);
  const [wonTargetInquiry, setWonTargetInquiry] = useState<Inquiry | null>(null);
  const [touchTargetInquiry, setTouchTargetInquiry] = useState<Inquiry | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<Inquiry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Board Horizontal Scroll Ref
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [activeVisibleStage, setActiveVisibleStage] = useState<string>('');

  // Sensors for @dnd-kit: 8px threshold allows clean clicks vs drag, TouchSensor allows smooth touch dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 6,
      },
    })
  );

  // Active Inquiry derived for DragOverlay
  const activeInquiry = useMemo(() => {
    if (!activeInquiryId) return null;
    return inquiries.find((i) => i.id === activeInquiryId) || null;
  }, [activeInquiryId, inquiries]);

  // Track active visible column on scroll for mobile pills indicator
  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const cols = container.querySelectorAll<HTMLElement>('[data-stage-key]');
      let closestStage = '';
      let minDistance = Infinity;

      cols.forEach((col) => {
        const offsetLeft = col.offsetLeft;
        const distance = Math.abs(offsetLeft - scrollLeft);
        if (distance < minDistance) {
          minDistance = distance;
          closestStage = col.getAttribute('data-stage-key') || '';
        }
      });

      if (closestStage) {
        setActiveVisibleStage(closestStage);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [stages]);

  const refreshData = async () => {
    try {
      const [inqRes, stageRes] = await Promise.all([
        InquiryService.getInquiries({ pageSize: 500 }),
        PipelineStageService.getPipelineStages(),
      ]);
      if (inqRes && inqRes.data) {
        setInquiries(inqRes.data);
      }
      if (stageRes && stageRes.success && stageRes.data && stageRes.data.length > 0) {
        setStages(stageRes.data);
      }
    } catch (err) {
      console.warn('Pipeline fetch error:', err);
    } finally {
      setIsLoading(false);
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
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (!inq) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        Boolean(inq.inquiryNumber && inq.inquiryNumber.toLowerCase().includes(q)) ||
        Boolean(inq.companyName && inq.companyName.toLowerCase().includes(q)) ||
        Boolean(inq.location && inq.location.toLowerCase().includes(q)) ||
        Boolean(inq.contactName && inq.contactName.toLowerCase().includes(q)) ||
        Boolean(inq.requirement && inq.requirement.toLowerCase().includes(q)) ||
        Boolean(inq.targetCorridor && inq.targetCorridor.toLowerCase().includes(q));

      const matchesOwner = ownerFilter === 'all' || inq.salespersonId === ownerFilter;
      const matchesPriority = priorityFilter === 'all' || inq.priority === priorityFilter;
      const matchesCorridor =
        corridorFilter === 'all' || inq.targetCorridor === corridorFilter || inq.location === corridorFilter;

      return matchesQuery && matchesOwner && matchesPriority && matchesCorridor;
    });
  }, [inquiries, searchQuery, ownerFilter, priorityFilter, corridorFilter]);

  // Drag & Drop Handlers for @dnd-kit
  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardMenuId(null);
    setActiveInquiryId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveInquiryId(null);

    if (!over) return;

    const inqId = String(active.id);
    const targetInq = inquiries.find((i) => i.id === inqId);
    if (!targetInq) return;

    // Resolve target stage: could be stage key or another inquiry in that stage
    let targetStage: PipelineStageKey | null = null;
    const directStage = stages.find((s) => s.key === over.id);
    if (directStage) {
      targetStage = directStage.key;
    } else {
      const overInquiry = inquiries.find((i) => i.id === over.id);
      if (overInquiry) {
        targetStage = overInquiry.stage;
      }
    }

    if (!targetStage || targetInq.stage === targetStage) return;

    // Intercept Won / Lost stages with confirmation modals
    if (targetStage === 'lost') {
      setLostTargetInquiry(targetInq);
      return;
    }

    if (targetStage === 'won') {
      setWonTargetInquiry(targetInq);
      return;
    }

    // 1. Optimistic UI update
    setInquiries((prev) =>
      prev.map((i) => (i.id === inqId ? { ...i, stage: targetStage! } : i))
    );

    // 2. Persist to Backend Database
    try {
      const res = await InquiryService.updateInquiry(inqId, { stage: targetStage });
      if (res && res.success === false) {
        throw new Error(res.error || 'Failed to update stage on server');
      }
      const stageObj = stages.find((s) => s.key === targetStage);
      success(
        'Stage Updated',
        `Moved ${targetInq.inquiryNumber} to ${stageObj?.label || targetStage.replace(/_/g, ' ').toUpperCase()}`
      );
    } catch (err: any) {
      console.error('Failed to update stage:', err);
      error('Update Failed', 'Failed to save stage change. Reverting.');
      // Revert optimistic update
      setInquiries((prev) =>
        prev.map((i) => (i.id === inqId ? { ...i, stage: targetInq.stage } : i))
      );
    }
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

    // 2. Backend API
    try {
      await InquiryService.updateInquiry(inq.id, { stage: targetStage });
      const stageObj = stages.find((s) => s.key === targetStage);
      success(
        'Stage Updated',
        `Moved ${inq.inquiryNumber} to ${stageObj?.label || targetStage.replace(/_/g, ' ').toUpperCase()}`
      );
    } catch (err) {
      console.warn('Backend stage update notice:', err);
    }
  };

  // Prompt delete inquiry from 3-dot menu
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
      const container = boardContainerRef.current;
      const scrollAmount = Math.max(280, container.clientWidth * 0.75);
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const scrollToStage = (stageKey: string) => {
    if (!boardContainerRef.current) return;
    const col = boardContainerRef.current.querySelector(`[data-stage-key="${stageKey}"]`) as HTMLElement;
    if (col) {
      col.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      setActiveVisibleStage(stageKey);
    }
  };

  const sanitizeBudget = (amt?: number) => {
    if (!amt || isNaN(amt) || amt <= 0) return 0;
    if (amt > 50000000) return 50000000;
    return amt;
  };

  const totalBoardValue = filteredInquiries.reduce((acc, curr) => acc + sanitizeBudget(curr.budgetMonthlyINR), 0);
  const highPriorityCount = filteredInquiries.filter((i) => i.priority === 'High').length;
  const overdueCount = filteredInquiries.filter((i) =>
    i.nextFollowUpDate && i.status === 'Active' && new Date(i.nextFollowUpDate) < new Date(new Date().toDateString())
  ).length;

  const ownerFilterOptions = useMemo<ComboboxOption[]>(() => {
    return [
      { value: 'all', label: 'All Owners' },
      ...users.map((u) => ({
        value: u.id,
        label: u.name,
        icon: (
          <span className="w-4 h-4 rounded-full bg-surface-muted border border-border text-[9px] font-bold text-foreground flex items-center justify-center shrink-0">
            {u.name?.slice(0, 2).toUpperCase()}
          </span>
        ),
      })),
    ];
  }, [users]);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden text-left space-y-3">
      {/* 1. Header Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-muted text-foreground border border-border flex items-center justify-center shrink-0 shadow-2xs">
            <Kanban className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Sales Pipeline Kanban
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-muted border border-border text-foreground">
                {filteredInquiries.length} Active Deals
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 border border-primary/20 text-primary">
                Drag & Drop Enabled
              </span>
            </div>
            <p className="text-xs text-foreground-muted hidden sm:block">
              Drag cards across stages or use the 3-dot menu to advance opportunities
            </p>
          </div>
        </div>

        {/* Quick Metric Pills + Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="px-2.5 py-1 rounded-lg border border-border bg-surface shadow-2xs">
              <span className="text-[10px] text-foreground-muted block font-medium">Pipeline Value</span>
              <span className="font-mono font-bold text-foreground text-xs">
                {formatINR(totalBoardValue, true)} / mo
              </span>
            </div>
            {highPriorityCount > 0 && (
              <div className="hidden md:block px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">
                <span className="text-[10px] block font-medium">High Priority</span>
                <span className="font-bold text-xs">{highPriorityCount} deals</span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="hidden lg:block px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                <span className="text-[10px] block font-medium">Follow-ups Due</span>
                <span className="font-bold text-xs">{overdueCount} leads</span>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenNewInquiry}
            className="flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Inquiry</span>
          </Button>
        </div>
      </div>

      {/* 2. Unified Filter Toolbar */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-surface p-2 rounded-xl border border-border shadow-2xs">
        <div className="flex flex-1 items-center gap-2 flex-wrap min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search deal, company, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface-muted/50 text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-foreground/30 transition-all"
            />
          </div>

          {/* Owner Filter */}
          <div className="w-38 sm:w-44">
            <Combobox
              options={ownerFilterOptions}
              value={ownerFilter}
              onChange={setOwnerFilter}
              placeholder="All Owners"
              searchPlaceholder="Search salesperson..."
              className="w-full text-xs h-8"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 py-1 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          {/* Corridor Filter */}
          <select
            value={corridorFilter}
            onChange={(e) => setCorridorFilter(e.target.value)}
            className="h-8 px-2.5 py-1 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Corridors</option>
            <option value="Dahej">Dahej Corridor</option>
            <option value="Jhagadia">Jhagadia Industrial</option>
            <option value="Panoli">Panoli Corridor</option>
            <option value="Ankleshwar">Ankleshwar GIDC</option>
            <option value="Vilayat">Vilayat PCPIR</option>
          </select>

          {(searchQuery || ownerFilter !== 'all' || priorityFilter !== 'all' || corridorFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setOwnerFilter('all');
                setPriorityFilter('all');
                setCorridorFilter('all');
              }}
              className="text-xs text-foreground-muted hover:text-foreground underline cursor-pointer px-1"
            >
              Reset
            </button>
          )}
        </div>

        {/* Board Horizontal Scroll Controls */}
        <div className="flex items-center gap-2 justify-between md:justify-end shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-border">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-foreground-muted mr-0.5">Scroll:</span>
            <button
              type="button"
              onClick={() => scrollBoard('left')}
              className="size-7.5 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition-colors cursor-pointer shadow-2xs"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBoard('right')}
              className="size-7.5 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition-colors cursor-pointer shadow-2xs"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Stage Quick Switcher */}
      <div className="shrink-0 flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {stages.map((stage) => {
          const colInquiries = filteredInquiries.filter((i) => i.stage === stage.key);
          const isCurrent = (activeVisibleStage || stages[0]?.key) === stage.key;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => scrollToStage(stage.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all border cursor-pointer select-none active:scale-95 ${
                isCurrent
                  ? 'bg-surface text-foreground border-foreground/40 shadow-xs ring-1 ring-foreground/20'
                  : 'bg-surface-muted/70 text-foreground-muted border-border hover:text-foreground'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span>{stage.label}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-surface border border-border">
                {colInquiries.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Screen-Height-Fit Kanban Board with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerCollisions = pointerWithin(args);
          if (pointerCollisions.length > 0) return pointerCollisions;
          return rectIntersection(args);
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveInquiryId(null)}
      >
        <div
          ref={boardContainerRef}
          className="flex-1 min-h-0 flex gap-3 overflow-x-auto overflow-y-hidden pb-2.5 pt-0.5 select-none scroll-smooth snap-x snap-mandatory sm:snap-none"
        >
          {isLoading && stages.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="w-[84vw] xs:w-[78vw] sm:w-80 shrink-0 h-full flex flex-col rounded-2xl border border-border bg-surface-muted/30 p-3 space-y-3 animate-pulse"
              >
                <div className="h-8 bg-surface-muted rounded-xl w-3/4" />
                <div className="flex-1 space-y-3 pt-2">
                  <div className="h-28 bg-surface rounded-xl" />
                  <div className="h-28 bg-surface rounded-xl" />
                </div>
              </div>
            ))
          ) : (
            stages.map((stage) => {
              const colInquiries = filteredInquiries.filter((i) => i.stage === stage.key);
              return (
                <DroppablePipelineColumn
                  key={stage.id}
                  stage={stage}
                  inquiries={colInquiries}
                  canEdit={canEdit}
                  canDrag={canDrag}
                  activeCardMenuId={activeCardMenuId}
                  onToggleMenu={setActiveCardMenuId}
                  onSelectInquiry={onSelectInquiry}
                  onEditInquiry={setEditingInquiry}
                  onDeleteInquiry={promptDeleteInquiry}
                  onMoveStage={handleMoveStage}
                  onLogTouch={setTouchTargetInquiry}
                  stages={stages}
                />
              );
            })
          )}
        </div>

        {/* Floating Card DragOverlay during active drag */}
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeInquiry ? (
            <PipelineCardStatic inquiry={activeInquiry} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Backdrop for 3-Dot Card Menu */}
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

      {/* Lost Reason Modal */}
      {lostTargetInquiry && (
        <LostReasonModal
          isOpen={!!lostTargetInquiry}
          onClose={() => setLostTargetInquiry(null)}
          inquiryNumber={lostTargetInquiry.inquiryNumber}
          companyName={lostTargetInquiry.companyName}
          onConfirm={async (data) => {
            try {
              await InquiryService.updateInquiry(lostTargetInquiry.id, {
                stage: 'lost',
                status: 'Lost',
                lostReason: data.lostReason,
                lostComments: data.lostComments,
                lostDate: data.lostDate,
                closedByUserId: data.closedByUserId,
              } as any);
              await refreshData();
              setLostTargetInquiry(null);
              success('Marked Lost', `Reason recorded for ${lostTargetInquiry.inquiryNumber}`);
            } catch (err: any) {
              error('Update Failed', err.message || 'Failed to mark inquiry as lost');
            }
          }}
        />
      )}

      {touchTargetInquiry && (
        <LogTouchModal
          isOpen={!!touchTargetInquiry}
          onClose={() => setTouchTargetInquiry(null)}
          inquiryId={touchTargetInquiry.id}
          companyName={touchTargetInquiry.companyName}
          onLogged={async (result) => {
            const company = touchTargetInquiry.companyName;
            await refreshData();
            if (result.suggestLost) return;
            const next = result.nextFollowUp;
            success(
              result.status === 'Parked' ? 'Lead parked' : 'Follow-up saved',
              next ? `${company}: next check-in ${formatRelativeDate(next.dueDate)}.` : company
            );
          }}
          onSuggestLost={() => setLostTargetInquiry(touchTargetInquiry)}
        />
      )}

      {/* Won Celebration Modal */}
      {wonTargetInquiry && (
        <WonCelebrationModal
          isOpen={!!wonTargetInquiry}
          onClose={() => setWonTargetInquiry(null)}
          inquiry={wonTargetInquiry}
          defaultPropertyId={wonTargetInquiry.wonPropertyId || wonTargetInquiry.matchedPropertyIds?.[0]}
          onWon={async (result) => {
            const company = wonTargetInquiry.companyName;
            setWonTargetInquiry(null);
            await refreshData();
            success('Deal Won!', `${company} · ${result.areaSqFt.toLocaleString('en-IN')} sq ft leased at ${result.propertyName}.`);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
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
