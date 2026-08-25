import React, { useState } from 'react';
import {
  Settings,
  Users,
  Shield,
  Kanban,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Check,
  Eye,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { User, UserRole, PipelineStageConfig, AuditLog } from '@/modules/core/types';
import { formatDate, formatDateTime } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Tabs } from '@/modules/core/components/ui/Tabs';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select } from '@/modules/core/components/ui/Input';

export const SettingsView: React.FC = () => {
  const { currentUser, users, updateRole, isSuperAdmin, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'rbac' | 'pipeline' | 'audit'>('users');
  const [stages, setStages] = useState<PipelineStageConfig[]>(StorageService.getPipelineStages());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(StorageService.getAuditLogs());

  // User form modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'sales' as UserRole,
    phone: '',
    department: 'Industrial Leasing',
  });

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (!isSuperAdmin) {
      error('Permission Denied', 'Only Super Admin can modify system roles.');
      return;
    }
    updateRole(userId, newRole);
    success('Role Updated', 'User permissions updated across the workspace.');
  };

  const handleToggleUserStatus = (userId: string) => {
    if (!isAdmin) {
      error('Permission Denied', 'Admin permission required to deactivate users.');
      return;
    }
    StorageService.toggleUserStatus(userId);
    success('User Updated', 'User status modified.');
    window.location.reload();
  };

  // Roles & Permissions Matrix data as defined in PRD Section 18
  const PERMISSION_MATRIX = [
    { capability: 'View all companies & accounts', superAdmin: 'Yes', admin: 'Yes', sales: 'Assigned / All', viewer: 'View' },
    { capability: 'Create new company & contacts', superAdmin: 'Yes', admin: 'Yes', sales: 'Yes', viewer: 'No' },
    { capability: 'Edit company information', superAdmin: 'Yes', admin: 'Yes', sales: 'Assigned / All', viewer: 'No' },
    { capability: 'Delete / Archive company', superAdmin: 'Yes', admin: 'Yes', sales: 'Restricted', viewer: 'No' },
    { capability: 'Create & import inquiries', superAdmin: 'Yes', admin: 'Yes', sales: 'Yes', viewer: 'No' },
    { capability: 'Change pipeline stages', superAdmin: 'Yes', admin: 'Yes', sales: 'Yes', viewer: 'No' },
    { capability: 'Configure pipeline stages', superAdmin: 'Yes', admin: 'Yes', sales: 'No', viewer: 'No' },
    { capability: 'Create & complete tasks', superAdmin: 'Yes', admin: 'Yes', sales: 'Yes', viewer: 'No' },
    { capability: 'Draft commercial proposals', superAdmin: 'Yes', admin: 'Yes', sales: 'Yes', viewer: 'View' },
    { capability: 'Manage users & roles', superAdmin: 'Yes', admin: 'Configurable', sales: 'No', viewer: 'No' },
    { capability: 'View system audit logs', superAdmin: 'Yes', admin: 'Limited', sales: 'No', viewer: 'No' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">Administration / Settings</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <Settings className="w-6 h-6 text-fairway-600" />
            <span>Settings & Access Control</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Manage users, configure Role-Based Access Control (RBAC), customize pipeline stages, and review audit logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
        variant="pills"
        tabs={[
          { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
          { id: 'rbac', label: 'Roles & Permissions Matrix', icon: <Shield className="w-4 h-4" /> },
          { id: 'pipeline', label: 'Pipeline Stages Config', icon: <Kanban className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Trail Logs', icon: <FileText className="w-4 h-4" /> },
        ]}
      />

      {/* ================= TAB 1: USERS ================= */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">Team Members & Access Accounts</CardTitle>
              <p className="text-xs text-foreground-muted">Assign user access roles: Super Admin, Admin, Sales, and Viewer</p>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-muted text-[11px] font-bold uppercase text-foreground-muted border-b border-border">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assigned Leads</th>
                  <th className="p-3">Last Active</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                        <div>
                          <span className="font-bold text-foreground block">{u.name}</span>
                          <span className="text-[10px] text-foreground-muted">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-foreground-muted">{u.department || 'Operations'}</td>

                    <td className="p-3">
                      {isSuperAdmin ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="bg-surface border border-border rounded px-2 py-1 font-bold text-xs capitalize text-fairway-900 focus:outline-none"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="sales">Sales</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="font-bold capitalize bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          {u.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          u.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="p-3 font-mono font-bold text-center">{u.assignedLeadsCount}</td>
                    <td className="p-3 text-foreground-muted">{u.lastActive}</td>

                    <td className="p-3 text-right">
                      {isAdmin && u.id !== currentUser.id && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleToggleUserStatus(u.id)}
                        >
                          {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ================= TAB 2: RBAC PERMISSIONS MATRIX ================= */}
      {activeTab === 'rbac' && (
        <Card className="space-y-4">
          <CardHeader>
            <div>
              <CardTitle className="text-sm">Role-Based Access Control (RBAC) Permissions Matrix</CardTitle>
              <p className="text-xs text-foreground-muted">
                System enforces permissions server-side as mandated by PRD Section 18.
              </p>
            </div>
          </CardHeader>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-muted text-[11px] font-bold uppercase text-foreground-muted border-b border-border">
                <tr>
                  <th className="p-3">Capability / Operation</th>
                  <th className="p-3 text-center text-purple-900 font-extrabold bg-purple-50/50">Super Admin</th>
                  <th className="p-3 text-center text-blue-900 font-extrabold bg-blue-50/50">Admin</th>
                  <th className="p-3 text-center text-emerald-900 font-extrabold bg-emerald-50/50">Sales</th>
                  <th className="p-3 text-center text-slate-800 font-extrabold bg-slate-50/50">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMISSION_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-muted/20">
                    <td className="p-3 font-semibold text-foreground">{row.capability}</td>
                    <td className="p-3 text-center font-mono font-bold text-purple-800 bg-purple-50/20">
                      {row.superAdmin === 'Yes' ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-purple-600" />
                          <span>Granted</span>
                        </span>
                      ) : (
                        row.superAdmin
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-blue-800 bg-blue-50/20">
                      {row.admin === 'Yes' ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          <span>Granted</span>
                        </span>
                      ) : (
                        row.admin
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/20">
                      {row.sales === 'Yes' ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Granted</span>
                        </span>
                      ) : (
                        row.sales
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700 bg-slate-50/20">
                      {row.viewer === 'View' ? (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>View Only</span>
                        </span>
                      ) : (
                        row.viewer
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ================= TAB 3: PIPELINE STAGES ================= */}
      {activeTab === 'pipeline' && (
        <Card className="space-y-4">
          <CardHeader>
            <div>
              <CardTitle className="text-sm">Configurable Pipeline Stages</CardTitle>
              <p className="text-xs text-foreground-muted">
                Stages stored in database config allowing dynamic reordering and renaming without code changes.
              </p>
            </div>
          </CardHeader>

          <div className="space-y-2">
            {stages.map((stg) => (
              <div key={stg.id} className="p-3 bg-surface border border-border rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-500 w-6">0{stg.order}</span>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stg.color }} />
                  <div>
                    <span className="font-bold text-foreground block">{stg.label}</span>
                    <span className="text-[11px] text-foreground-muted">{stg.description}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] bg-surface-muted px-2 py-0.5 rounded text-foreground-muted border border-border">
                  key: {stg.key}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ================= TAB 4: AUDIT TRAIL ================= */}
      {activeTab === 'audit' && (
        <Card className="space-y-4">
          <CardHeader>
            <div>
              <CardTitle className="text-sm">System Audit Logs & Traceability</CardTitle>
              <p className="text-xs text-foreground-muted">Immutable history of who changed what, old values, and timestamps.</p>
            </div>
          </CardHeader>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-muted text-[11px] font-bold uppercase text-foreground-muted border-b border-border">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-muted/20">
                    <td className="p-3 font-mono text-foreground-muted">{formatDateTime(log.timestamp)}</td>
                    <td className="p-3">
                      <span className="font-bold text-foreground">{log.userName}</span>
                      <span className="text-[10px] text-foreground-muted block">({log.userRole})</span>
                    </td>
                    <td className="p-3 font-bold">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'STAGE_CHANGE'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-foreground">
                      {log.entityType} {log.entityName && `· ${log.entityName}`}
                    </td>
                    <td className="p-3 text-foreground-muted max-w-md leading-relaxed">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export const SettingsPage = SettingsView;
export default SettingsPage;
