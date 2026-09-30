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

  /**
   * Which warehouses can take a requirement now (space held for this deal counts as usable),
   * with a split suggestion when none fits alone. GET /api/properties/capacity
   */
  static async getCapacity(areaSqFt: number, inquiryId?: string): Promise<ApiResponse<CapacityCheck>> {
    const params = new URLSearchParams({ areaSqFt: String(areaSqFt) });
    if (inquiryId) params.append('inquiryId', inquiryId);
    return api.get<CapacityCheck>(`/properties/capacity?${params.toString()}`);
  }
}

export interface CapacityWarehouse {
  id: string;
  name: string;
  city: string;
  totalAreaSqFt: number;
  freeSqFt: number;
  heldForThisDealSqFt: number;
  usableSqFt: number;
  fits: boolean;
}

export interface CapacityCheck {
  requiredSqFt: number;
  fitsAny: boolean;
  warehouses: CapacityWarehouse[];
  split: { parts: { id: string; name: string; useSqFt: number }[]; coveredSqFt: number; shortfallSqFt: number } | null;
}

export default PropertyService;
