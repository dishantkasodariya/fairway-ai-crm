import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { AuditLog } from '@/modules/core/types';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';

export const AuditLogsTab: React.FC = () => {
  const [auditLogs] = useState<AuditLog[]>(StorageService.getAuditLogs());

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-fairway-600" />
              <span>Audit Trail & Security Logs</span>
            </CardTitle>
            <p className="text-xs text-foreground-muted mt-0.5">
              Immutable system audit logs recording user actions and access events.
            </p>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
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
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground-muted">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-foreground-muted">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{log.userName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted border border-border text-foreground">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-foreground-muted">{log.entityType}</td>
                    <td className="p-3 text-foreground-muted text-[11px]">{log.details}</td>
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
