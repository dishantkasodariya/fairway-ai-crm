import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Sliders,
  Trash2,
  Lock,
  LayoutGrid,
  List,
  MoreVertical,
  RotateCcw,
  Check,
  X as XIcon,
} from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { RoleService, RoleItem, RolePermissionDetail } from '@/modules/core/services/roleService';
import { PermissionsService, RolePermissionItem } from '@/modules/core/services/permissionsService';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Combobox } from '@/modules/core/components/ui/combobox-1';

interface RolesPermissionsTabProps {
  roles: RoleItem[];
  isLoadingRoles: boolean;
  permissions: RolePermissionItem[];
  isLoadingPermissions: boolean;
  onRefreshData: () => Promise<void>;
}

export const RolesPermissionsTab: React.FC<RolesPermissionsTabProps> = ({
  roles,
  isLoadingRoles,
  permissions,
  isLoadingPermissions,
  onRefreshData,
}) => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [rbacViewMode, setRbacViewMode] = useState<'cards' | 'matrix' | 'capabilities'>('matrix');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [openActionMenuRoleId, setOpenActionMenuRoleId] = useState<string | null>(null);

  // Permissions state
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [permCategoryFilter, setPermCategoryFilter] = useState('All');
  const [isResettingPerms, setIsResettingPerms] = useState(false);

  // Create Role Modal State
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    description: '',
    color: 'blue',
  });

  // Define Permissions Modal State (Action field / 3-dot)
  const [definingRole, setDefiningRole] = useState<RoleItem | null>(null);
  const [rolePermissionsList, setRolePermissionsList] = useState<RolePermissionDetail[]>([]);
  const [isLoadingRolePerms, setIsLoadingRolePerms] = useState(false);
  const [isSavingRolePerms, setIsSavingRolePerms] = useState(false);

  // Categories list for permissions
  const categories = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [permissions]);

  // Filtered roles list for Role List / Matrix view
  const filteredRoles = useMemo(() => {
    if (!roleSearchQuery.trim()) return roles;
    const q = roleSearchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, roleSearchQuery]);

  // Filtered permissions list
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesSearch =
        p.capability.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(permSearchQuery.toLowerCase()));
      const matchesCategory =
        permCategoryFilter === 'All' || p.category === permCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [permissions, permSearchQuery, permCategoryFilter]);

  // Create Role Handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) {
      error('Validation Error', 'Role name is required.');
      return;
    }

    setIsSubmittingRole(true);
    const res = await RoleService.createRole({
      name: newRoleForm.name.trim(),
      description: newRoleForm.description.trim(),
      color: newRoleForm.color,
    });
    setIsSubmittingRole(false);

    if (res.success && res.data) {
      success('Role Created', `Custom role "${newRoleForm.name}" created successfully.`);
      setIsCreateRoleOpen(false);
      setNewRoleForm({ name: '', description: '', color: 'blue' });
      await onRefreshData();
    } else {
      error('Creation Failed', res.error || 'Failed to create role.');
    }
  };

  // Open Define Permissions Modal for specific role
  const handleOpenDefinePermissions = async (role: RoleItem) => {
    setDefiningRole(role);
    setOpenActionMenuRoleId(null);
    setIsLoadingRolePerms(true);

    const res = await RoleService.getRolePermissionsForRole(role.key);
    if (res.success && res.data) {
      setRolePermissionsList(res.data);
    } else {
      // Fallback from existing permissions state
      const fallbackList = permissions.map((p) => {
        let value = 'No';
        if (role.key === 'super_admin') value = p.superAdmin;
        else if (role.key === 'admin') value = p.admin;
        else if (role.key === 'sales') value = p.sales;
        else if (role.key === 'viewer') value = p.viewer;
        else {
          const custom = p.customPermissions || {};
          value = custom[role.key] || 'No';
        }
        return {
          id: p.id,
          capability: p.capability,
          category: p.category,
          value,
          description: p.description,
        };
      });
      setRolePermissionsList(fallbackList);
    }
    setIsLoadingRolePerms(false);
  };

  // Save Role Permissions from Define Modal
  const handleSaveRolePermissions = async () => {
    if (!definingRole) return;
    setIsSavingRolePerms(true);

    const payload = rolePermissionsList.map((item) => ({
      id: item.id,
      value: item.value,
    }));

    const res = await RoleService.updateRolePermissionsForRole(definingRole.key, payload);
    setIsSavingRolePerms(false);

    if (res.success) {
      success('Permissions Saved', `Permissions updated for ${definingRole.name}.`);
      setDefiningRole(null);
      await onRefreshData();
    } else {
      error('Save Failed', res.error || 'Failed to update permissions.');
    }
  };

  // Permission update handler in matrix view
  const handleUpdatePermissionValue = async (
    id: string,
    roleKey: string,
    newValue: string
  ) => {
    if (!isAdmin) {
      error('Permission Denied', 'Only Admins can modify the RBAC permissions matrix.');
      return;
    }

    if (['superAdmin', 'admin', 'sales', 'viewer'].includes(roleKey)) {
      await PermissionsService.updateRolePermission(id, { [roleKey]: newValue });
    } else {
      await RoleService.updateRolePermissionsForRole(roleKey, [{ id, value: newValue }]);
    }

    await onRefreshData();
    success('Permissions Updated', `Updated permission for ${roleKey}.`);
  };

  // Reset permissions to baseline
  const handleResetPermissions = async () => {
    if (!window.confirm('Reset all roles & permissions to the default PRD baseline?')) return;
    setIsResettingPerms(true);
    const res = await PermissionsService.resetRolePermissions();
    setIsResettingPerms(false);

    if (res.success) {
      await onRefreshData();
      success('Permissions Reset', 'Roles & Permissions matrix restored to default baseline.');
    } else {
      error('Reset Failed', res.error || 'Failed to reset permissions.');
    }
  };

  // Delete Custom Role
  const handleDeleteRole = async (role: RoleItem) => {
    if (role.isSystem) {
      error('Restricted', 'System default roles cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    const res = await RoleService.deleteRole(role.id);
    if (res.success) {
      success('Role Deleted', `Role "${role.name}" has been deleted.`);
      await onRefreshData();
    } else {
      error('Deletion Failed', res.error || 'Failed to delete role.');
    }
  };

  // Color helper for roles
  const getRoleColorStyles = (color: string) => {
    switch (color) {
      case 'purple':
        return { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20', ring: 'ring-purple-500' };
      case 'blue':
        return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', ring: 'ring-blue-500' };
      case 'emerald':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', ring: 'ring-emerald-500' };
      case 'amber':
        return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', ring: 'ring-amber-500' };
      case 'rose':
        return { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', ring: 'ring-rose-500' };
      case 'indigo':
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20', ring: 'ring-indigo-500' };
      default:
        return { bg: 'bg-surface-muted', text: 'text-foreground-muted', border: 'border-border', ring: 'ring-fairway-500' };
    }
  };

  const renderPermissionBadge = (id: string, roleKey: string, val: string) => {
    const isYes = val === 'Yes';
    const isNo = val === 'No';

    let badgeColor = 'bg-surface-muted text-foreground-muted border-border';
    if (isYes) badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    else if (isNo) badgeColor = 'bg-surface-muted text-foreground-muted border-border';
    else badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';

    if (isAdmin) {
      return (
        <select
          value={val}
          onChange={(e) => handleUpdatePermissionValue(id, roleKey, e.target.value)}
          className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none transition-all shadow-2xs cursor-pointer ${badgeColor}`}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="Assigned / All">Assigned / All</option>
          <option value="Restricted">Restricted</option>
          <option value="Limited">Limited</option>
          <option value="View">View</option>
          <option value="Configurable">Configurable</option>
        </select>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${badgeColor}`}>
        {isYes && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
        {isNo && <XIcon className="w-3 h-3 text-foreground-muted/60 shrink-0" />}
        <span>{val}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Sub-header Bar: View Switcher (Cards / Matrix List / Capabilities) & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-fairway-600" />
            <span>Role Access & Permission Governance</span>
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Define and manage security roles, access profiles, and granular capability matrices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher: Cards vs Matrix List vs Capabilities Matrix */}
          <div className="flex items-center p-1 bg-surface-muted/60 border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setRbacViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rbacViewMode === 'cards'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card View</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rbacViewMode === 'matrix'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Matrix List</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacViewMode('capabilities')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rbacViewMode === 'capabilities'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Capabilities Matrix</span>
            </button>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCreateRoleOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-fairway-600 hover:bg-fairway-700 text-white shadow-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Role</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPermissions}
                disabled={isResettingPerms}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl shadow-xs"
                title="Reset RBAC permissions to default baseline"
              >
                <RotateCcw className="w-3.5 h-3.5 text-fairway-600" />
                <span className="hidden md:inline">Reset Baseline</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ================= VIEW 1: ROLE CARDS VIEW ================= */}
      {rbacViewMode === 'cards' && (
        isLoadingRoles ? (
          <div className="p-12 text-center bg-surface rounded-2xl border border-border shadow-2xs">
            <div className="inline-block w-6 h-6 border-2 border-fairway-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs font-semibold text-foreground">Loading workspace roles...</p>
            <p className="text-[11px] text-foreground-muted mt-0.5">Fetching live roles from PostgreSQL API</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center bg-surface rounded-2xl border border-border">
            <Shield className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-foreground">No roles available</p>
            <p className="text-[11px] text-foreground-muted mt-0.5">Create your first custom role to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {roles.map((role) => {
              const colorStyle = getRoleColorStyles(role.color);
              const isActionOpen = openActionMenuRoleId === role.id;

              return (
                <div
                  key={role.id}
                  className="relative flex flex-col justify-between p-5 rounded-2xl bg-surface border border-border hover:border-fairway-400/80 transition-all shadow-2xs hover:shadow-md group"
                >
                  <div>
                    {/* Top Header: Role Icon + Name + 3-Dot Action */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${colorStyle.bg} ${colorStyle.text} border ${colorStyle.border}`}>
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground group-hover:text-fairway-600 transition-colors">
                            {role.name}
                          </h4>
                          <span className="text-[10px] font-mono text-foreground-muted">
                            {role.key}
                          </span>
                        </div>
                      </div>

                      {/* Three-Dot Action Field Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionMenuRoleId(isActionOpen ? null : role.id)
                          }
                          className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
                          title="Role actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isActionOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenActionMenuRoleId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-xl border border-border shadow-xl p-1.5 z-50 animate-scale-in text-left">
                              <button
                                type="button"
                                onClick={() => handleOpenDefinePermissions(role)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-fairway-500/10 hover:text-fairway-700 dark:hover:text-fairway-300 transition-colors text-left"
                              >
                                <Sliders className="w-3.5 h-3.5 text-fairway-600" />
                                <span>Define Permissions</span>
                              </button>

                              {!role.isSystem && (
                                <>
                                  <div className="border-t border-border my-1" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuRoleId(null);
                                      handleDeleteRole(role);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Role</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-foreground-muted line-clamp-3 mb-4 leading-relaxed">
                      {role.description || 'Custom access role configured for the workspace.'}
                    </p>
                  </div>

                  {/* Bottom Metadata & Button */}
                  <div className="space-y-3 pt-3 border-t border-border/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-muted text-[11px]">Assigned Members</span>
                      <span className="font-bold text-foreground font-mono bg-surface-muted px-2 py-0.5 rounded-md border border-border">
                        {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                      </span>
                    </div>

                    {/* Action Button: Define Permissions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDefinePermissions(role)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 hover:border-fairway-500 hover:text-fairway-700 dark:hover:text-fairway-300"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Define Permissions</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ================= VIEW 2: ROLE MATRIX LIST VIEW (SHOWS WHOLE LIST OF ROLES) ================= */}
      {rbacViewMode === 'matrix' && (
        <Card className="space-y-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-fairway-600" />
                <span>Workspace Roles Matrix List</span>
              </CardTitle>
              <p className="text-xs text-foreground-muted mt-0.5">
                Whole list of all {roles.length} system and custom roles configured in Fairway CRM.
              </p>
            </div>

            {/* Role Search and Create Role Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  placeholder="Search roles..."
                  className="pl-8.5 pr-3 py-1.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 transition-all w-48 sm:w-56 shadow-2xs"
                />
              </div>

              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateRoleOpen(true)}
                  className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-xl shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Role</span>
                </Button>
              )}
            </div>
          </CardHeader>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-muted text-[11px] font-bold uppercase text-foreground-muted border-b border-border">
                <tr>
                  <th className="p-3.5 min-w-[220px]">Role Name & Identifier</th>
                  <th className="p-3.5 min-w-[280px]">Description</th>
                  <th className="p-3.5 min-w-[120px] text-center">Type</th>
                  <th className="p-3.5 min-w-[130px] text-center">Assigned Users</th>
                  <th className="p-3.5 min-w-[180px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingRoles ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-foreground-muted text-xs">
                      <div className="inline-block w-5 h-5 border-2 border-fairway-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="font-semibold text-foreground">Fetching roles from API...</p>
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-foreground-muted text-xs">
                      No roles match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const colorStyle = getRoleColorStyles(role.color);
                    return (
                      <tr key={role.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${colorStyle.bg} ${colorStyle.text} border ${colorStyle.border} shrink-0`}
                            >
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{role.name}</span>
                              <span className="text-[10px] font-mono text-foreground-muted">
                                {role.key}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <p className="text-xs text-foreground-muted line-clamp-2 max-w-md">
                            {role.description || 'Custom access role configured for the workspace.'}
                          </p>
                        </td>

                        <td className="p-3.5 text-center">
                          {role.isSystem ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-foreground-muted">
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>System Default</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-fairway-500/10 border border-fairway-500/20 text-fairway-700 dark:text-fairway-300">
                              <span>Custom Role</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="font-bold text-foreground font-mono bg-surface-muted px-2.5 py-1 rounded-md border border-border text-xs">
                            {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionMenuRoleId(
                                  openActionMenuRoleId === `matrix_${role.id}` ? null : `matrix_${role.id}`
                                )
                              }
                              className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors border border-transparent hover:border-border"
                              title="Role actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openActionMenuRoleId === `matrix_${role.id}` && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setOpenActionMenuRoleId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-xl border border-border shadow-xl p-1.5 z-50 animate-scale-in text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuRoleId(null);
                                      handleOpenDefinePermissions(role);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-fairway-500/10 hover:text-fairway-700 dark:hover:text-fairway-300 transition-colors text-left"
                                  >
                                    <Sliders className="w-3.5 h-3.5 text-fairway-600" />
                                    <span>Define Permissions</span>
                                  </button>

                                  {!role.isSystem && (
                                    <>
                                      <div className="border-t border-border my-1" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuRoleId(null);
                                          handleDeleteRole(role);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete Role</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ================= VIEW 3: DYNAMIC CAPABILITIES MATRIX ================= */}
      {rbacViewMode === 'capabilities' && (
        <Card className="space-y-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold">Comprehensive Capabilities Matrix</CardTitle>
              <p className="text-xs text-foreground-muted">
                In-place dynamic matrix across all {roles.length} system & custom roles.
              </p>
            </div>

            {/* Permissions Filters & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={permSearchQuery}
                  onChange={(e) => setPermSearchQuery(e.target.value)}
                  placeholder="Search capabilities..."
                  className="pl-8.5 pr-8 py-1.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 transition-all w-48 sm:w-56 shadow-2xs"
                />
                {permSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPermSearchQuery('')}
                    className="absolute right-2.5 text-foreground-muted hover:text-foreground"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="w-44">
                <Combobox
                  options={categories.map((cat) => ({ value: cat, label: cat }))}
                  value={permCategoryFilter}
                  onChange={(val) => setPermCategoryFilter(val || 'All')}
                  placeholder="Category"
                />
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-muted text-[11px] font-bold uppercase text-foreground-muted border-b border-border">
                <tr>
                  <th className="p-3.5 min-w-[240px]">Capability / Operation</th>
                  {roles.map((r) => {
                    const colorStyle = getRoleColorStyles(r.color);
                    return (
                      <th
                        key={r.id}
                        className={`p-3.5 text-center font-extrabold ${colorStyle.text} ${colorStyle.bg} min-w-[130px]`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{r.name}</span>
                          <span className="text-[9px] font-mono opacity-70 lowercase">
                            {r.key}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingPermissions ? (
                  <tr>
                    <td colSpan={roles.length + 1} className="p-12 text-center text-foreground-muted text-xs">
                      <div className="inline-block w-5 h-5 border-2 border-fairway-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="font-semibold text-foreground">Fetching capabilities matrix...</p>
                    </td>
                  </tr>
                ) : filteredPermissions.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted/20 transition-colors">
                    <td className="p-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs">{row.capability}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-muted border border-border text-foreground-muted font-medium">
                            {row.category}
                          </span>
                        </div>
                        {row.description && (
                          <span className="text-[10px] text-foreground-muted block mt-0.5">
                            {row.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {roles.map((r) => {
                      let val = 'No';
                      if (r.key === 'super_admin') val = row.superAdmin;
                      else if (r.key === 'admin') val = row.admin;
                      else if (r.key === 'sales') val = row.sales;
                      else if (r.key === 'viewer') val = row.viewer;
                      else {
                        const custom = row.customPermissions || {};
                        val = custom[r.key] || 'No';
                      }

                      const colorStyle = getRoleColorStyles(r.color);

                      return (
                        <td
                          key={r.id}
                          className={`p-3.5 text-center ${colorStyle.bg}`}
                        >
                          {renderPermissionBadge(row.id, r.key, val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ================= MODAL: CREATE NEW ROLE ================= */}
      {isCreateRoleOpen && (
        <Modal
          isOpen={isCreateRoleOpen}
          onClose={() => setIsCreateRoleOpen(false)}
          title="Create New Role"
          description="Define a custom access role for team members and assign permissions."
        >
          <form onSubmit={handleCreateRole} className="space-y-4 text-xs text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newRoleForm.name}
                onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                placeholder="e.g. Broker Desk Head, Regional Lead, Legal Auditor"
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Description
              </label>
              <textarea
                rows={3}
                value={newRoleForm.description}
                onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                placeholder="Brief description of responsibilities and scope..."
                className="w-full px-3.5 py-2 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Color Accent</label>
              <div className="flex items-center gap-2.5 pt-1">
                {[
                  { id: 'purple', label: 'Purple' },
                  { id: 'blue', label: 'Blue' },
                  { id: 'emerald', label: 'Emerald' },
                  { id: 'amber', label: 'Amber' },
                  { id: 'rose', label: 'Rose' },
                  { id: 'indigo', label: 'Indigo' },
                ].map((col) => {
                  const c = getRoleColorStyles(col.id);
                  const isSelected = newRoleForm.color === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setNewRoleForm({ ...newRoleForm, color: col.id })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        isSelected
                          ? `${c.bg} ${c.text} border-fairway-500 ring-2 ${c.ring}`
                          : 'bg-surface border-border text-foreground hover:bg-surface-muted'
                      }`}
                    >
                      <span>{col.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingRole} className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold">
                {isSubmittingRole ? 'Creating...' : 'Create Role'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL: DEFINE PERMISSIONS FOR ROLE ================= */}
      {definingRole && (
        <Modal
          isOpen={!!definingRole}
          onClose={() => setDefiningRole(null)}
          title={`Define Permissions — ${definingRole.name}`}
          description={`Configure and customize capability access levels for role "${definingRole.name}".`}
        >
          <div className="space-y-4 text-xs text-left max-h-[75vh] flex flex-col">
            {/* Header Controls: Grant All / Revoke All */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/50 border border-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Quick Bulk Actions:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRolePermissionsList((prev) =>
                      prev.map((item) => ({ ...item, value: 'Yes' }))
                    )
                  }
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                >
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRolePermissionsList((prev) =>
                      prev.map((item) => ({ ...item, value: 'No' }))
                    )
                  }
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                >
                  Revoke All
                </button>
              </div>
            </div>

            {/* Permissions List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-border">
              {rolePermissionsList.map((item) => (
                <div
                  key={item.id}
                  className="pt-2.5 flex items-center justify-between gap-4 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs">{item.capability}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-muted border border-border text-foreground-muted font-medium">
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <span className="text-[10px] text-foreground-muted block mt-0.5">
                        {item.description}
                      </span>
                    )}
                  </div>

                  {/* Value selector */}
                  <div className="w-48 shrink-0">
                    <Combobox
                      options={[
                        { value: 'Yes', label: 'Yes (Full Access)' },
                        { value: 'No', label: 'No (Disabled)' },
                        { value: 'Assigned / All', label: 'Assigned / All' },
                        { value: 'Restricted', label: 'Restricted' },
                        { value: 'Limited', label: 'Limited' },
                        { value: 'View', label: 'View Only' },
                        { value: 'Configurable', label: 'Configurable' },
                      ]}
                      value={item.value}
                      onChange={(val) => {
                        if (val) {
                          setRolePermissionsList((prev) =>
                            prev.map((p) => (p.id === item.id ? { ...p, value: val } : p))
                          );
                        }
                      }}
                      placeholder="Access Level"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0">
              <Button type="button" variant="outline" onClick={() => setDefiningRole(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSavingRolePerms}
                onClick={handleSaveRolePermissions}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold"
              >
                {isSavingRolePerms ? 'Saving Changes...' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RolesPermissionsTab;
