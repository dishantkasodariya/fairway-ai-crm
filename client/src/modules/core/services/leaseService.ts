import { Lease, LeaseStatus } from '@/modules/core/types';
import { api, ApiResponse } from './api';

export interface CreateLeasePayload {
  propertyId: string;
  areaSqFt: number;
  startDate: string;
  inquiryId?: string;
  companyId?: string;
  companyName?: string;
  rentPerSqFtINR?: number;
  endDate?: string;
  tenureYears?: number;
  lockInMonths?: number;
  escalationPercent?: number;
  notes?: string;
  /** Records a tenant already counted in the warehouse's "occupied by existing tenants" figure. */
  fromBaseline?: boolean;
}

export type UpdateLeasePayload = Partial<Omit<CreateLeasePayload, 'propertyId' | 'fromBaseline'>> & { status?: LeaseStatus };

/** The backend sends `error` as a plain string; ApiResponse types it as an object. */
export const apiErrorMessage = (res: ApiResponse<any>, fallback: string): string => {
  const e: any = res.error;
  if (typeof e === 'string') return e;
  return e?.message || res.message || fallback;
};

export class LeaseService {
  static async getLeases(filters: { propertyId?: string; companyId?: string; inquiryId?: string; status?: string } = {}): Promise<ApiResponse<Lease[]>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    return api.get<Lease[]>(`/leases${qs}`);
  }

  static async createLease(payload: CreateLeasePayload): Promise<ApiResponse<Lease>> {
    return api.post<Lease>('/leases', payload);
  }

  static async updateLease(id: string, payload: UpdateLeasePayload): Promise<ApiResponse<Lease>> {
    return api.put<Lease>(`/leases/${id}`, payload);
  }

  static async deleteLease(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/leases/${id}`);
  }
}
