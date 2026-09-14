import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/modules/core/types';
import { AuthService } from '@/modules/core/services/authService';
import { UserService, CreateUserPayload, UpdateUserPayload } from '@/modules/core/services/userService';
import { RoleService, RolePermissionDetail } from '@/modules/core/services/roleService';

interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface AuthContextType {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password?: string) => Promise<AuthResult>;
  updateProfile: (payload: Partial<User>) => Promise<AuthResult>;
  logout: () => void;
  switchUser: (userId: string) => void;
  refreshUsers: () => Promise<void>;
  updateRole: (userId: string, newRole: UserRole) => Promise<void>;
  addUser: (payload: CreateUserPayload) => Promise<{ success: boolean; data?: User; error?: string }>;
  editUser: (userId: string, payload: UpdateUserPayload) => Promise<{ success: boolean; data?: User; error?: string }>;
  removeUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (userId: string) => Promise<{ success: boolean; error?: string }>;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canConfigureStages: boolean;
  canViewAuditLogs: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isSales: boolean;
  isViewer: boolean;
  rolePermissions: RolePermissionDetail[];
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEditModule: (module?: string) => boolean;
  canDeleteModule: (module?: string) => boolean;
  canExport: (module: string) => boolean;
  canImport: (module: string) => boolean;
  canApprove: (module: string) => boolean;
  canAssign: (module: string) => boolean;
  canManage: (module: string) => boolean;
  hasCapability: (capabilityId: string) => boolean;
  refreshRolePermissions: (roleKey?: string) => Promise<void>;
}

const getInitialUser = (): User => {
  try {
    const raw = localStorage.getItem('fw_auth_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    id: 'usr_1',
    name: 'Admin User',
    email: 'admin@fairway.com',
    role: 'super_admin',
    department: 'Industrial Leasing',
    status: 'Active',
    assignedLeadsCount: 0,
    lastActive: 'Just now',
  };
};

const saveCurrentUserLocal = (user: User) => {
  try {
    localStorage.setItem('fw_auth_user', JSON.stringify(user));
  } catch {}
};

export const normalizeModuleCategory = (mod: string): string => {
  const m = (mod || '').toLowerCase().trim();
  if (m.includes('inquir') || m.includes('lead') || m.includes('pipeline')) return 'Inquiries & Leads';
  if (m.includes('prop_quote') || m.includes('proposal') || m.includes('financial') || m.includes('quote')) return 'Proposals & Financials';
  if (m.includes('prop') || m.includes('warehouse')) return 'Properties & Warehouses';
  if (m.includes('comp') || m.includes('account') || m.includes('contact')) return 'Companies & Accounts';
  if (m.includes('task') || m.includes('follow') || m.includes('site_visit')) return 'Tasks & Follow-ups';
  if (m.includes('comm') || m.includes('mail') || m.includes('call')) return 'Communications';
  if (m.includes('rep') || m.includes('analytics')) return 'Reports & Analytics';
  if (m.includes('adm') || m.includes('setting') || m.includes('role') || m.includes('user')) return 'Administration';
  return mod;
};

export type PermissionActionType =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'import'
  | 'approve'
  | 'assign'
  | 'manage'
  | 'special';

export const matchPermissionAction = (
  perm: RolePermissionDetail,
  actionKey: PermissionActionType
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
  if (actionKey === 'create') {
    return (
      (id.includes('create') ||
        cap.includes('create') ||
        cap.includes('add') ||
        cap.includes('register') ||
        cap.includes('generate') ||
        id.includes('call')) &&
      !id.includes('quote_edit')
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
  if (actionKey === 'delete') {
    return (
      id.includes('delete') ||
      cap.includes('delete') ||
      cap.includes('archive') ||
      cap.includes('remove') ||
      cap.includes('complete')
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
  if (actionKey === 'assign') {
    return id.includes('assign') || cap.includes('assign') || cap.includes('reassign');
  }
  if (actionKey === 'approve') {
    return id.includes('approve') || cap.includes('approve') || id.includes('stage') || cap.includes('stage');
  }
  if (actionKey === 'manage') {
    return (
      id.includes('users') ||
      id.includes('roles') ||
      id.includes('stages') ||
      id.includes('audit') ||
      cap.includes('manage') ||
      cap.includes('configure')
    );
  }
  if (actionKey === 'special') {
    return (
      id.includes('stage') ||
      id.includes('assign') ||
      id.includes('users') ||
      id.includes('roles') ||
      id.includes('stages') ||
      id.includes('financial')
    );
  }
  return false;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(getInitialUser);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('fw_auth_authenticated');
      const token = localStorage.getItem('fw_auth_token');
      // Require explicit authenticated flag and presence of a token
      if (stored === 'false' || !stored) return false;
      return !!token;
    } catch {
      return false;
    }
  });

  const refreshUsers = async (activeUserId?: string, activeEmail?: string) => {
    try {
      const res = await UserService.getUsers();
      if (res.success && res.data && res.data.length > 0) {
        setUsers(res.data);

        // Update currentUserState only if matching the authenticated user's email or ID
        setCurrentUserState((prevUser) => {
          const targetEmail = (activeEmail || prevUser?.email)?.trim().toLowerCase();
          const targetId = activeUserId || prevUser?.id;

          const me = res.data?.find(
            (u) =>
              (targetEmail && u.email?.trim().toLowerCase() === targetEmail) ||
              (targetId && u.id === targetId)
          );

          if (me) {
            saveCurrentUserLocal(me);
            return me;
          }
          return prevUser;
        });
      }
    } catch (err) {
      console.warn('Could not refresh users from API:', err);
    }
  };

  // Verify session and fetch initial team members with backend on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('fw_auth_token');
      const storedAuth = localStorage.getItem('fw_auth_authenticated');
      let activeUser: User | null = null;

      if (token && storedAuth === 'true') {
        try {
          const res = await AuthService.getMe();
          if (res.success && res.data?.user) {
            activeUser = res.data.user;
            setCurrentUserState(res.data.user);
            saveCurrentUserLocal(res.data.user);
            setIsAuthenticated(true);
          } else {
            // Token invalid or session expired
            logout();
          }
        } catch {
          // If offline or network error, verify cached current user
          const cached = getInitialUser();
          if (cached && cached.email && storedAuth === 'true') {
            activeUser = cached;
            setCurrentUserState(cached);
            setIsAuthenticated(true);
          } else {
            logout();
          }
        }
      } else {
        const explicitlyLoggedOut = localStorage.getItem('fw_user_logged_out') === 'true';
        if (!explicitlyLoggedOut && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          try {
            const loginRes = await AuthService.login({ email: 'amit@fairway.co.in', password: 'fairway123' });
            if (loginRes.success && loginRes.data) {
              activeUser = loginRes.data.user;
              setCurrentUserState(loginRes.data.user);
              saveCurrentUserLocal(loginRes.data.user);
              localStorage.setItem('fw_auth_token', loginRes.data.token);
              localStorage.setItem('fw_auth_authenticated', 'true');
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
            }
          } catch {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      }

      if (activeUser) {
        await refreshUsers(activeUser.id, activeUser.email);
      } else {
        await refreshUsers();
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password?: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return {
        success: false,
        error: 'Please enter your work email address.',
      };
    }

    if (!password) {
      return {
        success: false,
        error: 'Please enter your password.',
      };
    }

    try {
      const res = await AuthService.login({
        email: normalizedEmail,
        password: password,
      });

      if (res.success && res.data) {
        const { user, token } = res.data;
        try {
          localStorage.setItem('fw_auth_token', token);
          localStorage.setItem('fw_auth_authenticated', 'true');
          localStorage.removeItem('fw_user_logged_out');
        } catch {}

        saveCurrentUserLocal(user);
        setCurrentUserState(user);
        setIsAuthenticated(true);
        await refreshUsers(user.id, user.email);

        return { success: true, message: `Signed in as ${user.name}` };
      }

      // Backend returned failure with invalid password or unregistered email
      const errorMsg =
        res.error?.message ||
        res.message ||
        'Invalid email or password. Please check your credentials.';

      return {
        success: false,
        error: errorMsg,
      };
    } catch (e: any) {
      console.error('Login error:', e);
      return {
        success: false,
        error: e.message || 'Unable to connect to authentication server. Please try again.',
      };
    }
  };

  const signup = async (name: string, email: string, password?: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await AuthService.register({
        name: name.trim(),
        email: normalizedEmail,
        password: password || '',
      });

      if (res.success && res.data) {
        const { user, token } = res.data;
        try {
          localStorage.setItem('fw_auth_token', token);
          localStorage.setItem('fw_auth_authenticated', 'true');
        } catch {}

        saveCurrentUserLocal(user);
        setCurrentUserState(user);
        setIsAuthenticated(true);
        await refreshUsers(user.id, user.email);

        return { success: true, message: 'Account registered successfully.' };
      }

      return {
        success: false,
        error: res.error?.message || 'Registration failed. An account with this email may already exist.',
      };
    } catch (e: any) {
      console.error('Backend signup error:', e);
      return {
        success: false,
        error: e.message || 'Unable to connect to authentication server. Please try again.',
      };
    }
  };

  const updateProfile = async (payload: Partial<User>): Promise<AuthResult> => {
    try {
      const res = await AuthService.updateProfile({
        name: payload.name,
        phone: payload.phone,
        department: payload.department,
        avatar: payload.avatar,
        timezone: payload.timezone,
        workingHoursStart: payload.workingHoursStart,
        workingHoursEnd: payload.workingHoursEnd,
        twoFactorEnabled: payload.twoFactorEnabled,
        birthDate: payload.birthDate,
      });

      if (res.success && res.data?.user) {
        const updated = res.data.user;
        setCurrentUserState(updated);
        saveCurrentUserLocal(updated);

        const updatedUsers = users.map((u) => (u.id === updated.id ? updated : u));
        setUsers(updatedUsers);

        return { success: true, message: 'Profile updated successfully.' };
      }

      if (res.error?.message && !res.error.message.includes('Cannot reach backend')) {
        return { success: false, error: res.error.message };
      }
    } catch (e: any) {
      console.warn('Backend updateProfile error:', e);
    }

    const updated = { ...currentUser, ...payload };
    setCurrentUserState(updated);
    saveCurrentUserLocal(updated);
    const updatedUsers = users.map((u) => (u.id === updated.id ? updated : u));
    setUsers(updatedUsers);

    return { success: true, message: 'Profile updated.' };
  };

  const [rolePermissions, setRolePermissions] = useState<RolePermissionDetail[]>(() => {
    try {
      const raw = localStorage.getItem('fw_user_role_permissions');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const refreshRolePermissions = async (roleKey?: string) => {
    const targetRole = (roleKey || currentUser?.role || '').trim();
    if (!targetRole) return;
    try {
      const res = await RoleService.getRolePermissionsForRole(targetRole);
      if (res.success && res.data && res.data.length > 0) {
        setRolePermissions(res.data);
        try {
          localStorage.setItem('fw_user_role_permissions', JSON.stringify(res.data));
        } catch {}
      }
    } catch (err) {
      console.warn('Could not refresh role permissions:', err);
    }
  };

  useEffect(() => {
    if (currentUser?.role) {
      refreshRolePermissions(currentUser.role);
    }

    const handlePermUpdate = (e: any) => {
      const updatedRole = e.detail?.roleKey;
      if (!updatedRole || updatedRole.toLowerCase() === (currentUser?.role || '').toLowerCase()) {
        refreshRolePermissions(currentUser?.role);
      }
    };

    window.addEventListener('fw_role_permissions_updated', handlePermUpdate);
    return () => {
      window.removeEventListener('fw_role_permissions_updated', handlePermUpdate);
    };
  }, [currentUser?.role]);

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('fw_auth_token');
      localStorage.setItem('fw_auth_authenticated', 'false');
      localStorage.setItem('fw_user_logged_out', 'true');
      localStorage.removeItem('fw_auth_user');
      localStorage.removeItem('fw_user_role_permissions');
    } catch {}
    setRolePermissions([]);
    setCurrentUserState(getInitialUser());
  };

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      saveCurrentUserLocal(target);
      setCurrentUserState(target);
      refreshRolePermissions(target.role);
    }
  };

  const updateRole = async (userId: string, newRole: UserRole) => {
    try {
      await UserService.updateUser(userId, { role: newRole });
    } catch {}

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    if (currentUser.id === userId) {
      const updated = { ...currentUser, role: newRole };
      setCurrentUserState(updated);
      saveCurrentUserLocal(updated);
      refreshRolePermissions(newRole);
    }
  };

  const addUser = async (payload: CreateUserPayload) => {
    const res = await UserService.createUser(payload);
    if (res.success && res.data) {
      setUsers((prev) => [...prev, res.data!]);
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to create user' };
  };

  const editUser = async (userId: string, payload: UpdateUserPayload) => {
    const res = await UserService.updateUser(userId, payload);
    if (res.success && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data! : u)));
      if (currentUser.id === userId) {
        setCurrentUserState(res.data);
        saveCurrentUserLocal(res.data);
      }
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to update user' };
  };

  const removeUser = async (userId: string) => {
    const res = await UserService.deleteUser(userId);
    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to delete user' };
  };

  const toggleUserStatus = async (userId: string) => {
    const res = await UserService.toggleUserStatus(userId);
    if (res.success && res.data) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: res.data!.status } : u))
      );
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to toggle status' };
  };

  const role = currentUser.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = isSuperAdmin || role === 'admin';
  const isSales = role === 'sales';
  const isViewer = role === 'viewer';

  const checkPermission = (
    moduleName: string,
    actionKey: PermissionActionType
  ): boolean => {
    // Admin has full platform authority across all modules and actions
    if (isAdmin) return true;

    const targetCategory = normalizeModuleCategory(moduleName).toLowerCase();

    if (rolePermissions && rolePermissions.length > 0) {
      const categoryPerms = rolePermissions.filter((p) => {
        const pCat = (p.category || '').toLowerCase();
        return (
          pCat === targetCategory ||
          pCat.includes(targetCategory) ||
          targetCategory.includes(pCat)
        );
      });

      if (categoryPerms.length > 0) {
        const actionPerms = categoryPerms.filter((p) =>
          matchPermissionAction(p, actionKey)
        );

        if (actionPerms.length > 0) {
          return actionPerms.some((p) => {
            const val = (p.value || '').trim().toLowerCase();
            return val !== '' && val !== 'no';
          });
        }

        // If checking 'view' and no explicit 'view' capability matched, check if ANY capability in category is granted
        if (actionKey === 'view') {
          return categoryPerms.some((p) => {
            const val = (p.value || '').trim().toLowerCase();
            return val !== '' && val !== 'no';
          });
        }

        return false;
      }
    }

    return false;
  };

  const hasCapability = (capabilityId: string): boolean => {
    if (isAdmin) return true;
    const targetId = capabilityId.toLowerCase().trim();
    const found = rolePermissions.find((p) => (p.id || '').toLowerCase().trim() === targetId);
    if (found) {
      const val = (found.value || '').trim().toLowerCase();
      return val !== '' && val !== 'no';
    }
    return false;
  };

  const canView = (module: string) => checkPermission(module, 'view');
  const canCreate = (module: string) => checkPermission(module, 'create');
  const canEdit = isAdmin || (rolePermissions && rolePermissions.length > 0
    ? rolePermissions.some((p) => matchPermissionAction(p, 'edit') && (p.value || '').trim().toLowerCase() !== 'no' && (p.value || '').trim() !== '')
    : false);

  const canDelete = isAdmin || (rolePermissions && rolePermissions.length > 0
    ? rolePermissions.some((p) => matchPermissionAction(p, 'delete') && (p.value || '').trim().toLowerCase() !== 'no' && (p.value || '').trim() !== '')
    : false);

  const canEditModule = (module?: string) => {
    if (!module) return canEdit;
    return checkPermission(module, 'edit');
  };
  const canDeleteModule = (module?: string) => {
    if (!module) return canDelete;
    return checkPermission(module, 'delete');
  };
  const canExport = (module: string) => checkPermission(module, 'export');
  const canImport = (module: string) => checkPermission(module, 'import');
  const canApprove = (module: string) => checkPermission(module, 'approve');
  const canAssign = (module: string) => checkPermission(module, 'assign');
  const canManage = (module: string) => checkPermission(module, 'manage');

  const canManageUsers = isAdmin || hasCapability('perm_adm_users');
  const canConfigureStages = isAdmin || hasCapability('perm_adm_stages') || hasCapability('perm_inq_stage');
  const canViewAuditLogs = isAdmin || hasCapability('perm_adm_audit');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated,
        isLoading,
        login,
        signup,
        updateProfile,
        logout,
        switchUser,
        refreshUsers,
        updateRole,
        addUser,
        editUser,
        removeUser,
        toggleUserStatus,
        canEdit,
        canDelete,
        canManageUsers,
        canConfigureStages,
        canViewAuditLogs,
        isSuperAdmin,
        isAdmin,
        isSales,
        isViewer,
        rolePermissions,
        canView,
        canCreate,
        canEditModule,
        canDeleteModule,
        canExport,
        canImport,
        canApprove,
        canAssign,
        canManage,
        hasCapability,
        refreshRolePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
