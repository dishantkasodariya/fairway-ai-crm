import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  AlertCircle,
  FileText,
  Building2,
  RefreshCw,
  FileCheck,
  X,
  Database,
  ArrowLeft,
  Layers,
  Check,
  HelpCircle,
  Filter,
} from 'lucide-react';
import { normalizeCompanyName } from '@/modules/core/utils/formatters';
import { ImportService } from '@/modules/core/services/importService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { CompanyService } from '@/modules/core/services/companyService';
import { ImportResult, Inquiry, Company } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/modules/core/components/ui/Select';
import { useToast } from '@/modules/core/providers/ToastContext';
import { cn } from '@/modules/core/lib/utils';

export interface ImportWizardViewProps {
  onNavigateToInquiries: () => void;
  onNavigateToCompanies: () => void;
  onBack?: () => void;
}

const SAMPLE_CSV_DATA = `Site Name,Area Required (sq. ft.),Date,Company,Contact Person,Contact Number,Entered By,Comments,Remark 1 – Current Status,Remark 2 – Next Action,Remark 3 – Follow-up Plan
Union Dahej,217,800 sq. ft.,2026-06-16,Indiano Green Strategic Materials,Deepak Pednekar,+91 77448 13146,Prapti Shah,They need shed for manufacturing,Requirement Confirmed,Close this inquiry for present & retain company,No immediate follow-up. Review in 90 days.
LPS kosamba,45000,2026-03-26,Blue Dart Logistics,Amit Sharma,+91 98250 11223,Prapti Shah,Exploratory logistics distribution unit,Contacted,Follow up for requirement area specifications,Re-check after 14 days
LPS kosamba,85000,2026-03-26,Mahindra Logistics,Sunil Verma,+91 99099 44332,Prapti Shah,Mother hub requirement discussion,Requirement Confirmed,Schedule technical briefing with regional manager,Follow up on Friday
LPS kosamba,60000,2026-02-23,Tatva Chintan Pharma Chem Limited,Rakesh Poonia,+91 98791 83452,Prapti Shah,At present no requirement,Contacted,Keep lead dormant; retain on reactivation list,Re-check in 30 days
Surat Logistics Park,120000,2026-04-10,Adani Wilmar Ltd,Rajesh Shah,+91 98240 88221,Prapti Shah,Mother DC for edible oil distribution,Property Matched,Arrange joint site visit at Surat Logistics Park,2026-09-02`;

/**
 * Format string, number or Excel serial date code into readable YYYY-MM-DD
 */
const formatExcelDate = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d && d.y) {
        return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
      }
    } catch {}
  }
  const str = String(val).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
};

/**
 * Parse numeric area string cleanly
 */
const parseAreaNumber = (val: any): number => {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const ImportWizardView: React.FC<ImportWizardViewProps> = ({
  onNavigateToInquiries,
  onNavigateToCompanies,
  onBack,
}) => {
  const { success, error } = useToast();
  const [step, setStep] = useState<number>(1);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [rawWorkbook, setRawWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'skipped'>('all');

  // Column Mapping State supporting exact enquiries.xlsx fields
  const [columnMapping, setColumnMapping] = useState({
    companyName: 'Company',
    siteName: 'Site Name',
    requiredAreaSqFt: 'Area Required (sq. ft.)',
    inquiryDate: 'Date',
    contactName: 'Contact Person',
    phone: 'Contact Number',
    enteredBy: 'Entered By',
    comments: 'Comments',
    remark1CurrentStatus: 'Remark 1 – Current Status',
    remark2NextAction: 'Remark 2 – Next Action',
    remark3FollowUpPlan: 'Remark 3 – Follow-up Plan',
  });

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [existingInquiries, setExistingInquiries] = useState<Inquiry[]>([]);
  const [existingCompanies, setExistingCompanies] = useState<Company[]>([]);

  useEffect(() => {
    InquiryService.getInquiries({ pageSize: 1000 }).then((res) => {
      if (res.success && res.data) setExistingInquiries(res.data);
    });
    CompanyService.getCompanies({ pageSize: 1000 }).then((res) => {
      if (res.success && res.data) setExistingCompanies(res.data);
    });
  }, []);

  // Smart Auto-map column helper
  const autoMapColumns = (head: string[]) => {
    const newMapping = { ...columnMapping };
    head.forEach((h) => {
      const lower = h.toLowerCase().trim();
      if (lower === 'company' || lower.includes('company name') || lower.includes('client') || lower.includes('party name')) {
        newMapping.companyName = h;
      } else if (lower.includes('site') || lower.includes('location') || lower.includes('city') || lower.includes('hub') || lower.includes('corridor')) {
        newMapping.siteName = h;
      } else if (lower.includes('area') || lower.includes('sq. ft') || lower.includes('sqft') || lower.includes('size') || lower.includes('built up')) {
        newMapping.requiredAreaSqFt = h;
      } else if (lower.includes('date') && !newMapping.inquiryDate) {
        newMapping.inquiryDate = h;
      } else if (lower.includes('contact person') || lower.includes('decision maker') || lower.includes('contact name') || lower.includes('person')) {
        newMapping.contactName = h;
      } else if (lower.includes('contact number') || lower.includes('phone') || lower.includes('mobile') || lower.includes('contact no')) {
        newMapping.phone = h;
      } else if (lower.includes('entered by') || lower.includes('salesperson') || lower.includes('owner') || lower.includes('executive')) {
        newMapping.enteredBy = h;
      } else if (lower.includes('comment') || lower.includes('requirement') || lower.includes('desc') || lower.includes('spec') || lower.includes('remarks')) {
        newMapping.comments = h;
      } else if (lower.includes('remark 1') || lower.includes('current status') || lower.includes('stage')) {
        newMapping.remark1CurrentStatus = h;
      } else if (lower.includes('remark 2') || lower.includes('next action') || lower.includes('action')) {
        newMapping.remark2NextAction = h;
      } else if (lower.includes('remark 3') || lower.includes('follow-up') || lower.includes('follow up') || lower.includes('plan')) {
        newMapping.remark3FollowUpPlan = h;
      }
    });
    setColumnMapping(newMapping);
  };

  // Load a specific sheet from the active workbook
  const loadWorksheetData = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    if (!jsonData || jsonData.length === 0) {
      error('Empty Sheet', `The worksheet "${sheetName}" contains no data rows.`);
      return;
    }

    const head = Object.keys(jsonData[0] || {}).map((h) => h.trim());
    setHeaders(head);
    setParsedRows(jsonData);
    autoMapColumns(head);
    setSelectedSheet(sheetName);
  };

  // Process uploaded Excel / CSV file
  const processFile = async (file: File) => {
    if (!file) return;
    const sizeKB = (file.size / 1024).toFixed(1);
    setUploadedFileName(file.name);
    setUploadedFileSize(`${sizeKB} KB`);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', raw: false });
      setRawWorkbook(workbook);
      setSheetNames(workbook.SheetNames);

      const targetSheet = workbook.SheetNames.includes('Enquiries')
        ? 'Enquiries'
        : workbook.SheetNames[0];

      loadWorksheetData(workbook, targetSheet);
      setStep(2);
      success('File Loaded Successfully', `${file.name} (${sizeKB} KB) parsed with ${workbook.SheetNames.length} sheet(s).`);
    } catch (err: any) {
      console.error('Failed to parse spreadsheet file', err);
      error('Parsing Error', 'Failed to parse Excel/CSV file. Please ensure it is a valid spreadsheet.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Drag and Drop event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  }, []);

  const handleLoadSample = () => {
    setUploadedFileName('fairway_sample_inquiries.csv');
    setUploadedFileSize('1.2 KB');

    const workbook = XLSX.read(SAMPLE_CSV_DATA, { type: 'string' });
    setRawWorkbook(workbook);
    setSheetNames(workbook.SheetNames);
    loadWorksheetData(workbook, workbook.SheetNames[0]);
    setStep(2);
    success('Demo Data Loaded', 'Loaded 5 sample Gujarat industrial warehouse inquiries.');
  };

  // Proactive Diagnostic Validation Calculation for Step 3 Preview
  const validationAnalysis = useMemo(() => {
    if (!parsedRows || parsedRows.length === 0) {
      return {
        rowStatuses: [] as Array<{
          isMissingCompany: boolean;
          isDuplicate: boolean;
          duplicateReason: string;
          isValid: boolean;
          isOpenSpec?: boolean;
        }>,
        validCount: 0,
        duplicateCount: 0,
        missingCount: 0,
      };
    }

    const seenInBatch = new Set<string>();
    let validCount = 0;
    let duplicateCount = 0;
    let missingCount = 0;

    const mapping = columnMapping as Record<string, string | undefined>;
    const rowStatuses = parsedRows.map((r) => {
      const rawComp = (
        r[mapping.companyName || ''] ??
        r[mapping.company || ''] ??
        r['Company'] ??
        r['Company Name'] ??
        ''
      ).toString().trim();
      if (!rawComp) {
        missingCount++;
        return { isMissingCompany: true, isDuplicate: false, duplicateReason: 'Missing company name', isValid: false };
      }

      const normComp = normalizeCompanyName(rawComp) || rawComp.toLowerCase().replace(/[^a-z0-9]/gi, '');
      const siteName = (
        r[mapping.siteName || ''] ??
        r[mapping.city || ''] ??
        r['Site Name'] ??
        r['City'] ??
        r['Location'] ??
        'Gujarat Industrial Cluster'
      ).toString().trim();
      const area = parseAreaNumber(
        r[mapping.requiredAreaSqFt || ''] ??
        r[mapping.areaRequired || ''] ??
        r['Area Required (sq. ft.)'] ??
        r['Required Area']
      );
      const comments = (
        r[mapping.comments || ''] ??
        r[mapping.requirement || ''] ??
        r['Comments'] ??
        r['Requirement Description'] ??
        ''
      ).toString().trim();
      const rawPhone = (
        r[mapping.phone || ''] ??
        r[mapping.contactNumber || ''] ??
        r['Contact Number'] ??
        r['Phone'] ??
        ''
      ).toString().trim();

      const batchKey = `${normComp}::${area}::${siteName.toLowerCase()}::${comments.toLowerCase()}`;

      // Check within-batch duplicate
      if (seenInBatch.has(batchKey)) {
        duplicateCount++;
        return { isMissingCompany: false, isDuplicate: true, duplicateReason: 'Duplicate row inside this spreadsheet', isValid: false };
      }

      // Check against CRM records (from prior imports or manual entries)
      const matchedCompany = existingCompanies.find(
        (c) => normalizeCompanyName(c.name) === normComp || (c.legalName && normalizeCompanyName(c.legalName) === normComp)
      );

      const isExistingInCrm = existingInquiries.some((inq) => {
        const sameComp = (matchedCompany && inq.companyId === matchedCompany.id) || normalizeCompanyName(inq.companyName) === normComp;
        if (!sameComp) return false;
        const sameAreaAndLoc = inq.requiredAreaSqFt === area && (Boolean(inq.location && inq.location.toLowerCase().trim() === siteName.toLowerCase().trim()) || !siteName);
        const samePhoneAndArea = Boolean(rawPhone && inq.contactPhone && inq.contactPhone.replace(/\D/g, '') === rawPhone.replace(/\D/g, '') && inq.requiredAreaSqFt === area);
        const sameRequirement = Boolean(comments && inq.requirement && inq.requirement.toLowerCase().trim() === comments.toLowerCase().trim());
        return sameAreaAndLoc || samePhoneAndArea || sameRequirement;
      });

      if (isExistingInCrm) {
        seenInBatch.add(batchKey);
        duplicateCount++;
        return { isMissingCompany: false, isDuplicate: true, duplicateReason: 'Already exists in Fairway CRM', isValid: false };
      }

      seenInBatch.add(batchKey);
      validCount++;
      return { isMissingCompany: false, isDuplicate: false, duplicateReason: '', isValid: true, isOpenSpec: area <= 0 };
    });

    return { rowStatuses, validCount, duplicateCount, missingCount };
  }, [parsedRows, columnMapping, existingInquiries, existingCompanies]);

  const handleExecuteImport = async () => {
    setIsImporting(true);
    try {
      const res = await ImportService.importInquiries(parsedRows, columnMapping);
      if (res.success && res.data) {
        const mappedResult: ImportResult = {
          totalRows: res.data.totalProcessed,
          importedCount: res.data.importedCount,
          skippedCount: res.data.skippedCount,
          errors: res.data.errors.map((e) => ({
            row: e.row,
            field: 'Row Data',
            error: e.error,
            data: {},
          })),
          importedCompanies: res.data.importedInquiries.map((i) => i.companyName),
          importedInquiries: res.data.importedInquiries.map((i) => i.inquiryNumber),
        };

        setImportResult(mappedResult);
        setStep(4);
        success('Migration Completed', `Successfully imported ${res.data.importedCount} records into Fairway CRM.`);
      } else {
        error('Import Failed', res.error || 'Failed to execute migration.');
      }
    } catch (err: any) {
      error('Import Error', err?.message || 'Failed to execute migration.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const element = document.createElement('a');
    const file = new Blob([SAMPLE_CSV_DATA], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = 'Fairway_Inquiry_Import_Template.csv';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Header options for Combobox
  const headerComboboxOptions: ComboboxOption[] = [
    { value: '', label: '-- Skip (Do Not Map) --' },
    ...headers.map((h) => ({
      value: h,
      label: h,
    })),
  ];

  const stepsList = [
    { num: 1, label: '1. Upload Spreadsheet' },
    { num: 2, label: '2. Match Columns' },
    { num: 3, label: '3. Preview & Verify' },
    { num: 4, label: '4. Import Summary' },
  ];

  // Filtered rows for Step 3
  const displayedRows = useMemo(() => {
    return parsedRows
      .map((row, index) => ({ row, index, status: validationAnalysis.rowStatuses[index] }))
      .filter(({ status }) => {
        if (previewFilter === 'valid') return status?.isValid;
        if (previewFilter === 'skipped') return !status?.isValid;
        return true;
      });
  }, [parsedRows, validationAnalysis, previewFilter]);

  return (
    <div className="w-full text-left space-y-6 pb-16">
      {/* 1. MINIMAL EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Spreadsheet Data Import</h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-muted text-foreground-muted border border-border">
              Excel & CSV
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            Quickly import client inquiries, accounts, and requirements into your CRM pipeline without manual data entry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <Button size="sm" variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={downloadSampleTemplate}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download Template (.csv)
          </Button>
        </div>
      </div>

      {/* 2. SIMPLE RESPONSIVE STEP INDICATOR */}
      <div className="flex items-center border border-border rounded-xl bg-surface p-1 text-xs overflow-x-auto no-scrollbar touch-pan-x select-none">
        {stepsList.map((s) => {
          const isCurrent = step === s.num;
          const isDone = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num === 1) setStep(1);
                else if (s.num === 2 && parsedRows.length > 0) setStep(2);
                else if (s.num === 3 && parsedRows.length > 0) setStep(3);
              }}
              disabled={s.num > step && parsedRows.length === 0}
              className={cn(
                'flex-1 min-w-[140px] sm:min-w-0 py-2.5 px-3 rounded-lg font-medium text-center transition-all whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5',
                isCurrent
                  ? 'bg-foreground text-background font-semibold shadow-2xs'
                  : isDone
                  ? 'text-foreground hover:bg-surface-muted'
                  : 'text-foreground-muted opacity-50 cursor-not-allowed'
              )}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center font-bold">
                  {s.num}
                </span>
              )}
              <span>{s.label.split('. ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* ================= STEP 1: UPLOAD SPREADSHEET ================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Main Drag-and-Drop Area */}
          <div className="bg-surface border border-border rounded-xl p-6 sm:p-10 text-center space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 sm:p-14 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center space-y-3',
                isDragging
                  ? 'border-foreground bg-surface-muted/60'
                  : 'border-border hover:border-foreground/40 bg-surface-muted/20 hover:bg-surface-muted/40'
              )}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Click or drag file to upload"
              />

              <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground shrink-0 shadow-2xs">
                <UploadCloud className="w-6 h-6 text-foreground" />
              </div>

              <div className="space-y-1 pointer-events-none">
                <p className="text-sm font-semibold text-foreground">
                  {isDragging ? 'Drop your spreadsheet here' : 'Click to select or drag & drop spreadsheet file'}
                </p>
                <p className="text-xs text-foreground-muted">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv, .txt) files
                </p>
              </div>

              <div className="pt-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-surface border border-border text-foreground-muted">
                  <FileSpreadsheet className="w-3 h-3" />
                  Auto-detects columns and sheets automatically
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: MATCH COLUMNS ================= */}
      {step === 2 && (
        <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6">
          {/* Top Bar with file summary and sheet picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">Match Spreadsheet Columns to CRM Fields</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                We automatically matched common columns. Review them below or pick any field from the dropdowns.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-foreground-muted font-medium">Sheet:</span>
                  <Select
                    value={selectedSheet}
                    onValueChange={(val) => {
                      if (rawWorkbook) loadWorksheetData(rawWorkbook, val);
                    }}
                  >
                    <SelectTrigger className="h-8 px-2.5 bg-surface-muted border-border font-semibold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <span className="text-xs font-mono px-2.5 py-1 bg-surface-muted border border-border rounded-lg text-foreground">
                {uploadedFileName || 'Spreadsheet'} • {parsedRows.length} rows
              </span>
            </div>
          </div>

          {/* Section 1: Required Core Fields */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                1. Required Core Fields
              </span>
              <span className="text-[10px] text-foreground-muted font-normal">
                (Mandatory for pipeline inquiry creation)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Company Name */}
              <div className="p-3 rounded-lg border border-border bg-surface-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    <span>Company Name</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {columnMapping.companyName && (
                    <span className="text-[10px] text-foreground-muted font-medium flex items-center gap-0.5">
                      <Check className="w-3 h-3 text-foreground" /> Auto-Mapped
                    </span>
                  )}
                </div>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.companyName}
                  onChange={(val) => setColumnMapping({ ...columnMapping, companyName: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Site Name / Location */}
              <div className="p-3 rounded-lg border border-border bg-surface-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    <span>Site / Hub Location</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {columnMapping.siteName && (
                    <span className="text-[10px] text-foreground-muted font-medium flex items-center gap-0.5">
                      <Check className="w-3 h-3 text-foreground" /> Auto-Mapped
                    </span>
                  )}
                </div>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.siteName}
                  onChange={(val) => setColumnMapping({ ...columnMapping, siteName: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Required Area */}
              <div className="p-3 rounded-lg border border-border bg-surface-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    <span>Required Area (sq. ft.)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {columnMapping.requiredAreaSqFt && (
                    <span className="text-[10px] text-foreground-muted font-medium flex items-center gap-0.5">
                      <Check className="w-3 h-3 text-foreground" /> Auto-Mapped
                    </span>
                  )}
                </div>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.requiredAreaSqFt}
                  onChange={(val) => setColumnMapping({ ...columnMapping, requiredAreaSqFt: val })}
                  placeholder="Select column..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Optional Contact & Commercial Details */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                2. Contact & Commercial Details
              </span>
              <span className="text-[10px] text-foreground-muted font-normal">
                (Optional, will be attached to client inquiry)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Inquiry Date */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Inquiry Date</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.inquiryDate}
                  onChange={(val) => setColumnMapping({ ...columnMapping, inquiryDate: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Contact Person */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Contact Person</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.contactName}
                  onChange={(val) => setColumnMapping({ ...columnMapping, contactName: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Contact Phone */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Phone / Mobile</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.phone}
                  onChange={(val) => setColumnMapping({ ...columnMapping, phone: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Assigned Salesperson */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Assigned Salesperson</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.enteredBy}
                  onChange={(val) => setColumnMapping({ ...columnMapping, enteredBy: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Requirement Comments */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Requirement Notes / Comments</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.comments}
                  onChange={(val) => setColumnMapping({ ...columnMapping, comments: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Current Status */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Current Status / Stage</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.remark1CurrentStatus}
                  onChange={(val) => setColumnMapping({ ...columnMapping, remark1CurrentStatus: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Next Action */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Next Action</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.remark2NextAction}
                  onChange={(val) => setColumnMapping({ ...columnMapping, remark2NextAction: val })}
                  placeholder="Select column..."
                />
              </div>

              {/* Follow-up Plan */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Follow-up Plan</label>
                <Combobox
                  options={headerComboboxOptions}
                  value={columnMapping.remark3FollowUpPlan}
                  onChange={(val) => setColumnMapping({ ...columnMapping, remark3FollowUpPlan: val })}
                  placeholder="Select column..."
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back to Upload
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep(3)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto font-semibold"
            >
              Continue to Preview & Verify ({parsedRows.length} Rows)
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PREVIEW & VERIFY ================= */}
      {step === 3 && (
        <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-5">
          {/* Header & Metric Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">Data Preview & Duplicate Check</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Review rows before saving to CRM. Existing records or in-file duplicates are automatically skipped.
              </p>
            </div>

            {/* Metric Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-surface-muted text-foreground border border-border">
                <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                {validationAnalysis.validCount} Ready to Import
              </span>
              {validationAnalysis.duplicateCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-surface-muted text-foreground-muted border border-border">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {validationAnalysis.duplicateCount} Duplicates (Will Skip)
                </span>
              )}
              {validationAnalysis.missingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-surface-muted text-foreground-muted border border-border">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validationAnalysis.missingCount} Incomplete
                </span>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground-muted text-[11px] font-medium">Show:</span>
            <button
              type="button"
              onClick={() => setPreviewFilter('all')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors font-medium',
                previewFilter === 'all'
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-surface-muted text-foreground-muted hover:text-foreground'
              )}
            >
              All Rows ({parsedRows.length})
            </button>
            <button
              type="button"
              onClick={() => setPreviewFilter('valid')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors font-medium',
                previewFilter === 'valid'
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-surface-muted text-foreground-muted hover:text-foreground'
              )}
            >
              Ready Only ({validationAnalysis.validCount})
            </button>
            <button
              type="button"
              onClick={() => setPreviewFilter('skipped')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors font-medium',
                previewFilter === 'skipped'
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-surface-muted text-foreground-muted hover:text-foreground'
              )}
            >
              Skipped / Duplicates ({validationAnalysis.duplicateCount + validationAnalysis.missingCount})
            </button>
          </div>

          {/* Clean Responsive High-Density Table */}
          <div className="overflow-x-auto no-scrollbar touch-pan-x border border-border rounded-lg max-h-[460px] bg-surface relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-border bg-surface-muted dark:bg-[#161B22]">
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">#</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Company Name</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Site / Location</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Required Area</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Date</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Contact Person</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Phone</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Salesperson</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Status / Note</th>
                  <th className="sticky top-0 z-20 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground text-right whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-foreground-muted">
                      No records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map(({ row: r, index: i, status }) => {
                    const companyName = r[columnMapping.companyName]?.toString().trim();
                    const siteName = r[columnMapping.siteName]?.toString().trim();
                    const areaRaw = r[columnMapping.requiredAreaSqFt];
                    const area = parseAreaNumber(areaRaw);
                    const rawDate = r[columnMapping.inquiryDate] ?? r['Date_1'] ?? r['Date'];
                    const formattedDate = formatExcelDate(rawDate);
                    const remarkText = r[columnMapping.remark1CurrentStatus]?.toString().trim();

                    return (
                      <tr
                        key={i}
                        className={cn(
                          'transition-colors hover:bg-surface-muted/50',
                          (!status?.isValid) && 'opacity-65 bg-surface-muted/20'
                        )}
                      >
                        <td className="px-3 py-2 font-mono text-foreground-muted text-[11px] whitespace-nowrap">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">
                          {companyName ? (
                            <div className="flex flex-col">
                              <span>{companyName}</span>
                              {status?.isDuplicate && (
                                <span className="text-[10px] text-foreground-muted font-normal">
                                  {status.duplicateReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-foreground-muted font-medium">
                              Missing Company
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted whitespace-nowrap">
                          {siteName || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-foreground whitespace-nowrap">
                          {area > 0 ? (
                            `${area.toLocaleString()} sq.ft`
                          ) : (
                            <span className="text-foreground-muted font-sans text-[11px]">Open / TBD</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted font-mono text-[11px] whitespace-nowrap">
                          {formattedDate || '—'}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted whitespace-nowrap">
                          {r[columnMapping.contactName] || '—'}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted font-mono text-[11px] whitespace-nowrap">
                          {r[columnMapping.phone] ? String(r[columnMapping.phone]) : '—'}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted whitespace-nowrap">
                          {r[columnMapping.enteredBy] || 'Prapti Shah'}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted max-w-[200px] truncate">
                          {remarkText || 'Active'}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {status?.isMissingCompany ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-foreground-muted border border-border">
                              Skip (Incomplete)
                            </span>
                          ) : status?.isDuplicate ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-foreground-muted border border-border" title={status.duplicateReason}>
                              Skip (Duplicate)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-foreground border border-border">
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(2)}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back to Column Matching
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isImporting || validationAnalysis.validCount === 0}
              onClick={handleExecuteImport}
              className="w-full sm:w-auto font-semibold"
            >
              {isImporting
                ? 'Importing into CRM...'
                : `Import ${validationAnalysis.validCount} Valid Records${
                    validationAnalysis.duplicateCount > 0
                      ? ` (${validationAnalysis.duplicateCount} duplicates skipped)`
                      : ''
                  }`}
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: IMPORT SUMMARY ================= */}
      {step === 4 && importResult && (
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-surface-muted border border-border text-foreground flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Import Successfully Completed!</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                {importResult.importedCount} inquiry records have been added to your Fairway CRM database
                {importResult.skippedCount > 0 && ` (${importResult.skippedCount} duplicates skipped safely)`}.
              </p>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">Total Processed</span>
              <span className="text-2xl font-bold font-mono text-foreground mt-1 block">{importResult.totalRows}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">New Inquiries Created</span>
              <span className="text-2xl font-bold font-mono text-foreground mt-1 block">{importResult.importedCount}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">Duplicates Skipped</span>
              <span className="text-2xl font-bold font-mono text-foreground mt-1 block">{importResult.skippedCount}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">Companies Linked</span>
              <span className="text-2xl font-bold font-mono text-foreground mt-1 block">{new Set(importResult.importedCompanies).size}</span>
            </div>
          </div>

          {/* Skipped Records Log (If Any) */}
          {importResult.errors.length > 0 && (
            <div className="border border-border rounded-xl p-4 text-xs space-y-2 bg-surface-muted/10">
              <h4 className="font-semibold text-foreground">Skipped Records Details ({importResult.errors.length})</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="py-1 px-2.5 text-foreground-muted flex items-center justify-between border-b border-border/50 last:border-0 rounded hover:bg-surface-muted/30">
                    <span>Row {err.row}: {err.error}</span>
                    <span className="text-[10px] text-foreground-muted font-medium px-2 py-0.5 rounded bg-surface-muted border border-border">
                      Skipped
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Step Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep(1);
                setParsedRows([]);
                setImportResult(null);
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
            >
              Import Another Spreadsheet
            </Button>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToCompanies}
                leftIcon={<Building2 className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto"
              >
                View Companies Master
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onNavigateToInquiries}
                leftIcon={<FileText className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto font-semibold"
              >
                View Inquiries Pipeline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ImportWizardPage = ImportWizardView;
export default ImportWizardPage;
