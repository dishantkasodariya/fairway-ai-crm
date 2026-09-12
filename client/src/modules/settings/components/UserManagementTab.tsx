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
} from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { User, UserRole } from '@/modules/core/types';
import { RoleItem } from '@/modules/core/services/roleService';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Modal } from '@/modules/core/components/ui/Modal';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';
import { Combobox } from '@/modules/core/components/ui/combobox-1';

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'sales' as UserRole,
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
    role: 'sales' as UserRole,
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
        role: 'sales',
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

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-fairway-600" />
              <span>Team Members & Access Accounts</span>
            </CardTitle>
            <p className="text-xs text-foreground-muted mt-0.5">Assign user access roles across configured workspaces</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, dept..."
                className="pl-8.5 pr-8 py-1.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 transition-all w-48 sm:w-60 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-foreground-muted hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-36">
              <Combobox
                options={[
                  { value: 'all', label: 'All Roles' },
                  ...roles.map((r) => ({ value: r.key, label: r.name })),
                ]}
                value={roleFilter}
                onChange={(val) => setRoleFilter(val || 'all')}
                placeholder="All Roles"
              />
            </div>

            <div className="w-32">
              <Combobox
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val || 'all')}
                placeholder="All Status"
              />
            </div>

            {isAdmin && (
              <Button
                onClick={() => setIsAddUserOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-fairway-600 hover:bg-fairway-700 text-white shadow-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted/80 text-[11px] font-bold uppercase text-foreground-muted border-b border-border">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Assigned Leads</th>
                <th className="p-3.5">Last Active</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-foreground-muted">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar src={u.avatar} name={u.name} size="md" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground block text-xs">{u.name}</span>
                            {u.id === currentUser.id && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-foreground-muted font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-foreground-muted font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Building className="w-3 h-3 text-foreground-muted" />
                        <span>{u.department || 'Executive Leadership'}</span>
                      </span>
                    </td>

                    <td className="p-3.5">
                      {isAdmin ? (
                        <div className="w-36">
                          <Combobox
                            options={roles.map((r) => ({ value: r.key, label: r.name }))}
                            value={u.role}
                            onChange={(val) => {
                              if (val) handleRoleChange(u.id, val as UserRole);
                            }}
                            disabled={u.id === currentUser.id && isSuperAdmin}
                            placeholder="Select role"
                          />
                        </div>
                      ) : (
                        <span className="font-bold capitalize bg-surface-muted border border-border px-2.5 py-1 rounded-lg text-foreground text-xs">
                          {u.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          u.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-surface-muted text-foreground-muted border border-border'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'Active' ? 'bg-emerald-500' : 'bg-foreground-muted'
                          }`}
                        />
                        {u.status}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-center text-foreground">
                      {u.assignedLeadsCount || 0}
                    </td>

                    <td className="p-3.5 text-foreground-muted text-[11px]">{u.lastActive || 'Just now'}</td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
                            title="Edit user details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isAdmin && u.id !== currentUser.id && (
                          <>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
                              title={u.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                            >
                              {u.status === 'Active' ? (
                                <UserX className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </button>

                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 text-foreground-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingUser} className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold">
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditUserOpen(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingEdit} className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold">
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
              This user will no longer be able to log in to Fairway CRM. Any existing leads assigned to this user will need to be reassigned.
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400">
              <strong>Warning:</strong> This action permanently deletes user access.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setDeletingUser(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
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
