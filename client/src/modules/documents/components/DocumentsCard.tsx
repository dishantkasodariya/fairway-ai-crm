import React from 'react';
import {
  Building2,
  Download,
  Trash2,
} from 'lucide-react';
import { DocumentItem } from '@/modules/core/services/documentService';
import { Button } from '@/modules/core/components/ui/Button';
import { getDocumentFileIcon } from './DocumentsList';

export interface DocumentsCardProps {
  documents: DocumentItem[];
  onSelectCompany?: (companyId: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const DocumentsCard: React.FC<DocumentsCardProps> = ({
  documents,
  onSelectCompany,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-surface rounded-card border border-border p-4 shadow-subtle hover:border-fairway-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left"
        >
          <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0">
                {getDocumentFileIcon(doc.fileType)}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{doc.name}</h3>
                <span className="text-[11px] text-muted-foreground font-mono uppercase">
                  {doc.fileType} • {doc.fileSize || '1.2 MB'}
                </span>
              </div>
            </div>

            <Button
              size="xs"
              variant="ghost"
              onClick={() => onDelete(doc.id, doc.name)}
              className="h-7 w-7 p-0 hover:text-destructive shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-1.5 text-xs flex-1">
            <div>
              <span className="bg-surface-muted px-2 py-0.5 rounded border border-border text-[11px] text-muted-foreground">
                {doc.category}
              </span>
            </div>

            {doc.companyName && (
              <div
                onClick={() => doc.companyId && onSelectCompany && onSelectCompany(doc.companyId)}
                className="font-medium text-foreground hover:underline cursor-pointer flex items-center gap-1.5 pt-1"
              >
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="break-words sm:truncate">{doc.companyName}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-muted-foreground">
              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}
            </span>
            <Button size="xs" variant="outline" leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
