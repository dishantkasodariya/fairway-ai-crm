import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Link2, Mail, Copy, ExternalLink, Loader2 } from 'lucide-react';
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
import { Button } from '@/modules/core/components/ui/Button';
import { Modal } from '@/modules/core/components/ui/Modal';
import { useToast } from '@/modules/core/providers/ToastContext';
import { IntelligenceService, ContactWithCompany, DraftMessage } from '@/modules/core/services/intelligenceService';

type Channel = 'linkedin' | 'email';

export const AiConnectionsPage: React.FC = () => {
  const { error: toastError, success } = useToast();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeContact, setActiveContact] = useState<ContactWithCompany | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel>('linkedin');
  const [draft, setDraft] = useState<DraftMessage | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);

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

  const openDraft = async (contact: ContactWithCompany, channel: Channel) => {
    setActiveContact(contact);
    setActiveChannel(channel);
    setDraft(null);
    setIsDrafting(true);
    try {
      const res = await IntelligenceService.draftMessage(contact.id);
      if (!res.success || !res.data) {
        toastError('Draft Failed', res.error || 'Could not draft a message for this contact.');
        setActiveContact(null);
        return;
      }
      setDraft(res.data);
    } finally {
      setIsDrafting(false);
    }
  };

  const closeModal = () => {
    setActiveContact(null);
    setDraft(null);
  };

  const activeDraft = draft ? (activeChannel === 'linkedin' ? draft.linkedin : draft.email) : null;

  const handleCopy = () => {
    if (!activeDraft) return;
    const text = activeChannel === 'email' && activeDraft.subject
      ? `Subject: ${activeDraft.subject}\n\n${activeDraft.body}`
      : activeDraft.body;
    navigator.clipboard.writeText(text);
    success('Copied', 'Draft copied to clipboard.');
  };

  const handleOpen = () => {
    if (!activeContact) return;
    if (activeChannel === 'linkedin' && activeContact.linkedinUrl) {
      window.open(activeContact.linkedinUrl, '_blank', 'noopener,noreferrer');
    } else if (activeChannel === 'email' && activeContact.email) {
      const subject = activeDraft?.subject ? `?subject=${encodeURIComponent(activeDraft.subject)}` : '';
      window.location.href = `mailto:${activeContact.email}${subject}`;
    }
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

      <Modal
        isOpen={activeContact !== null}
        onClose={closeModal}
        title={activeContact ? `${activeChannel === 'linkedin' ? 'LinkedIn' : 'Email'} draft for ${activeContact.name}` : ''}
        description={activeContact?.companyName}
        maxWidth="lg"
        footer={
          activeDraft && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} leftIcon={<Copy className="w-3.5 h-3.5" />}>
                Copy
              </Button>
              <Button type="button" size="sm" onClick={handleOpen} leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                {activeChannel === 'linkedin' ? 'Open LinkedIn Profile' : 'Open in Email Client'}
              </Button>
            </>
          )
        }
      >
        {isDrafting ? (
          <div className="py-10 text-center">
            <Loader2 className="w-6 h-6 text-fairway-600 animate-spin mx-auto" />
            <p className="text-xs text-foreground-muted mt-2">Drafting message…</p>
          </div>
        ) : activeDraft ? (
          <div className="space-y-2">
            {activeChannel === 'email' && activeDraft.subject && (
              <p className="text-sm font-semibold text-foreground">Subject: {activeDraft.subject}</p>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap">{activeDraft.body}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AiConnectionsPage;
