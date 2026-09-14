import React from 'react';
import {
  Phone,
  Mail,
  Building2,
  Trash2,
  Edit2,
  ShieldCheck,
} from 'lucide-react';
import { Contact } from '@/modules/core/types';
import { Card } from '@/modules/core/components/ui/Card';
import { Button } from '@/modules/core/components/ui/Button';

export interface ContactsListProps {
  contacts: Contact[];
  columns: Record<string, boolean>;
  onSelectCompany?: (companyId: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string, name: string) => void;
}

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  columns,
  onSelectCompany,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="p-0 border border-border bg-surface shadow-xs rounded-xl overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {columns.contact && <th className="py-3 px-4">Contact</th>}
              {columns.company && <th className="py-3 px-4">Company</th>}
              {columns.department && <th className="py-3 px-4">Department</th>}
              {columns.phone && <th className="py-3 px-4">Phone</th>}
              {columns.email && <th className="py-3 px-4">Email</th>}
              {columns.actions && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-surface-muted/40 transition-colors">
                {columns.contact && (
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.isPrimary && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200"
                              title="Primary Contact"
                            >
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {c.designation || 'Operational Liaison'}
                        </p>
                      </div>
                    </div>
                  </td>
                )}

                {columns.company && (
                  <td className="py-3.5 px-4">
                    {c.companyId ? (
                      <button
                        onClick={() => onSelectCompany && onSelectCompany(c.companyId)}
                        className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[200px]">{c.companyName || 'Enterprise Account'}</span>
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">Unassigned</span>
                    )}
                  </td>
                )}

                {columns.department && (
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-foreground border border-border">
                      {c.department || 'Supply Chain'}
                    </span>
                  </td>
                )}

                {columns.phone && (
                  <td className="py-3.5 px-4">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="text-foreground hover:text-primary font-mono text-xs flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{c.phone}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                )}

                {columns.email && (
                  <td className="py-3.5 px-4">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-foreground hover:text-primary text-xs flex items-center gap-1.5 truncate max-w-[190px]">
                        <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                )}

                {columns.actions && (
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" variant="ghost" onClick={() => onEdit(c)} title="Edit Contact" className="h-7 w-7 p-0">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => onDelete(c.id, c.name)} title="Delete Contact" className="h-7 w-7 p-0 hover:text-destructive">
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

export default ContactsList;
