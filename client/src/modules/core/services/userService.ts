import { User, UserRole } from '@/modules/core/types';
import { API_BASE_URL } from './api';



export interface CreateUserPayload {
  name: string;
  email: string;
  role?: UserRole;
  department?: string;
  phone?: string;
  password?: string;
  avatar?: string;
}

export interface UpdateUserPayload {
  name?: string;
  role?: UserRole;
  department?: string;
  phone?: string;
  status?: 'Active' | 'Inactive';
  avatar?: string;
  birthDate?: string;
}

export const UserService = {
  async getUsers(): Promise<{ success: boolean; data?: User[]; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token');
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to fetch users' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      console.warn('Backend getUsers offline, using fallback:', err.message);
      return { success: false, error: err.message };
    }
  },

  async createUser(payload: CreateUserPayload): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token');
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to create user' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token');
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to update user' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async toggleUserStatus(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token');
      const response = await fetch(`${API_BASE_URL}/users/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to toggle user status' };
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteUser(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('fairway_token');
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to delete user' };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
