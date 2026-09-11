import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import DocumentService, { DocumentItem } from '@/modules/core/services/documentService';
import CompanyService from '@/modules/core/services/companyService';
import { Company } from '@/modules/core/types';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Card } from '@/modules/core/components/ui/Card';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input } from '@/modules/core/components/ui/Input';

interface DocumentsPageProps {
  onSelectCompany?: (companyId: string) => void;
  onSelectInquiry?: (inquiryId: string) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onSelectCompany, onSelectInquiry }) => {
  const { success, error } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Commercial Proposal',
    fileType: 'PDF',
    fileSize: '1.5 MB',
    companyId: '',
    companyName: '',
    inquiryNumber: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [docRes, compRes] = await Promise.all([
        DocumentService.getDocuments(),
        CompanyService.getCompanies({ pageSize: 100 }),
      ]);

      if (docRes.success && docRes.data) {
        setDocuments(docRes.data);
      }
      if (compRes.success && compRes.data) {
        setCompanies(compRes.data);
      }
    } catch (err: any) {
      error('Failed to load documents', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      d.inquiryNumber?.toLowerCase().includes(search.toLowerCase()) ||
      d.category?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalFiles = documents.length;
  const proposalCount = documents.filter((d) => d.category.includes('Proposal')).length;
  const blueprintCount = documents.filter((d) => d.category.includes('Blueprint') || d.category.includes('Layout')).length;

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete document ${name}?`)) return;
    try {
      const res = await DocumentService.deleteDocument(id);
      if (res.success) {
        success('Document Removed', `Deleted ${name}`);
        loadData();
      } else {
        error('Delete Failed', res.error || 'Failed to delete');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name.trim()) {
      error('Validation Error', 'File title is required');
      return;
    }

    setUploadSubmitting(true);
    try {
      const comp = companies.find((c) => c.id === uploadForm.companyId);
      const res = await DocumentService.createDocument({
        name: uploadForm.name.trim().endsWith('.pdf') || uploadForm.name.trim().endsWith('.xlsx')
          ? uploadForm.name.trim()
          : `${uploadForm.name.trim()}.${uploadForm.fileType.toLowerCase()}`,
        category: uploadForm.category,
        fileType: uploadForm.fileType,
        fileSize: uploadForm.fileSize,
        companyId: uploadForm.companyId || undefined,
        companyName: comp?.name || undefined,
        inquiryNumber: uploadForm.inquiryNumber || undefined,
        url: uploadForm.category === 'Commercial Proposal' ? '/api/v1/follow-ups/fu_1/download-pdf' : '#',
      });

      if (res.success) {
        success('Document Uploaded', 'Stored document metadata in PostgreSQL.');
        setIsUploadOpen(false);
        setUploadForm({
          name: '',
          category: 'Commercial Proposal',
          fileType: 'PDF',
          fileSize: '1.5 MB',
          companyId: '',
          companyName: '',
          inquiryNumber: '',
        });
        loadData();
      } else {
        error('Upload Failed', res.error || 'Failed to register document.');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setUploadSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'XLSX':
      case 'CSV':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'DWG':
      case 'CAD':
        return <FileCode className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-primary" />
            <span>Document & File Repository</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Commercial lease proposals, technical warehouse blueprints, NFPA fire compliance certificates, and client agreements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2 shadow-sm font-medium">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Documents</span>
            <span className="p-2 rounded-lg bg-orange-50 text-primary">
              <FolderOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalFiles}</span>
            <span className="text-xs text-muted-foreground">files indexed</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proposals Generated</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{proposalCount}</span>
            <span className="text-xs text-muted-foreground">PDF dossiers</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engineering Layouts</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <FileCode className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{blueprintCount}</span>
            <span className="text-xs text-muted-foreground">AutoCAD / Layouts</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cloud Storage</span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <HardDrive className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">7.65 MB</span>
            <span className="text-xs text-muted-foreground">PostgreSQL & Blob</span>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filter Controls */}
      <Card className="p-4 bg-white border border-border/80 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents by file name, company, or inquiry number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50/50 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All Document Categories</option>
              <option value="Commercial Proposal">Commercial Proposal</option>
              <option value="Engineering Blueprint">Engineering Blueprint</option>
              <option value="Requirements Matrix">Requirements Matrix</option>
              <option value="Compliance & NFPA">Compliance & NFPA</option>
              <option value="Client NDA & Lease">Client NDA & Lease</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 4. Documents Table */}
      <Card className="bg-white border border-border/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading documents repository...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-muted-foreground flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No documents found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {search || selectedCategory !== 'all'
                ? 'Try clearing your search query or choosing another category.'
                : 'Upload commercial proposals, site layouts, and lease contracts.'}
            </p>
            <Button size="sm" onClick={() => setIsUploadOpen(true)} className="mt-2 gap-1.5">
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Associated Entity</th>
                  <th className="py-3 px-4">File Specs</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Date Added</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                          {getFileIcon(doc.fileType)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                            {doc.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {doc.inquiryNumber ? `Ref: ${doc.inquiryNumber}` : 'General File'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {doc.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {doc.companyName ? (
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{doc.companyName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Direct Fairway Asset</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-foreground">{doc.fileSize}</div>
                      <div className="text-[11px] text-muted-foreground uppercase">{doc.fileType} Format</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-foreground">{doc.uploadedByName || 'Pooja Hegde'}</div>
                      <div className="text-[11px] text-muted-foreground">Leasing Desk</div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                        <a
                          href={doc.url && doc.url !== '#' ? doc.url : '/api/v1/follow-ups/fu_1/download-pdf'}
                          download={doc.name}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-muted-foreground hover:text-primary transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id, doc.name)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Industrial Document"
        description="Register and index proposals, blueprint drawings, and requirement sheets."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Document Title *
            </label>
            <Input
              placeholder="e.g. Fairway_Proposal_INQ-1048_Dahej_PCPIR"
              value={uploadForm.name}
              onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Document Category
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Commercial Proposal">Commercial Proposal</option>
                <option value="Engineering Blueprint">Engineering Blueprint</option>
                <option value="Requirements Matrix">Requirements Matrix</option>
                <option value="Compliance & NFPA">Compliance & NFPA</option>
                <option value="Client NDA & Lease">Client NDA & Lease</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                File Type
              </label>
              <select
                value={uploadForm.fileType}
                onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="PDF">PDF Document</option>
                <option value="XLSX">Excel Spreadsheet (.xlsx)</option>
                <option value="CSV">CSV Data File</option>
                <option value="CAD">AutoCAD / Drawing (.dwg)</option>
                <option value="DOCX">Word Agreement (.docx)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Associated Company
              </label>
              <select
                value={uploadForm.companyId}
                onChange={(e) => setUploadForm({ ...uploadForm, companyId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">None / General Template</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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

          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-sm font-semibold text-foreground">Click to select files or drag & drop</div>
            <div className="text-xs text-muted-foreground mt-1">PDF, XLSX, CSV, CAD up to 50MB</div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadSubmitting} className="gap-2">
              {uploadSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>Register Document</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
