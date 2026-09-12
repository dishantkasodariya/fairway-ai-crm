import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { StorageService, normalizeCompanyName } from '@/modules/core/services/storageService';
import { ImportService } from '@/modules/core/services/importService';
import { ImportResult } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { useToast } from '@/modules/core/providers/ToastContext';
import { cn } from '@/modules/core/lib/utils';

export interface ImportWizardViewProps {
  onNavigateToInquiries: () => void;
  onNavigateToCompanies: () => void;
  onBack?: () => void;
}

const SAMPLE_CSV_DATA = `Site Name,Area Required (sq. ft.),Date,Company,Contact Person,Contact Number,Entered By,Comments,Remark 1 – Current Status,Remark 2 – Next Action,Remark 3 – Follow-up Plan
Union Dahej,217,800 sq. ft.,2026-06-16,Indiano Green Strategic Materials,Deepak Pednekar,+91 77448 13146,Prapti Shah,They need shed for manufacturing,Requirement Confirmed,Close this inquiry for present & retain company,No immediate follow-up. Review in 90 days.
LPS kosamba,,2026-03-26,Blue Dart,,,Prapti Shah,Exploratory logistics distribution unit,Contacted,Follow up for requirement area specifications,Re-check after 14 days
LPS kosamba,,2026-03-26,Mahindra Logistics,,,Prapti Shah,Mother hub requirement discussion,Requirement Confirmed,Schedule technical briefing with regional manager,Follow up on Friday
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

  // Auto-map column helper
  const autoMapColumns = (head: string[]) => {
    const newMapping = { ...columnMapping };
    head.forEach((h) => {
      const lower = h.toLowerCase().trim();
      if (lower === 'company' || lower.includes('company name') || lower.includes('client')) {
        newMapping.companyName = h;
      } else if (lower.includes('site') || lower.includes('location') || lower.includes('city') || lower.includes('hub')) {
        newMapping.siteName = h;
      } else if (lower.includes('area') || lower.includes('sq. ft') || lower.includes('sqft') || lower.includes('size')) {
        newMapping.requiredAreaSqFt = h;
      } else if (lower.includes('date') && !newMapping.inquiryDate) {
        newMapping.inquiryDate = h;
      } else if (lower.includes('contact person') || lower.includes('decision maker') || lower.includes('contact name')) {
        newMapping.contactName = h;
      } else if (lower.includes('contact number') || lower.includes('phone') || lower.includes('mobile')) {
        newMapping.phone = h;
      } else if (lower.includes('entered by') || lower.includes('salesperson') || lower.includes('owner')) {
        newMapping.enteredBy = h;
      } else if (lower.includes('comment') || lower.includes('requirement') || lower.includes('desc') || lower.includes('spec')) {
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
    setUploadedFileName('enquiries_template.xlsx');
    setUploadedFileSize('18.5 KB');
    
    const workbook = XLSX.read(SAMPLE_CSV_DATA, { type: 'string' });
    setRawWorkbook(workbook);
    setSheetNames(workbook.SheetNames);
    loadWorksheetData(workbook, workbook.SheetNames[0]);
    setStep(2);
    success('Sample Data Loaded', 'Loaded 5 sample industrial warehouse inquiry records.');
  };

  // Proactive Diagnostic Validation Calculation for Step 3 Preview (detects in-file and cross-file duplicates)
  const validationAnalysis = React.useMemo(() => {
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

    const existingInquiries = StorageService.getInquiries();
    const existingCompanies = StorageService.getCompanies();

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
        return { isMissingCompany: true, isDuplicate: false, duplicateReason: '', isValid: false };
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
        return { isMissingCompany: false, isDuplicate: true, duplicateReason: 'Duplicate row within this spreadsheet', isValid: false };
      }

      // Check against CRM records (from prior imports or manual entries)
      const matchedCompany = existingCompanies.find(
        (c) => normalizeCompanyName(c.name) === normComp || (c.legalName && normalizeCompanyName(c.legalName) === normComp)
      );

      const isExistingInCrm = existingInquiries.some((inq) => {
        const sameComp = (matchedCompany && inq.companyId === matchedCompany.id) || normalizeCompanyName(inq.companyName) === normComp;
        if (!sameComp) return false;
        const sameAreaAndLoc = inq.requiredAreaSqFt === area && (inq.location.toLowerCase().trim() === siteName.toLowerCase().trim() || !siteName);
        const samePhoneAndArea = Boolean(rawPhone && inq.contactPhone && inq.contactPhone.replace(/\D/g, '') === rawPhone.replace(/\D/g, '') && inq.requiredAreaSqFt === area);
        const sameRequirement = Boolean(comments && inq.requirement && inq.requirement.toLowerCase().trim() === comments.toLowerCase().trim());
        return sameAreaAndLoc || samePhoneAndArea || sameRequirement;
      });

      if (isExistingInCrm) {
        seenInBatch.add(batchKey);
        duplicateCount++;
        return { isMissingCompany: false, isDuplicate: true, duplicateReason: 'Already exists in Fairway CRM database', isValid: false };
      }

      seenInBatch.add(batchKey);
      validCount++;
      return { isMissingCompany: false, isDuplicate: false, duplicateReason: '', isValid: true, isOpenSpec: area <= 0 };
    });

    return { rowStatuses, validCount, duplicateCount, missingCount };
  }, [parsedRows, columnMapping]);

  const handleValidateAndProceed = () => {
    setStep(3);
  };

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

        try {
          StorageService.importFromParsedData(parsedRows, columnMapping);
        } catch {}

        setImportResult(mappedResult);
        setStep(4);
        success('Migration Completed', `Successfully imported ${res.data.importedCount} records into Fairway CRM.`);
      } else {
        const result = StorageService.importFromParsedData(parsedRows, columnMapping);
        setImportResult(result);
        setStep(4);
        success('Migration Completed', `Imported ${result.importedCount} records into Fairway CRM.`);
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
    element.download = 'Fairway_CRM_Inquiries_Template.csv';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Header options for Combobox
  const headerComboboxOptions: ComboboxOption[] = [
    { value: '', label: '-- Do Not Map (Skip Field) --' },
    ...headers.map((h) => ({
      value: h,
      label: h,
    })),
  ];

  return (
    <div className="w-full text-left space-y-6 pb-16">
      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Spreadsheet Data Import</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Import inquiries, client accounts, and pipeline records from Excel (.xlsx) or CSV files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <Button size="sm" variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={downloadSampleTemplate} leftIcon={<Download className="w-3.5 h-3.5" />}>
            Download Template (.csv)
          </Button>
        </div>
      </div>

      {/* Minimal 4-Step Segmented Bar */}
      <div className="flex items-center border border-border rounded-xl bg-surface p-1 text-xs">
        {[
          { num: 1, label: '1. Upload File' },
          { num: 2, label: '2. Map Columns' },
          { num: 3, label: '3. Validate & Preview' },
          { num: 4, label: '4. Summary' },
        ].map((s) => (
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
              'flex-1 py-2 px-3 rounded-lg font-medium text-center transition-all truncate',
              step === s.num
                ? 'bg-fairway-600 text-white font-semibold shadow-2xs'
                : step > s.num
                ? 'text-foreground hover:bg-surface-muted'
                : 'text-foreground-muted opacity-50 cursor-not-allowed'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ================= STEP 1: UPLOAD FILE ================= */}
      {step === 1 && (
        <div className="bg-surface border border-border rounded-xl p-8 sm:p-12 text-center space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border border-dashed rounded-xl p-10 sm:p-14 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center space-y-3',
              isDragging
                ? 'border-fairway-500 bg-fairway-500/5'
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

            <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center text-foreground shrink-0 shadow-2xs">
              <UploadCloud className="w-6 h-6 text-fairway-600" />
            </div>

            <div className="space-y-1 pointer-events-none">
              <p className="text-sm font-semibold text-foreground">
                {isDragging ? 'Drop your spreadsheet here' : 'Click to upload or drag and drop spreadsheet'}
              </p>
              <p className="text-xs text-foreground-muted">
                Supports Excel (.xlsx, .xls) and CSV (.csv, .txt) files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: MAP COLUMNS ================= */}
      {step === 2 && (
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">Map Columns to CRM Fields</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Assign each spreadsheet column to the corresponding CRM record field.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2 bg-surface-muted px-2.5 py-1 rounded-lg border border-border text-xs">
                  <span className="text-foreground-muted font-medium">Sheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      if (rawWorkbook) loadWorksheetData(rawWorkbook, e.target.value);
                    }}
                    className="bg-transparent font-semibold text-foreground outline-none cursor-pointer"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <span className="text-xs font-mono px-2.5 py-1 bg-surface-muted border border-border rounded-lg text-foreground-muted">
                {uploadedFileName || 'File'} ({parsedRows.length} rows)
              </span>
            </div>
          </div>

          {/* Clean Minimal Field Mapping Grid (No Nested Box Clutter) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 text-xs">
            {/* 1. Company */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Company Name</span>
                <span className="text-[10px] text-rose-500 font-normal">Required</span>
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.companyName}
                onChange={(val) => setColumnMapping({ ...columnMapping, companyName: val })}
                placeholder="Map to Company Name..."
              />
            </div>

            {/* 2. Site Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Site Name / Hub Location
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.siteName}
                onChange={(val) => setColumnMapping({ ...columnMapping, siteName: val })}
                placeholder="Map to Site Name..."
              />
            </div>

            {/* 3. Area Required */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Area Required (sq. ft.)
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.requiredAreaSqFt}
                onChange={(val) => setColumnMapping({ ...columnMapping, requiredAreaSqFt: val })}
                placeholder="Map to Required Area..."
              />
            </div>

            {/* 4. Date */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Inquiry Date
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.inquiryDate}
                onChange={(val) => setColumnMapping({ ...columnMapping, inquiryDate: val })}
                placeholder="Map to Date..."
              />
            </div>

            {/* 5. Contact Person */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Contact Person
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.contactName}
                onChange={(val) => setColumnMapping({ ...columnMapping, contactName: val })}
                placeholder="Map to Contact Name..."
              />
            </div>

            {/* 6. Contact Number */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Phone Number
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.phone}
                onChange={(val) => setColumnMapping({ ...columnMapping, phone: val })}
                placeholder="Map to Phone..."
              />
            </div>

            {/* 7. Entered By */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Assigned Salesperson
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.enteredBy}
                onChange={(val) => setColumnMapping({ ...columnMapping, enteredBy: val })}
                placeholder="Map to Salesperson..."
              />
            </div>

            {/* 8. Comments */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Requirement Details / Comments
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.comments}
                onChange={(val) => setColumnMapping({ ...columnMapping, comments: val })}
                placeholder="Map to Requirement..."
              />
            </div>

            {/* 9. Remark 1 */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Current Status
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.remark1CurrentStatus}
                onChange={(val) => setColumnMapping({ ...columnMapping, remark1CurrentStatus: val })}
                placeholder="Map to Current Status..."
              />
            </div>

            {/* 10. Remark 2 */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Next Action
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.remark2NextAction}
                onChange={(val) => setColumnMapping({ ...columnMapping, remark2NextAction: val })}
                placeholder="Map to Next Action..."
              />
            </div>

            {/* 11. Remark 3 */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Follow-up Plan
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.remark3FollowUpPlan}
                onChange={(val) => setColumnMapping({ ...columnMapping, remark3FollowUpPlan: val })}
                placeholder="Map to Follow-up Plan..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Upload
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleValidateAndProceed}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold"
            >
              Validate & Preview ({parsedRows.length} Rows)
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PREVIEW & VALIDATE ================= */}
      {step === 3 && (
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">Data Preview & Validation</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Review records before importing. Duplicates and existing records will be automatically skipped.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {validationAnalysis.validCount} New
              </span>
              {validationAnalysis.duplicateCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {validationAnalysis.duplicateCount} Duplicates (Skip)
                </span>
              )}
              {validationAnalysis.missingCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  {validationAnalysis.missingCount} Incomplete
                </span>
              )}
            </div>
          </div>

          {/* Clean High-Density Minimalist Table */}
          <div className="overflow-x-auto border border-border rounded-lg max-h-[460px] bg-surface relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-border">
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">#</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Company</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Site Name</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Area Required</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Date</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Contact Person</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Phone</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Entered By</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Status Remark</th>
                  <th className="sticky top-0 z-20 px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-foreground text-right whitespace-nowrap bg-surface-muted dark:bg-[#161B22] border-b border-border">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {parsedRows.map((r, i) => {
                  const companyName = r[columnMapping.companyName]?.toString().trim();
                  const siteName = r[columnMapping.siteName]?.toString().trim();
                  const areaRaw = r[columnMapping.requiredAreaSqFt];
                  const area = parseAreaNumber(areaRaw);
                  const rawDate = r[columnMapping.inquiryDate] ?? r['Date_1'] ?? r['Date'];
                  const formattedDate = formatExcelDate(rawDate);
                  const remarkText = r[columnMapping.remark1CurrentStatus]?.toString().trim();
                  const status = validationAnalysis.rowStatuses[i];

                  return (
                    <tr
                      key={i}
                      className={cn(
                        'transition-colors',
                        status?.isMissingCompany
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : status?.isDuplicate
                          ? 'bg-amber-50/30 dark:bg-amber-950/20'
                          : 'hover:bg-surface-muted/50'
                      )}
                    >
                      <td className="px-3.5 py-2 font-mono text-foreground-muted text-[11px] whitespace-nowrap">
                        {i + 1}
                      </td>
                      <td className="px-3.5 py-2 font-semibold text-foreground whitespace-nowrap">
                        {companyName ? (
                          <div className="flex flex-col">
                            <span>{companyName}</span>
                            {status?.isDuplicate && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                {status.duplicateReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            Missing Company
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-foreground-muted whitespace-nowrap">
                        {siteName || '—'}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-foreground whitespace-nowrap">
                        {area > 0 ? (
                          `${area.toLocaleString()} sq.ft`
                        ) : (
                          <span className="text-foreground-muted font-sans text-[11px]">Open / TBD</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-foreground-muted font-mono text-[11px] whitespace-nowrap">
                        {formattedDate || '—'}
                      </td>
                      <td className="px-3.5 py-2 text-foreground-muted whitespace-nowrap">
                        {r[columnMapping.contactName] || '—'}
                      </td>
                      <td className="px-3.5 py-2 text-foreground-muted font-mono text-[11px] whitespace-nowrap">
                        {r[columnMapping.phone] ? String(r[columnMapping.phone]) : '—'}
                      </td>
                      <td className="px-3.5 py-2 text-foreground-muted whitespace-nowrap">
                        {r[columnMapping.enteredBy] || 'Prapti Shah'}
                      </td>
                      <td className="px-3.5 py-2 text-foreground-muted max-w-[200px] truncate">
                        {remarkText || 'Active'}
                      </td>
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        {status?.isMissingCompany ? (
                          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            Skip
                          </span>
                        ) : status?.isDuplicate ? (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400" title={status.duplicateReason}>
                            Duplicate (Skip)
                          </span>
                        ) : status?.isOpenSpec ? (
                          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            Valid (Open)
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Mapping
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isImporting}
              onClick={handleExecuteImport}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold"
            >
              {isImporting
                ? 'Importing...'
                : `Import ${validationAnalysis.validCount} Records${
                    validationAnalysis.duplicateCount > 0
                      ? ` (${validationAnalysis.duplicateCount} skipped)`
                      : ''
                  }`}
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: RESULT SUMMARY ================= */}
      {step === 4 && importResult && (
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Import Complete</h3>
              <p className="text-xs text-foreground-muted">
                {importResult.importedCount} records imported into Fairway CRM database
                {importResult.skippedCount > 0 && ` (${importResult.skippedCount} duplicates/invalids skipped)`}.
              </p>
            </div>
          </div>

          {/* Clean Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">Total Processed</span>
              <span className="text-xl font-semibold font-mono text-foreground mt-1 block">{importResult.totalRows}</span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">New Inquiries</span>
              <span className="text-xl font-semibold font-mono text-foreground mt-1 block">{importResult.importedCount}</span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">Duplicates Skipped</span>
              <span className="text-xl font-semibold font-mono text-foreground mt-1 block">{importResult.skippedCount}</span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-surface-muted/20">
              <span className="text-xs text-foreground-muted block">Companies Linked</span>
              <span className="text-xl font-semibold font-mono text-foreground mt-1 block">{new Set(importResult.importedCompanies).size}</span>
            </div>
          </div>

          {/* Clean Minimalist Skipped Log */}
          {importResult.errors.length > 0 && (
            <div className="border border-border rounded-lg p-3 text-xs space-y-2 bg-surface-muted/10">
              <h4 className="font-semibold text-foreground">Skipped Records Log ({importResult.errors.length})</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="py-1 px-2 text-foreground-muted flex items-center justify-between border-b border-border/50 last:border-0">
                    <span>Row {err.row}: {err.error}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Skipped</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Import Another File
            </Button>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={onNavigateToCompanies} leftIcon={<Building2 className="w-3.5 h-3.5" />}>
                View Companies
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onNavigateToInquiries}
                leftIcon={<FileText className="w-3.5 h-3.5" />}
                className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold shadow-xs"
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
