export interface RolePermissionItem {
  id: string;
  capability: string;
  category: string;
  superAdmin: string;
  admin: string;
  sales: string;
  viewer: string;
  customPermissions?: Record<string, string>;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}


import { API_BASE_URL } from './api';

export const PermissionsService = {
  async getRolePermissions(): Promise<{ success: boolean; data?: RolePermissionItem[]; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles-permissions`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to load permissions' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      console.warn('Backend permissions offline, using fallback:', err.message);
      return { success: false, error: err.message };
    }
  },

  async updateRolePermission(
    id: string,
    payload: Partial<RolePermissionItem>
  ): Promise<{ success: boolean; data?: RolePermissionItem; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles-permissions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to update permission' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async resetRolePermissions(): Promise<{ success: boolean; data?: RolePermissionItem[]; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      const response = await fetch(`${API_BASE_URL}/roles-permissions/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to reset permissions' };
      }

      return { success: true, data: data.data, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
