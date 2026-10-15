import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Link2, Mail, Phone, Search, ChevronRight, ArrowLeft, Building2, Loader2, Layers, Send, CheckSquare, Square } from 'lucide-react';
import { ColumnDef, useTable } from '@tanstack/react-table';
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
import { useToast } from '@/modules/core/providers/ToastContext';
import {
  IntelligenceService,
  CompanyConnections,
  Contact,
  errorText,
} from '@/modules/core/services/intelligenceService';
import { OutreachDraftModal } from '../components/OutreachDraftModal';
import { BulkOutreachModal } from '../components/BulkOutreachModal';
import { CampaignsDrawer } from '../components/CampaignsDrawer';

type Channel = 'linkedin' | 'email';

const PAGE_SIZE = 50;

interface AiConnectionsPageProps {
  onOpenProspect?: (prospectId: number) => void;
}

/**
 * Connections, one row per company ("MRF — 6 connections"). Opening a company lists its
 * people with LinkedIn / email / phone and drafts a cold message for review; nothing is
 * sent automatically.
 */
export const AiConnectionsPage: React.FC<AiConnectionsPageProps> = ({ onOpenProspect }) => {
  const { error: toastError } = useToast();

  const [companies, setCompanies] = useState<CompanyConnections[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [selected, setSelected] = useState<CompanyConnections | null>(null);
  const [people, setPeople] = useState<Contact[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);

  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel>('linkedin');

  // Bulk outreach sequence selection state
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCampaignsDrawerOpen, setIsCampaignsDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(0), [debouncedSearch]);

  useEffect(() => {
    let live = true;
    setIsLoading(true);
    IntelligenceService.listConnectionsByCompany({ search: debouncedSearch || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then(
      (res) => {
        if (!live) return;
        if (res.success && res.data) {
          setCompanies(res.data.items);
          setTotal(res.data.total);
        } else {
          toastError('Failed to load', errorText(res.error, 'Could not load connections.'));
        }
        setIsLoading(false);
      }
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  const openCompany = (c: CompanyConnections) => {
    setSelected(c);
    setPeople([]);
    setIsLoadingPeople(true);
    IntelligenceService.getCompanyContacts(c.companyId).then((res) => {
      if (res.success && res.data) setPeople(res.data.items);
      else toastError('Failed to load', errorText(res.error, 'Could not load this company’s people.'));
      setIsLoadingPeople(false);
    });
  };

  const openDraft = (contact: Contact, channel: Channel) => {
    setActiveContact(contact);
    setActiveChannel(channel);
  };

  const toggleContactSelection = (id: number) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.size === people.length && people.length > 0) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(people.map((p) => p.id)));
    }
  };

  const selectedContactsForOutreach = useMemo(() => {
    const targetPeople = selectedContactIds.size > 0
      ? people.filter((p) => selectedContactIds.has(p.id))
      : people;
    return targetPeople.map((p) => ({
      id: p.id,
      companyId: p.companyId,
      name: p.name,
      email: p.email,
      companyName: selected?.companyName || 'Company',
    }));
  }, [people, selectedContactIds, selected?.companyName]);

  const columns = useMemo<ColumnDef<DataGridFeatures, Contact>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="p-1 text-foreground-muted hover:text-foreground cursor-pointer flex items-center justify-center"
            title="Select / deselect all"
          >
            {people.length > 0 && selectedContactIds.size === people.length ? (
              <CheckSquare className="w-4 h-4 text-fairway-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => toggleContactSelection(row.original.id)}
            className="p-1 text-foreground-muted hover:text-foreground cursor-pointer flex items-center justify-center"
          >
            {selectedContactIds.has(row.original.id) ? (
              <CheckSquare className="w-4 h-4 text-fairway-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        ),
        size: 40,
        enableSorting: false,
      },
      {
        id: 'name',
        accessorKey: 'name',
        meta: { headerTitle: 'Person' },
        header: ({ column }) => <DataGridColumnHeader column={column} title="Person" />,
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-foreground block">{row.original.name}</span>
            <span className="text-[11px] text-foreground-muted">{row.original.title || '—'}</span>
          </div>
        ),
        size: 240,
      },
      {
        id: 'reach',
        header: 'How to reach',
        cell: ({ row }) => (
          <div className="text-[11px] text-foreground-muted space-y-0.5">
            {row.original.email && <span className="block text-foreground">{row.original.email}</span>}
            {row.original.phone && <span className="block">{row.original.phone}</span>}
            {row.original.linkedinUrl && (
              <a href={row.original.linkedinUrl} target="_blank" rel="noreferrer" className="block text-fairway-600 hover:underline truncate max-w-[240px]">
                LinkedIn profile
              </a>
            )}
            {!row.original.email && !row.original.phone && !row.original.linkedinUrl && <span>No contact details yet</span>}
          </div>
        ),
        size: 260,
        enableSorting: false,
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
        header: 'Cold outreach',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openDraft(row.original, 'linkedin')}
              disabled={!row.original.linkedinUrl}
              title="Draft LinkedIn message"
              className="h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" /> LinkedIn
            </button>
            <button
              type="button"
              onClick={() => openDraft(row.original, 'email')}
              disabled={!row.original.email}
              title={row.original.email ? 'Draft email' : 'No email on file'}
              className="h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
          </div>
        ),
        size: 170,
        enableSorting: false,
      },
    ],
    [people, selectedContactIds]
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: people,
    getRowId: (row: Contact) => String(row.id),
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fairway-600" />
            AI Connections
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Key decision-makers at AI-discovered companies. Single reachout or automated bulk sequences with follow-up logic.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCampaignsDrawerOpen(true)}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <Layers className="w-4 h-4 text-fairway-600" />
          <span>Outreach Sequences & Campaigns</span>
        </button>
      </div>

      {selected ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setSelectedContactIds(new Set());
            }}
            className="text-xs font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All companies
          </button>
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-fairway-600" />
                {selected.companyName}
              </h2>
              <p className="text-[11px] text-foreground-muted mt-0.5">
                {selected.businessType || 'Business type unknown'}
                {selected.opportunityScore !== null && ` · score ${selected.opportunityScore}`}
                {selected.estimatedRequirement && ` · needs ${selected.estimatedRequirement}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedContactIds(new Set(people.filter((p) => p.email).map((p) => p.id)));
                  setIsBulkModalOpen(true);
                }}
                disabled={people.filter((p) => p.email).length === 0}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-fairway-600" />
                Bulk Reachout to Company ({people.filter((p) => p.email).length})
              </Button>
              {onOpenProspect && (
                <button
                  type="button"
                  onClick={() => onOpenProspect(selected.companyId)}
                  className="text-xs font-semibold text-fairway-600 hover:underline cursor-pointer"
                >
                  Open prospect →
                </button>
              )}
            </div>
          </Card>

          {/* Selection Action Banner */}
          {selectedContactIds.size > 0 && (
            <div className="flex items-center justify-between p-2.5 px-4 bg-fairway-50/70 dark:bg-fairway-950/40 border border-fairway-200 dark:border-fairway-800 rounded-lg text-xs">
              <div className="flex items-center gap-2 font-semibold text-fairway-900 dark:text-fairway-200">
                <CheckSquare className="w-4 h-4 text-fairway-600" />
                <span>{selectedContactIds.size} {selectedContactIds.size === 1 ? 'contact' : 'contacts'} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedContactIds(new Set())}
                  className="text-foreground-muted hover:text-foreground text-xs cursor-pointer font-medium"
                >
                  Deselect all
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enroll in Bulk Outreach Sequence
                </Button>
              </div>
            </div>
          )}

          <Card className="p-0 border border-border bg-surface shadow-xs rounded-xl overflow-hidden">
            <DataGrid table={table} recordCount={people.length} isLoading={isLoadingPeople} tableLayout={{ columnsResizable: true, headerSticky: true }}>
              <DataGridContainer className="w-full">
                <DataGridScrollArea className="w-full overflow-auto max-h-[calc(100vh-340px)]" orientation="both">
                  <DataGridTable />
                </DataGridScrollArea>
              </DataGridContainer>
            </DataGrid>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search a company or person…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-fairway-600"
            />
          </div>

          <Card className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-fairway-600 animate-spin" />
              </div>
            ) : companies.length === 0 ? (
              <p className="py-12 text-center text-xs text-foreground-muted">
                {debouncedSearch
                  ? 'No company or person matches that search.'
                  : 'No connections yet. Run the intelligence pipeline on an AI Discovery search, or add key people on a prospect.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {companies.map((c) => (
                  <li key={c.companyId}>
                    <button
                      type="button"
                      onClick={() => openCompany(c)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-muted/60 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">
                          {c.companyName}
                          <span className="font-normal text-foreground-muted"> — {c.contactCount} {c.contactCount === 1 ? 'connection' : 'connections'}</span>
                        </p>
                        <p className="text-[11px] text-foreground-muted truncate">
                          {c.businessType || 'Business type unknown'}
                          {c.estimatedRequirement && ` · needs ${c.estimatedRequirement}`}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 text-[11px] text-foreground-muted shrink-0">
                        <span className="flex items-center gap-1" title="With email"><Mail className="w-3 h-3" />{c.withEmail}</span>
                        <span className="flex items-center gap-1" title="With LinkedIn"><Link2 className="w-3 h-3" />{c.withLinkedin}</span>
                        <span className="flex items-center gap-1" title="With phone"><Phone className="w-3 h-3" />{c.withPhone}</span>
                      </div>
                      {c.opportunityScore !== null && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-fairway-600/10 text-fairway-700 dark:text-fairway-300 shrink-0">
                          {c.opportunityScore}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-foreground-muted shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-[11px] text-foreground-muted">
              <span>{total} companies</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded border border-border disabled:opacity-40 cursor-pointer">
                  Previous
                </button>
                <span>Page {page + 1} of {pageCount}</span>
                <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded border border-border disabled:opacity-40 cursor-pointer">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <OutreachDraftModal
        isOpen={activeContact !== null}
        onClose={() => setActiveContact(null)}
        contact={activeContact}
        companyName={selected?.companyName || ''}
        channel={activeChannel}
      />

      <BulkOutreachModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedContacts={selectedContactsForOutreach}
        onEnrolled={() => {
          setSelectedContactIds(new Set());
          setIsCampaignsDrawerOpen(true);
        }}
      />

      <CampaignsDrawer
        isOpen={isCampaignsDrawerOpen}
        onClose={() => setIsCampaignsDrawerOpen(false)}
      />
    </div>
  );
};

export default AiConnectionsPage;
