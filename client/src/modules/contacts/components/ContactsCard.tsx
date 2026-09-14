import React from 'react';
import {
  Phone,
  Mail,
  Building2,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Contact } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';

export interface ContactsCardProps {
  contacts: Contact[];
  onSelectCompany?: (companyId: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string, name: string) => void;
}

export const ContactsCard: React.FC<ContactsCardProps> = ({
  contacts,
  onSelectCompany,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contacts.map((c) => (
        <div
          key={c.id}
          className="bg-surface rounded-card border border-border p-4 shadow-subtle hover:border-fairway-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left"
        >
          <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 font-bold flex items-center justify-center text-sm shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <span>{c.name}</span>
                  {c.isPrimary && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      PRIMARY
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{c.designation || 'Operational Liaison'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button size="xs" variant="ghost" onClick={() => onEdit(c)} className="h-7 w-7 p-0">
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
              <Button size="xs" variant="ghost" onClick={() => onDelete(c.id, c.name)} className="h-7 w-7 p-0 hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 flex-1 text-xs">
            {c.companyName && (
              <div
                onClick={() => c.companyId && onSelectCompany && onSelectCompany(c.companyId)}
                className="font-semibold text-foreground hover:underline cursor-pointer flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{c.companyName}</span>
              </div>
            )}

            <div className="inline-block">
              <span className="bg-surface-muted px-2 py-0.5 rounded border border-border text-[11px] text-muted-foreground">
                {c.department || 'Supply Chain'}
              </span>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-1 text-muted-foreground">
              {c.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <a href={`tel:${c.phone}`} className="hover:text-primary font-mono">{c.phone}</a>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <a href={`mailto:${c.email}`} className="hover:text-primary truncate">{c.email}</a>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
