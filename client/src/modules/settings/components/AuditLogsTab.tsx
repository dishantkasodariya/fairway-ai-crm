import React, { useState, useEffect } from 'react';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { AuditLogService } from '@/modules/core/services/auditLogService';
import { AuditLog } from '@/modules/core/types';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { Button } from '@/modules/core/components/ui/Button';

export const AuditLogsTab: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAuditLogs = async (spin = false) => {
    if (spin) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await AuditLogService.getAuditLogs();
      if (res.success && res.data) {
        setAuditLogs(res.data);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setAuditLogs([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-fairway-600" />
              <span>Audit Trail & Security Logs</span>
            </CardTitle>
            <p className="text-xs text-foreground-muted mt-0.5">
              Immutable PostgreSQL audit logs recording user actions and access events.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAuditLogs(true)}
            disabled={isRefreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </CardHeader>

        <div className="overflow-x-auto no-scrollbar touch-pan-x">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted/80 text-[11px] font-bold uppercase text-foreground-muted border-b border-border">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground-muted">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-fairway-600" />
                      <span>Loading audit records from PostgreSQL...</span>
                    </div>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground-muted">
                    No audit logs recorded yet in database.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-foreground-muted whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{log.userName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted border border-border text-foreground">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-foreground-muted">{log.entityType}</td>
                    <td className="p-3 text-foreground-muted text-[11px] max-w-md truncate">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AuditLogsTab;
