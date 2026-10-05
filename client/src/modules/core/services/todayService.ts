import { api, ApiResponse } from './api';

export type TodayItemType = 'follow_up' | 'new_lead' | 'stuck_deal' | 'hold' | 'prospect' | 'renewal';

export interface TodayItem {
  type: TodayItemType;
  key: string;
  title: string;
  detail: string;
  ownerId: string | null;
  ownerName: string;
  ownerIsSuggested: boolean;
  dueDate?: string | null;
  daysOverdue?: number;
  score?: number | null;
  inquiryId?: string;
  inquiryNumber?: string;
  companyName?: string;
  prospectId?: number;
  propertyId?: string;
  taskId?: string;
}

export interface TodaySection {
  type: TodayItemType;
  items: TodayItem[];
  total: number;
}

export interface TodayList {
  today: string;
  sections: TodaySection[];
  rules: {
    STUCK_AFTER_DAYS: number;
    HOLD_WARN_AFTER_DAYS: number;
    HOLD_RELEASE_AFTER_DAYS: number;
    PROSPECT_MIN_SCORE: number;
    RENEWAL_WINDOW_MONTHS: number;
    TOP_N: number;
  };
}

export class TodayService {
  static async getToday(): Promise<ApiResponse<TodayList>> {
    return api.get<TodayList>('/today');
  }
}
