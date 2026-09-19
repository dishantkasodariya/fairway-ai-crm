import { Property } from '@/modules/core/types';
import { api, ApiResponse } from './api';

export class PropertyService {
  /**
   * Fetch all properties from backend GET /api/properties
   */
  static async getProperties(filters?: {
    corridor?: string;
    status?: string;
    search?: string;
    minArea?: number;
    maxRent?: number;
  }): Promise<ApiResponse<Property[]>> {
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
    return api.get<Property[]>(`/properties${queryString}`);
  }

  /**
   * Fetch unique corridors with counts
   */
  static async getCorridors(): Promise<ApiResponse<{ corridor: string; count: number }[]>> {
    return api.get<{ corridor: string; count: number }[]>('/properties/corridors');
  }

  /**
   * Fetch active properties dropdown options GET /api/properties/dd/active
   */
  static async getActivePropertiesDropdown(): Promise<ApiResponse<{
    id: string;
    value: string;
    label: string;
    code: string;
    name: string;
    location: string;
    corridor: string;
    city: string;
    availableAreaSqFt: number;
    rentPerSqFtINR: number;
    status: string;
  }[]>> {
    return api.get('/properties/dd/active');
  }

  /**
   * Fetch unique industries from backend GET /api/properties/industries
   */
  static async getIndustries(): Promise<ApiResponse<string[]>> {
    return api.get<string[]>('/properties/industries');
  }

  /**
   * Fetch single property by ID or Code from backend GET /api/properties/:id
   */
  static async getPropertyById(id: string): Promise<ApiResponse<Property>> {
    return api.get<Property>(`/properties/${id}`);
  }

  /**
   * Create a new property via backend POST /api/properties
   */
  static async createProperty(propertyData: Partial<Property>): Promise<ApiResponse<Property>> {
    return api.post<Property>('/properties', propertyData);
  }

  /**
   * Update an existing property via backend PUT /api/properties/:id
   */
  static async updateProperty(id: string, propertyData: Partial<Property>): Promise<ApiResponse<Property>> {
    return api.put<Property>(`/properties/${id}`, propertyData);
  }

  /**
   * Delete a property via backend DELETE /api/properties/:id
   */
  static async deleteProperty(id: string): Promise<ApiResponse<any>> {
    return api.delete(`/properties/${id}`);
  }
}

export default PropertyService;
