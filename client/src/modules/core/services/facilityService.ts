import { Facility } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export class FacilityService {
  /**
   * Fetch facilities for a company
   */
  static async getFacilities(companyId?: string): Promise<{
    success: boolean;
    data: Facility[];
    error?: string;
  }> {
    try {
      const q = companyId ? `?companyId=${companyId}` : '';
      const res = await fetch(`${API_BASE_URL}/facilities${q}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('FacilityService.getFacilities failed:', err);
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Create a facility
   */
  static async createFacility(payload: {
    companyId: string;
    companyName?: string;
    name: string;
    type?: Facility['type'];
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    status?: Facility['status'];
    builtUpAreaSqFt?: number;
  }): Promise<{ success: boolean; data?: Facility; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/facilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('FacilityService.createFacility failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a facility
   */
  static async deleteFacility(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/facilities/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('FacilityService.deleteFacility failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export default FacilityService;
