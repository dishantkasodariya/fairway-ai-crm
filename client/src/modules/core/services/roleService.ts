export interface RoleItem {
  id: string;
  name: string;
  key: string;
  description: string;
  color: string;
  isSystem: boolean;
  userCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermissionDetail {
  id: string;
  capability: string;
  category: string;
  value: string;
  description?: string;
}

import { API_BASE_URL } from './api';

export const RoleService = {
  async getRoles(): Promise<{ success: boolean; data?: RoleItem[]; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to fetch roles' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      console.warn('Backend roles offline, using fallback:', err.message);
      return { success: false, error: err.message };
    }
  },

  async createRole(payload: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<{ success: boolean; data?: RoleItem; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to create role' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateRole(
    id: string,
    payload: { name?: string; description?: string; color?: string }
  ): Promise<{ success: boolean; data?: RoleItem; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to update role' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteRole(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to delete role' };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getRolePermissionsForRole(
    roleKey: string
  ): Promise<{ success: boolean; data?: RolePermissionDetail[]; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles/${roleKey}/permissions`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to fetch role permissions' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateRolePermissionsForRole(
    roleKey: string,
    permissions: { id: string; value: string }[]
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles/${roleKey}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ permissions }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to update role permissions' };
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fw_role_permissions_updated', { detail: { roleKey } }));
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
