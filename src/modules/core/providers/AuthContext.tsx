import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/modules/core/types';
import { StorageService } from '@/modules/core/services/storageService';

interface AuthContextType {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  login: (email: string, password?: string) => boolean;
  signup: (name: string, email: string, password?: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  updateRole: (userId: string, newRole: UserRole) => void;
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
  const [currentUser, setCurrentUserState] = useState<User>(StorageService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(StorageService.getUsers());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('fw_auth_authenticated');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentUserState(StorageService.getCurrentUser());
      setUsers(StorageService.getUsers());
    };
    window.addEventListener('fw_storage_change', handleStorageChange);
    return () => window.removeEventListener('fw_storage_change', handleStorageChange);
  }, []);

  const login = (email: string, _password?: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    const userToLogin = existing || users[0];

    StorageService.setCurrentUser(userToLogin);
    setCurrentUserState(userToLogin);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('fw_auth_authenticated', 'true');
    } catch { }
    return true;
  };

  const signup = (name: string, email: string, _password?: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    let existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!existing) {
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: name.trim() || 'Workspace User',
        email: normalizedEmail,
        role: 'admin',
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        status: 'Active',
        assignedLeadsCount: 0,
        lastActive: 'Just now',
        department: 'Industrial Leasing',
      };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      StorageService.setCurrentUser(newUser);
      setCurrentUserState(newUser);
    } else {
      StorageService.setCurrentUser(existing);
      setCurrentUserState(existing);
    }

    setIsAuthenticated(true);
    try {
      localStorage.setItem('fw_auth_authenticated', 'true');
    } catch { }
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.setItem('fw_auth_authenticated', 'false');
    } catch { }
  };

  const switchUser = (userId: string) => {
    const target = StorageService.getUserById(userId);
    if (target) {
      StorageService.setCurrentUser(target);
      setCurrentUserState(target);
    }
  };

  const updateRole = (userId: string, newRole: UserRole) => {
    StorageService.updateUserRole(userId, newRole);
    setUsers(StorageService.getUsers());
    if (currentUser.id === userId) {
      setCurrentUserState((prev) => ({ ...prev, role: newRole }));
    }
  };

  const role = currentUser.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = isSuperAdmin || role === 'admin';
  const isSales = role === 'sales';
  const isViewer = role === 'viewer';

  const canEdit = !isViewer;
  const canDelete = isSuperAdmin || role === 'admin';
  const canManageUsers = isSuperAdmin;
  const canConfigureStages = isSuperAdmin || role === 'admin';
  const canViewAuditLogs = isSuperAdmin || role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated,
        login,
        signup,
        logout,
        switchUser,
        updateRole,
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

