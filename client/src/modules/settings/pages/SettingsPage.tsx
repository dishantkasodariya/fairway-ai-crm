import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Shield,
  Kanban,
  FileText,
} from 'lucide-react';
import { useRouter } from '@/modules/core/router/RouterContext';
import { RoleService, RoleItem } from '@/modules/core/services/roleService';
import { PermissionsService, RolePermissionItem } from '@/modules/core/services/permissionsService';
import { Tabs } from '@/modules/core/components/ui/Tabs';

import { UserManagementTab } from '../components/UserManagementTab';
import { RolesPermissionsTab } from '../components/RolesPermissionsTab';
import { PipelineStagesTab } from '../components/PipelineStagesTab';
import { AuditLogsTab } from '../components/AuditLogsTab';

export type SettingsTabId = 'user-management' | 'roles-permissions' | 'pipeline-stages' | 'audit-logs';

export const SettingsView: React.FC = () => {
  const { pathname, navigate, selectedEntityId } = useRouter();

  // Roles state from backend API (live PostgreSQL)
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(true);

  // Permissions state from backend API (live PostgreSQL)
  const [permissions, setPermissions] = useState<RolePermissionItem[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState<boolean>(true);

  // Determine active tab from URL (/setting/user-management, /setting/roles-permissions, etc.)
  const activeTab: SettingsTabId = React.useMemo(() => {
    if (selectedEntityId) {
      if (['user-management', 'roles-permissions'].includes(selectedEntityId)) {
        return selectedEntityId as SettingsTabId;
      }
    }
    const clean = pathname.toLowerCase();
    if (clean.includes('role') || clean.includes('rbac')) return 'roles-permissions';
    return 'user-management';
  }, [pathname, selectedEntityId]);

  // Fetch roles and permissions from backend API on mount
  const loadData = async () => {
    setIsLoadingPermissions(true);
    setIsLoadingRoles(true);
    try {
      const [permRes, roleRes] = await Promise.all([
        PermissionsService.getRolePermissions(),
        RoleService.getRoles(),
      ]);

      if (permRes.success && permRes.data) {
        setPermissions(permRes.data);
      }
      if (roleRes.success && roleRes.data) {
        setRoles(roleRes.data);
      }
    } catch (err) {
      console.warn('Could not fetch RBAC data from API:', err);
    } finally {
      setIsLoadingPermissions(false);
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tabId: string) => {
    navigate(`/setting/${tabId}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left animate-fade-in pb-12">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">Administration / Settings</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <Settings className="w-6 h-6 text-fairway-600" />
            <span>Settings & Access Control</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Manage users and configure live roles & permissions.
          </p>
        </div>
      </div>

      {/* Navigation Tabs connected to URL routing */}
      <Tabs
        activeTab={activeTab}
        onChange={handleTabChange}
        variant="pills"
        tabs={[
          { id: 'user-management', label: 'User Management', icon: <Users className="w-4 h-4" /> },
          { id: 'roles-permissions', label: 'Roles & Permissions', icon: <Shield className="w-4 h-4" /> },
          // { id: 'pipeline-stages', label: 'Pipeline Stages Config', icon: <Kanban className="w-4 h-4" /> },
          // { id: 'audit-logs', label: 'Audit Trail Logs', icon: <FileText className="w-4 h-4" /> },
        ]}
      />

      {/* ================= TAB 1: USER MANAGEMENT (/setting/user-management) ================= */}
      {activeTab === 'user-management' && (
        <UserManagementTab roles={roles} isLoadingRoles={isLoadingRoles} />
      )}

      {/* ================= TAB 2: ROLES & PERMISSIONS (/setting/roles-permissions) ================= */}
      {activeTab === 'roles-permissions' && (
        <RolesPermissionsTab
          roles={roles}
          isLoadingRoles={isLoadingRoles}
          permissions={permissions}
          isLoadingPermissions={isLoadingPermissions}
          onRefreshData={loadData}
        />
      )}

      {/* ================= TAB 3: PIPELINE STAGES (/setting/pipeline-stages) [HIDDEN] ================= */}
      {/* {activeTab === 'pipeline-stages' && <PipelineStagesTab />} */}

      {/* ================= TAB 4: AUDIT TRAIL LOGS (/setting/audit-logs) [HIDDEN] ================= */}
      {/* {activeTab === 'audit-logs' && <AuditLogsTab />} */}
    </div>
  );
};

export const SettingsPage = SettingsView;
export default SettingsView;
