import { api, ApiResponse } from './api';

export interface FunnelCounts {
  leads: number;
  contacted: number;
  requirementConfirmed: number;
  proposal: number;
  won: number;
  lost: number;
  open: number;
  parked: number;
  /** won / leads, 0..1 */
  winRate: number;
}

export interface AiAttributionReport {
  period: { from: string | null; to: string | null };
  ai: FunnelCounts & {
    sqFtLeased: number;
    monthlyRentINR: number;
    leaseCount: number;
    avgTouchesPerWin: number | null;
    avgDaysToClose: number | null;
    medianDaysToClose: number | null;
    openPipelineSqFt: number;
  };
  otherSources: FunnelCounts;
  leasedByWarehouse: { propertyId: string; propertyName: string; sqFt: number; leases: number }[];
  wins: {
    inquiryId: string;
    inquiryNumber: string;
    companyName: string;
    wonAt: string | null;
    daysToClose: number | null;
    touches: number;
    sqFt: number;
  }[];
}

export class ReportService {
  /** Leads created between from and to (YYYY-MM-DD, IST; both optional). */
  static async getAiAttribution(period: { from?: string; to?: string } = {}): Promise<ApiResponse<AiAttributionReport>> {
    const q = new URLSearchParams();
    if (period.from) q.set('from', period.from);
    if (period.to) q.set('to', period.to);
    const qs = q.toString();
    return api.get<AiAttributionReport>(`/reports/ai-attribution${qs ? `?${qs}` : ''}`);
  }
}
