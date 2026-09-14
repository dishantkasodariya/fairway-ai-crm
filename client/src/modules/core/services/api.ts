// Base API helper client

const getBaseUrl = (): string => {
  let url: string = (import.meta as any).env?.VITE_API_URL || '';
  if (!url) {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      url = 'https://fairway-crm-backend.onrender.com/api';
    } else {
      url = '/api';
    }
  }
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // If user provided backend domain without /api (e.g. https://fairway-crm-backend.onrender.com), append /api
  if (url.startsWith('http') && !url.endsWith('/api') && !url.includes('/api/')) {
    url = `${url}/api`;
  }
  return url;
};

export const API_BASE_URL = getBaseUrl();
const BASE_URL = API_BASE_URL;

export const getAuthHeaders = (customHeaders?: Record<string, string>): Record<string, string> => {
  let token: string | null = null;
  let userRole: string | null = null;
  let userId: string | null = null;
  try {
    token = localStorage.getItem('fw_auth_token');
    const rawUser = localStorage.getItem('fw_auth_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      userRole = u.role;
      userId = u.id;
    }
  } catch {}
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userRole ? { 'x-user-role': userRole } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
    ...(customHeaders || {}),
  };
};

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

class ApiClient {
  private getToken(): string | null {
    try {
      return localStorage.getItem('fw_auth_token');
    } catch {
      return null;
    }
  }

  private getUserInfo(): { role?: string; id?: string } {
    try {
      const rawUser = localStorage.getItem('fw_auth_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        return { role: u.role, id: u.id };
      }
    } catch {}
    return {};
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const { role, id } = this.getUserInfo();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(role ? { 'x-user-role': role } : {}),
      ...(id ? { 'x-user-id': id } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({
        success: false,
        error: { message: `Request failed with status ${response.status}` },
      }));

      if (!response.ok) {
        return {
          success: false,
          error: data.error || { message: data.message || `Error ${response.status}` },
        };
      }

      return data;
    } catch (networkError: any) {
      console.warn(`[API Network Error] ${endpoint}:`, networkError.message);
      return {
        success: false,
        error: { message: networkError.message || 'Cannot reach backend server. Ensure backend is running.' },
      };
    }
  }

  get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
