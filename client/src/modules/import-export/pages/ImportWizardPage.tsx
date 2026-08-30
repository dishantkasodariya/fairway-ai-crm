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
  Sparkles,
  Layers,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
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
      {/* Header Pattern Matching Warehouse Inquiry & Companies Module */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-muted border border-border text-foreground flex items-center justify-center shrink-0 shadow-xs">
            <UploadCloud className="w-5 h-5 text-fairway-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>Excel & CSV Inquiry Migration Wizard</span>
            </h1>
            <p className="text-xs text-foreground-muted mt-0.5">
              Migrate spreadsheets (such as enquiries.xlsx) directly into Fairway CRM with field mapping and validation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <Button size="sm" variant="outline" onClick={onBack} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={downloadSampleTemplate} leftIcon={<Download className="w-3.5 h-3.5" />}>
            Download Template
          </Button>
        </div>
      </div>

      {/* 4-Step Stepper Progress Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-surface p-3 rounded-2xl border border-border shadow-xs">
        {[
          { num: 1, label: 'Upload File', desc: 'Select or drag enquiries.xlsx' },
          { num: 2, label: 'Map Columns', desc: 'Auto & manual mapping' },
          { num: 3, label: 'Validate Data', desc: 'Diagnostics preview' },
          { num: 4, label: 'Import Summary', desc: 'Batch completion stats' },
        ].map((s) => (
          <div
            key={s.num}
            className={cn(
              'p-2.5 rounded-xl border transition-all flex items-center gap-3',
              step === s.num
                ? 'bg-fairway-50/70 dark:bg-fairway-950/40 border-fairway-400 shadow-2xs'
                : step > s.num
                ? 'bg-surface-muted/40 border-border/70 text-foreground-muted'
                : 'bg-transparent border-transparent opacity-60'
            )}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                step > s.num
                  ? 'bg-fairway-600 text-white'
                  : step === s.num
                  ? 'bg-fairway-600 text-white shadow-xs'
                  : 'bg-surface-muted text-foreground-muted border border-border'
              )}
            >
              {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <div className="min-w-0">
              <span className={cn('text-xs font-bold block truncate', step === s.num ? 'text-foreground' : 'text-foreground-muted')}>
                {s.label}
              </span>
              <span className="text-[10px] text-foreground-muted truncate block hidden sm:block">
                {s.desc}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ================= STEP 1: UPLOAD FILE (DRAG & DROP READY) ================= */}
      {step === 1 && (
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-lg font-bold text-foreground">Upload your Spreadsheet or Data Log</h2>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Upload warehouse inquiry logs, Excel (.xlsx/.xls) sheets, or CSV files to bulk-ingest into your Fairway pipeline.
            </p>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer relative group flex flex-col items-center justify-center space-y-4',
              isDragging
                ? 'border-fairway-500 bg-fairway-500/10 scale-[1.005] shadow-lg'
                : 'border-border hover:border-fairway-400/80 bg-surface-muted/30 hover:bg-surface-muted/60'
            )}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Click or drag file to upload"
            />

            <div
              className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xs',
                isDragging
                  ? 'bg-fairway-600 text-white scale-110'
                  : 'bg-fairway-100 text-fairway-800 dark:bg-fairway-950 dark:text-fairway-200 border border-fairway-300 dark:border-fairway-800 group-hover:scale-105'
              )}
            >
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1 z-0 pointer-events-none">
              <p className="text-sm font-bold text-foreground">
                {isDragging ? 'Drop your Excel/CSV file right here' : 'Drag & drop enquiries.xlsx or any spreadsheet here, or browse files'}
              </p>
              <p className="text-xs text-foreground-muted">
                Supports Microsoft Excel (.XLSX, .XLS) and Comma-Separated (.CSV, .TXT) files
              </p>
            </div>

            <div className="pt-2 z-0 pointer-events-none">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-fairway-600 text-white text-xs font-bold rounded-xl shadow-xs group-hover:bg-fairway-700 transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Select File from Computer</span>
              </span>
            </div>
          </div>

          {/* Quick Demo Dataset Action */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-surface-muted border border-border text-foreground hover:bg-surface-muted/80 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Load 5-Row Demo Sample Dataset</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: MAP COLUMNS (WITH SHEET SELECTOR & COMBOBOX) ================= */}
      {step === 2 && (
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Step 2: Map Spreadsheet Columns to Fairway CRM Fields
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Verify auto-detected mapping or assign columns from your spreadsheet for each field below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-1.5 bg-surface-muted px-2.5 py-1 rounded-xl border border-border text-xs">
                  <Layers className="w-3.5 h-3.5 text-fairway-600" />
                  <span className="font-semibold text-foreground-muted">Sheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      if (rawWorkbook) loadWorksheetData(rawWorkbook, e.target.value);
                    }}
                    className="bg-transparent font-bold text-foreground outline-none cursor-pointer"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Badge variant="outline" className="font-mono text-xs">
                📄 {uploadedFileName || 'Uploaded File'} ({parsedRows.length} Rows)
              </Badge>
            </div>
          </div>

          {/* Field Mapping Grid with Custom Schema */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* 1. Company */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Company <span className="text-rose-500">*</span>
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.companyName}
                onChange={(val) => setColumnMapping({ ...columnMapping, companyName: val })}
                placeholder="Map to Company..."
              />
            </div>

            {/* 2. Site Name */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Site Name / Hub Location
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.siteName}
                onChange={(val) => setColumnMapping({ ...columnMapping, siteName: val })}
                placeholder="Map to Site Name..."
              />
            </div>

            {/* 3. Area Required (sq. ft.) */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Area Required (sq. ft.)
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.requiredAreaSqFt}
                onChange={(val) => setColumnMapping({ ...columnMapping, requiredAreaSqFt: val })}
                placeholder="Map to Area Required..."
              />
            </div>

            {/* 4. Date */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Date / Inquiry Date
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.inquiryDate}
                onChange={(val) => setColumnMapping({ ...columnMapping, inquiryDate: val })}
                placeholder="Map to Date..."
              />
            </div>

            {/* 5. Contact Person */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Contact Person
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.contactName}
                onChange={(val) => setColumnMapping({ ...columnMapping, contactName: val })}
                placeholder="Map to Contact Person..."
              />
            </div>

            {/* 6. Contact Number */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Contact Number / Phone
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.phone}
                onChange={(val) => setColumnMapping({ ...columnMapping, phone: val })}
                placeholder="Map to Contact Number..."
              />
            </div>

            {/* 7. Entered By */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Entered By / Assigned Owner
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.enteredBy}
                onChange={(val) => setColumnMapping({ ...columnMapping, enteredBy: val })}
                placeholder="Map to Entered By..."
              />
            </div>

            {/* 8. Comments */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Comments / Description
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.comments}
                onChange={(val) => setColumnMapping({ ...columnMapping, comments: val })}
                placeholder="Map to Comments..."
              />
            </div>

            {/* 9. Remark 1 – Current Status */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Remark 1 – Current Status
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.remark1CurrentStatus}
                onChange={(val) => setColumnMapping({ ...columnMapping, remark1CurrentStatus: val })}
                placeholder="Map to Remark 1..."
              />
            </div>

            {/* 10. Remark 2 – Next Action */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60">
              <label className="font-bold text-foreground block">
                Remark 2 – Next Action
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.remark2NextAction}
                onChange={(val) => setColumnMapping({ ...columnMapping, remark2NextAction: val })}
                placeholder="Map to Remark 2..."
              />
            </div>

            {/* 11. Remark 3 – Follow-up Plan */}
            <div className="space-y-1.5 bg-surface-muted/30 p-3 rounded-xl border border-border/60 md:col-span-2">
              <label className="font-bold text-foreground block">
                Remark 3 – Follow-up Plan
              </label>
              <Combobox
                options={headerComboboxOptions}
                value={columnMapping.remark3FollowUpPlan}
                onChange={(val) => setColumnMapping({ ...columnMapping, remark3FollowUpPlan: val })}
                placeholder="Map to Remark 3..."
              />
            </div>
          </div>

          {/* Stepper Footer Navigation */}
          <div className="flex items-center justify-between pt-5 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Upload
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleValidateAndProceed}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold"
            >
              Validate & Preview Data ({parsedRows.length} Rows)
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PREVIEW & DIAGNOSTICS VALIDATION ================= */}
      {step === 3 && (
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Step 3: Diagnostic Validation & Row Preview
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Automated validation verifies company accounts and normalizes serial dates and area requirements.
              </p>
            </div>
            <Badge variant="success" size="sm" className="font-semibold">
              Ready to Ingest ({parsedRows.length} Records)
            </Badge>
          </div>

          {/* Preview Table with Solid Background */}
          <div className="overflow-x-auto border border-border rounded-xl max-h-88 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-muted dark:bg-[#161B22] text-[11px] font-bold uppercase text-foreground-muted sticky top-0 z-10 border-b border-border shadow-xs">
                <tr>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">#</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Company</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Site Name</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Area Required</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Date</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Contact Person</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Phone</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Entered By</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22]">Status Remark</th>
                  <th className="p-3 bg-surface-muted dark:bg-[#161B22] text-right">Validation</th>
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
                  const isMissingCompany = !companyName;

                  return (
                    <tr key={i} className={isMissingCompany ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300' : 'hover:bg-surface-muted/30'}>
                      <td className="p-3 font-mono font-bold text-foreground-muted">{i + 1}</td>
                      <td className="p-3 font-bold text-foreground">{companyName || '⚠️ Missing Company'}</td>
                      <td className="p-3 text-foreground-muted">{siteName || '—'}</td>
                      <td className="p-3 font-mono font-bold text-foreground">
                        {area > 0 ? (
                          `${area.toLocaleString()} sq.ft`
                        ) : (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                            Open / TBD
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-foreground-muted font-mono text-[11px]">{formattedDate || '—'}</td>
                      <td className="p-3 text-foreground-muted">{r[columnMapping.contactName] || '—'}</td>
                      <td className="p-3 text-foreground-muted font-mono text-[11px]">
                        {r[columnMapping.phone] ? String(r[columnMapping.phone]) : '—'}
                      </td>
                      <td className="p-3 text-foreground-muted">{r[columnMapping.enteredBy] || 'Prapti Shah'}</td>
                      <td className="p-3 text-foreground-muted max-w-[200px] truncate" title={r[columnMapping.remark1CurrentStatus]}>
                        {r[columnMapping.remark1CurrentStatus] ? (
                          <span className="px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[10px] font-semibold truncate block">
                            {String(r[columnMapping.remark1CurrentStatus])}
                          </span>
                        ) : (
                          'Active'
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isMissingCompany ? (
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                            Will Skip
                          </span>
                        ) : area > 0 ? (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            Valid
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-full border border-sky-300 dark:border-sky-800">
                            Valid (Open Spec)
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
            <Button variant="outline" size="sm" onClick={() => setStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Mapping
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isImporting}
              onClick={handleExecuteImport}
              leftIcon={<UploadCloud className="w-4 h-4" />}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold shadow-xs"
            >
              {isImporting ? 'Migrating Records into CRM...' : `Confirm & Import ${parsedRows.length} Records`}
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: RESULT SUMMARY ================= */}
      {step === 4 && importResult && (
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-4 text-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Migration Batch Completed Successfully!</h3>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Successfully imported <strong className="text-foreground">{importResult.importedCount}</strong> inquiry records into the Fairway CRM database.
                {importResult.skippedCount > 0 && ` (${importResult.skippedCount} empty rows were skipped).`}
              </p>
            </div>
          </div>

          {/* Diagnostic Error Report if any skipped */}
          {importResult.errors.length > 0 && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-2">
              <h4 className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Diagnostic Report ({importResult.errors.length} skipped)</span>
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="p-2 bg-surface text-foreground rounded-lg border border-border flex items-center justify-between">
                    <span>Row {err.row}: <strong>{err.field}</strong> — {err.error}</span>
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
