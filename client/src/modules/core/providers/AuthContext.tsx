import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/modules/core/types';
import { StorageService } from '@/modules/core/services/storageService';
import { AuthService } from '@/modules/core/services/authService';
import { UserService, CreateUserPayload, UpdateUserPayload } from '@/modules/core/services/userService';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => StorageService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
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
        StorageService.saveUsers(res.data);

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
            StorageService.setCurrentUser(me);
            return me;
          }
          return prevUser;
        });
      }
    } catch (err) {
      console.warn('Could not refresh users from API, keeping cache:', err);
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
            StorageService.setCurrentUser(res.data.user);
            setIsAuthenticated(true);
          } else {
            // Token invalid or session expired
            logout();
          }
        } catch {
          // If offline or network error, verify cached current user
          const cached = StorageService.getCurrentUser();
          if (cached && storedAuth === 'true') {
            activeUser = cached;
            setCurrentUserState(cached);
            setIsAuthenticated(true);
          } else {
            logout();
          }
        }
      } else {
        setIsAuthenticated(false);
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

  useEffect(() => {
    const handleStorageChange = () => {
      const savedUser = StorageService.getCurrentUser();
      if (savedUser) {
        setCurrentUserState(savedUser);
      }
      setUsers(StorageService.getUsers());
    };
    window.addEventListener('fw_storage_change', handleStorageChange);
    return () => window.removeEventListener('fw_storage_change', handleStorageChange);
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
        } catch {}

        StorageService.setCurrentUser(user);
        setCurrentUserState(user);
        setIsAuthenticated(true);
        await refreshUsers(user.id, user.email);
        window.dispatchEvent(new Event('fw_storage_change'));

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

        StorageService.setCurrentUser(user);
        setCurrentUserState(user);
        setIsAuthenticated(true);
        await refreshUsers(user.id, user.email);
        window.dispatchEvent(new Event('fw_storage_change'));

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
        StorageService.setCurrentUser(updated);

        const updatedUsers = users.map((u) => (u.id === updated.id ? updated : u));
        setUsers(updatedUsers);
        StorageService.saveUsers(updatedUsers);
        window.dispatchEvent(new Event('fw_storage_change'));

        return { success: true, message: 'Profile updated successfully.' };
      }

      if (res.error?.message && !res.error.message.includes('Cannot reach backend')) {
        return { success: false, error: res.error.message };
      }
    } catch (e: any) {
      console.warn('Backend updateProfile error, applying local update:', e);
    }

    const updated = { ...currentUser, ...payload };
    setCurrentUserState(updated);
    StorageService.setCurrentUser(updated);
    const updatedUsers = users.map((u) => (u.id === updated.id ? updated : u));
    setUsers(updatedUsers);
    StorageService.saveUsers(updatedUsers);
    window.dispatchEvent(new Event('fw_storage_change'));

    return { success: true, message: 'Profile updated.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('fw_auth_token');
      localStorage.setItem('fw_auth_authenticated', 'false');
      localStorage.removeItem('fw_crm_current_user');
    } catch {}
    window.dispatchEvent(new Event('fw_storage_change'));
  };

  const switchUser = (userId: string) => {
    const target = StorageService.getUserById(userId) || users.find((u) => u.id === userId);
    if (target) {
      StorageService.setCurrentUser(target);
      setCurrentUserState(target);
      try {
        localStorage.removeItem('fw_auth_token');
      } catch {}
      window.dispatchEvent(new Event('fw_storage_change'));
    }
  };

  const updateRole = async (userId: string, newRole: UserRole) => {
    try {
      await UserService.updateUser(userId, { role: newRole });
    } catch {}

    StorageService.updateUserRole(userId, newRole);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUserState((prev) => ({ ...prev, role: newRole }));
    }
  };

  const addUser = async (payload: CreateUserPayload) => {
    const res = await UserService.createUser(payload);
    if (res.success && res.data) {
      setUsers((prev) => [...prev, res.data!]);
      StorageService.saveUsers([...users, res.data!]);
      return { success: true, data: res.data };
    }
    // Fallback local creation if backend offline
    if (res.error?.includes('Failed to fetch') || !res.success) {
      const fallbackUser: User = {
        id: `usr_${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role || 'sales',
        department: payload.department || 'Industrial Leasing',
        phone: payload.phone || '+91 988496151',
        status: 'Active',
        assignedLeadsCount: 0,
        lastActive: 'Just now',
      };
      const updated = [...users, fallbackUser];
      setUsers(updated);
      StorageService.saveUsers(updated);
      return { success: true, data: fallbackUser };
    }
    return { success: false, error: res.error };
  };

  const editUser = async (userId: string, payload: UpdateUserPayload) => {
    const res = await UserService.updateUser(userId, payload);
    if (res.success && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data! : u)));
      if (currentUser.id === userId) {
        setCurrentUserState(res.data);
      }
      return { success: true, data: res.data };
    }
    // Fallback local update
    const target = users.find((u) => u.id === userId);
    if (target) {
      const updated = { ...target, ...payload };
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (currentUser.id === userId) {
        setCurrentUserState(updated);
      }
      StorageService.saveUsers(users.map((u) => (u.id === userId ? updated : u)));
      return { success: true, data: updated };
    }
    return { success: false, error: res.error };
  };

  const removeUser = async (userId: string) => {
    const res = await UserService.deleteUser(userId);
    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      StorageService.saveUsers(users.filter((u) => u.id !== userId));
      return { success: true };
    }
    // Fallback local removal
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    StorageService.saveUsers(users.filter((u) => u.id !== userId));
    return { success: true };
  };

  const toggleUserStatus = async (userId: string) => {
    const res = await UserService.toggleUserStatus(userId);
    if (res.success && res.data) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: res.data.status } : u))
      );
      return { success: true };
    }
    // Fallback local toggle
    StorageService.toggleUserStatus(userId);
    setUsers(StorageService.getUsers());
    return { success: true };
  };

  const role = currentUser.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = isSuperAdmin || role === 'admin';
  const isSales = role === 'sales';
  const isViewer = role === 'viewer';

  const canEdit = !isViewer;
  const canDelete = isSuperAdmin || role === 'admin';
  const canManageUsers = isSuperAdmin || isAdmin;
  const canConfigureStages = isSuperAdmin || role === 'admin';
  const canViewAuditLogs = isSuperAdmin || role === 'admin';

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
