import React, { useState, useMemo, useEffect } from 'react';
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
  MoreHorizontal,
  RotateCcw,
  Check,
  X as XIcon,
  Users,
  RefreshCw,
  FileText,
  Building2,
  Layers,
  FileCheck,
  Calendar,
  Mail,
  TrendingUp,
  Settings,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Filter,
  Eye,
  PlusCircle,
  Edit3,
  Download,
  Upload,
  ArrowLeft,
  CheckCircle2,
  Building,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { RoleService, RoleItem } from '@/modules/core/services/roleService';
import { PermissionsService, RolePermissionItem } from '@/modules/core/services/permissionsService';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Combobox } from '@/modules/core/components/ui/combobox-1';
import { cn } from '@/modules/core/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import {
  CommonDataGrid,
  DataGridColumnVisibilityMenu,
} from '@/modules/core/components/ui/CommonDataGrid';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from '@tanstack/react-table';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  title?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled,
  label,
  size = 'md',
  title,
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 select-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fairway-500/40',
          size === 'sm' ? 'h-5 w-9' : 'h-5.5 w-10',
          checked
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-xs ring-1 ring-emerald-500/20'
            : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
            size === 'sm'
              ? checked
                ? 'h-4 w-4 translate-x-4'
                : 'h-4 w-4 translate-x-0'
              : checked
                ? 'h-4.5 w-4.5 translate-x-4.5'
                : 'h-4.5 w-4.5 translate-x-0'
          )}
        />
      </button>
      {label && (
        <span
          className={cn(
            'text-[10px] font-bold tracking-tight',
            checked
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-foreground-muted opacity-70'
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
};

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
  const { isAdmin, refreshRolePermissions } = useAuth();
  const { success, error } = useToast();

  // Primary view modes: 'matrix' (List), 'cards' (Cards), 'modules' (Role & Module Toggle Matrix)
  const [rbacViewMode, setRbacViewMode] = useState<'matrix' | 'cards' | 'modules'>('modules');
  const [previousRolesView, setPreviousRolesView] = useState<'matrix' | 'cards'>('matrix');
  const [expandedModuleRows, setExpandedModuleRows] = useState<Record<string, boolean>>({});
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>(() => roles[0]?.key || 'admin');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
  // Pending unsaved changes map: { [permId]: 'Yes' | 'No' }
  const [pendingChanges, setPendingChanges] = useState<Record<string, 'Yes' | 'No'>>({});
  // Table state (matching Inquiries DataGrid)
  const [rolePagination, setRolePagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [roleSorting, setRoleSorting] = useState<SortingState>([]);
  const [roleColumnVisibility, setRoleColumnVisibility] = useState<Record<string, boolean>>({});
  const [roleColumnPinning, setRoleColumnPinning] = useState<{ start: string[]; end: string[] }>({
    start: ['actions'],
    end: [],
  });
  const [roleColumnOrder, setRoleColumnOrder] = useState<string[]>([]);
  const [roleColumnSizing, setRoleColumnSizing] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingPerm, setIsUpdatingPerm] = useState(false);

  // Permissions filter state
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

  // Create Custom Permission Capability Modal State
  const [isCreatePermOpen, setIsCreatePermOpen] = useState(false);
  const [isSubmittingPerm, setIsSubmittingPerm] = useState(false);
  const [newPermForm, setNewPermForm] = useState({
    capability: '',
    category: 'Inquiries & Leads',
    description: '',
    accessLevel: 'Yes',
  });


  // Keep selectedRoleKey valid when roles update
  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.key === selectedRoleKey)) {
      setSelectedRoleKey(roles[0].key);
    }
  }, [roles, selectedRoleKey]);

  // Selected Role Object
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.key === selectedRoleKey) || roles[0] || null;
  }, [roles, selectedRoleKey]);

  // Standard Categories list for permissions
  const categories = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [permissions]);

  // Aggregate KPI Metrics matching InquiriesPage pattern
  const totalGovernedUsers = useMemo(
    () => roles.reduce((acc, r) => acc + (r.userCount || 0), 0),
    [roles]
  );
  const systemRolesCount = useMemo(() => roles.filter((r) => r.isSystem).length, [roles]);
  const customRolesCount = useMemo(() => roles.filter((r) => !r.isSystem).length, [roles]);

  // Refresh handler with spin animation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to extract access level for a specific role
  const getRolePermissionValue = (perm: RolePermissionItem, roleKey: string): string => {
    const k = (roleKey || '').toLowerCase();
    if (k === 'admin' || k === 'super_admin') return 'Yes';
    const custom = (perm.customPermissions || {}) as Record<string, string>;
    if (custom[roleKey] !== undefined) return custom[roleKey];
    for (const [ck, cv] of Object.entries(custom)) {
      if (ck.toLowerCase() === k) return cv;
    }
    return 'No';
  };

  // Effective permission value taking into account uncommitted pendingChanges for the active role
  const getEffectiveRolePermissionValue = (perm: RolePermissionItem, roleKey: string): string => {
    if (roleKey === selectedRoleKey && pendingChanges[perm.id] !== undefined) {
      return pendingChanges[perm.id];
    }
    return getRolePermissionValue(perm, roleKey);
  };

  // Filtered roles list for Role List / Matrix view
  const filteredRoles = useMemo(() => {
    let list = roles;
    if (roleTypeFilter === 'system') list = list.filter((r) => r.isSystem);
    if (roleTypeFilter === 'custom') list = list.filter((r) => !r.isSystem);

    if (!roleSearchQuery.trim()) return list;
    const q = roleSearchQuery.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, roleSearchQuery, roleTypeFilter]);

  // Paged roles for list/card views
  const pagedRoles = useMemo(() => {
    const start = rolePagination.pageIndex * rolePagination.pageSize;
    return filteredRoles.slice(start, start + rolePagination.pageSize);
  }, [filteredRoles, rolePagination.pageIndex, rolePagination.pageSize]);

  // Filtered permissions list
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const q = permSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.capability.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      const matchesCategory =
        permCategoryFilter === 'All' || p.category === permCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [permissions, permSearchQuery, permCategoryFilter]);

  // Group filtered permissions by module category
  const permissionsByModule = useMemo(() => {
    const map = new Map<string, RolePermissionItem[]>();
    filteredPermissions.forEach((p) => {
      const cat = p.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });
    return Array.from(map.entries());
  }, [filteredPermissions]);

  // Update permission value directly
  const handleUpdateRolePermissionValue = async (
    permId: string,
    roleKey: string,
    newValue: string
  ) => {
    if (!isAdmin) {
      error('Permission Denied', 'Only Admins can modify role capabilities.');
      return;
    }

    try {
      setIsUpdatingPerm(true);
      await RoleService.updateRolePermissionsForRole(roleKey, [{ id: permId, value: newValue }]);
      await onRefreshData();
      window.dispatchEvent(new CustomEvent('fw_role_permissions_updated', { detail: { roleKey } }));
      await refreshRolePermissions();
      success('Permission Saved', `Access level updated to "${newValue}".`);
    } catch (err: any) {
      error('Update Failed', err.message || 'Failed to update capability.');
    } finally {
      setIsUpdatingPerm(false);
    }
  };

  // Action Definitions for the 9 CRM Permission Actions
  interface ActionDef {
    key: 'view' | 'create' | 'edit' | 'delete' | 'import' | 'export' | 'approve' | 'assign' | 'manage';
    title: string;
    shortTitle: string;
    description: string;
    badge: string;
    icon: React.ReactNode;
  }

  const ACTION_DEFINITIONS: ActionDef[] = [
    {
      key: 'view',
      title: 'View & Browse',
      shortTitle: 'View',
      description: 'Read-only access to browse records, listings, analytics & history',
      badge: 'Read',
      icon: <Eye className="w-3.5 h-3.5 text-sky-500" />,
    },
    {
      key: 'create',
      title: 'Create & Add',
      shortTitle: 'Create',
      description: 'Register new inquiries, properties, accounts, proposals & tasks',
      badge: 'Write',
      icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />,
    },
    {
      key: 'edit',
      title: 'Edit & Update',
      shortTitle: 'Edit',
      description: 'Update specifications, pricing terms, deadlines & communications',
      badge: 'Modify',
      icon: <Edit3 className="w-3.5 h-3.5 text-amber-500" />,
    },
    {
      key: 'delete',
      title: 'Delete & Archive',
      shortTitle: 'Delete',
      description: 'Permanently remove or archive closed records and proposals',
      badge: 'Danger',
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
    },
    {
      key: 'import',
      title: 'Import & Upload',
      shortTitle: 'Import',
      description: 'Bulk upload spreadsheets, architectural drawings & documentation',
      badge: 'Import',
      icon: <Upload className="w-3.5 h-3.5 text-purple-500" />,
    },
    {
      key: 'export',
      title: 'Export (CSV / PDF)',
      shortTitle: 'Export',
      description: 'Download analytical spreadsheets, customer lists & proposal PDFs',
      badge: 'Export',
      icon: <Download className="w-3.5 h-3.5 text-indigo-500" />,
    },
    {
      key: 'approve',
      title: 'Approve & Stage',
      shortTitle: 'Approve',
      description: 'Approve pipeline stages, commercial proposals & governance steps',
      badge: 'Approve',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />,
    },
    {
      key: 'assign',
      title: 'Assign & Delegate',
      shortTitle: 'Assign',
      description: 'Reassign leads, team tasks and delegate account owners',
      badge: 'Assign',
      icon: <Users className="w-3.5 h-3.5 text-blue-500" />,
    },
    {
      key: 'manage',
      title: 'Manage & Admin',
      shortTitle: 'Manage',
      description: 'Configure security roles, user accounts, stages & revenue metrics',
      badge: 'Admin',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />,
    },
  ];

  // Standard modules list for the table rows
  const standardModules = useMemo(() => {
    const defaultList = [
      { key: 'Inquiries & Leads', shortName: 'Inquiries', icon: <FileText className="w-3.5 h-3.5 text-fairway-600" /> },
      { key: 'Properties & Warehouses', shortName: 'Warehouse / Props', icon: <Building2 className="w-3.5 h-3.5 text-blue-600" /> },
      { key: 'Companies & Accounts', shortName: 'Companies', icon: <Building className="w-3.5 h-3.5 text-indigo-600" /> },
      { key: 'Proposals & Financials', shortName: 'Proposals', icon: <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> },
      { key: 'Tasks & Follow-ups', shortName: 'Tasks', icon: <Calendar className="w-3.5 h-3.5 text-amber-600" /> },
      { key: 'Communications', shortName: 'Communications', icon: <Mail className="w-3.5 h-3.5 text-purple-600" /> },
      { key: 'Reports & Analytics', shortName: 'Reports', icon: <TrendingUp className="w-3.5 h-3.5 text-rose-600" /> },
      { key: 'Administration', shortName: 'Administration', icon: <Settings className="w-3.5 h-3.5 text-slate-600" /> },
    ];

    const knownKeys = new Set(defaultList.map((m) => m.key));
    const extraCats = categories.filter((c) => c !== 'All' && !knownKeys.has(c));
    return [
      ...defaultList,
      ...extraCats.map((cat) => ({
        key: cat,
        shortName: cat,
        icon: <Layers className="w-3.5 h-3.5 text-fairway-600" />,
      })),
    ];
  }, [categories]);

  // Filtered modules by moduleSearchQuery
  const filteredStandardModules = useMemo(() => {
    if (!moduleSearchQuery.trim()) return standardModules;
    const q = moduleSearchQuery.toLowerCase().trim();
    return standardModules.filter(
      (m) =>
        m.key.toLowerCase().includes(q) ||
        m.shortName.toLowerCase().includes(q)
    );
  }, [standardModules, moduleSearchQuery]);

  // Match a permission to an Action type
  const matchPermissionToAction = (
    perm: RolePermissionItem,
    actionKey: ActionDef['key']
  ): boolean => {
    const cap = (perm.capability || '').toLowerCase();
    const id = (perm.id || '').toLowerCase();

    if (actionKey === 'export') {
      return (
        id.includes('export') ||
        cap.includes('export') ||
        cap.includes('pdf') ||
        cap.includes('download') ||
        cap.includes('excel') ||
        cap.includes('csv')
      );
    }
    if (actionKey === 'import') {
      return (
        id.includes('import') ||
        cap.includes('import') ||
        cap.includes('upload') ||
        cap.includes('bulk') ||
        id.includes('docs')
      );
    }
    if (actionKey === 'delete') {
      return (
        id.includes('delete') ||
        cap.includes('delete') ||
        cap.includes('archive') ||
        cap.includes('remove')
      );
    }
    if (actionKey === 'edit') {
      return (
        (id.includes('edit') ||
          cap.includes('edit') ||
          cap.includes('update') ||
          cap.includes('reschedule') ||
          cap.includes('terms') ||
          id.includes('email')) &&
        !id.includes('delete')
      );
    }
    if (actionKey === 'approve') {
      return (
        id.includes('stage') ||
        cap.includes('stage') ||
        id.includes('approve') ||
        cap.includes('approve')
      );
    }
    if (actionKey === 'assign') {
      return (
        id.includes('assign') ||
        cap.includes('assign') ||
        cap.includes('reassign')
      );
    }
    if (actionKey === 'manage') {
      return (
        id.includes('roles') ||
        id.includes('users') ||
        id.includes('financial') ||
        cap.includes('manage') ||
        cap.includes('configure') ||
        cap.includes('admin')
      );
    }
    if (actionKey === 'create') {
      return (
        (id.includes('create') ||
          cap.includes('create') ||
          cap.includes('add') ||
          cap.includes('register') ||
          cap.includes('generate') ||
          id.includes('call')) &&
        !id.includes('quote_edit') &&
        !id.includes('assign')
      );
    }
    if (actionKey === 'view') {
      return (
        id.includes('view') ||
        cap.includes('view') ||
        cap.includes('browse') ||
        cap.includes('read') ||
        cap.includes('access') ||
        id.includes('audit')
      );
    }
    return false;
  };

  // Toggle cell permissions for a specific module & action (recorded into pendingChanges)
  const handleToggleCellAction = (
    perms: RolePermissionItem[],
    roleKey: string,
    targetValue: boolean
  ) => {
    if (!isAdmin) {
      error('Permission Denied', 'Only Admins can modify role capabilities.');
      return;
    }
    if (perms.length === 0) return;

    const newValue = targetValue ? 'Yes' : 'No';
    setPendingChanges((prev) => {
      const next = { ...prev };
      perms.forEach((p) => {
        next[p.id] = newValue;
      });
      return next;
    });
  };

  // Toggle a single granular capability
  const handleToggleGranularPermission = (
    permId: string,
    targetValue: boolean
  ) => {
    if (!isAdmin) {
      error('Permission Denied', 'Only Admins can modify role capabilities.');
      return;
    }
    const newValue = targetValue ? 'Yes' : 'No';
    setPendingChanges((prev) => ({
      ...prev,
      [permId]: newValue,
    }));
  };

  // Toggle an entire Action column across all modules
  const handleToggleEntireActionRow = (
    actionKey: ActionDef['key'],
    roleKey: string,
    targetValue: boolean
  ) => {
    if (!isAdmin) return;
    const permsToUpdate = permissions.filter((p) => matchPermissionToAction(p, actionKey));
    if (permsToUpdate.length === 0) return;

    const newValue = targetValue ? 'Yes' : 'No';
    setPendingChanges((prev) => {
      const next = { ...prev };
      permsToUpdate.forEach((p) => {
        next[p.id] = newValue;
      });
      return next;
    });
  };

  // Toggle an entire Module across all operations
  const handleToggleEntireModule = (
    moduleCategory: string,
    roleKey: string,
    targetValue: boolean
  ) => {
    if (!isAdmin) return;
    const modulePerms = permissions.filter((p) => p.category === moduleCategory);
    if (modulePerms.length === 0) return;

    const newValue = targetValue ? 'Yes' : 'No';
    setPendingChanges((prev) => {
      const next = { ...prev };
      modulePerms.forEach((p) => {
        next[p.id] = newValue;
      });
      return next;
    });
  };

  // Bulk Grant All for selected role into pendingChanges
  const handleGrantAllForRole = (roleKey: string) => {
    if (!isAdmin) return;
    setPendingChanges((prev) => {
      const next = { ...prev };
      permissions.forEach((p) => {
        next[p.id] = 'Yes';
      });
      return next;
    });
  };

  // Bulk Revoke All for selected role into pendingChanges
  const handleRevokeAllForRole = (roleKey: string) => {
    if (!isAdmin) return;
    setPendingChanges((prev) => {
      const next = { ...prev };
      permissions.forEach((p) => {
        next[p.id] = 'No';
      });
      return next;
    });
  };

  // Save all pending changes to the database
  const handleSaveAllChanges = async () => {
    if (!isAdmin) {
      error('Permission Denied', 'Only Admins can modify role capabilities.');
      return;
    }
    const updates = Object.entries(pendingChanges).map(([id, value]) => ({ id, value }));
    if (updates.length === 0) return;

    try {
      setIsUpdatingPerm(true);
      await RoleService.updateRolePermissionsForRole(selectedRoleKey, updates);
      setPendingChanges({});
      await onRefreshData();
      window.dispatchEvent(new CustomEvent('fw_role_permissions_updated', { detail: { roleKey: selectedRoleKey } }));
      await refreshRolePermissions();
      success(
        'Permissions Saved',
        `Successfully saved ${updates.length} permission update(s) for role "${selectedRole?.name}".`
      );
    } catch (err: any) {
      error('Save Failed', err.message || 'Failed to save changes.');
    } finally {
      setIsUpdatingPerm(false);
    }
  };

  // Discard all pending changes
  const handleDiscardChanges = () => {
    setPendingChanges({});
  };

  // Role switch handler with unsaved confirmation
  const handleSelectRole = (newRoleKey: string) => {
    if (newRoleKey === selectedRoleKey) return;
    if (Object.keys(pendingChanges).length > 0) {
      if (
        !window.confirm(
          `You have ${Object.keys(pendingChanges).length} unsaved changes for role "${selectedRole?.name}". Switching roles will discard these changes. Continue?`
        )
      ) {
        return;
      }
      setPendingChanges({});
    }
    setSelectedRoleKey(newRoleKey);
  };

  // Toggle expand / collapse on module rows
  const handleToggleModuleRowExpand = (modKey: string) => {
    setExpandedModuleRows((prev) => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
  };

  // Create Custom Permission Capability Handler
  const handleCreateCustomPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermForm.capability.trim()) {
      error('Validation Error', 'Permission capability name is required.');
      return;
    }

    try {
      setIsSubmittingPerm(true);
      const res = await PermissionsService.createRolePermission({
        capability: newPermForm.capability.trim(),
        category: newPermForm.category.trim() || 'General',
        description: newPermForm.description.trim(),
        superAdmin: 'Yes',
        admin: 'Yes',
        sales: newPermForm.accessLevel,
        viewer: 'No',
      });

      if (res.success && res.data) {
        // If current role is custom, assign it directly as well
        if (selectedRoleKey && !['super_admin', 'admin', 'sales', 'viewer'].includes(selectedRoleKey)) {
          await RoleService.updateRolePermissionsForRole(selectedRoleKey, [
            { id: res.data.id, value: newPermForm.accessLevel },
          ]);
        }

        success(
          'Capability Created',
          `Added "${newPermForm.capability}" under module "${newPermForm.category}".`
        );
        setIsCreatePermOpen(false);
        setNewPermForm({
          capability: '',
          category: 'Inquiries & Leads',
          description: '',
          accessLevel: 'Yes',
        });
        await onRefreshData();
      } else {
        error('Creation Failed', res.error || 'Failed to create permission.');
      }
    } catch (err: any) {
      error('Creation Error', err.message);
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  // Delete Custom Permission Capability
  const handleDeleteCustomPermission = async (permId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete capability "${name}"?`)) return;
    try {
      const res = await PermissionsService.deleteRolePermission(permId);
      if (res.success) {
        success('Capability Removed', `Permission "${name}" has been deleted.`);
        await onRefreshData();
      } else {
        error('Deletion Failed', res.error || 'Failed to delete permission.');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

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
      setSelectedRoleKey(res.data.key);
      await onRefreshData();
    } else {
      error('Creation Failed', res.error || 'Failed to create role.');
    }
  };

  // Open Define Permissions Toggle Matrix UI for specific role
  const handleOpenDefinePermissions = (role: RoleItem) => {
    setPreviousRolesView(rbacViewMode === 'cards' ? 'cards' : 'matrix');
    setSelectedRoleKey(role.key);
    setRbacViewMode('modules');
  };


  // Reset permissions to baseline
  const handleResetPermissions = async () => {
    if (!window.confirm('Reset all roles & permissions to the full 39 CRM module-wise baseline?')) return;
    setIsResettingPerms(true);
    const res = await PermissionsService.resetRolePermissions();
    setIsResettingPerms(false);

    if (res.success) {
      await onRefreshData();
      success('Permissions Reset', 'Roles & Permissions matrix restored to full module-wise baseline.');
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

  // Module icon resolver
  const getModuleIcon = (category: string) => {
    switch (category) {
      case 'Inquiries & Leads':
        return <FileText className="w-4 h-4 text-fairway-600" />;
      case 'Companies & Accounts':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'Properties & Warehouses':
        return <Layers className="w-4 h-4 text-amber-600" />;
      case 'Proposals & Financials':
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case 'Tasks & Follow-ups':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'Communications':
        return <Mail className="w-4 h-4 text-cyan-600" />;
      case 'Reports & Analytics':
        return <TrendingUp className="w-4 h-4 text-rose-600" />;
      case 'Administration':
        return <Settings className="w-4 h-4 text-indigo-600" />;
      default:
        return <Shield className="w-4 h-4 text-fairway-600" />;
    }
  };

  // Permission access badge style
  const getAccessBadgeClass = (val: string) => {
    if (val === 'Yes') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (val === 'Assigned / All') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    if (val === 'View') return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    if (val === 'Restricted' || val === 'Limited') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    if (val === 'Configurable') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
    return 'bg-surface-muted text-foreground-muted border-border';
  };

  const renderPermissionBadge = (id: string, roleKey: string, val: string) => {
    if (isAdmin) {
      return (
        <select
          value={val}
          onChange={(e) => handleUpdateRolePermissionValue(id, roleKey, e.target.value)}
          disabled={isUpdatingPerm}
          className={cn(
            'text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none transition-all shadow-2xs cursor-pointer',
            getAccessBadgeClass(val)
          )}
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
      <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border', getAccessBadgeClass(val))}>
        {val === 'Yes' && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
        {val === 'No' && <XIcon className="w-3 h-3 text-foreground-muted/60 shrink-0" />}
        <span>{val}</span>
      </span>
    );
  };

  const isBusy = isLoadingRoles || isLoadingPermissions || isRefreshing || isUpdatingPerm;


  // ================= REUI DATA-GRID COLUMN CONFIGURATION FOR ROLES =================
  const roleColumns = useMemo<ColumnDef<DataGridFeatures, RoleItem>[]>(
    () => [
      {
        id: 'actions',
        header: ({ column }) => <DataGridColumnHeader title="Action" column={column} />,
        cell: ({ row }) => {
          const role = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                    title="Role actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-48 bg-surface border border-border shadow-dialog z-50 p-1 rounded-xl"
                >
                  <DropdownMenuItem
                    onClick={() => handleOpenDefinePermissions(role)}
                    className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg text-fairway-600 font-semibold"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Define Permissions</span>
                  </DropdownMenuItem>

                  {!role.isSystem && (
                    <>
                      <DropdownMenuSeparator className="my-1 border-border" />
                      <DropdownMenuItem
                        onClick={() => handleDeleteRole(role)}
                        className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Role</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 75,
        minSize: 65,
        maxSize: 90,
        enableSorting: false,
        enableResizing: false,
        enablePinning: true,
      },
      {
        accessorKey: 'key',
        id: 'key',
        header: ({ column }) => <DataGridColumnHeader title="Role #" column={column} />,
        cell: ({ row }) => {
          const role = row.original;
          return (
            <button
              type="button"
              onClick={() => handleOpenDefinePermissions(role)}
              className="font-mono font-bold text-primary dark:text-white bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-full border border-primary/25 dark:border-primary/40 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors text-xs text-left cursor-pointer inline-flex items-center shadow-xs"
            >
              {role.key}
            </button>
          );
        },
        size: 140,
        minSize: 130,
        enableSorting: true,
        enablePinning: true,
      },
      {
        accessorKey: 'name',
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader title="Role Name" column={column} />,
        cell: ({ row }) => {
          const role = row.original;
          const colorStyle = getRoleColorStyles(role.color);
          return (
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => handleOpenDefinePermissions(role)}
            >
              <div
                className={cn(
                  'size-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border',
                  colorStyle.bg,
                  colorStyle.text,
                  colorStyle.border
                )}
              >
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-foreground hover:text-fairway-600 dark:hover:text-fairway-400 transition-colors text-xs truncate">
                {role.name}
              </span>
            </div>
          );
        },
        size: 210,
        minSize: 180,
        enableSorting: true,
      },
      {
        accessorKey: 'description',
        id: 'description',
        header: ({ column }) => <DataGridColumnHeader title="Description & Responsibilities" column={column} />,
        cell: ({ row }) => (
          <p className="text-xs text-foreground-muted line-clamp-2 max-w-md leading-relaxed" title={row.original.description}>
            {row.original.description || 'Configured access profile governing workspace capabilities.'}
          </p>
        ),
        size: 270,
        minSize: 220,
        enableSorting: false,
      },
      {
        accessorKey: 'isSystem',
        id: 'type',
        header: ({ column }) => <DataGridColumnHeader title="Role Type" column={column} />,
        cell: ({ row }) => {
          const role = row.original;
          return role.isSystem ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-2xs">
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              <span>System Default</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
              <span>Custom Role</span>
            </span>
          );
        },
        size: 140,
        minSize: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'userCount',
        id: 'userCount',
        header: ({ column }) => <DataGridColumnHeader title="Assigned Users" column={column} />,
        cell: ({ row }) => (
          <span className="font-bold text-fairway-900 dark:text-fairway-300 text-xs tabular-nums">
            {row.original.userCount || 0} members
          </span>
        ),
        size: 130,
        minSize: 110,
        enableSorting: true,
      },
      {
        id: 'action',
        header: ({ column }) => <DataGridColumnHeader title="Capabilities" column={column} />,
        cell: ({ row }) => {
          const role = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenDefinePermissions(role)}
                className="text-xs h-7 px-2.5 text-primary border-primary/25 hover:bg-primary/10 hover:border-primary/40 font-semibold shadow-2xs"
                leftIcon={<Sliders className="w-3 h-3 text-fairway-600" />}
              >
                Define
              </Button>
            </div>
          );
        },
        size: 110,
        minSize: 95,
        enableSorting: false,
      },
    ],
    []
  );

  const roleTable = useTable({
    features: dataGridFeatures,
    columns: roleColumns,
    data: pagedRoles,
    pageCount: Math.max(1, Math.ceil(filteredRoles.length / (rolePagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: RoleItem) => row.id,
    state: {
      pagination: rolePagination,
      sorting: roleSorting,
      columnVisibility: roleColumnVisibility,
      columnPinning: roleColumnPinning,
      columnOrder: roleColumnOrder,
      columnSizing: roleColumnSizing,
    },
    onPaginationChange: setRolePagination,
    onSortingChange: setRoleSorting,
    onColumnVisibilityChange: setRoleColumnVisibility,
    onColumnPinningChange: setRoleColumnPinning,
    onColumnOrderChange: setRoleColumnOrder,
    onColumnSizingChange: setRoleColumnSizing,
  });

  return (
    <div className="space-y-4 w-full text-left animate-fade-in">
      {/* Modern KPI Cards with Glowing Sparkline Waves */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Workspace Roles */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex items-end justify-between transition-all hover:border-fairway-400/60 relative overflow-hidden group">
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight block">
              Configured Roles
            </span>
            <span className="text-xs text-foreground-muted mt-4 block font-medium">
              {customRolesCount} custom • {systemRolesCount} system default
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight block mt-0.5">
              {roles.length} Roles
            </span>
          </div>

          <div className="shrink-0 pb-1">
            <svg className="w-28 sm:w-36 h-12 overflow-visible" viewBox="0 0 120 40">
              <defs>
                <linearGradient id="themeWaveRoles1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--fw-600, #0084FF)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--fw-600, #0084FF)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 28 Q 12 18, 24 24 T 48 18 T 72 14 T 96 8 T 120 4 L 120 40 L 0 40 Z"
                fill="url(#themeWaveRoles1)"
              />
              <path
                d="M 0 28 Q 12 18, 24 24 T 48 18 T 72 14 T 96 8 T 120 4"
                fill="none"
                stroke="var(--fw-600, #0084FF)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Governed Users */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex items-end justify-between transition-all hover:border-accent-400/60 relative overflow-hidden group">
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight block">
              Governed Team Members
            </span>
            <span className="text-xs text-foreground-muted mt-4 block font-medium">
              Across all role profiles
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight block mt-0.5">
              {totalGovernedUsers} {totalGovernedUsers === 1 ? 'User' : 'Users'}
            </span>
          </div>

          <div className="shrink-0 pb-1">
            <svg className="w-28 sm:w-36 h-12 overflow-visible" viewBox="0 0 120 40">
              <defs>
                <linearGradient id="themeWaveRoles2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-500, #10B981)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--accent-500, #10B981)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 30 Q 15 22, 30 25 T 60 19 T 90 12 T 120 8 L 120 40 L 0 40 Z"
                fill="url(#themeWaveRoles2)"
              />
              <path
                d="M 0 30 Q 15 22, 30 25 T 60 19 T 90 12 T 120 8"
                fill="none"
                stroke="var(--accent-500, #10B981)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Security Capabilities */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex items-end justify-between transition-all hover:border-indigo-400/60 relative overflow-hidden group">
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight block">
              Audited Capabilities
            </span>
            <span className="text-xs text-foreground-muted mt-4 block font-medium">
              Across {categories.length - 1} CRM modules
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight block mt-0.5">
              {permissions.length} Operations
            </span>
          </div>

          <div className="shrink-0 pb-1">
            <svg className="w-28 sm:w-36 h-12 overflow-visible" viewBox="0 0 120 40">
              <defs>
                <linearGradient id="themeWaveRoles3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-5, #8B5CF6)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--chart-5, #8B5CF6)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 26 Q 15 18, 30 22 T 60 14 T 90 10 T 120 6 L 120 40 L 0 40 Z"
                fill="url(#themeWaveRoles3)"
              />
              <path
                d="M 0 26 Q 15 18, 30 22 T 60 14 T 90 10 T 120 6"
                fill="none"
                stroke="var(--chart-5, #8B5CF6)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Sleek Search & Control Toolbar matching Lead Inquiries view */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-1">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder={
              rbacViewMode === 'matrix' || rbacViewMode === 'cards'
                ? 'Search roles by name, identifier, or responsibilities...'
                : 'Search capabilities, export, import, view, create...'
            }
            value={rbacViewMode === 'matrix' || rbacViewMode === 'cards' ? roleSearchQuery : permSearchQuery}
            onChange={(e) => {
              if (rbacViewMode === 'matrix' || rbacViewMode === 'cards') {
                setRoleSearchQuery(e.target.value);
              } else {
                setPermSearchQuery(e.target.value);
              }
            }}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
          />
          {(rbacViewMode === 'matrix' || rbacViewMode === 'cards' ? roleSearchQuery : permSearchQuery) && (
            <button
              type="button"
              onClick={() => {
                if (rbacViewMode === 'matrix' || rbacViewMode === 'cards') setRoleSearchQuery('');
                else setPermSearchQuery('');
              }}
              className="absolute right-2.5 top-2.5 text-foreground-muted hover:text-foreground cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Controls & View Switcher */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end w-full sm:w-auto">
            {/* Filter Dropdown / Combobox */}
            {rbacViewMode === 'modules' ? (
              <div className="w-40 sm:w-44">
                <Combobox
                  options={categories.map((cat) => ({ value: cat, label: cat }))}
                  value={permCategoryFilter}
                  onChange={(val) => setPermCategoryFilter(val || 'All')}
                  placeholder="Filter Module"
                />
              </div>
            ) : (
              <div className="w-36 sm:w-40">
                <Combobox
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'system', label: 'System Default' },
                    { value: 'custom', label: 'Custom Roles' },
                  ]}
                  value={roleTypeFilter}
                  onChange={(val) => setRoleTypeFilter((val as 'all' | 'system' | 'custom') || 'all')}
                  placeholder="Role Type"
                />
              </div>
            )}

            {/* Column Settings Dropdown (Common Component) */}
            {(rbacViewMode === 'matrix' || rbacViewMode === 'cards') && (
              <DataGridColumnVisibilityMenu table={roleTable} excludeColumns={['actions', 'key']} />
            )}

            {/* Refresh / Reload Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isBusy}
                  className="size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      'w-4 h-4 transition-transform duration-700',
                      isBusy && 'animate-spin text-fairway-600'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Refresh Live Data</TooltipContent>
            </Tooltip>

            {/* Segmented View Mode Switcher (Roles Matrix List, Capabilities Grid, Card View) */}
            <div className="flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setRbacViewMode('modules')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      rbacViewMode === 'modules'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Module Permissions Matrix</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setRbacViewMode('matrix')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      rbacViewMode === 'matrix'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Roles List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setRbacViewMode('cards')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      rbacViewMode === 'cards'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Role Cards</TooltipContent>
              </Tooltip>
            </div>

            {/* Admin Action Buttons */}
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetPermissions}
                  disabled={isResettingPerms}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5 text-fairway-600" />}
                  className="hidden md:inline-flex"
                >
                  Reset Baseline
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreatePermOpen(true)}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                  className="hidden sm:inline-flex border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50/50 text-indigo-700 dark:text-indigo-300"
                >
                  Add Capability
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsCreateRoleOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Role
                </Button>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* ================= VIEW 0: MODULE-WISE PERMISSIONS UI (PRIMARY / DEFAULT) ================= */}
      {rbacViewMode === 'modules' && (
        <div className="space-y-3">
          {/* Streamlined Role Selector & Bulk Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border p-2.5 rounded-2xl shadow-xs">
            {/* Back Button & Role Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
              <button
                type="button"
                onClick={() => setRbacViewMode(previousRolesView)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-muted text-foreground border border-border transition-all cursor-pointer shadow-2xs hover:border-fairway-500 shrink-0"
                title="Return to roles directory"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-fairway-600" />
                <span>Back to Roles</span>
              </button>

              <div className="h-4 w-px bg-border shrink-0 hidden sm:block mx-0.5" />

              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted shrink-0 flex items-center gap-1.5 pl-1 pr-1">
                <Shield className="w-3.5 h-3.5 text-fairway-600" />
                <span>Role:</span>
              </span>
              {roles.map((r) => {
                const isSelected = r.key === selectedRoleKey;
                const colorStyle = getRoleColorStyles(r.color);

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRole(r.key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border text-left',
                      isSelected
                        ? 'bg-fairway-600 text-white border-fairway-600 shadow-xs font-bold'
                        : 'bg-surface hover:bg-surface-muted/70 border-border text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'size-5 rounded-md flex items-center justify-center font-bold text-[9px] shrink-0 border',
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : cn(colorStyle.bg, colorStyle.text, colorStyle.border)
                      )}
                    >
                      <Shield className="w-2.5 h-2.5" />
                    </div>
                    <span>{r.name}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.2 rounded-md',
                        isSelected
                          ? 'bg-white/20 text-white font-medium'
                          : 'bg-surface-muted text-foreground-muted'
                      )}
                    >
                      {r.userCount || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Role Quick Bulk Actions & Save/Discard */}
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pr-1">
                {Object.keys(pendingChanges).length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDiscardChanges}
                      disabled={isUpdatingPerm}
                      className="text-xs text-foreground-muted hover:text-foreground"
                      leftIcon={<RotateCcw className="w-3 h-3" />}
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveAllChanges}
                      disabled={isUpdatingPerm}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                      leftIcon={isUpdatingPerm ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    >
                      Save Changes ({Object.keys(pendingChanges).length})
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGrantAllForRole(selectedRoleKey)}
                  disabled={isUpdatingPerm}
                  className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-xs"
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Grant All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRevokeAllForRole(selectedRoleKey)}
                  disabled={isUpdatingPerm}
                  className="text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-xs"
                  leftIcon={<XIcon className="w-3.5 h-3.5" />}
                >
                  Revoke All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreatePermOpen(true)}
                  className="text-xs bg-fairway-50 dark:bg-fairway-950/30 border-fairway-200 dark:border-fairway-800 text-fairway-700 dark:text-fairway-300 hover:bg-fairway-100"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Capability
                </Button>
              </div>
            )}
          </div>

          {/* Module Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface border border-border p-2.5 px-3.5 rounded-2xl shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter CRM modules (e.g. Inquiries, Warehouses, Accounts, Proposals...)"
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
              />
              {moduleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setModuleSearchQuery('')}
                  className="absolute right-2.5 top-2 text-foreground-muted hover:text-foreground cursor-pointer"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-foreground-muted">
              <span>
                Showing <strong>{filteredStandardModules.length}</strong> of {standardModules.length} modules
              </span>
            </div>
          </div>

          {/* ================= MODULES IN ROWS TABLE (PRIMARY MATRIX) ================= */}
          <div className="border border-border rounded-2xl bg-surface overflow-hidden shadow-xs">
            <div className="p-3 bg-surface-muted/40 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Module Rows Matrix: {selectedRole?.name}
                  </h4>
                  <p className="text-[11px] text-foreground-muted">
                    Each row represents a CRM module with 9 independent action toggles. Toggle individual actions and click Save Changes.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {Object.keys(pendingChanges).length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                    {Object.keys(pendingChanges).length} unsaved
                  </span>
                )}
                <span className="text-[11px] font-mono text-foreground-muted hidden md:inline">
                  {standardModules.length} Modules configured
                </span>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar touch-pan-x">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-muted dark:bg-[#151c27] text-[11px] font-bold text-foreground-muted border-b border-border">
                  <tr>
                    {/* Sticky Module Header */}
                    <th className="p-3.5 min-w-[220px] sticky left-0 bg-surface-muted dark:bg-[#151c27] z-20 border-r border-border shadow-xs">
                      CRM Module
                    </th>

                    {/* 9 Action Columns: View, Create, Edit, Delete, Import, Export, Approve, Assign, Manage */}
                    {ACTION_DEFINITIONS.map((action) => {
                      const colPerms = permissions.filter((p) =>
                        matchPermissionToAction(p, action.key)
                      );
                      const activeCount = colPerms.filter(
                        (p) => getEffectiveRolePermissionValue(p, selectedRoleKey) !== 'No'
                      ).length;
                      const isColFullyActive =
                        colPerms.length > 0 && activeCount === colPerms.length;

                      return (
                        <th
                          key={action.key}
                          className="p-3 text-center min-w-[96px] border-r border-border/50 group/col"
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{action.icon}</span>
                              <span className="font-bold text-foreground text-xs">
                                {action.shortTitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-foreground-muted font-normal">
                                {activeCount}/{colPerms.length}
                              </span>
                              {isAdmin && colPerms.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleEntireActionRow(
                                      action.key,
                                      selectedRoleKey,
                                      !isColFullyActive
                                    )
                                  }
                                  disabled={isUpdatingPerm}
                                  className="opacity-0 group-hover/col:opacity-100 transition-opacity text-[9px] font-bold px-1.5 py-0.2 rounded bg-fairway-50 dark:bg-fairway-950/40 text-fairway-600 hover:bg-fairway-100 border border-fairway-200 cursor-pointer"
                                  title={`Toggle all ${action.shortTitle} permissions`}
                                >
                                  {isColFullyActive ? 'Off' : 'On'}
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}

                    {/* Quick Module Toggle Column */}
                    <th className="p-3 text-center min-w-[105px] text-foreground-muted font-bold">
                      Module Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {filteredStandardModules.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-foreground-muted text-xs">
                        No CRM modules match your filter &ldquo;{moduleSearchQuery}&rdquo;
                      </td>
                    </tr>
                  ) : (
                    filteredStandardModules.map((mod) => {
                      const modPerms = permissions.filter((p) => p.category === mod.key);
                      const isExpanded = !!expandedModuleRows[mod.key];
                      const activeCount = modPerms.filter(
                        (p) => getEffectiveRolePermissionValue(p, selectedRoleKey) !== 'No'
                      ).length;
                      const isModuleFullyGranted =
                        modPerms.length > 0 && activeCount === modPerms.length;

                      return (
                        <React.Fragment key={mod.key}>
                          <tr className="hover:bg-surface-muted/25 dark:hover:bg-[#151c27]/60 transition-colors group">
                            {/* Sticky Module Column with solid background in dark mode */}
                            <td className="p-3.5 sticky left-0 bg-surface dark:bg-[#111722] group-hover:bg-surface-muted/60 dark:group-hover:bg-[#161e2b] z-10 border-r border-border shadow-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="size-8 rounded-xl bg-surface-muted/70 dark:bg-[#18202d] border border-border flex items-center justify-center shrink-0">
                                    {mod.icon}
                                  </div>
                                  <div>
                                    <span className="font-bold text-foreground text-xs block">
                                      {mod.key}
                                    </span>
                                    <span className="text-[10px] text-foreground-muted">
                                      {activeCount}/{modPerms.length} capabilities enabled
                                    </span>
                                  </div>
                                </div>

                                {modPerms.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleRowExpand(mod.key)}
                                    className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-muted/80 dark:hover:bg-[#1c2534] transition-colors cursor-pointer"
                                    title="Expand all granular capabilities"
                                  >
                                    <ChevronDown
                                      className={cn(
                                        'w-3.5 h-3.5 transition-transform duration-200',
                                        isExpanded && 'transform rotate-180 text-fairway-600'
                                      )}
                                    />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* 9 Action Columns: View, Create, Edit, Delete, Import, Export, Approve, Assign, Manage */}
                            {ACTION_DEFINITIONS.map((action) => {
                              const cellPerms = modPerms.filter((p) =>
                                matchPermissionToAction(p, action.key)
                              );

                              if (cellPerms.length === 0) {
                                return (
                                  <td
                                    key={action.key}
                                    className="p-3 text-center border-r border-border/40 text-foreground-muted/40"
                                  >
                                    <span className="text-xs font-mono select-none">—</span>
                                  </td>
                                );
                              }

                              const isCellActive = cellPerms.every(
                                (p) => getEffectiveRolePermissionValue(p, selectedRoleKey) !== 'No'
                              );

                              return (
                                <td
                                  key={action.key}
                                  className="p-3 text-center border-r border-border/40"
                                >
                                  <div className="flex items-center justify-center">
                                    <ToggleSwitch
                                      checked={isCellActive}
                                      disabled={!isAdmin || isUpdatingPerm}
                                      onChange={(newVal) =>
                                        handleToggleCellAction(cellPerms, selectedRoleKey, newVal)
                                      }
                                      label={isCellActive ? 'ON' : 'OFF'}
                                      size="sm"
                                      title={cellPerms.map((p) => `${p.capability} (${p.description || ''})`).join('\n')}
                                    />
                                  </div>
                                </td>
                              );
                            })}

                            {/* Quick Module Toggle */}
                            <td className="p-3 text-center">
                              {isAdmin && modPerms.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleEntireModule(
                                      mod.key,
                                      selectedRoleKey,
                                      !isModuleFullyGranted
                                    )
                                  }
                                  disabled={isUpdatingPerm}
                                  className={cn(
                                    'text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer',
                                    isModuleFullyGranted
                                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
                                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100'
                                  )}
                                >
                                  {isModuleFullyGranted ? 'Revoke All' : 'Grant All'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-foreground-muted">—</span>
                              )}
                            </td>
                          </tr>

                          {/* Accordion Sub-Drawer for Granular Capabilities */}
                          {isExpanded && (
                            <tr className="bg-surface-muted/20 dark:bg-[#121824]/60">
                              <td colSpan={11} className="p-4 border-b border-border">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                                      Granular Capabilities in {mod.key}
                                    </span>
                                    <span className="text-[10px] text-foreground-muted">
                                      {modPerms.length} capabilities
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {modPerms.map((perm) => {
                                      const isPermActive =
                                        getEffectiveRolePermissionValue(perm, selectedRoleKey) !== 'No';
                                      const isCustomPerm =
                                        perm.id.startsWith('perm_') &&
                                        !perm.id.startsWith('perm_inq') &&
                                        !perm.id.startsWith('perm_comp') &&
                                        !perm.id.startsWith('perm_prop') &&
                                        !perm.id.startsWith('perm_task') &&
                                        !perm.id.startsWith('perm_comm') &&
                                        !perm.id.startsWith('perm_rep') &&
                                        !perm.id.startsWith('perm_adm');

                                      return (
                                        <div
                                          key={perm.id}
                                          className="p-2.5 rounded-xl bg-surface dark:bg-[#151c27] border border-border flex items-center justify-between gap-3 shadow-2xs"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-xs text-foreground">
                                                {perm.capability}
                                              </span>
                                              {isCustomPerm && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                  Custom
                                                </span>
                                              )}
                                            </div>
                                            {perm.description && (
                                              <p className="text-[10px] text-foreground-muted truncate">
                                                {perm.description}
                                              </p>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                            <ToggleSwitch
                                              checked={isPermActive}
                                              disabled={!isAdmin || isUpdatingPerm}
                                              onChange={(newVal) =>
                                                handleToggleGranularPermission(perm.id, newVal)
                                              }
                                              label={isPermActive ? 'ON' : 'OFF'}
                                              size="sm"
                                            />
                                            {isCustomPerm && isAdmin && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeleteCustomPermission(
                                                    perm.id,
                                                    perm.capability
                                                  )
                                                }
                                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                                                title="Delete custom capability"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Floating Save Changes Banner */}
          {Object.keys(pendingChanges).length > 0 && (
            <div className="sticky bottom-4 z-40 bg-white/95 dark:bg-[#151c27]/95 backdrop-blur border-2 border-emerald-500/60 shadow-2xl rounded-2xl p-3.5 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-4 ring-emerald-500/20" />
                <div className="text-xs">
                  <p className="font-extrabold text-foreground">
                    Unsaved Permission Changes ({Object.keys(pendingChanges).length})
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    You have modified permissions for role <span className="font-bold text-fairway-600">{selectedRole?.name}</span>. Click Save Changes to apply them across the CRM.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDiscardChanges}
                  disabled={isUpdatingPerm}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveAllChanges}
                  disabled={isUpdatingPerm}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                  leftIcon={isUpdatingPerm ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                >
                  {isUpdatingPerm ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 1: ROLE MATRIX LIST VIEW (POWERED BY COMMON DATA GRID) ================= */}
      {rbacViewMode === 'matrix' && (
        <CommonDataGrid
          table={roleTable}
          recordCount={filteredRoles.length}
          isLoading={isLoadingRoles || isRefreshing}
          emptyState={
            <div className="p-12 text-center text-foreground-muted text-xs bg-surface rounded-xl border border-border">
              <ShieldAlert className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-foreground">No roles found</p>
              <p className="text-[11px] text-foreground-muted mt-0.5">
                Try adjusting your search query or role filter.
              </p>
            </div>
          }
        />
      )}

      {/* ================= VIEW 2: ROLE CARDS VIEW (MATCHING WAREHOUSE INQUIRY CARD) ================= */}
      {rbacViewMode === 'cards' && (
        <DataGrid
          table={roleTable}
          recordCount={filteredRoles.length}
          isLoading={isLoadingRoles || isRefreshing}
          loadingMode="skeleton"
        >
          <div className="space-y-4">
            {filteredRoles.length === 0 && !isLoadingRoles ? (
              <div className="p-12 text-center bg-surface rounded-2xl border border-border">
                <Shield className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-foreground">No roles match your search</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Create your first custom role to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-fade-in">
                {pagedRoles.map((role) => {
                  const colorStyle = getRoleColorStyles(role.color);

                  return (
                    <div
                      key={role.id}
                      onClick={() => handleOpenDefinePermissions(role)}
                      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-card rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-xs select-none shadow-2xs"
                    >
                      <div>
                        {/* Top Row: Code Badge + Stage Pill + Dropdown Menu */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:bg-emerald-950/30 dark:border-emerald-500/30 shadow-xs">
                            {role.key}
                          </span>
                          <div className="flex items-center gap-2">
                            {role.isSystem ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                <Lock className="w-2.5 h-2.5" />
                                System
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                Custom
                              </span>
                            )}

                            {/* Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 bg-surface border border-border shadow-xl p-1 rounded-xl z-50"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleOpenDefinePermissions(role)}
                                  className="flex items-center gap-2 text-xs font-semibold text-fairway-600 dark:text-fairway-400 focus:text-fairway-700 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-fairway-50 dark:hover:bg-fairway-950/40"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                  <span>Define Permissions</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDefinePermissions(role)}
                                  className="flex items-center gap-2 text-xs text-foreground cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-surface-muted"
                                >
                                  <Eye className="w-3.5 h-3.5 text-foreground-muted" />
                                  <span>View Details</span>
                                </DropdownMenuItem>
                                {!role.isSystem && isAdmin && (
                                  <>
                                    <DropdownMenuSeparator className="my-1 border-border" />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteRole(role)}
                                      className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Role</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mt-3 flex items-start gap-2.5">
                          <div
                            className={cn(
                              'size-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border mt-0.5',
                              colorStyle.bg,
                              colorStyle.text,
                              colorStyle.border
                            )}
                          >
                            <Shield className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-foreground group-hover:text-fairway-600 transition-colors truncate">
                              {role.name}
                            </h3>
                            <p className="text-xs text-foreground-muted line-clamp-2 mt-0.5 leading-relaxed">
                              {role.description || 'Configured security profile governing capabilities.'}
                            </p>
                          </div>
                        </div>

                        {/* Key Attributes */}
                        <div className="mt-3.5 space-y-1.5 pt-3 border-t border-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground-muted flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-foreground-muted" />
                              <span>Assigned Users</span>
                            </span>
                            <span className="font-bold text-foreground">
                              {role.userCount || 0} active members
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground-muted flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-foreground-muted" />
                              <span>Audited Modules</span>
                            </span>
                            <span className="font-bold text-foreground">
                              {categories.length - 1} domains
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground-muted flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-foreground-muted" />
                              <span>Granted Level</span>
                            </span>
                            <span className="font-bold text-fairway-600 dark:text-fairway-400">
                              {role.key === 'super_admin' ? 'Unlimited Super Admin' : role.key === 'admin' ? 'Workspace Admin' : 'Governed Access'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-foreground-muted">
                          {role.key} profile
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenDefinePermissions(role)}
                          className="text-xs h-7 px-3 bg-fairway-600 hover:bg-fairway-700 text-white font-semibold"
                          leftIcon={<Sliders className="w-3 h-3" />}
                        >
                          Define
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Card View Pagination */}
            {filteredRoles.length > 0 && !isLoadingRoles && (
              <DataGridPagination sizes={[5, 10, 20, 50, 100]} />
            )}
          </div>
        </DataGrid>
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${isSelected
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



      {/* ================= MODAL: CREATE CUSTOM PERMISSION CAPABILITY ================= */}
      {isCreatePermOpen && (
        <Modal
          isOpen={isCreatePermOpen}
          onClose={() => setIsCreatePermOpen(false)}
          title="Create Permission Capability"
          description="Add a granular capability to a CRM module and configure role-level governance."
        >
          <form onSubmit={handleCreateCustomPermission} className="space-y-4 text-xs text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Capability / Action Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newPermForm.capability}
                onChange={(e) => setNewPermForm({ ...newPermForm, capability: e.target.value })}
                placeholder="e.g. Export High-Value Deal Financials, Approve Custom Lease Escalation"
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Target CRM Module / Category <span className="text-rose-500">*</span>
              </label>
              <Combobox
                options={[
                  { value: 'Inquiries & Leads', label: 'Inquiries & Leads' },
                  { value: 'Companies & Accounts', label: 'Companies & Accounts' },
                  { value: 'Properties & Warehouses', label: 'Properties & Warehouses' },
                  { value: 'Proposals & Financials', label: 'Proposals & Financials' },
                  { value: 'Tasks & Follow-ups', label: 'Tasks & Follow-ups' },
                  { value: 'Communications', label: 'Communications' },
                  { value: 'Reports & Analytics', label: 'Reports & Analytics' },
                  { value: 'Administration', label: 'Administration' },
                ]}
                value={newPermForm.category}
                onChange={(val) => setNewPermForm({ ...newPermForm, category: val || 'Inquiries & Leads' })}
                placeholder="Select Module"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Description / Purpose
              </label>
              <textarea
                rows={2}
                value={newPermForm.description}
                onChange={(e) => setNewPermForm({ ...newPermForm, description: e.target.value })}
                placeholder="What this permission authorizes within the CRM..."
                className="w-full px-3.5 py-2 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Initial Access for Selected Role ({selectedRole?.name || selectedRoleKey})
              </label>
              <select
                value={newPermForm.accessLevel}
                onChange={(e) => setNewPermForm({ ...newPermForm, accessLevel: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground font-semibold focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 shadow-2xs cursor-pointer"
              >
                <option value="Yes">Full Access (Yes)</option>
                <option value="Assigned / All">Assigned / All</option>
                <option value="View">View Only</option>
                <option value="Restricted">Restricted</option>
                <option value="No">No Access</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsCreatePermOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPerm}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold"
              >
                {isSubmittingPerm ? 'Creating...' : 'Create Capability'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default RolesPermissionsTab;
