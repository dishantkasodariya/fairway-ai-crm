import React, { useMemo, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Building2,
  Download,
  Trash2,
} from 'lucide-react';
import { DocumentItem } from '@/modules/core/services/documentService';
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
      return <FileText className="w-5 h-5 text-fairway-600" />;
  }
};

export const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  columns: visibleColumns,
  onSelectCompany,
  onDelete,
}) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ]);

  const columns = useMemo<ColumnDef<DataGridFeatures, DocumentItem>[]>(
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
        id: 'name',
        header: 'Document Name',
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0">
                {getDocumentFileIcon(doc.fileType)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground hover:text-fairway-600 transition-colors cursor-pointer truncate">
                  {doc.name}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono uppercase">{doc.fileType} Format</div>
              </div>
            </div>
          );
        },
        size: 260,
        enableSorting: true,
      },
      {
        accessorKey: 'category',
        id: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-foreground border border-border">
            {row.original.category}
          </span>
        ),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'companyName',
        id: 'company',
        header: 'Associated Account',
        cell: ({ row }) => {
          const doc = row.original;
          return doc.companyId ? (
            <button
              onClick={() => onSelectCompany && onSelectCompany(doc.companyId!)}
              className="font-medium text-foreground hover:text-fairway-600 transition-colors flex items-center gap-1.5 text-left cursor-pointer truncate max-w-[190px]"
            >
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{doc.companyName || 'Enterprise'}</span>
            </button>
          ) : (
            <span className="text-muted-foreground text-xs">General</span>
          );
        },
        size: 190,
        enableSorting: true,
      },
      {
        accessorKey: 'inquiryNumber',
        id: 'inquiry',
        header: 'Inquiry Ref',
        cell: ({ row }) => {
          const doc = row.original;
          return doc.inquiryNumber ? (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-fairway-500/10 text-fairway-600 border border-fairway-500/20">
              {doc.inquiryNumber}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'fileSize',
        id: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.fileSize || '1.2 MB'}
          </span>
        ),
        size: 100,
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        id: 'date',
        header: 'Upload Date',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        ),
        size: 120,
        enableSorting: true,
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button size="xs" variant="ghost" title="Download Document" className="h-7 w-7 p-0">
                <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
              <Button size="xs" variant="ghost" onClick={() => onDelete(doc.id, doc.name)} title="Delete Document" className="h-7 w-7 p-0 hover:text-rose-600">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        },
        size: 90,
        enableSorting: false,
      },
    ],
    [onSelectCompany, onDelete]
  );

  const columnVisibility = useMemo(() => {
    return {
      name: visibleColumns.name ?? true,
      category: visibleColumns.category ?? true,
      company: visibleColumns.company ?? true,
      inquiry: visibleColumns.inquiry ?? true,
      size: visibleColumns.size ?? true,
      date: visibleColumns.date ?? true,
      actions: visibleColumns.actions ?? true,
    };
  }, [visibleColumns]);

  const pagedDocuments = useMemo(() => {
    const sorted = [...documents].sort((a, b) => {
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
  }, [documents, sorting, pagination.pageIndex, pagination.pageSize]);

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: pagedDocuments,
    pageCount: Math.max(1, Math.ceil(documents.length / (pagination.pageSize || 10))),
    manualPagination: true,
    manualSorting: true,
    getRowId: (row: DocumentItem) => row.id,
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
      recordCount={documents.length}
      showPagination={true}
      paginationSizes={[10, 20, 50, 100]}
      scrollMaxHeight="max-h-[calc(100vh-280px)]"
      emptyState={
        <div className="py-16 text-center text-xs text-foreground-muted bg-surface rounded-xl border border-border shadow-xs p-6">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-foreground text-sm">No documents found</p>
          <p className="mt-1 max-w-sm mx-auto">
            Upload commercial layouts, sanction certificates, or lease agreements.
          </p>
        </div>
      }
    />
  );
};

export default DocumentsList;
