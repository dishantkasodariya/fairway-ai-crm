import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  RefreshCw,
  List,
  LayoutGrid,
  X,
  RotateCcw,
  Sparkles,
  Phone,
  Mail,
  ClipboardList,
  Users,
  Zap,
} from 'lucide-react';
import { TaskService } from '@/modules/core/services/taskService';
import { CompanyService } from '@/modules/core/services/companyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Task, Company } from '@/modules/core/types';
import { formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Textarea } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { TimePicker } from '@/modules/core/components/ui/TimePicker';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { UserCombobox } from '@/modules/core/components/ui/UserCombobox';
import { Skeleton } from '@/modules/core/components/ui/Skeleton';
import {
  TasksList,
  normalizeStatus,
  getValidDueDate,
} from '../components/TasksList';
import { TasksCard } from '../components/TasksCard';
import { cn } from '@/modules/core/lib/utils';

export const TASK_TYPE_OPTIONS = [
  {
    value: 'Follow-up',
    label: 'Follow-up',
    icon: <ClipboardList className="w-4 h-4 text-foreground-muted shrink-0" />,
  },
  {
    value: 'Call',
    label: 'Call',
    icon: <Phone className="w-4 h-4 text-foreground-muted shrink-0" />,
  },
  {
    value: 'Meeting',
    label: 'Meeting',
    icon: <Users className="w-4 h-4 text-foreground-muted shrink-0" />,
  },
  {
    value: 'Site Visit',
    label: 'Site Visit',
    icon: <Building2 className="w-4 h-4 text-foreground-muted shrink-0" />,
  },
  {
    value: 'Email',
    label: 'Email',
    icon: <Mail className="w-4 h-4 text-foreground-muted shrink-0" />,
  },
  {
    value: 'Other',
    label: 'Other',
    icon: <Zap className="w-4 h-4 text-foreground-muted shrink-0" />,
  },
];

export interface TaskListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { currentUser, users, isSales, canCreate, canEditModule, canDeleteModule } = useAuth();
  const { success, error } = useToast();

  // Active Category Filter: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Task & Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const getEmptyTaskForm = () => ({
    companyId: '',
    taskType: 'Follow-up' as Task['taskType'],
    description: '',
    dueDate: todayStr,
    dueTime: '11:00 AM',
    priority: 'Medium' as Task['priority'],
    assignedUserId: currentUser?.id || '',
  });

  const [newTaskForm, setNewTaskForm] = useState(getEmptyTaskForm);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});

  // Edit Task States
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState(getEmptyTaskForm);
  const [editTaskErrors, setEditTaskErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const clearTaskError = (field: string) => {
    setTaskErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const clearEditTaskError = (field: string) => {
    setEditTaskErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  // Load companies for linked company dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await CompanyService.getCompanies({ pageSize: 1000 });
        if (res.success && Array.isArray(res.data)) {
          setCompanies(res.data);
        } else {
          setCompanies([]);
        }
      } catch {
        setCompanies([]);
      }
    };
    fetchCompanies();
  }, []);

  const loadTasks = async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await TaskService.getTasks();
      if (res.success && Array.isArray(res.data)) {
        const normalizedBackend = res.data.map((t) => ({
          ...t,
          status: normalizeStatus(t.status),
          dueDate: getValidDueDate(t),
        }));
        setTasks(normalizedBackend);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Failed to load tasks from backend:', err);
      setTasks([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Base tasks matching non-tab filters (search, owner, type, priority)
  const baseFilteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        t.description.toLowerCase().includes(q) ||
        (t.companyName && t.companyName.toLowerCase().includes(q)) ||
        (t.assignedUserName && t.assignedUserName.toLowerCase().includes(q)) ||
        (t.inquiryNumber && t.inquiryNumber.toLowerCase().includes(q));

      const matchesOwner = ownerFilter === 'all' || t.assignedUserId === ownerFilter;
      const matchesType = typeFilter === 'all' || t.taskType === typeFilter;
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

      return matchesQuery && matchesOwner && matchesType && matchesPriority;
    });
  }, [tasks, searchQuery, ownerFilter, typeFilter, priorityFilter]);

  // Executive Metric Counts dynamically computed
  const overdueCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) < todayStr).length,
    [baseFilteredTasks, todayStr]
  );
  const todaysCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) === todayStr).length,
    [baseFilteredTasks, todayStr]
  );
  const upcomingCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) > todayStr).length,
    [baseFilteredTasks, todayStr]
  );
  const completedCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Completed').length,
    [baseFilteredTasks]
  );
  const allOpenCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending').length,
    [baseFilteredTasks]
  );

  // Filter tasks based on active category card
  const filteredTasks = useMemo(() => {
    return baseFilteredTasks.filter((t) => {
      const taskStatus = normalizeStatus(t.status);
      const taskDueDate = getValidDueDate(t);

      if (activeTab === 'all') return taskStatus === 'Pending';
      if (activeTab === 'today') return taskStatus === 'Pending' && taskDueDate === todayStr;
      if (activeTab === 'upcoming') return taskStatus === 'Pending' && taskDueDate > todayStr;
      if (activeTab === 'overdue') return taskStatus === 'Pending' && taskDueDate < todayStr;
      if (activeTab === 'completed') return taskStatus === 'Completed';

      return true;
    });
  }, [baseFilteredTasks, activeTab, todayStr]);

  // Toggle task completion
  const handleToggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const newStatus: Task['status'] = target.status === 'Completed' ? 'Pending' : 'Completed';

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await TaskService.updateTask(id, { status: newStatus });
      if (!res.success) {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: target.status } : t))
        );
        error('Failed to update task', res.error);
      } else {
        success(
          newStatus === 'Completed' ? 'Task Completed' : 'Task Reopened',
          newStatus === 'Completed'
            ? 'Follow-up marked as completed.'
            : 'Follow-up moved back to open tasks.'
        );
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: target.status } : t))
      );
      error('Error', 'Failed to update task status');
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this task?');
    if (!confirmDelete) return;

    try {
      const res = await TaskService.deleteTask(id);
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        success('Task Deleted', 'Follow-up task removed.');
      } else {
        error('Delete Failed', res.error || 'Failed to delete task.');
      }
    } catch (err: any) {
      error('Error', err.message || 'Failed to delete task.');
    }
  };

  // Open Edit Modal
  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskForm({
      companyId: task.companyId || '',
      taskType: task.taskType || 'Follow-up',
      description: task.description || '',
      dueDate: getValidDueDate(task),
      dueTime: task.dueTime || '',
      priority: task.priority || 'Medium',
      assignedUserId: task.assignedUserId || '',
    });
    setEditTaskErrors({});
  };

  // Create Task Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newTaskForm.description.trim()) {
      errors.description = 'Please enter task details or what to follow up on';
    }
    if (!newTaskForm.dueDate) {
      errors.dueDate = 'Due date is required';
    }

    if (Object.keys(errors).length > 0) {
      setTaskErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedComp = companies.find((c) => c.id === newTaskForm.companyId);
      const selectedUser = users.find((u) => u.id === newTaskForm.assignedUserId);

      const taskData: Partial<Task> = {
        companyId: newTaskForm.companyId || undefined,
        companyName: selectedComp ? selectedComp.name : undefined,
        assignedUserId: newTaskForm.assignedUserId || currentUser?.id,
        assignedUserName: selectedUser ? selectedUser.name : currentUser?.name,
        taskType: newTaskForm.taskType,
        description: newTaskForm.description.trim(),
        dueDate: newTaskForm.dueDate,
        dueTime: newTaskForm.dueTime || undefined,
        priority: newTaskForm.priority,
        status: 'Pending',
      };

      const res = await TaskService.createTask(taskData);
      if (res.success && res.data) {
        const created: Task = {
          ...res.data,
          status: 'Pending',
          dueDate: getValidDueDate(res.data),
        };
        setTasks((prev) => [created, ...prev]);
        setIsNewTaskOpen(false);
        setNewTaskForm(getEmptyTaskForm());
        setTaskErrors({});
        success('Task Scheduled', 'New follow-up task added to your schedule.');
      } else {
        error('Failed to create task', res.error || 'Server error creating task');
      }
    } catch (err: any) {
      error('Error', err.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Task Submission
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const errors: Record<string, string> = {};
    if (!editTaskForm.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!editTaskForm.dueDate) {
      errors.dueDate = 'Due date is required';
    }

    if (Object.keys(errors).length > 0) {
      setEditTaskErrors(errors);
      return;
    }

    setIsUpdating(true);
    try {
      const selectedComp = companies.find((c) => c.id === editTaskForm.companyId);
      const selectedUser = users.find((u) => u.id === editTaskForm.assignedUserId);

      const taskData: Partial<Task> = {
        companyId: editTaskForm.companyId || undefined,
        companyName: selectedComp ? selectedComp.name : undefined,
        assignedUserId: editTaskForm.assignedUserId || undefined,
        assignedUserName: selectedUser ? selectedUser.name : undefined,
        taskType: editTaskForm.taskType,
        description: editTaskForm.description.trim(),
        dueDate: editTaskForm.dueDate,
        dueTime: editTaskForm.dueTime || undefined,
        priority: editTaskForm.priority,
      };

      const res = await TaskService.updateTask(editingTask.id, taskData);
      if (res.success && res.data) {
        const updated = {
          ...res.data,
          status: normalizeStatus(res.data.status),
          dueDate: getValidDueDate(res.data),
        };
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
        setEditingTask(null);
        setEditTaskForm(getEmptyTaskForm());
        setEditTaskErrors({});
        success('Task Updated', 'Follow-up task details updated.');
      } else {
        error('Update Failed', res.error || 'Failed to update task');
      }
    } catch (err: any) {
      error('Error', err.message || 'Failed to update task.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Dropdown filter options
  const salespersonOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Salespersons' },
      ...users.map((u) => ({ value: u.id, label: u.name })),
    ];
  }, [users]);

  const taskTypeOptions = [
    { value: 'all', label: 'All Types' },
    ...TASK_TYPE_OPTIONS,
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'High', label: 'High Priority' },
    { value: 'Medium', label: 'Medium Priority' },
    { value: 'Low', label: 'Low Priority' },
  ];

  const resetAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setPriorityFilter('all');
    setOwnerFilter(isSales ? currentUser.id : 'all');
    setActiveTab('today');
  };

  const hasActiveFilters = searchQuery !== '' || typeFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div className="space-y-5 max-w-8xl mx-auto text-left px-1 sm:px-0 pb-16">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">CRM / Follow-ups</span>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <CheckSquare className="w-5 h-5 sm:w-6 h-6 text-foreground shrink-0" />
            <span>Daily Follow-up & Tasks</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Ensure zero dropped deals with scheduled calls, site visits, and follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {canCreate('tasks') && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setNewTaskForm(getEmptyTaskForm());
                setTaskErrors({});
                setIsNewTaskOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
              className="w-full sm:w-auto font-semibold"
            >
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* 2. EXECUTIVE FOCUS STRIP (4 Clickable Cards + All Open Pill) */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Overdue Follow-ups */}
          <button
            type="button"
            onClick={() => setActiveTab('overdue')}
            className={cn(
              'p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
              activeTab === 'overdue'
                ? 'bg-surface-muted border-foreground/40 shadow-2xs'
                : 'bg-surface border-border hover:bg-surface-muted/40 hover:border-foreground/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                Overdue
              </span>
              {activeTab === 'overdue' && (
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {overdueCount}
              </span>
              <span className="text-[11px] text-foreground-muted">urgent</span>
            </div>
          </button>

          {/* Card 2: Today's Tasks */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={cn(
              'p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
              activeTab === 'today'
                ? 'bg-surface-muted border-foreground/40 shadow-2xs'
                : 'bg-surface border-border hover:bg-surface-muted/40 hover:border-foreground/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                Today's Tasks
              </span>
              {activeTab === 'today' && (
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {todaysCount}
              </span>
              <span className="text-[11px] text-foreground-muted">scheduled</span>
            </div>
          </button>

          {/* Card 3: Upcoming Tasks */}
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              'p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
              activeTab === 'upcoming'
                ? 'bg-surface-muted border-foreground/40 shadow-2xs'
                : 'bg-surface border-border hover:bg-surface-muted/40 hover:border-foreground/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                Upcoming
              </span>
              {activeTab === 'upcoming' && (
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {upcomingCount}
              </span>
              <span className="text-[11px] text-foreground-muted">next 7 days</span>
            </div>
          </button>

          {/* Card 4: Completed History */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={cn(
              'p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
              activeTab === 'completed'
                ? 'bg-surface-muted border-foreground/40 shadow-2xs'
                : 'bg-surface border-border hover:bg-surface-muted/40 hover:border-foreground/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                Completed
              </span>
              {activeTab === 'completed' && (
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {completedCount}
              </span>
              <span className="text-[11px] text-foreground-muted">done</span>
            </div>
          </button>
        </div>

        {/* Quick pill toggle to view all open tasks */}
        <div className="flex items-center justify-between text-xs pt-1 px-0.5">
          <div className="flex items-center gap-2">
            <span className="text-foreground-muted text-[11px]">View Scope:</span>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'all'
                  ? 'bg-foreground text-background font-semibold shadow-2xs'
                  : 'bg-surface border border-border text-foreground-muted hover:text-foreground'
              )}
            >
              All Open Tasks ({allOpenCount})
            </button>
          </div>

          <div className="text-[11px] text-foreground-muted hidden sm:block">
            Showing <strong className="text-foreground">{filteredTasks.length}</strong> tasks in active view
          </div>
        </div>
      </div>

      {/* 3. STREAMLINED CONTROL TOOLBAR (No Icon Clutter) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 w-full">
        {/* Left: Search Bar */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, companies, salesperson..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-foreground/50 focus:outline-none transition-colors h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-foreground-muted hover:text-foreground p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Clean Filters & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Task Type Filter */}
          <div className="w-[125px]">
            <Combobox
              options={taskTypeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              placeholder="All Types"
              searchPlaceholder="Filter type..."
              triggerClassName="h-9 text-xs"
            />
          </div>

          {/* Salesperson Filter */}
          <div className="w-[145px]">
            <Combobox
              options={salespersonOptions}
              value={ownerFilter}
              onChange={setOwnerFilter}
              placeholder="All Salespersons"
              searchPlaceholder="Filter person..."
              triggerClassName="h-9 text-xs"
            />
          </div>

          {/* Reset Filters button if any active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-9 px-2 text-xs font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Reset</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadTasks(true)}
            disabled={isRefreshing || isLoading}
            className="h-9 w-9 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground transition-colors cursor-pointer shrink-0"
            title="Refresh tasks"
          >
            <RefreshCw
              className={cn(
                'w-3.5 h-3.5',
                (isRefreshing || isLoading) && 'animate-spin'
              )}
            />
          </button>

          {/* Desktop-only List vs Card Toggle */}
          <div className="hidden sm:flex items-center h-9 bg-surface border border-border rounded-lg overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'w-8 h-full flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-foreground text-background font-bold'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted'
              )}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'w-8 h-full flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-foreground text-background font-bold'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted'
              )}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN TASK CONTENT */}
      {isLoading || isRefreshing ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 bg-surface rounded-xl border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-5 h-5 rounded-full" />
                <div className="space-y-1.5 flex-1 max-w-md">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
              <Skeleton className="w-20 h-6 rounded-md hidden sm:block" />
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center text-xs text-foreground-muted bg-surface rounded-xl border border-border p-6 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div>
            <p className="font-bold text-foreground text-sm">No tasks found</p>
            <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
              {hasActiveFilters || searchQuery
                ? 'No tasks match your search or filters. Try clearing them.'
                : activeTab === 'overdue'
                ? 'Great job! You have zero overdue tasks.'
                : activeTab === 'today'
                ? 'No tasks due today. Schedule a new touchpoint to stay ahead.'
                : 'No tasks scheduled in this view.'}
            </p>
          </div>
          {(hasActiveFilters || searchQuery) && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetAllFilters}
              className="mt-2 text-xs"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile view (<768px): Always render clean touch Cards for best UX */}
          <div className="block md:hidden">
            <TasksCard
              tasks={filteredTasks}
              todayStr={todayStr}
              onToggleTask={handleToggleTask}
              onEditTask={canEditModule('tasks') ? handleOpenEditTask : undefined}
              onDeleteTask={canDeleteModule('tasks') ? handleDeleteTask : undefined}
              onNavigateToCompany={onNavigateToCompany}
              onNavigateToInquiry={onNavigateToInquiry}
            />
          </div>

          {/* Desktop view (≥768px): Respects user's view mode (List vs Grid) */}
          <div className="hidden md:block">
            {viewMode === 'list' ? (
              <TasksList
                tasks={filteredTasks}
                todayStr={todayStr}
                isLoading={isLoading || isRefreshing}
                onToggleTask={handleToggleTask}
                onEditTask={canEditModule('tasks') ? handleOpenEditTask : undefined}
                onDeleteTask={canDeleteModule('tasks') ? handleDeleteTask : undefined}
                onNavigateToCompany={onNavigateToCompany}
                onNavigateToInquiry={onNavigateToInquiry}
              />
            ) : (
              <TasksCard
                tasks={filteredTasks}
                todayStr={todayStr}
                onToggleTask={handleToggleTask}
                onEditTask={canEditModule('tasks') ? handleOpenEditTask : undefined}
                onDeleteTask={canDeleteModule('tasks') ? handleDeleteTask : undefined}
                onNavigateToCompany={onNavigateToCompany}
                onNavigateToInquiry={onNavigateToInquiry}
              />
            )}
          </div>
        </>
      )}

      {/* 5. NEW TASK MODAL */}
      <Modal
        isOpen={isNewTaskOpen}
        onClose={() => {
          setIsNewTaskOpen(false);
          setTaskErrors({});
        }}
        title="Schedule Follow-up Task"
        description="Plan a customer call, meeting, site visit, or follow-up note."
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewTaskOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-task-form"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="font-semibold"
            >
              {isSubmitting ? 'Scheduling...' : 'Save Task'}
            </Button>
          </div>
        }
      >
        <form id="new-task-form" onSubmit={handleCreateTask} noValidate className="space-y-4 text-xs text-left">
          {/* Linked Company */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Customer Company
            </label>
            <Combobox
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
                description: `${c.city || 'Gujarat'} · ${c.industry || 'Industrial'}`,
              }))}
              value={newTaskForm.companyId}
              onChange={(val) => {
                setNewTaskForm({ ...newTaskForm, companyId: val });
                clearTaskError('companyId');
              }}
              placeholder="Select company (or leave blank)..."
              searchPlaceholder="Search company..."
            />
          </div>

          {/* Task Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Task Type <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={TASK_TYPE_OPTIONS}
                value={newTaskForm.taskType}
                onChange={(val) => {
                  setNewTaskForm({ ...newTaskForm, taskType: val as any });
                  clearTaskError('taskType');
                }}
                placeholder="Select task type..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Priority
              </label>
              <Combobox
                options={[
                  { value: 'Medium', label: 'Medium (Standard)' },
                  { value: 'High', label: 'High (Urgent)' },
                  { value: 'Low', label: 'Low (Flexible)' },
                ]}
                value={newTaskForm.priority}
                onChange={(val) => setNewTaskForm({ ...newTaskForm, priority: val as any })}
                placeholder="Select priority..."
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Due Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <DatePicker
                value={newTaskForm.dueDate}
                onChange={(dateStr) => {
                  setNewTaskForm({ ...newTaskForm, dueDate: dateStr });
                  clearTaskError('dueDate');
                }}
                placeholder="Select date"
                error={taskErrors.dueDate}
              />
            </div>
            <TimePicker
              label="Due Time"
              placeholder="e.g. 11:00 AM"
              value={newTaskForm.dueTime}
              onChange={(timeStr) => setNewTaskForm({ ...newTaskForm, dueTime: timeStr })}
            />
          </div>

          {/* Assigned Salesperson */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Assigned Salesperson
            </label>
            <UserCombobox
              users={users}
              value={newTaskForm.assignedUserId}
              onChange={(val) => setNewTaskForm({ ...newTaskForm, assignedUserId: val })}
              placeholder="Assign to salesperson..."
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Task Details / Notes <span className="text-rose-500 font-bold">*</span>
            </label>
            <Textarea
              placeholder="e.g. Follow up with Deepak regarding shed lease agreement and advance token..."
              value={newTaskForm.description}
              onChange={(e) => {
                setNewTaskForm({ ...newTaskForm, description: e.target.value });
                clearTaskError('description');
              }}
              error={taskErrors.description}
              rows={3}
            />
          </div>
        </form>
      </Modal>

      {/* 6. EDIT TASK MODAL */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => {
          setEditingTask(null);
          setEditTaskErrors({});
        }}
        title="Edit Follow-up Task"
        description="Update task notes, schedule, priority, or salesperson."
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setEditTaskErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-task-form"
              variant="primary"
              size="sm"
              disabled={isUpdating}
              className="font-semibold"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form id="edit-task-form" onSubmit={handleUpdateTask} className="space-y-4 pt-1 text-xs text-left">
          {/* Linked Company */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Customer Company
            </label>
            <Combobox
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
                description: `${c.city || 'Gujarat'} · ${c.industry || 'Industrial'}`,
              }))}
              value={editTaskForm.companyId}
              onChange={(val) => setEditTaskForm({ ...editTaskForm, companyId: val })}
              placeholder="Select company..."
            />
          </div>

          {/* Task Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Task Type <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={TASK_TYPE_OPTIONS}
                value={editTaskForm.taskType}
                onChange={(val) => setEditTaskForm({ ...editTaskForm, taskType: val as any })}
                placeholder="Select task type..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Priority
              </label>
              <Combobox
                options={[
                  { value: 'Medium', label: 'Medium (Standard)' },
                  { value: 'High', label: 'High (Urgent)' },
                  { value: 'Low', label: 'Low (Flexible)' },
                ]}
                value={editTaskForm.priority}
                onChange={(val) => setEditTaskForm({ ...editTaskForm, priority: val as any })}
                placeholder="Select priority..."
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Due Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <DatePicker
                value={editTaskForm.dueDate}
                onChange={(dateStr) => setEditTaskForm({ ...editTaskForm, dueDate: dateStr })}
                placeholder="Select date"
                error={editTaskErrors.dueDate}
              />
            </div>
            <TimePicker
              label="Due Time"
              placeholder="e.g. 11:00 AM"
              value={editTaskForm.dueTime}
              onChange={(timeStr) => setEditTaskForm({ ...editTaskForm, dueTime: timeStr })}
            />
          </div>

          {/* Assigned Salesperson */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Assigned Salesperson
            </label>
            <UserCombobox
              users={users}
              value={editTaskForm.assignedUserId}
              onChange={(val) => setEditTaskForm({ ...editTaskForm, assignedUserId: val })}
              placeholder="Select salesperson..."
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Task Details / Notes <span className="text-rose-500 font-bold">*</span>
            </label>
            <Textarea
              placeholder="Enter task details..."
              value={editTaskForm.description}
              onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
              error={editTaskErrors.description}
              rows={3}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const TasksPage = TaskListView;
export default TasksPage;
