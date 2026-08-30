import { ImportResult } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export interface ColumnMapping {
  companyName?: string;
  siteName?: string;
  city?: string;
  industry?: string;
  requiredAreaSqFt?: string;
  inquiryDate?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  enteredBy?: string;
  salespersonName?: string;
  comments?: string;
  requirement?: string;
  remark1CurrentStatus?: string;
  remark2NextAction?: string;
  remark3FollowUpPlan?: string;
  [key: string]: string | undefined;
}

export class ImportService {
  /**
   * Send parsed spreadsheet rows and column mappings to backend API
   */
  static async importInquiries(
    rows: Array<Record<string, any>>,
    columnMapping: ColumnMapping
  ): Promise<{
    success: boolean;
    data?: {
      totalProcessed: number;
      importedCount: number;
      skippedCount: number;
      errors: Array<{ row: number; error: string }>;
      importedInquiries: any[];
    };
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/import/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, columnMapping }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ImportService.importInquiries failed:', err);
      return { success: false, error: err.message || 'Import request failed' };
    }
  }
}

export default ImportService;
