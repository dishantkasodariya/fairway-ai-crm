import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Building,
  UserCheck,
  UserX,
  X,
  LayoutGrid,
  List,
  RefreshCw,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Phone,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { User, UserRole } from '@/modules/core/types';
import { RoleItem } from '@/modules/core/services/roleService';
import { Button } from '@/modules/core/components/ui/Button';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Card } from '@/modules/core/components/ui/Card';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';
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

interface UserManagementTabProps {
  roles: RoleItem[];
  isLoadingRoles?: boolean;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ roles, isLoadingRoles }) => {
  const {
    currentUser,
    users,
    updateRole,
    addUser,
    editUser,
    removeUser,
    toggleUserStatus,
    isSuperAdmin,
    isAdmin,
  } = useAuth();
  const { success, error } = useToast();

  // View state: 'table' (List) vs 'grid' (Cards) matching Inquiries
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Table state (matching Inquiries DataGrid)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnPinning, setColumnPinning] = useState<{ start: string[]; end: string[] }>({
    start: ['actions'],
    end: [],
  });
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: (roles[0]?.key as UserRole) || 'admin',
    department: 'Industrial Leasing',
    phone: '+91 988496151',
    password: '',
  });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    role: (roles[0]?.key as UserRole) || 'admin',
    department: 'Industrial Leasing',
    phone: '+91 988496151',
  });

  // Delete User Confirmation State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Options for Role Combobox in User Modals
  const roleOptions = useMemo(() => {
    return roles.map((r) => ({
      value: r.key,
      label: r.name,
      description: r.description,
    }));
  }, [roles]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Paged users for current page
  const pagedUsers = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredUsers.slice(start, start + pagination.pageSize);
  }, [filteredUsers, pagination.pageIndex, pagination.pageSize]);

  // Handle Refresh simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      success('Refreshed', 'User list is up to date.');
    }, 450);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isAdmin) {
      error('Permission Denied', 'Admin permission required to modify system roles.');
      return;
    }
    await updateRole(userId, newRole);
    success('Role Updated', 'User permissions updated across the workspace.');
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    if (!isAdmin) {
      error('Permission Denied', 'Admin permission required to activate or deactivate users.');
      return;
    }
    const res = await toggleUserStatus(userId);
    if (res.success) {
      const nextStatus = currentStatus === 'Active' ? 'Deactivated' : 'Activated';
      success('Status Updated', `User has been ${nextStatus}.`);
    } else {
      error('Failed', res.error || 'Failed to update user status.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      error('Validation Error', 'Name and email are required.');
      return;
    }

    setIsSubmittingUser(true);
    const res = await addUser({
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim(),
      role: newUserForm.role,
      department: newUserForm.department.trim(),
      phone: newUserForm.phone.trim(),
      password: newUserForm.password.trim() || 'Fairway@123',
    });
    setIsSubmittingUser(false);

    if (res.success) {
      success('User Added', `${newUserForm.name} has been added to the team.`);
      setIsAddUserOpen(false);
      setNewUserForm({
        name: '',
        email: '',
        role: (roles[0]?.key as UserRole) || 'admin',
        department: 'Industrial Leasing',
        phone: '+91 988496151',
        password: '',
      });
    } else {
      error('Creation Failed', res.error || 'Failed to create user account.');
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name,
      role: user.role,
      department: user.department || 'Industrial Leasing',
      phone: user.phone || '+91 988496151',
    });
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserForm.name.trim()) {
      error('Validation Error', 'Name is required.');
      return;
    }

    setIsSubmittingEdit(true);
    const res = await editUser(editingUser.id, {
      name: editUserForm.name.trim(),
      role: editUserForm.role,
      department: editUserForm.department.trim(),
      phone: editUserForm.phone.trim(),
    });
    setIsSubmittingEdit(false);

    if (res.success) {
      success('User Updated', 'User details updated successfully.');
      setIsEditUserOpen(false);
      setEditingUser(null);
    } else {
      error('Update Failed', res.error || 'Failed to update user.');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    const res = await removeUser(deletingUser.id);
    setIsDeletingUser(false);

    if (res.success) {
      success('User Removed', `${deletingUser.name} has been removed.`);
      setDeletingUser(null);
    } else {
      error('Deletion Failed', res.error || 'Failed to delete user.');
    }
  };

  // ================= REUI DATA-GRID COLUMN CONFIGURATION =================
  const userColumns = useMemo<ColumnDef<DataGridFeatures, User>[]>(
    () => [
      {
        id: 'actions',
        header: ({ column }) => <DataGridColumnHeader title="Action" column={column} />,
        cell: ({ row }) => {
          const u = row.original;
          const isCurrentUser = u.id === currentUser?.id;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                    title="Actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-48 bg-surface border border-border shadow-dialog z-50 p-1 rounded-xl"
                >
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={() => handleOpenEditModal(u)}
                      className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit Member Details</span>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && !isCurrentUser && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                        className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg"
                      >
                        {u.status === 'Active' ? (
                          <>
                            <UserX className="w-3.5 h-3.5 text-amber-500" />
                            <span>Deactivate Account</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Activate Account</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 border-border" />
                      <DropdownMenuItem
                        onClick={() => setDeletingUser(u)}
                        className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Member</span>
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
        accessorKey: 'id',
        id: 'code',
        header: ({ column }) => <DataGridColumnHeader title="User #" column={column} />,
        cell: ({ row }) => {
          const u = row.original;
          const userCode = `USR-${String(u.id).padStart(3, '0').slice(-4)}`;
          return (
            <span className="font-mono font-bold text-primary dark:text-white bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-full border border-primary/25 dark:border-primary/40 text-xs inline-flex items-center shadow-xs">
              {userCode}
            </span>
          );
        },
        size: 130,
        minSize: 120,
        enableSorting: true,
        enablePinning: true,
      },
      {
        accessorKey: 'name',
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader title="User / Member" column={column} />,
        cell: ({ row }) => {
          const u = row.original;
          const isCurrentUser = u.id === currentUser?.id;
          return (
            <div className="flex items-center gap-2.5">
              <UserAvatar src={u.avatar} name={u.name} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground hover:text-fairway-600 dark:hover:text-fairway-400 text-xs truncate">
                    {u.name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 font-bold">
                      You
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-foreground-muted font-mono truncate block">
                  {u.email}
                </span>
              </div>
            </div>
          );
        },
        size: 230,
        minSize: 190,
        enableSorting: true,
      },
      {
        accessorKey: 'department',
        id: 'department',
        header: ({ column }) => <DataGridColumnHeader title="Department" column={column} />,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-foreground-muted font-medium text-xs truncate">
            <Building className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
            <span className="truncate">{row.original.department || 'Executive Leadership'}</span>
          </span>
        ),
        size: 180,
        minSize: 150,
        enableSorting: true,
      },
      {
        accessorKey: 'role',
        id: 'role',
        header: ({ column }) => <DataGridColumnHeader title="Assigned Role" column={column} />,
        cell: ({ row }) => {
          const u = row.original;
          const isCurrentUser = u.id === currentUser?.id;
          const roleItem = roles.find((r) => r.key === u.role);
          return isAdmin ? (
            <div className="w-36" onClick={(e) => e.stopPropagation()}>
              <Combobox
                options={roles.map((r) => ({ value: r.key, label: r.name }))}
                value={u.role}
                onChange={(val) => {
                  if (val) handleRoleChange(u.id, val as UserRole);
                }}
                disabled={isCurrentUser && isSuperAdmin}
                placeholder="Select role"
              />
            </div>
          ) : (
            <span className="font-semibold capitalize bg-surface-muted border border-border px-2.5 py-1 rounded-lg text-foreground text-xs inline-flex items-center gap-1">
              <Shield className="w-3 h-3 text-fairway-600" />
              <span>{roleItem?.name || u.role.replace('_', ' ')}</span>
            </span>
          );
        },
        size: 170,
        minSize: 150,
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => {
          const status = row.original.status || 'Active';
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs',
                status === 'Active'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:bg-emerald-950/40 dark:border-emerald-800'
                  : 'bg-surface-muted text-foreground-muted border-border'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  status === 'Active' ? 'bg-emerald-500' : 'bg-foreground-muted'
                )}
              />
              {status}
            </span>
          );
        },
        size: 120,
        minSize: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'assignedLeadsCount',
        id: 'assignedLeadsCount',
        header: ({ column }) => <DataGridColumnHeader title="Assigned Leads" column={column} />,
        cell: ({ row }) => (
          <span className="font-bold text-fairway-900 dark:text-fairway-300 text-xs tabular-nums">
            {row.original.assignedLeadsCount || 0}
          </span>
        ),
        size: 130,
        minSize: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'lastActive',
        id: 'lastActive',
        header: ({ column }) => <DataGridColumnHeader title="Last Active" column={column} />,
        cell: ({ row }) => (
          <span className="text-foreground-muted text-xs truncate">
            {row.original.lastActive || 'Just now'}
          </span>
        ),
        size: 140,
        minSize: 120,
        enableSorting: true,
      },
    ],
    [currentUser, roles, isAdmin, isSuperAdmin]
  );

  const table = useTable({
    features: dataGridFeatures,
    columns: userColumns,
    data: pagedUsers,
    pageCount: Math.max(1, Math.ceil(filteredUsers.length / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: User) => row.id,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnPinning,
      columnOrder,
      columnSizing,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
  });

  return (
    <div className="space-y-4 animate-fade-in text-xs">
      {/* ================= SLEEK SEARCH & CONTROL TOOLBAR (MATCHING INQUIRIES) ================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-1">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search team members, emails, departments..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="absolute right-2.5 top-2.5 text-foreground-muted hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Controls & View Switcher */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end w-full sm:w-auto">
            {/* Role Filter */}
            <div className="w-36 sm:w-40">
              <Combobox
                options={[
                  { value: 'all', label: 'All Roles' },
                  ...roles.map((r) => ({ value: r.key, label: r.name })),
                ]}
                value={roleFilter}
                onChange={(val) => {
                  setRoleFilter(val || 'all');
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder="All Roles"
              />
            </div>

            {/* Status Filter */}
            <div className="w-32 sm:w-36">
              <Combobox
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val || 'all');
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder="All Status"
              />
            </div>

            {/* Column Settings Dropdown (Common Component - Desktop Only) */}
            <div className="hidden sm:block">
              <DataGridColumnVisibilityMenu table={table} excludeColumns={['actions', 'code']} />
            </div>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      'w-4 h-4 transition-transform duration-700',
                      isRefreshing && 'animate-spin text-fairway-600'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Refresh</TooltipContent>
            </Tooltip>

            {/* Segmented View Switcher (Desktop Only) */}
            <div className="hidden sm:flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      viewMode === 'table'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'w-9 h-full flex items-center justify-center transition-all cursor-pointer',
                      viewMode === 'grid'
                        ? 'bg-fairway-600 text-white font-bold'
                        : 'text-foreground hover:text-foreground hover:bg-surface-muted/60'
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Card</TooltipContent>
              </Tooltip>
            </div>

            {/* Add Member Button */}
            {isAdmin && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddUserOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="whitespace-nowrap"
              >
                Add Member
              </Button>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Mobile view: ONLY Card View show, NOT list page show */}
      <div className="block sm:hidden">
        <DataGrid
          table={table}
          recordCount={filteredUsers.length}
          isLoading={isRefreshing}
          loadingMode="skeleton"
        >
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center bg-surface rounded-2xl border border-border">
                <Users className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-foreground">No team members match your search</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Try adjusting your search criteria or add a new team member.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-fade-in">
                {pagedUsers.map((u) => {
                  const userCode = `USR-${String(u.id).padStart(3, '0').slice(-4)}`;
                  const roleItem = roles.find((r) => r.key === u.role);
                  const isCurrentUser = u.id === currentUser?.id;

                  return (
                    <div
                      key={u.id}
                      className="bg-surface border border-border hover:border-fairway-400 hover:shadow-card rounded-xl p-4 transition-all flex flex-col justify-between group text-xs select-none shadow-2xs"
                    >
                      <div>
                        {/* Top Row: Code Badge + Status Pill + Menu */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:bg-emerald-950/30 dark:border-emerald-500/30 shadow-xs">
                            {userCode}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                                u.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-surface-muted text-foreground-muted border-border'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  u.status === 'Active' ? 'bg-emerald-500' : 'bg-foreground-muted'
                                )}
                              />
                              <span>{u.status || 'Active'}</span>
                            </span>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                                  title="Actions"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 bg-surface border border-border shadow-dialog z-50 p-1 rounded-xl"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditModal(u)}
                                  className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-foreground-muted" />
                                  <span>Edit Member</span>
                                </DropdownMenuItem>
                                {isAdmin && !isCurrentUser && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleToggleUserStatus(u.id, u.status)}
                                      className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg"
                                    >
                                      {u.status === 'Active' ? (
                                        <>
                                          <UserX className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Deactivate Account</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                          <span>Activate Account</span>
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1 border-border" />
                                    <DropdownMenuItem
                                      onClick={() => setDeletingUser(u)}
                                      className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Member</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* User Info (Avatar + Name + Email) */}
                        <div className="mt-3 flex items-start gap-3">
                          <UserAvatar src={u.avatar} name={u.name} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-foreground group-hover:text-fairway-600 transition-colors truncate">
                                {u.name}
                              </h3>
                              {isCurrentUser && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 font-bold shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground-muted font-mono truncate mt-0.5">
                              {u.email}
                            </p>
                            {u.phone && (
                              <p className="text-[11px] text-foreground-muted flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3 text-foreground-muted" />
                                <span>{u.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Key Specs Matrix (2-Column Grid Matching WarehouseInquiryCard) */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-[11px]">
                          <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50">
                            <span className="text-[10px] text-foreground-muted block">Department</span>
                            <span className="font-semibold text-foreground truncate flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-fairway-600" />
                              <span className="truncate">{u.department || 'Industrial Leasing'}</span>
                            </span>
                          </div>
                          <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50">
                            <span className="text-[10px] text-foreground-muted block">Assigned Leads</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                              <span>{u.assignedLeadsCount || 0} leads</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer: Role & Action */}
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-muted">
                        <span className="font-semibold capitalize bg-surface-muted border border-border px-2 py-0.5 rounded-md text-foreground text-[11px] inline-flex items-center gap-1">
                          <Shield className="w-3 h-3 text-fairway-600" />
                          <span>{roleItem?.name || u.role}</span>
                        </span>

                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(u)}
                            className="h-7 px-2.5 text-xs text-foreground hover:border-fairway-500 hover:text-fairway-600 shadow-2xs"
                            leftIcon={<Edit2 className="w-3 h-3" />}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Card View Pagination */}
            {filteredUsers.length > 0 && !isRefreshing && (
              <DataGridPagination sizes={[5, 10, 20, 50, 100]} />
            )}
          </div>
        </DataGrid>
      </div>

      {/* Desktop view: Respects user viewMode (List vs Card) */}
      <div className="hidden sm:block">
        {viewMode === 'table' ? (
          <CommonDataGrid
            table={table}
            recordCount={filteredUsers.length}
            isLoading={isRefreshing}
            emptyState={
              <div className="p-12 text-center text-foreground-muted bg-surface rounded-xl border border-border">
                <Users className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-foreground text-xs">No team members found</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Try adjusting your search query or filter criteria.
                </p>
              </div>
            }
          />
        ) : (
          <DataGrid
            table={table}
            recordCount={filteredUsers.length}
            isLoading={isRefreshing}
            loadingMode="skeleton"
          >
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center bg-surface rounded-2xl border border-border">
                  <Users className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-foreground">No team members match your search</p>
                  <p className="text-[11px] text-foreground-muted mt-0.5">
                    Try adjusting your search criteria or add a new team member.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-fade-in">
                  {pagedUsers.map((u) => {
                    const userCode = `USR-${String(u.id).padStart(3, '0').slice(-4)}`;
                    const roleItem = roles.find((r) => r.key === u.role);
                    const isCurrentUser = u.id === currentUser?.id;

                    return (
                      <div
                        key={u.id}
                        className="bg-surface border border-border hover:border-fairway-400 hover:shadow-card rounded-xl p-4 transition-all flex flex-col justify-between group text-xs select-none shadow-2xs"
                      >
                        <div>
                          {/* Top Row: Code Badge + Status Pill + Menu */}
                          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:bg-emerald-950/30 dark:border-emerald-500/30 shadow-xs">
                              {userCode}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                                  u.status === 'Active'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-surface-muted text-foreground-muted border-border'
                                )}
                              >
                                <span
                                  className={cn(
                                    'w-1.5 h-1.5 rounded-full',
                                    u.status === 'Active' ? 'bg-emerald-500' : 'bg-foreground-muted'
                                  )}
                                />
                                <span>{u.status || 'Active'}</span>
                              </span>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="w-6 h-6 rounded-md flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                                    title="Actions"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48 bg-surface border border-border shadow-dialog z-50 p-1 rounded-xl"
                                >
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEditModal(u)}
                                    className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-foreground-muted" />
                                    <span>Edit Member</span>
                                  </DropdownMenuItem>
                                  {isAdmin && !isCurrentUser && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                                        className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg"
                                      >
                                        {u.status === 'Active' ? (
                                          <>
                                            <UserX className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Deactivate Account</span>
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Activate Account</span>
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1 border-border" />
                                      <DropdownMenuItem
                                        onClick={() => setDeletingUser(u)}
                                        className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-700 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Member</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* User Info (Avatar + Name + Email) */}
                          <div className="mt-3 flex items-start gap-3">
                            <UserAvatar src={u.avatar} name={u.name} size="lg" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-foreground group-hover:text-fairway-600 transition-colors truncate">
                                  {u.name}
                                </h3>
                                {isCurrentUser && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 font-bold shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-foreground-muted font-mono truncate mt-0.5">
                                {u.email}
                              </p>
                              {u.phone && (
                                <p className="text-[11px] text-foreground-muted flex items-center gap-1 mt-1">
                                  <Phone className="w-3 h-3 text-foreground-muted" />
                                  <span>{u.phone}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Key Specs Matrix (2-Column Grid Matching WarehouseInquiryCard) */}
                          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-[11px]">
                            <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50">
                              <span className="text-[10px] text-foreground-muted block">Department</span>
                              <span className="font-semibold text-foreground truncate flex items-center gap-1 mt-0.5">
                                <Building className="w-3 h-3 text-fairway-600" />
                                <span className="truncate">{u.department || 'Industrial Leasing'}</span>
                              </span>
                            </div>
                            <div className="bg-surface-muted/60 dark:bg-[#161c24] p-2 rounded-lg border border-border/50">
                              <span className="text-[10px] text-foreground-muted block">Assigned Leads</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                <span>{u.assignedLeadsCount || 0} leads</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Footer: Role & Action */}
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-muted">
                          <span className="font-semibold capitalize bg-surface-muted border border-border px-2 py-0.5 rounded-md text-foreground text-[11px] inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-fairway-600" />
                            <span>{roleItem?.name || u.role}</span>
                          </span>

                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditModal(u)}
                              className="h-7 px-2.5 text-xs text-foreground hover:border-fairway-500 hover:text-fairway-600 shadow-2xs"
                              leftIcon={<Edit2 className="w-3 h-3" />}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Card View Pagination */}
              {filteredUsers.length > 0 && !isRefreshing && (
                <DataGridPagination sizes={[5, 10, 20, 50, 100]} />
              )}
            </div>
          </DataGrid>
        )}
      </div>

      {/* ================= ADD USER MODAL ================= */}
      {isAddUserOpen && (
        <Modal
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          title="Add New Team Member"
          description="Create a workspace account and invite a new team member to Fairway CRM."
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="e.g. rahul@fairwaylogistics.in"
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Role</label>
                <Combobox
                  options={roleOptions}
                  value={newUserForm.role}
                  onChange={(role) => setNewUserForm({ ...newUserForm, role: role as UserRole })}
                  placeholder="Select role..."
                  searchPlaceholder="Search roles..."
                  emptyText="No role found."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Department</label>
                <input
                  type="text"
                  value={newUserForm.department}
                  onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                  placeholder="e.g. Industrial Leasing"
                  className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-fairway-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Phone Number</label>
              <input
                type="text"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                placeholder="+91 988496151"
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-fairway-500 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Initial Password</label>
              <input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Defaults to Fairway@123 if left blank"
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-fairway-500 shadow-2xs"
              />
            </div>

            <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
                className="w-full xs:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingUser}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold w-full xs:w-auto"
              >
                {isSubmittingUser ? 'Creating...' : 'Create Member'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= EDIT USER MODAL ================= */}
      {isEditUserOpen && editingUser && (
        <Modal
          isOpen={isEditUserOpen}
          onClose={() => {
            setIsEditUserOpen(false);
            setEditingUser(null);
          }}
          title="Edit Team Member"
          description={`Update profile details for ${editingUser.name}`}
        >
          <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Full Name</label>
              <input
                type="text"
                required
                value={editUserForm.name}
                onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-fairway-500 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Email</label>
              <input
                type="email"
                disabled
                value={editingUser.email}
                className="w-full px-3.5 py-2.5 bg-surface-muted/80 border border-border rounded-xl text-xs text-foreground-muted cursor-not-allowed select-none font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Role</label>
                <Combobox
                  options={roleOptions}
                  value={editUserForm.role}
                  onChange={(role) => setEditUserForm({ ...editUserForm, role: role as UserRole })}
                  placeholder="Select role..."
                  searchPlaceholder="Search roles..."
                  emptyText="No role found."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Department</label>
                <input
                  type="text"
                  value={editUserForm.department}
                  onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-fairway-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Phone Number</label>
              <input
                type="text"
                value={editUserForm.phone}
                onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-fairway-500 shadow-2xs"
              />
            </div>

            <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditUserOpen(false);
                  setEditingUser(null);
                }}
                className="w-full xs:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEdit}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold w-full xs:w-auto"
              >
                {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deletingUser && (
        <Modal
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          title="Delete Team Member"
          description={`Are you sure you want to remove ${deletingUser.name}?`}
        >
          <div className="space-y-4 text-xs text-left">
            <p className="text-foreground-muted">
              This user will no longer be able to log in to Fairway CRM. Any existing leads assigned
              to this user will need to be reassigned.
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400">
              <strong>Warning:</strong> This action permanently deletes user access.
            </div>

            <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingUser(null)}
                className="w-full xs:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="w-full xs:w-auto"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserManagementTab;
