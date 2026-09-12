import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { TaskService } from '@/modules/core/services/taskService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Task } from '@/modules/core/types';
import { formatRelativeDate, formatDate, getPriorityBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Tabs } from '@/modules/core/components/ui/Tabs';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { UserCombobox } from '@/modules/core/components/ui/UserCombobox';

export interface TaskListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit, currentUser, users, isSales } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>(() => StorageService.getTasks());
  const [isLoading, setIsLoading] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const companies = StorageService.getCompanies();

  const [newTaskForm, setNewTaskForm] = useState({
    companyId: companies[0]?.id || '',
    taskType: 'Call' as Task['taskType'],
    description: '',
    dueDate: todayStr,
    dueTime: '11:00 AM',
    priority: 'High' as Task['priority'],
    assignedUserId: currentUser.id,
  });

  const loadTasks = async () => {
    try {
      const local = StorageService.getTasks();
      const res = await TaskService.getTasks();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const normalizedBackend = res.data.map((t) => ({
          ...t,
          status: normalizeStatus(t.status),
          dueDate: getValidDueDate(t),
        }));

        // Merge backend items into local items so all 41 items in StorageService are retained
        const taskMap = new Map<string, Task>();
        local.forEach((t) => taskMap.set(t.id, t));
        normalizedBackend.forEach((t) => {
          if (taskMap.has(t.id)) {
            taskMap.set(t.id, { ...taskMap.get(t.id)!, ...t });
          } else {
            taskMap.set(t.id, t);
          }
        });

        const merged = Array.from(taskMap.values());
        setTasks(merged);
        StorageService.setTasks(merged);
      } else {
        setTasks(local);
      }
    } catch {
      setTasks(StorageService.getTasks());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const allOpenCount = tasks.filter((t) => normalizeStatus(t.status) === 'Pending').length;
  const todaysCount = tasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) === todayStr).length;
  const upcomingCount = tasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) > todayStr).length;
  const overdueCount = tasks.filter((t) => normalizeStatus(t.status) === 'Pending' && getValidDueDate(t) < todayStr).length;
  const completedCount = tasks.filter((t) => normalizeStatus(t.status) === 'Completed').length;

  const handleToggleTask = async (id: string) => {
    const updatedLocal = StorageService.toggleTaskCompletion(id);
    if (updatedLocal) {
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedLocal : t)));
    }
    try {
      await TaskService.toggleTask(id, updatedLocal);
    } catch { }
    success('Task Updated', 'Follow-up status synchronized.');
  };

  const handleDeleteTask = async (id: string) => {
    StorageService.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await TaskService.deleteTask(id);
    } catch { }
    success('Task Deleted', 'Follow-up task removed.');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.description.trim()) return;

    const comp = StorageService.getCompanyById(newTaskForm.companyId);
    const assigned = users.find((u) => u.id === newTaskForm.assignedUserId) || currentUser;

    setIsSubmitting(true);
    try {
      const localT = StorageService.createTask({
        companyId: comp?.id,
        companyName: comp?.name,
        assignedUserId: assigned.id,
        assignedUserName: assigned.name,
        taskType: newTaskForm.taskType,
        description: newTaskForm.description,
        dueDate: newTaskForm.dueDate,
        dueTime: newTaskForm.dueTime,
        priority: newTaskForm.priority,
        status: 'Pending',
      });
      setTasks((prev) => [localT, ...prev]);

      try {
        await TaskService.createTask({
          companyId: comp?.id,
          companyName: comp?.name,
          assignedUserId: assigned.id,
          assignedUserName: assigned.name,
          taskType: newTaskForm.taskType,
          description: newTaskForm.description,
          dueDate: newTaskForm.dueDate,
          dueTime: newTaskForm.dueTime,
          priority: newTaskForm.priority,
          status: 'Pending',
        });
      } catch { }

      setIsNewTaskOpen(false);
      setNewTaskForm({
        companyId: companies[0]?.id || '',
        taskType: 'Call',
        description: '',
        dueDate: todayStr,
        dueTime: '11:00 AM',
        priority: 'High',
        assignedUserId: currentUser.id,
      });
      success('Task Created', 'Follow-up task scheduled.');
    } catch (err: any) {
      error('Error', err.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tasks based on active tab and criteria
  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      t.description.toLowerCase().includes(q) ||
      (t.companyName && t.companyName.toLowerCase().includes(q));

    const matchesOwner = ownerFilter === 'all' || t.assignedUserId === ownerFilter;
    const matchesType = typeFilter === 'all' || t.taskType === typeFilter;

    const taskStatus = normalizeStatus(t.status);
    const taskDueDate = getValidDueDate(t);

    let matchesTab = false;
    if (activeTab === 'all') matchesTab = taskStatus === 'Pending';
    if (activeTab === 'today') matchesTab = taskStatus === 'Pending' && taskDueDate === todayStr;
    if (activeTab === 'upcoming') matchesTab = taskStatus === 'Pending' && taskDueDate > todayStr;
    if (activeTab === 'overdue') matchesTab = taskStatus === 'Pending' && taskDueDate < todayStr;
    if (activeTab === 'completed') matchesTab = taskStatus === 'Completed';

    return matchesQuery && matchesOwner && matchesType && matchesTab;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">CRM / Tasks</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <CheckSquare className="w-6 h-6 text-foreground" />
            <span>Follow-up & Tasks Management</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Ensure zero dropped customer touchpoints with scheduled calls, meetings, and follow-ups.
          </p>
        </div>

        {canEdit && (
          <Button size="sm" variant="primary" onClick={() => setIsNewTaskOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Task
          </Button>
        )}
      </div>

      {/* Tabs Row */}
      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        variant="pills"
        tabs={[
          { id: 'all', label: 'All Open Tasks', count: allOpenCount },
          { id: 'today', label: "Today's Tasks", count: todaysCount },
          { id: 'overdue', label: 'Overdue Follow-ups', count: overdueCount },
          { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
          { id: 'completed', label: 'Completed History', count: completedCount },
        ]}
      />

      {/* Filter Bar */}
      <div className="bg-surface p-3 rounded-card border border-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks by description or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-surface-muted/60 border border-border rounded-input text-xs focus:outline-none focus:border-fairway-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Task Types</option>
            <option value="Call">Call</option>
            <option value="Meeting">Meeting</option>
            <option value="Email">Email</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Site Visit">Site Visit</option>
          </select>
        </div>
      </div>

      {/* Task List Stack */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden divide-y divide-border">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-foreground">No tasks in this category.</p>
            <p className="mt-1">Everything looks clear!</p>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isDone = normalizeStatus(t.status) === 'Completed';
            const dueDateStr = getValidDueDate(t);
            const isOverdue = !isDone && dueDateStr < todayStr;

            return (
              <div
                key={t.id}
                className={`p-4 flex items-start justify-between gap-4 hover:bg-surface-muted/50 transition-colors ${
                  isOverdue ? 'bg-rose-500/5 border-l-2 border-rose-500' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleTask(t.id)}
                    className="mt-0.5 text-foreground-muted hover:text-emerald-600 transition-colors shrink-0"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        isDone ? 'text-emerald-600 fill-emerald-100' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${isDone ? 'line-through text-foreground-muted' : 'text-foreground'}`}>
                        {t.description}
                      </span>
                      <Badge variant={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'default'} size="sm" dot>
                        {t.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-foreground-muted mt-1.5 flex-wrap">
                      {t.companyName && (
                        <span
                          onClick={() => t.companyId && onNavigateToCompany(t.companyId)}
                          className="font-bold text-foreground hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-foreground-muted" />
                          <span>{t.companyName}</span>
                        </span>
                      )}

                      {t.inquiryNumber && (
                        <span
                          onClick={() => t.inquiryId && onNavigateToInquiry(t.inquiryId)}
                          className="font-mono bg-surface-muted px-1.5 py-0.2 rounded border border-border text-foreground hover:border-foreground/40 cursor-pointer"
                        >
                          {t.inquiryNumber}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600' : 'text-foreground-muted'}`} />
                        <span className={isOverdue ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-foreground-muted'}>
                          Due: {formatDate(dueDateStr)} {t.dueTime && `· ${t.dueTime}`} ({formatRelativeDate(dueDateStr)})
                        </span>
                      </span>

                      <span className="flex items-center gap-1 text-foreground-muted">
                        <User className="w-3 h-3 text-foreground-muted" />
                        <span>{t.assignedUserName}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="xs"
                    variant={isDone ? 'outline' : 'primary'}
                    onClick={() => handleToggleTask(t.id)}
                  >
                    {isDone ? 'Reopen' : 'Complete'}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleDeleteTask(t.id)}
                    title="Delete task"
                    className="text-foreground-muted hover:text-rose-600 px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Task Modal */}
      <Modal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title="Create Follow-up Task"
        description="Schedule a sales call, proposal follow-up, or client meeting"
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Linked Company <span className="text-rose-500">*</span>
            </label>
            <Combobox
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
                description: `${c.city || 'Gujarat'} · ${c.industry || 'Industrial'}`,
              }))}
              value={newTaskForm.companyId}
              onChange={(val) => setNewTaskForm({ ...newTaskForm, companyId: val })}
              placeholder="Select company..."
              searchPlaceholder="Search company..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Task Type"
              value={newTaskForm.taskType}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, taskType: e.target.value as any })}
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
              value={newTaskForm.priority}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as any })}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Due Date"
              value={newTaskForm.dueDate}
              onChange={(dateStr) => setNewTaskForm({ ...newTaskForm, dueDate: dateStr })}
              placeholder="Select due date"
            />
            <Input
              label="Due Time"
              value={newTaskForm.dueTime}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, dueTime: e.target.value })}
            />
          </div>

          <UserCombobox
            label="Assigned Salesperson"
            users={users}
            value={newTaskForm.assignedUserId}
            onChange={(val) => setNewTaskForm({ ...newTaskForm, assignedUserId: val })}
            placeholder="Select salesperson..."
          />

          <Textarea
            label="Task Description"
            placeholder="e.g. Call Rahul Shah regarding chemical containment and fire sprinkler approval..."
            value={newTaskForm.description}
            onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
            required
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewTaskOpen(false)}>
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

export const TasksPage = TaskListView;
export default TasksPage;
