import { Property } from '@/modules/core/types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export class PropertyService {
  /**
   * Fetch all properties with optional filters
   */
  static async getProperties(filters?: {
    corridor?: string;
    status?: string;
    search?: string;
    minArea?: number;
    maxRent?: number;
  }): Promise<{ success: boolean; data: Property[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters?.corridor && filters.corridor !== 'all') {
        params.append('corridor', filters.corridor);
      }
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.minArea) {
        params.append('minArea', filters.minArea.toString());
      }
      if (filters?.maxRent) {
        params.append('maxRent', filters.maxRent.toString());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE_URL}/properties${queryString}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('PropertyService.getProperties failed:', err);
      return { success: false, data: [], error: err.message || 'Network error' };
    }
  }

  /**
   * Fetch unique corridors with counts
   */
  static async getCorridors(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/properties/corridors`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('PropertyService.getCorridors failed:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Fetch single property by ID
   */
  static async getPropertyById(id: string): Promise<{ success: boolean; data?: Property; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/properties/${id}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`PropertyService.getPropertyById(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Create a new property
   */
  static async createProperty(propertyData: Partial<Property>): Promise<{ success: boolean; data?: Property; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('PropertyService.createProperty failed:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Update an existing property
   */
  static async updateProperty(id: string, propertyData: Partial<Property>): Promise<{ success: boolean; data?: Property; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`PropertyService.updateProperty(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Delete a property
   */
  static async deleteProperty(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`PropertyService.deleteProperty(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }
}

export default PropertyService;
