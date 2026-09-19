import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  UploadCloud,
  Download,
  Trash2,
  Building2,
  FileSpreadsheet,
  FileCode,
  FolderOpen,
  Filter,
  Plus,
  Loader2,
  HardDrive,
  FileCheck,
  Calendar,
  Eye,
  RefreshCw,
  List,
  LayoutGrid,
  X,
  Settings,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/modules/core/components/ui/tooltip';
import DocumentService, { DocumentItem } from '@/modules/core/services/documentService';
import CompanyService from '@/modules/core/services/companyService';
import { Company } from '@/modules/core/types';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Card } from '@/modules/core/components/ui/Card';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input } from '@/modules/core/components/ui/Input';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { cn } from '@/modules/core/lib/utils';
import { DocumentsList } from '../components/DocumentsList';
import { DocumentsCard } from '../components/DocumentsCard';

interface DocumentsPageProps {
  onSelectCompany?: (companyId: string) => void;
  onSelectInquiry?: (inquiryId: string) => void;
}

const CATEGORY_OPTIONS: ComboboxOption[] = [
  { value: 'all', label: 'All Document Categories' },
  { value: 'Commercial Proposal', label: 'Commercial Proposal' },
  { value: 'Engineering Blueprint', label: 'Engineering Blueprint' },
  { value: 'Requirements Matrix', label: 'Requirements Matrix' },
  { value: 'Compliance & NFPA', label: 'Compliance & NFPA' },
  { value: 'Client NDA & Lease', label: 'Client NDA & Lease' },
];

const FILE_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'PDF', label: 'PDF Document (.pdf)' },
  { value: 'XLSX', label: 'Excel Spreadsheet (.xlsx)' },
  { value: 'CSV', label: 'CSV Data File (.csv)' },
  { value: 'CAD', label: 'AutoCAD / Drawing (.dwg)' },
  { value: 'DOCX', label: 'Word Agreement (.docx)' },
];

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onSelectCompany, onSelectInquiry }) => {
  const { success, error } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');

  // Filter Drawer Drafts
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState('all');
  const [draftCompanyId, setDraftCompanyId] = useState('all');

  // Column Visibility Config
  const [columns, setColumns] = useState<Record<string, boolean>>({
    name: true,
    category: true,
    company: true,
    inquiry: true,
    size: true,
    date: true,
    actions: true,
  });

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Commercial Proposal',
    fileType: 'PDF',
    companyId: '',
    inquiryNumber: '',
  });
  const [uploading, setUploading] = useState(false);

  const loadData = async (isSpin = false) => {
    if (isSpin) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [docsRes, companiesRes] = await Promise.all([
        DocumentService.getDocuments(),
        CompanyService.getCompanies(),
      ]);

      if (docsRes.success && docsRes.data) {
        setDocuments(docsRes.data);
      }
      if (companiesRes.success && companiesRes.data) {
        setCompanies(companiesRes.data);
      }
    } catch (err: any) {
      error('Failed to load documents', err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openFilterDrawer = () => {
    setDraftCategory(selectedCategory);
    setDraftCompanyId(selectedCompanyId);
    setIsFilterDrawerOpen(true);
  };

  const applyFilters = () => {
    setSelectedCategory(draftCategory);
    setSelectedCompanyId(draftCompanyId);
    setIsFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setDraftCategory('all');
    setDraftCompanyId('all');
    setSelectedCategory('all');
    setSelectedCompanyId('all');
    setSearch('');
    setIsFilterDrawerOpen(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedCompanyId !== 'all') count++;
    return count;
  }, [selectedCategory, selectedCompanyId]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        (doc.companyName && doc.companyName.toLowerCase().includes(q)) ||
        (doc.inquiryNumber && doc.inquiryNumber.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesCompany = selectedCompanyId === 'all' || doc.companyId === selectedCompanyId;

      return matchesSearch && matchesCat && matchesCompany;
    });
  }, [documents, search, selectedCategory, selectedCompanyId]);

  // Metric aggregates
  const totalFiles = documents.length;
  const proposalFiles = documents.filter((d) => d.category === 'Commercial Proposal').length;
  const blueprintFiles = documents.filter((d) => d.category === 'Engineering Blueprint').length;
  const complianceFiles = documents.filter((d) => d.category === 'Compliance & NFPA').length;

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name.trim()) {
      error('Validation Error', 'Document file name is required');
      return;
    }

    setUploading(true);
    try {
      const selectedComp = companies.find((c) => c.id === uploadForm.companyId);

      const res = await DocumentService.createDocument({
        name: uploadForm.name,
        category: uploadForm.category as any,
        fileType: uploadForm.fileType as any,
        fileSize: '1.4 MB',
        companyId: uploadForm.companyId || undefined,
        companyName: selectedComp?.name || undefined,
        inquiryNumber: uploadForm.inquiryNumber.trim() || undefined,
        url: '#',
      });

      if (res.success && res.data) {
        setDocuments((prev) => [res.data!, ...prev]);
        success('Document Saved', `${uploadForm.name} added to repository.`);
        setIsUploadOpen(false);
        setUploadForm({
          name: '',
          category: 'Commercial Proposal',
          fileType: 'PDF',
          companyId: '',
          inquiryNumber: '',
        });
      } else {
        error('Upload Failed', res.error || 'Could not save document');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    try {
      const res = await DocumentService.deleteDocument(id);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        success('Document Removed', `${name} deleted.`);
      } else {
        error('Delete Failed', res.error || 'Could not delete');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const getFileIcon = (type: string) => {
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

  const companyOptions: ComboboxOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Companies' },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [companies]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">CRM / Documents</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-0.5">
            <FolderOpen className="w-6 h-6 text-primary" />
            <span>Industrial Document Repository</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Commercial lease proposals, architectural site plans, NFPA fire compliance, and client NDA documentation.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={() => setIsUploadOpen(true)} size="sm" className="gap-1.5 shadow-sm font-semibold w-full sm:w-auto justify-center">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* 2. Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Documents</span>
            <span className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-primary">
              <HardDrive className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalFiles}</span>
            <span className="text-xs text-muted-foreground">files</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proposals Delivered</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{proposalFiles}</span>
            <span className="text-xs text-muted-foreground">commercial terms</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Site & CAD Blueprints</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <FileCode className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{blueprintFiles}</span>
            <span className="text-xs text-muted-foreground">drawings</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Compliance & NFPA</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{complianceFiles}</span>
            <span className="text-xs text-muted-foreground">certificates</span>
          </div>
        </Card>
      </div>

      {/* 3. Sleek Search & Control Toolbar matching reference */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left: Search Bar */}
        <div className="relative flex-1 w-full max-w-full sm:max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by file name, company, or inquiry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-foreground-muted hover:text-foreground p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Controls & View Switcher */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Filter Drawer Trigger Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openFilterDrawer}
                  className={cn(
                    "relative size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs",
                    activeFiltersCount > 0 && "text-fairway-600 border-fairway-400 bg-fairway-50 dark:bg-fairway-950/40"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-fairway-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Filter
              </TooltipContent>
            </Tooltip>

            {/* Column Settings Dropdown (Desktop Only) */}
            <div className="hidden sm:block">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="size-9 rounded-button border border-border bg-white dark:bg-[#171717] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Column
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48 bg-surface dark:bg-[#161c24] border border-border dark:border-white/[0.12] shadow-none ring-0 outline-none p-1 rounded-card z-50">
                  <DropdownMenuLabel className="text-xs font-bold text-foreground px-2 py-1.5">
                    Toggle Columns
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={columns.name}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, name: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Document Name
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.category}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, category: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Category
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.company}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, company: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Associated Account
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.inquiry}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, inquiry: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Inquiry Reference
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.size}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, size: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    File Size
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.date}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, date: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Upload Date
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.actions}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, actions: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Actions
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  disabled={isRefreshing || loading}
                  className="size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 transition-transform duration-700",
                      (isRefreshing || loading) && "animate-spin text-fairway-600"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Refresh
              </TooltipContent>
            </Tooltip>

            {/* Segmented View Switcher (Desktop Only) */}
            <div className="hidden sm:flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'table'
                        ? "bg-fairway-600 text-white font-bold"
                        : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  List
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'grid'
                        ? "bg-fairway-600 text-white font-bold"
                        : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Card
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* 4. Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-surface border border-border rounded-card">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading documents...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-surface border border-border rounded-card p-6 shadow-subtle">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-muted-foreground flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No documents found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {search || activeFiltersCount > 0
              ? 'Try adjusting your search criteria or reset active filters.'
              : 'Upload your first commercial proposal or engineering drawing.'}
          </p>
          {(search || activeFiltersCount > 0) && (
            <Button size="sm" variant="outline" onClick={resetFilters} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile view: ONLY Card View show, NOT list page show */}
          <div className="block sm:hidden">
            <DocumentsCard
              documents={filteredDocs}
              onSelectCompany={onSelectCompany}
              onDelete={handleDelete}
            />
          </div>

          {/* Desktop view: Respects user viewMode (List vs Card) */}
          <div className="hidden sm:block">
            {viewMode === 'table' ? (
              <DocumentsList
                documents={filteredDocs}
                columns={columns}
                onSelectCompany={onSelectCompany}
                onDelete={handleDelete}
              />
            ) : (
              <DocumentsCard
                documents={filteredDocs}
                onSelectCompany={onSelectCompany}
                onDelete={handleDelete}
              />
            )}
          </div>
        </>
      )}

      {/* Advanced Filters Drawer (Right Slide-out) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in select-none overflow-hidden m-0 p-0">
          <div
            className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="relative w-full max-w-full sm:max-w-sm bg-surface border-l border-border h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none text-left">
            <div className="p-5 border-b border-border bg-surface flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-fairway-600" />
                  <span>Document Filters</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Filter files by category and company
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Category</label>
                <Combobox
                  options={CATEGORY_OPTIONS}
                  value={draftCategory}
                  onChange={setDraftCategory}
                  placeholder="Select category..."
                  searchPlaceholder="Search category..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Connected Company</label>
                <Combobox
                  options={companyOptions}
                  value={draftCompanyId}
                  onChange={setDraftCompanyId}
                  placeholder="Select company..."
                  searchPlaceholder="Search company..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-2.5 px-4 rounded-button border text-xs font-bold transition-all text-center bg-surface hover:bg-surface-muted border-border text-foreground cursor-pointer shadow-2xs"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 py-2.5 px-4 rounded-button bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold transition-all text-center shadow-xs cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal with Combobox */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Industrial Document"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Document / File Name *
            </label>
            <Input
              placeholder="e.g. Fairway_Proposal_INQ-1048_Dahej_PCPIR"
              value={uploadForm.name}
              onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Document Category
              </label>
              <Combobox
                options={CATEGORY_OPTIONS.filter((c) => c.value !== 'all')}
                value={uploadForm.category}
                onChange={(val) => setUploadForm({ ...uploadForm, category: val })}
                placeholder="Select category..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                File Type
              </label>
              <Combobox
                options={FILE_TYPE_OPTIONS}
                value={uploadForm.fileType}
                onChange={(val) => setUploadForm({ ...uploadForm, fileType: val })}
                placeholder="Select file type..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Associated Company
              </label>
              <Combobox
                options={[
                  { value: '', label: 'None / General Template' },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={uploadForm.companyId}
                onChange={(val) => setUploadForm({ ...uploadForm, companyId: val })}
                placeholder="Select company..."
                searchPlaceholder="Search company..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Inquiry Ref Number
              </label>
              <Input
                placeholder="e.g. INQ-1048"
                value={uploadForm.inquiryNumber}
                onChange={(e) => setUploadForm({ ...uploadForm, inquiryNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 border-2 border-dashed border-border rounded-xl text-center space-y-2 bg-surface-muted/30">
            <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="text-xs font-medium text-foreground">Click to browse or drop document here</div>
            <p className="text-[11px] text-muted-foreground">Supports PDF, XLSX, CSV, DWG, DOCX up to 50MB</p>
          </div>

          <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border w-full">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsUploadOpen(false)} className="w-full xs:w-auto">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={uploading} className="w-full xs:w-auto">
              {uploading ? 'Saving...' : 'Upload & Publish'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
