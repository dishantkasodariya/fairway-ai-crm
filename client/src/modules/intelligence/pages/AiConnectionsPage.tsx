import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Link2, Mail } from 'lucide-react';
import {
  ColumnDef,
  useTable,
} from '@tanstack/react-table';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { Card } from '@/modules/core/components/ui/Card';
import { useToast } from '@/modules/core/providers/ToastContext';
import { IntelligenceService, ContactWithCompany } from '@/modules/core/services/intelligenceService';
import { OutreachDraftModal } from '../components/OutreachDraftModal';

type Channel = 'linkedin' | 'email';

export const AiConnectionsPage: React.FC = () => {
  const { error: toastError } = useToast();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeContact, setActiveContact] = useState<ContactWithCompany | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel>('linkedin');

  const loadContacts = () => {
    setIsLoading(true);
    IntelligenceService.listAllContacts().then((res) => {
      if (res.success && res.data) setContacts(res.data.items);
      else if (!res.success) toastError('Failed to Load', res.error || 'Could not load contacts.');
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDraft = (contact: ContactWithCompany, channel: Channel) => {
    setActiveContact(contact);
    setActiveChannel(channel);
  };

  const columns = useMemo<ColumnDef<DataGridFeatures, ContactWithCompany>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        meta: { headerTitle: 'Contact' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contact" />,
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-foreground block">{row.original.name}</span>
            <span className="text-[11px] text-foreground-muted">{row.original.title || '—'}</span>
          </div>
        ),
        size: 200,
      },
      {
        id: 'companyName',
        accessorKey: 'companyName',
        meta: { headerTitle: 'Company' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Company" />,
        cell: ({ row }) => (
          <div>
            <span className="text-xs text-foreground block truncate max-w-[220px]">{row.original.companyName}</span>
            <span className="text-[11px] text-foreground-muted">{row.original.businessType || '—'}</span>
          </div>
        ),
        size: 220,
      },
      {
        id: 'source',
        accessorKey: 'source',
        meta: { headerTitle: 'Source' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Source" />,
        cell: ({ row }) => <span className="text-xs text-foreground-muted capitalize">{row.original.source}</span>,
        size: 100,
      },
      {
        id: 'actions',
        header: 'Outreach',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openDraft(row.original, 'linkedin')}
              disabled={!row.original.linkedinUrl}
              title="Draft LinkedIn message"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => openDraft(row.original, 'email')}
              disabled={!row.original.email}
              title="Draft email"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Mail className="w-4 h-4" />
            </button>
          </div>
        ),
        size: 110,
        enableSorting: false,
      },
    ],
    []
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: contacts,
    getRowId: (row: ContactWithCompany) => String(row.id),
  });

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fairway-600" />
          AI Connections
        </h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Contacts enriched via Apollo across every AI-discovered company. Drafts are generated for review only — nothing sends automatically.
        </p>
      </div>

      <Card className="p-0 border border-border bg-surface shadow-xs rounded-xl overflow-hidden">
        <DataGrid table={table} recordCount={contacts.length} isLoading={isLoading} tableLayout={{ columnsResizable: true, headerSticky: true }}>
          <DataGridContainer className="w-full">
            <DataGridScrollArea className="w-full overflow-auto max-h-[calc(100vh-260px)]" orientation="both">
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
        </DataGrid>
      </Card>

      {contacts.length === 0 && !isLoading && (
        <div className="py-10 text-center">
          <p className="text-xs text-foreground-muted">
            No contacts yet — enrich a company from its AI Discovery detail page first.
          </p>
        </div>
      )}

      <OutreachDraftModal
        isOpen={activeContact !== null}
        onClose={() => setActiveContact(null)}
        contact={activeContact}
        companyName={activeContact?.companyName || ''}
        channel={activeChannel}
      />
    </div>
  );
};

export default AiConnectionsPage;
