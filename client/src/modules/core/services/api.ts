// Base API helper client

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';


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

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
