import { api, ApiResponse } from './api';
import { User, UserRole } from '../types';

export interface AuthResponseData {
  user: User;
  token: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  department?: string;
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  department?: string;
  avatar?: string;
  timezone?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  twoFactorEnabled?: boolean;
  birthDate?: string;
}


export const AuthService = {
  async login(payload: LoginPayload): Promise<ApiResponse<AuthResponseData>> {
    return api.post<AuthResponseData>('/auth/login', payload);
  },

  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> {
    return api.post<AuthResponseData>('/auth/register', payload);
  },

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return api.get<{ user: User }>('/auth/me');
  },

  async getUsers(): Promise<ApiResponse<User[]>> {
    return api.get<User[]>('/auth/users');
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<{ user: User }>> {
    return api.put<{ user: User }>('/auth/profile', payload);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return api.put<void>('/auth/change-password', { currentPassword, newPassword });
  },
};
