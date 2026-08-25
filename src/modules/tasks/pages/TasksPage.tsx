import React, { useState } from 'react';
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
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Task } from '@/modules/core/types';
import { formatRelativeDate, formatDate, getPriorityBadge } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Tabs } from '@/modules/core/components/ui/Tabs';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';

export interface TaskListViewProps {
  onNavigateToCompany: (companyId: string) => void;
  onNavigateToInquiry: (inquiryId: string) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  onNavigateToCompany,
  onNavigateToInquiry,
}) => {
  const { canEdit, currentUser, users, isSales } = useAuth();
  const { success } = useToast();

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [ownerFilter, setOwnerFilter] = useState<string>(isSales ? currentUser.id : 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>(StorageService.getTasks());
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const companies = StorageService.getCompanies();

  const [newTaskForm, setNewTaskForm] = useState({
    companyId: companies[0]?.id || '',
    taskType: 'Call' as Task['taskType'],
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00 AM',
    priority: 'High' as Task['priority'],
    assignedUserId: currentUser.id,
  });

  const refreshData = () => {
    setTasks(StorageService.getTasks());
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const todaysCount = tasks.filter((t) => t.status === 'Pending' && t.dueDate === todayStr).length;
  const upcomingCount = tasks.filter((t) => t.status === 'Pending' && t.dueDate > todayStr).length;
  const overdueCount = tasks.filter((t) => t.status === 'Pending' && t.dueDate < todayStr).length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;

  const handleToggleTask = (id: string) => {
    StorageService.toggleTaskCompletion(id);
    refreshData();
    success('Task Updated', 'Follow-up status synchronized.');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.description.trim()) return;

    const comp = StorageService.getCompanyById(newTaskForm.companyId);
    const assigned = users.find((u) => u.id === newTaskForm.assignedUserId) || currentUser;

    StorageService.createTask({
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
    refreshData();
    success('Task Created', 'Follow-up task scheduled.');
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

    let matchesTab = false;
    if (activeTab === 'today') matchesTab = t.status === 'Pending' && t.dueDate === todayStr;
    if (activeTab === 'upcoming') matchesTab = t.status === 'Pending' && t.dueDate > todayStr;
    if (activeTab === 'overdue') matchesTab = t.status === 'Pending' && t.dueDate < todayStr;
    if (activeTab === 'completed') matchesTab = t.status === 'Completed';

    return matchesQuery && matchesOwner && matchesType && matchesTab;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Tasks</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <CheckSquare className="w-6 h-6 text-amber-600" />
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
            const prio = getPriorityBadge(t.priority);
            const isOverdue = t.status === 'Pending' && t.dueDate < todayStr;

            return (
              <div
                key={t.id}
                className={`p-4 flex items-start justify-between gap-4 hover:bg-surface-muted/50 transition-colors ${
                  isOverdue ? 'bg-rose-50/20' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleTask(t.id)}
                    className="mt-0.5 text-foreground-muted hover:text-emerald-600 transition-colors shrink-0"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        t.status === 'Completed' ? 'text-emerald-600 fill-emerald-100' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${t.status === 'Completed' ? 'line-through text-foreground-muted' : 'text-foreground'}`}>
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
                          className="font-bold text-fairway-800 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-fairway-600" />
                          <span>{t.companyName}</span>
                        </span>
                      )}

                      {t.inquiryNumber && (
                        <span
                          onClick={() => t.inquiryId && onNavigateToInquiry(t.inquiryId)}
                          className="font-mono bg-surface-muted px-1.5 py-0.2 rounded border border-border text-foreground hover:border-fairway-400 cursor-pointer"
                        >
                          {t.inquiryNumber}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className={isOverdue ? 'font-bold text-rose-700' : ''}>
                          Due: {formatDate(t.dueDate)} {t.dueTime && `· ${t.dueTime}`} ({formatRelativeDate(t.dueDate)})
                        </span>
                      </span>

                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{t.assignedUserName}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="xs"
                    variant={t.status === 'Completed' ? 'outline' : 'primary'}
                    onClick={() => handleToggleTask(t.id)}
                  >
                    {t.status === 'Completed' ? 'Reopen' : 'Complete'}
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
          <Select
            label="Linked Company"
            value={newTaskForm.companyId}
            onChange={(e) => setNewTaskForm({ ...newTaskForm, companyId: e.target.value })}
            required
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city})
              </option>
            ))}
          </Select>

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
            <Input
              type="date"
              label="Due Date"
              value={newTaskForm.dueDate}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
              required
            />
            <Input
              label="Due Time"
              value={newTaskForm.dueTime}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, dueTime: e.target.value })}
            />
          </div>

          <Select
            label="Assigned Salesperson"
            value={newTaskForm.assignedUserId}
            onChange={(e) => setNewTaskForm({ ...newTaskForm, assignedUserId: e.target.value })}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>

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
