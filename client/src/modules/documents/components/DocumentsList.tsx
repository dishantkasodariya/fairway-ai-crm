import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Building2,
  Download,
  Trash2,
} from 'lucide-react';
import { DocumentItem } from '@/modules/core/services/documentService';
import { Card } from '@/modules/core/components/ui/Card';
import { Button } from '@/modules/core/components/ui/Button';

export interface DocumentsListProps {
  documents: DocumentItem[];
  columns: Record<string, boolean>;
  onSelectCompany?: (companyId: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const getDocumentFileIcon = (type: string) => {
  switch (type) {
    case 'PDF':
      return <FileText className="w-5 h-5 text-rose-500" />;
    case 'XLSX':
    case 'CSV':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    case 'CAD':
      return <FileCode className="w-5 h-5 text-indigo-500" />;
    default:
      return <FileText className="w-5 h-5 text-primary" />;
  }
};

export const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  columns,
  onSelectCompany,
  onDelete,
}) => {
  return (
    <Card className="bg-surface border border-border shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-surface-muted/60 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {columns.name && <th className="py-3 px-4">Document Name</th>}
              {columns.category && <th className="py-3 px-4">Category</th>}
              {columns.company && <th className="py-3 px-4">Associated Account</th>}
              {columns.inquiry && <th className="py-3 px-4">Inquiry Ref</th>}
              {columns.size && <th className="py-3 px-4">Size</th>}
              {columns.date && <th className="py-3 px-4">Upload Date</th>}
              {columns.actions && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-surface-muted/50 transition-colors group">
                {columns.name && (
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0">
                        {getDocumentFileIcon(doc.fileType)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                          {doc.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono uppercase">{doc.fileType} Format</div>
                      </div>
                    </div>
                  </td>
                )}

                {columns.category && (
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-foreground border border-border">
                      {doc.category}
                    </span>
                  </td>
                )}

                {columns.company && (
                  <td className="py-3.5 px-4">
                    {doc.companyId ? (
                      <button
                        onClick={() => onSelectCompany && onSelectCompany(doc.companyId!)}
                        className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[180px]">{doc.companyName || 'Enterprise'}</span>
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">General</span>
                    )}
                  </td>
                )}

                {columns.inquiry && (
                  <td className="py-3.5 px-4">
                    {doc.inquiryNumber ? (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {doc.inquiryNumber}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                )}

                {columns.size && (
                  <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                    {doc.fileSize || '1.2 MB'}
                  </td>
                )}

                {columns.date && (
                  <td className="py-3.5 px-4 text-xs text-muted-foreground">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                )}

                {columns.actions && (
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" variant="ghost" title="Download Document" className="h-7 w-7 p-0">
                        <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => onDelete(doc.id, doc.name)} title="Delete Document" className="h-7 w-7 p-0 hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
