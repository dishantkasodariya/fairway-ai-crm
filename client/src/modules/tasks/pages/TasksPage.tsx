import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  Phone,
  Mail,
  Trash2,
  RefreshCw,
  Loader2,
  List,
  LayoutGrid,
  Settings,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/modules/core/components/ui/tooltip';
import { TaskService } from '@/modules/core/services/taskService';
import { CompanyService } from '@/modules/core/services/companyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Task, Company } from '@/modules/core/types';
import { formatRelativeDate, formatDate } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Tabs } from '@/modules/core/components/ui/Tabs';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { TimePicker } from '@/modules/core/components/ui/TimePicker';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { UserCombobox } from '@/modules/core/components/ui/UserCombobox';
import { Skeleton } from '@/modules/core/components/ui/Skeleton';
import {
  TasksList,
  ColumnVisibility,
  getTaskTypeIcon,
  normalizeStatus,
  getValidDueDate,
} from '../components/TasksList';
import { TasksCard } from '../components/TasksCard';
import { cn } from '@/modules/core/lib/utils';

export interface TaskListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit, canEditModule, currentUser, users, isSales, canCreate, canDeleteModule } = useAuth();
  const { success, error } = useToast();

  // Tab & View States
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // Filter Drawer States (Drafts)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftOwnerFilter, setDraftOwnerFilter] = useState('all');
  const [draftTypeFilter, setDraftTypeFilter] = useState('all');
  const [draftPriorityFilter, setDraftPriorityFilter] = useState('all');
  const [draftCompanyFilter, setDraftCompanyFilter] = useState('all');
  const [draftDateRangeFilter, setDraftDateRangeFilter] = useState('all');

  // Columns visibility config for List View
  const [columns, setColumns] = useState<ColumnVisibility>({
    status: true,
    description: true,
    priority: true,
    company: true,
    inquiry: true,
    dueDate: true,
    assignee: true,
    actions: true,
  });

  // Task & Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const normalizeStatus = (s?: string): Task['status'] => {
    if (!s) return 'Pending';
    return s.toString().trim().toLowerCase() === 'completed' ? 'Completed' : 'Pending';
  };

  const getValidDueDate = (t: Task): string => {
    if (t.dueDate) return t.dueDate;
    if (t.createdAt) return t.createdAt.split('T')[0];
    return todayStr;
  };

  const getEmptyTaskForm = () => ({
    companyId: '',
    taskType: '' as Task['taskType'],
    description: '',
    dueDate: '',
    dueTime: '',
    priority: '' as Task['priority'],
    assignedUserId: '',
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

  // Load companies dynamically from backend for linked company dropdown
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

  // Filter Drawer Syncing
  const openFilterDrawer = () => {
    setDraftOwnerFilter(ownerFilter);
    setDraftTypeFilter(typeFilter);
    setDraftPriorityFilter(priorityFilter);
    setDraftCompanyFilter(companyFilter);
    setDraftDateRangeFilter(dateRangeFilter);
    setIsFilterDrawerOpen(true);
  };

  const applyFilters = () => {
    setOwnerFilter(draftOwnerFilter);
    setTypeFilter(draftTypeFilter);
    setPriorityFilter(draftPriorityFilter);
    setCompanyFilter(draftCompanyFilter);
    setDateRangeFilter(draftDateRangeFilter);
    if (draftDateRangeFilter !== 'all') {
      setActiveTab('all');
    }
    setIsFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setDraftOwnerFilter('all');
    setDraftTypeFilter('all');
    setDraftPriorityFilter('all');
    setDraftCompanyFilter('all');
    setDraftDateRangeFilter('all');
    setOwnerFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setCompanyFilter('all');
    setDateRangeFilter('all');
    setSearchQuery('');
    setActiveTab('all');
    setIsFilterDrawerOpen(false);
  };

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (ownerFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (companyFilter !== 'all') count++;
    if (dateRangeFilter !== 'all') count++;
    return count;
  }, [ownerFilter, typeFilter, priorityFilter, companyFilter, dateRangeFilter]);

  // Base tasks matching non-tab filters (search, owner, type, priority, company)
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
      const matchesCompany = companyFilter === 'all' || t.companyId === companyFilter;

      return matchesQuery && matchesOwner && matchesType && matchesPriority && matchesCompany;
    });
  }, [tasks, searchQuery, ownerFilter, typeFilter, priorityFilter, companyFilter]);

  // Tab counts dynamically calculated from base filtered tasks
  const allOpenCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending').length,
    [baseFilteredTasks]
  );
  const todaysCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) === todayStr).length,
    [baseFilteredTasks, todayStr]
  );
  const upcomingCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) > todayStr).length,
    [baseFilteredTasks, todayStr]
  );
  const overdueCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) < todayStr).length,
    [baseFilteredTasks, todayStr]
  );
  const completedCount = useMemo(
    () => baseFilteredTasks.filter((t) => normalizeStatus(t.status) === 'Completed').length,
    [baseFilteredTasks]
  );

  const handleToggleTask = async (id: string) => {
    try {
      const res = await TaskService.toggleTask(id);
      if (res.success && res.data) {
        const updated = {
          ...res.data,
          status: normalizeStatus(res.data.status),
          dueDate: getValidDueDate(res.data),
        };
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        success('Task Updated', 'Follow-up status synchronized.');
      } else {
        error('Update Failed', res.error || 'Failed to update task');
      }
    } catch (err: any) {
      error('Update Failed', err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await TaskService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      success('Task Deleted', 'Follow-up task removed.');
    } catch (e: any) {
      console.error('Backend deleteTask error:', e);
      error('Delete Failed', e.message || 'Failed to delete task');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!newTaskForm.companyId) {
      errors.companyId = 'Linked company is required';
    }
    if (!newTaskForm.taskType) {
      errors.taskType = 'Task type is required';
    }
    if (!newTaskForm.priority) {
      errors.priority = 'Priority level is required';
    }
    if (!newTaskForm.dueDate) {
      errors.dueDate = 'Due date is required';
    }
    if (!newTaskForm.assignedUserId) {
      errors.assignedUserId = 'Assigned salesperson is required';
    }
    if (!newTaskForm.description.trim()) {
      errors.description = 'Task description is required';
    }

    if (Object.keys(errors).length > 0) {
      setTaskErrors(errors);
      error('Validation Error', 'Please fill in all mandatory fields highlighted in red.');
      return;
    }

    const comp = companies.find((c) => c.id === newTaskForm.companyId);
    const assigned = users.find((u) => u.id === newTaskForm.assignedUserId) || currentUser;

    setIsSubmitting(true);
    try {
      const taskData: Partial<Task> = {
        companyId: comp?.id,
        companyName: comp?.name,
        assignedUserId: assigned.id,
        assignedUserName: assigned.name,
        taskType: newTaskForm.taskType as Task['taskType'],
        description: newTaskForm.description.trim(),
        dueDate: newTaskForm.dueDate,
        dueTime: newTaskForm.dueTime || undefined,
        priority: newTaskForm.priority as Task['priority'],
        status: 'Pending' as const,
      };

      const res = await TaskService.createTask(taskData);
      if (res.success && res.data) {
        const created = {
          ...res.data,
          status: normalizeStatus(res.data.status),
          dueDate: getValidDueDate(res.data),
        };
        setTasks((prev) => [created, ...prev]);
        setIsNewTaskOpen(false);
        setNewTaskForm(getEmptyTaskForm());
        setTaskErrors({});
        success('Task Created', 'Follow-up task scheduled.');
      } else {
        error('Create Failed', res.error || 'Failed to create task on backend');
      }
    } catch (err: any) {
      error('Error', err.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskForm({
      companyId: task.companyId || '',
      taskType: (task.taskType || 'Follow-up') as Task['taskType'],
      description: task.description || '',
      dueDate: getValidDueDate(task),
      dueTime: task.dueTime || '',
      priority: (task.priority || 'Medium') as Task['priority'],
      assignedUserId: task.assignedUserId || currentUser.id,
    });
    setEditTaskErrors({});
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const errors: Record<string, string> = {};
    if (!editTaskForm.companyId) errors.companyId = 'Please select a company';
    if (!editTaskForm.taskType) errors.taskType = 'Task type is required';
    if (!editTaskForm.priority) errors.priority = 'Priority is required';
    if (!editTaskForm.dueDate) errors.dueDate = 'Due date is required';
    if (!editTaskForm.assignedUserId) errors.assignedUserId = 'Assignee is required';
    if (!editTaskForm.description || !editTaskForm.description.trim()) {
      errors.description = 'Task description is required';
    }

    if (Object.keys(errors).length > 0) {
      setEditTaskErrors(errors);
      return;
    }

    const comp = companies.find((c) => c.id === editTaskForm.companyId);
    const assigned = users.find((u) => u.id === editTaskForm.assignedUserId) || currentUser;

    setIsUpdating(true);
    try {
      const taskData: Partial<Task> = {
        companyId: comp?.id,
        companyName: comp?.name,
        assignedUserId: assigned.id,
        assignedUserName: assigned.name,
        taskType: editTaskForm.taskType as Task['taskType'],
        description: editTaskForm.description.trim(),
        dueDate: editTaskForm.dueDate,
        dueTime: editTaskForm.dueTime || undefined,
        priority: editTaskForm.priority as Task['priority'],
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
        error('Update Failed', res.error || 'Failed to update task on backend');
      }
    } catch (err: any) {
      error('Error', err.message || 'Failed to update task.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter tasks based on active tab, search query, and filters
  const filteredTasks = useMemo(() => {
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
      const matchesCompany = companyFilter === 'all' || t.companyId === companyFilter;

      const taskStatus = normalizeStatus(t.status);
      const taskDueDate = getValidDueDate(t);

      // Date Range Filter
      let matchesDateRange = true;
      if (dateRangeFilter === 'today') matchesDateRange = taskDueDate === todayStr;
      else if (dateRangeFilter === 'overdue') matchesDateRange = taskDueDate < todayStr;
      else if (dateRangeFilter === 'upcoming') matchesDateRange = taskDueDate > todayStr;
      else if (dateRangeFilter === 'week') {
        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0];
        matchesDateRange = taskDueDate >= todayStr && taskDueDate <= endOfWeekStr;
      }

      // Tab matching
      let matchesTab = false;
      if (activeTab === 'all') matchesTab = taskStatus === 'Pending';
      if (activeTab === 'today') matchesTab = taskStatus === 'Pending' && taskDueDate === todayStr;
      if (activeTab === 'upcoming') matchesTab = taskStatus === 'Pending' && taskDueDate > todayStr;
      if (activeTab === 'overdue') matchesTab = taskStatus === 'Pending' && taskDueDate < todayStr;
      if (activeTab === 'completed') matchesTab = taskStatus === 'Completed';

      return matchesQuery && matchesOwner && matchesType && matchesPriority && matchesCompany && matchesDateRange && matchesTab;
    });
  }, [tasks, searchQuery, ownerFilter, typeFilter, priorityFilter, companyFilter, dateRangeFilter, activeTab, todayStr]);

  // Options for combobox filters
  const salespersonOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Salespersons' },
      ...users.map((u) => ({ value: u.id, label: u.name })),
    ];
  }, [users]);

  const taskTypeOptions = [
    { value: 'all', label: 'All Task Types' },
    { value: 'Call', label: 'Call' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Email', label: 'Email' },
    { value: 'Follow-up', label: 'Follow-up' },
    { value: 'Site Visit', label: 'Site Visit' },
    { value: 'Other', label: 'Other' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'High', label: 'High Priority' },
    { value: 'Medium', label: 'Medium Priority' },
    { value: 'Low', label: 'Low Priority' },
  ];

  const companyOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Companies' },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [companies]);

  const dateRangeOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Due Today' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'week', label: 'Due This Week' },
    { value: 'upcoming', label: 'Future / Upcoming' },
  ];

  const getTaskTypeIcon = (type?: string) => {
    switch (type) {
      case 'Call':
        return <Phone className="w-3.5 h-3.5" />;
      case 'Meeting':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'Email':
        return <Mail className="w-3.5 h-3.5" />;
      case 'Site Visit':
        return <Building2 className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4 max-w-8xl mx-auto text-left px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">CRM / Tasks</span>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <CheckSquare className="w-5 h-5 sm:w-6 h-6 text-foreground shrink-0" />
            <span>Follow-up & Tasks Management</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Ensure zero dropped customer touchpoints with scheduled calls, meetings, and follow-ups.
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

      {/* Tabs Row with Mobile Previous / Next Arrows */}
      <div className="w-full pb-0.5">
        <Tabs
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id as any);
            if (dateRangeFilter !== 'all') {
              setDateRangeFilter('all');
              setDraftDateRangeFilter('all');
            }
          }}
          variant="pills"
          tabs={[
            { id: 'all', label: 'All Open Tasks', count: allOpenCount },
            { id: 'today', label: "Today's Tasks", count: todaysCount },
            { id: 'overdue', label: 'Overdue Follow-ups', count: overdueCount },
            { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { id: 'completed', label: 'Completed History', count: completedCount },
          ]}
        />
      </div>

      {/* Sleek Search & Control Toolbar matching reference */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 w-full">
        {/* Left: Search Bar */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, companies, salesperson..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors h-9"
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

        {/* Right: Controls & View Switcher */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Left on Mobile: Filter Drawer Trigger Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openFilterDrawer}
                  className={cn(
                    "relative size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs",
                    activeFiltersCount > 0 && "text-fairway-600 border-fairway-400 bg-fairway-50 dark:bg-fairway-950/40"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-fairway-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Filter
              </TooltipContent>
            </Tooltip>

            {/* Right Group on Mobile: Column Settings, Refresh, and View Switcher (List / Card) */}
            <div className="flex items-center gap-2">
              {/* Column Settings Dropdown (Desktop Only) */}
              <div className="hidden sm:block">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="size-9 rounded-button border border-border bg-white dark:bg-[#171717] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Column
                    </TooltipContent>
                  </Tooltip>
                <DropdownMenuContent align="end" className="w-48 bg-surface border border-border shadow-2xl p-1 rounded-card z-50">
                  <DropdownMenuLabel className="text-xs font-bold text-foreground px-2 py-1.5">
                    Toggle Columns
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={columns.status}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, status: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Status Checkbox
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.description}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, description: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Task Description
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.priority}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, priority: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Priority Badge
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.company}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, company: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Linked Company
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.inquiry}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, inquiry: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Inquiry Reference
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.dueDate}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, dueDate: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Due Date & Time
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.assignee}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, assignee: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Salesperson
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.actions}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, actions: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Action Buttons
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

              {/* Refresh Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => loadTasks(true)}
                    disabled={isRefreshing || isLoading}
                    className="size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                  >
                    <RefreshCw
                      className={cn(
                        "w-4 h-4 transition-transform duration-700",
                        (isRefreshing || isLoading) && "animate-spin text-fairway-600"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Refresh
                </TooltipContent>
              </Tooltip>

              {/* Segmented View Switcher (List / Card) - Desktop Only */}
              <div className="hidden sm:flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                        viewMode === 'list'
                          ? "bg-fairway-600 text-white font-bold"
                          : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    List
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                        viewMode === 'grid'
                          ? "bg-fairway-600 text-white font-bold"
                          : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Card
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Main Content Area */}
      {isLoading || isRefreshing ? (
        <>
          {/* Mobile view: Always render Card Skeletons */}
          <div className="grid grid-cols-1 gap-3 sm:hidden animate-fade-in">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface rounded-card border border-border p-4 shadow-subtle flex flex-col justify-between gap-3 text-left"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-16 h-5 rounded" />
                    <Skeleton className="w-14 h-5 rounded-full" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <Skeleton className="w-5 h-5 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                  <div className="space-y-1 pt-1">
                    <Skeleton className="h-3.5 w-32 rounded" />
                    <Skeleton className="h-3.5 w-24 rounded" />
                  </div>
                </div>
                <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="w-20 h-3.5 rounded" />
                  </div>
                  <Skeleton className="w-20 h-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view: Render based on viewMode */}
          <div className="hidden sm:block">
            {viewMode === 'list' ? (
              <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden divide-y divide-border animate-fade-in">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                      <Skeleton className="w-16 h-5 rounded-md shrink-0" />
                      <div className="space-y-1.5 flex-1 max-w-md">
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-3 w-3/4 rounded" />
                      </div>
                      <Skeleton className="w-24 h-4 rounded hidden md:block" />
                      <Skeleton className="w-16 h-5 rounded-full hidden sm:block" />
                      <Skeleton className="w-20 h-4 rounded hidden lg:block" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="w-16 h-7 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface rounded-card border border-border p-4 shadow-subtle flex flex-col justify-between gap-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-16 h-5 rounded" />
                        <Skeleton className="w-14 h-5 rounded-full" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="w-5 h-5 rounded-full" />
                        <Skeleton className="w-5 h-5 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-4/5 rounded" />
                      <div className="space-y-1 pt-1">
                        <Skeleton className="h-3.5 w-32 rounded" />
                        <Skeleton className="h-3.5 w-24 rounded" />
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <Skeleton className="w-20 h-3.5 rounded" />
                      </div>
                      <Skeleton className="w-20 h-7 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center text-xs text-foreground-muted bg-surface rounded-card border border-border shadow-subtle p-6">
          <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-foreground text-sm">No tasks in this category</p>
          <p className="mt-1 max-w-sm mx-auto">
            {activeFiltersCount > 0 || searchQuery
              ? "No tasks match your current search and filter criteria. Try resetting them."
              : "Everything looks clear! Schedule a new task to keep customer relationships warm."}
          </p>
          {(activeFiltersCount > 0 || searchQuery) && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              className="mt-4"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile view: ONLY Card View show, NOT list page show */}
          <div className="block sm:hidden">
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

          {/* Desktop view: Respects user viewMode (List vs Card) */}
          <div className="hidden sm:block">
            {viewMode === 'list' ? (
              <TasksList
                tasks={filteredTasks}
                columns={columns}
                todayStr={todayStr}
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

      {/* Advanced Filters Drawer (Right Slide-out matching reference) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in select-none overflow-hidden m-0 p-0">
          {/* Backdrop */}
          <div
            className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full sm:w-96 max-w-full sm:max-w-sm bg-surface border-l border-border border-t-0 border-r-0 border-b-0 h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none ring-0 text-left">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface flex items-start justify-between border-t-0">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-fairway-600" />
                  <span>Advanced Task Filters</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Refine tasks by salesperson, type, priority, or dates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Fields Body using Combobox */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Assigned Salesperson */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Assigned Salesperson</label>
                <Combobox
                  options={salespersonOptions}
                  value={draftOwnerFilter}
                  onChange={setDraftOwnerFilter}
                  placeholder="Select salesperson..."
                  searchPlaceholder="Search salesperson..."
                />
              </div>

              {/* Task Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Task Type</label>
                <Combobox
                  options={taskTypeOptions}
                  value={draftTypeFilter}
                  onChange={setDraftTypeFilter}
                  placeholder="Select task type..."
                  searchPlaceholder="Search task type..."
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Priority</label>
                <Combobox
                  options={priorityOptions}
                  value={draftPriorityFilter}
                  onChange={setDraftPriorityFilter}
                  placeholder="Select priority..."
                  searchPlaceholder="Search priority..."
                />
              </div>

              {/* Linked Company */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Linked Company</label>
                <Combobox
                  options={companyOptions}
                  value={draftCompanyFilter}
                  onChange={setDraftCompanyFilter}
                  placeholder="Select company..."
                  searchPlaceholder="Search company..."
                />
              </div>

              {/* Due Date Range */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Due Date Range</label>
                <Combobox
                  options={dateRangeOptions}
                  value={draftDateRangeFilter}
                  onChange={setDraftDateRangeFilter}
                  placeholder="Select date range..."
                  searchPlaceholder="Search date range..."
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-2.5 px-4 rounded-button border text-xs font-bold transition-all text-center bg-surface hover:bg-surface-muted border-border text-foreground cursor-pointer shadow-2xs"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 py-2.5 px-4 rounded-button bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold transition-all text-center shadow-xs cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      <Modal
        isOpen={isNewTaskOpen}
        onClose={() => {
          setIsNewTaskOpen(false);
          setTaskErrors({});
        }}
        title="Create Follow-up Task"
        description="Schedule a sales call, proposal follow-up, or client meeting"
        footer={
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full">
            <Button
              type="submit"
              form="new-task-form"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="w-full xs:w-auto"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
            </Button>
          </div>
        }
      >
        <form id="new-task-form" onSubmit={handleCreateTask} noValidate className="space-y-4 text-xs text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Linked Company <span className="text-rose-500 font-bold">*</span>
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
              placeholder="Select company..."
              searchPlaceholder="Search company..."
              triggerClassName={taskErrors.companyId ? 'border-rose-500 ring-1 ring-rose-500' : ''}
            />
            {taskErrors.companyId && (
              <p className="text-[11px] text-rose-500 font-medium">{taskErrors.companyId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Task Type <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={[
                  { value: 'Call', label: 'Call' },
                  { value: 'Meeting', label: 'Meeting' },
                  { value: 'Email', label: 'Email' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Site Visit', label: 'Site Visit' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={newTaskForm.taskType}
                onChange={(val) => {
                  setNewTaskForm({ ...newTaskForm, taskType: val as any });
                  clearTaskError('taskType');
                }}
                placeholder="Select task type..."
                searchPlaceholder="Search task type..."
                triggerClassName={taskErrors.taskType ? 'border-rose-500 ring-1 ring-rose-500' : ''}
              />
              {taskErrors.taskType && (
                <p className="text-[11px] text-rose-500 font-medium">{taskErrors.taskType}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Priority <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={[
                  { value: 'High', label: 'High' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Low', label: 'Low' },
                ]}
                value={newTaskForm.priority}
                onChange={(val) => {
                  setNewTaskForm({ ...newTaskForm, priority: val as any });
                  clearTaskError('priority');
                }}
                placeholder="Select priority..."
                searchPlaceholder="Search priority..."
                triggerClassName={taskErrors.priority ? 'border-rose-500 ring-1 ring-rose-500' : ''}
              />
              {taskErrors.priority && (
                <p className="text-[11px] text-rose-500 font-medium">{taskErrors.priority}</p>
              )}
            </div>
          </div>

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
                placeholder="Select due date"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Assigned Salesperson <span className="text-rose-500 font-bold">*</span>
            </label>
            <UserCombobox
              users={users}
              value={newTaskForm.assignedUserId}
              onChange={(val) => {
                setNewTaskForm({ ...newTaskForm, assignedUserId: val });
                clearTaskError('assignedUserId');
              }}
              placeholder="Select salesperson..."
              searchPlaceholder="Search salespeople..."
              triggerClassName={taskErrors.assignedUserId ? 'border-rose-500 ring-1 ring-rose-500' : ''}
            />
            {taskErrors.assignedUserId && (
              <p className="text-[11px] text-rose-500 font-medium">{taskErrors.assignedUserId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Task Description <span className="text-rose-500 font-bold">*</span>
            </label>
            <Textarea
              placeholder="e.g. Call Rahul Shah regarding chemical containment and fire sprinkler approval..."
              value={newTaskForm.description}
              onChange={(e) => {
                setNewTaskForm({ ...newTaskForm, description: e.target.value });
                clearTaskError('description');
              }}
              className={taskErrors.description ? 'border-rose-500 ring-1 ring-rose-500' : ''}
              error={taskErrors.description}
              rows={3}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => {
          setEditingTask(null);
          setEditTaskErrors({});
        }}
        title="Edit Follow-up Task"
        description="Update task details, schedule, priority, and salesperson."
        footer={
          <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setEditTaskErrors({});
              }}
              className="w-full xs:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-task-form"
              variant="primary"
              size="sm"
              disabled={isUpdating}
              className="w-full xs:w-auto"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form id="edit-task-form" onSubmit={handleUpdateTask} className="space-y-4 pt-1 text-xs text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Related Company <span className="text-rose-500 font-bold">*</span>
            </label>
            <Combobox
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
                description: `${c.city || 'Gujarat'} · ${c.industry || 'Industrial'}`,
              }))}
              value={editTaskForm.companyId}
              onChange={(val) => {
                setEditTaskForm({ ...editTaskForm, companyId: val });
                clearEditTaskError('companyId');
              }}
              placeholder="Select company..."
              searchPlaceholder="Search company..."
              triggerClassName={editTaskErrors.companyId ? 'border-rose-500 ring-1 ring-rose-500' : ''}
            />
            {editTaskErrors.companyId && (
              <p className="text-[11px] text-rose-500 font-medium">{editTaskErrors.companyId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Task Type <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={[
                  { value: 'Call', label: 'Call' },
                  { value: 'Meeting', label: 'Meeting' },
                  { value: 'Email', label: 'Email' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Site Visit', label: 'Site Visit' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={editTaskForm.taskType}
                onChange={(val) => {
                  setEditTaskForm({ ...editTaskForm, taskType: val as any });
                  clearEditTaskError('taskType');
                }}
                placeholder="Select task type..."
                searchPlaceholder="Search task type..."
                triggerClassName={editTaskErrors.taskType ? 'border-rose-500 ring-1 ring-rose-500' : ''}
              />
              {editTaskErrors.taskType && (
                <p className="text-[11px] text-rose-500 font-medium">{editTaskErrors.taskType}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Priority <span className="text-rose-500 font-bold">*</span>
              </label>
              <Combobox
                options={[
                  { value: 'High', label: 'High' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Low', label: 'Low' },
                ]}
                value={editTaskForm.priority}
                onChange={(val) => {
                  setEditTaskForm({ ...editTaskForm, priority: val as any });
                  clearEditTaskError('priority');
                }}
                placeholder="Select priority..."
                searchPlaceholder="Search priority..."
                triggerClassName={editTaskErrors.priority ? 'border-rose-500 ring-1 ring-rose-500' : ''}
              />
              {editTaskErrors.priority && (
                <p className="text-[11px] text-rose-500 font-medium">{editTaskErrors.priority}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Due Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <DatePicker
                value={editTaskForm.dueDate}
                onChange={(dateStr) => {
                  setEditTaskForm({ ...editTaskForm, dueDate: dateStr });
                  clearEditTaskError('dueDate');
                }}
                placeholder="Select due date"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Assigned Salesperson <span className="text-rose-500 font-bold">*</span>
            </label>
            <UserCombobox
              users={users}
              value={editTaskForm.assignedUserId}
              onChange={(val) => {
                setEditTaskForm({ ...editTaskForm, assignedUserId: val });
                clearEditTaskError('assignedUserId');
              }}
              placeholder="Select salesperson..."
              searchPlaceholder="Search salespeople..."
              triggerClassName={editTaskErrors.assignedUserId ? 'border-rose-500 ring-1 ring-rose-500' : ''}
            />
            {editTaskErrors.assignedUserId && (
              <p className="text-[11px] text-rose-500 font-medium">{editTaskErrors.assignedUserId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Task Description <span className="text-rose-500 font-bold">*</span>
            </label>
            <Textarea
              placeholder="e.g. Call Rahul Shah regarding chemical containment and fire sprinkler approval..."
              value={editTaskForm.description}
              onChange={(e) => {
                setEditTaskForm({ ...editTaskForm, description: e.target.value });
                clearEditTaskError('description');
              }}
              className={editTaskErrors.description ? 'border-rose-500 ring-1 ring-rose-500' : ''}
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
