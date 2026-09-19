import React, { useMemo, useState } from 'react';
import {
  Phone,
  Mail,
  Building2,
  Trash2,
  Edit2,
  User,
} from 'lucide-react';
import { Contact } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { CommonDataGrid } from '@/modules/core/components/ui/CommonDataGrid';
import {
  dataGridFeatures,
  DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from '@tanstack/react-table';

export interface ContactsListProps {
  contacts: Contact[];
  columns: Record<string, boolean>;
  onSelectCompany?: (companyId: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string, name: string) => void;
}

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  columns: visibleColumns,
  onSelectCompany,
  onEdit,
  onDelete,
}) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false },
  ]);

  const columns = useMemo<ColumnDef<DataGridFeatures, Contact>[]>(
    () => [
      {
        id: 'srNo',
        header: 'Sr. No.',
        cell: ({ row }) => (
          <span className="font-medium text-foreground-muted tabular-nums text-xs pl-1">
            {pagination.pageIndex * pagination.pageSize + row.index + 1}
          </span>
        ),
        size: 70,
      },
      {
        accessorKey: 'name',
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-muted border border-border text-foreground font-bold flex items-center justify-center text-xs shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="truncate">{c.name}</span>
                  {c.isPrimary && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-surface-muted text-foreground border border-border shrink-0"
                      title="Primary Contact"
                    >
                      PRIMARY
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-[11px] truncate">
                  {c.designation || 'Operational Liaison'}
                </p>
              </div>
            </div>
          );
        },
        size: 240,
        enableSorting: true,
      },
      {
        accessorKey: 'companyName',
        id: 'company',
        header: 'Company',
        cell: ({ row }) => {
          const c = row.original;
          return c.companyId ? (
            <button
              onClick={() => onSelectCompany && onSelectCompany(c.companyId)}
              className="font-medium text-foreground hover:text-fairway-600 transition-colors flex items-center gap-1.5 text-left cursor-pointer truncate max-w-[220px]"
            >
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{c.companyName || 'Enterprise Account'}</span>
            </button>
          ) : (
            <span className="text-muted-foreground text-xs">Unassigned</span>
          );
        },
        size: 200,
        enableSorting: true,
      },
      {
        accessorKey: 'department',
        id: 'department',
        header: 'Department',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-foreground border border-border">
              {c.department || 'Supply Chain'}
            </span>
          );
        },
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'phone',
        id: 'phone',
        header: 'Phone',
        cell: ({ row }) => {
          const c = row.original;
          return c.phone ? (
            <a href={`tel:${c.phone}`} className="text-foreground hover:text-fairway-600 font-mono text-xs flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
              <span>{c.phone}</span>
            </a>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
        size: 150,
        enableSorting: false,
      },
      {
        accessorKey: 'email',
        id: 'email',
        header: 'Email',
        cell: ({ row }) => {
          const c = row.original;
          return c.email ? (
            <a href={`mailto:${c.email}`} className="text-foreground hover:text-fairway-600 text-xs flex items-center gap-1.5 truncate max-w-[200px]">
              <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate">{c.email}</span>
            </a>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
        size: 200,
        enableSorting: true,
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1.5">
              <Button size="xs" variant="ghost" onClick={() => onEdit(c)} title="Edit Contact" className="h-7 w-7 p-0">
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
              <Button size="xs" variant="ghost" onClick={() => onDelete(c.id, c.name)} title="Delete Contact" className="h-7 w-7 p-0 hover:text-rose-600">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        },
        size: 90,
        enableSorting: false,
      },
    ],
    [onSelectCompany, onEdit, onDelete]
  );

  const columnVisibility = useMemo(() => {
    return {
      contact: visibleColumns.contact ?? true,
      company: visibleColumns.company ?? true,
      department: visibleColumns.department ?? true,
      phone: visibleColumns.phone ?? true,
      email: visibleColumns.email ?? true,
      actions: visibleColumns.actions ?? true,
    };
  }, [visibleColumns]);

  const pagedContacts = useMemo(() => {
    const sorted = [...contacts].sort((a, b) => {
      const activeSort = sorting[0];
      if (!activeSort) return 0;
      const valA = (a as any)[activeSort.id] || '';
      const valB = (b as any)[activeSort.id] || '';
      if (valA < valB) return activeSort.desc ? 1 : -1;
      if (valA > valB) return activeSort.desc ? -1 : 1;
      return 0;
    });
    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [contacts, sorting, pagination.pageIndex, pagination.pageSize]);

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: pagedContacts,
    pageCount: Math.max(1, Math.ceil(contacts.length / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: Contact) => row.id,
    state: {
      pagination,
      sorting,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  return (
    <CommonDataGrid
      table={table}
      recordCount={contacts.length}
      showPagination={true}
      paginationSizes={[10, 20, 50, 100]}
      scrollMaxHeight="max-h-[calc(100vh-280px)]"
      onRowClick={(contact) => onEdit(contact)}
      emptyState={
        <div className="py-16 text-center text-xs text-foreground-muted bg-surface rounded-xl border border-border shadow-xs p-6">
          <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-foreground text-sm">No contacts found</p>
          <p className="mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or register a new contact.
          </p>
        </div>
      }
    />
  );
};

export default ContactsList;
