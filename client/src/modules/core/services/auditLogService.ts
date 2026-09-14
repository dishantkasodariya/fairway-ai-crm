import { AuditLog } from '@/modules/core/types';
import { api } from './api';

export class AuditLogService {
  /**
   * Fetch audit logs from backend PostgreSQL
   */
  static async getAuditLogs(): Promise<{
    success: boolean;
    data?: AuditLog[];
    error?: string;
  }> {
    try {
      const res = await api.get<any[]>('/audit-logs');
      if (res.success && res.data) {
        const mapped: AuditLog[] = res.data.map((r) => ({
          id: r.id,
          timestamp: r.createdAt || r.timestamp || new Date().toISOString(),
          userId: r.userId || '',
          userName: r.userName || 'System',
          userRole: r.userRole || 'admin',
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId || '',
          details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details || ''),
          ipAddress: r.ipAddress,
        }));
        return { success: true, data: mapped };
      }
      return { success: false, error: res.error?.message || 'Failed to fetch audit logs' };
    } catch (err: any) {
      console.warn('AuditLogService.getAuditLogs failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export default AuditLogService;
