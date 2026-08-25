import React, { useState } from 'react';
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
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { ImportResult } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';
import { useToast } from '@/modules/core/providers/ToastContext';

export interface ImportWizardViewProps {
  onNavigateToInquiries: () => void;
  onNavigateToCompanies: () => void;
}

const SAMPLE_CSV_DATA = `Company Name,Industry,City,Required Area,Contact Person,Phone,Email,Requirement Description
Godrej Agrovet,Agro & Chemical,Dahej,80000,Vivek Sharma,+91 98250 99112,vivek@godrejagro.example.com,Need 80k sq.ft chemical warehouse with 10 dock levelers
Adani Wilmar Ltd,FMCG & Edible Oils,Surat,120000,Rajesh Shah,+91 98240 88221,rshah@adaniwilmar.example.com,Mother DC for edible oil distribution across South Gujarat
Pidilite Industries,Specialty Adhesives,Vapi,60000,Sanjay Patel,+91 98251 77334,sanjay.p@pidilite.example.com,Polymer and adhesive raw material storage near NH-48
Micron Technology India,Electronics,Sanand,95000,Kiran Joshi,+91 98253 66445,kiran@micron.example.com,Clean room components staging facility in Sanand GIDC
Incomplete Row Chemical,Specialty Chemicals,Dahej,0,Missing Area,+91 98000 00000,missing@chem.com,Invalid row test with zero area`;

export const ImportWizardView: React.FC<ImportWizardViewProps> = ({
  onNavigateToInquiries,
  onNavigateToCompanies,
}) => {
  const { success, error } = useToast();
  const [step, setStep] = useState<number>(1);
  const [rawText, setRawText] = useState(SAMPLE_CSV_DATA);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column Mapping State
  const [columnMapping, setColumnMapping] = useState({
    companyName: 'Company Name',
    industry: 'Industry',
    city: 'City',
    requiredAreaSqFt: 'Required Area',
    contactName: 'Contact Person',
    phone: 'Phone',
    email: 'Email',
    requirement: 'Requirement Description',
  });

  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Parse CSV helper
  const parseCSVText = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;

    const head = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      // Basic CSV regex to handle commas in quotes
      const values: string[] = [];
      let inQuotes = false;
      let currentVal = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^"|"$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^"|"$/g, ''));

      const rowObj: Record<string, string> = {};
      head.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      return rowObj;
    });

    setHeaders(head);
    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      parseCSVText(content);
      setStep(2);
      success('File Loaded', `Parsed ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    parseCSVText(SAMPLE_CSV_DATA);
    setStep(2);
  };

  const handleValidateAndProceed = () => {
    setStep(3);
  };

  const handleExecuteImport = () => {
    const result = StorageService.importFromParsedData(parsedRows, columnMapping);
    setImportResult(result);
    setStep(4);
    success('Migration Completed', `Imported ${result.importedCount} records to Fairway CRM.`);
  };

  const downloadSampleTemplate = () => {
    const element = document.createElement('a');
    const file = new Blob([SAMPLE_CSV_DATA], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = 'Fairway_CRM_Inquiry_Import_Template.csv';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Migration</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <UploadCloud className="w-6 h-6 text-indigo-600" />
            <span>Excel / CSV Inquiry Migration Wizard</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Migrate legacy Excel spreadsheets and inquiry logs directly into Fairway CRM with field mapping and validation.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={downloadSampleTemplate} leftIcon={<Download className="w-3.5 h-3.5" />}>
          Download Template
        </Button>
      </div>

      {/* 4-Step Stepper Progress Bar */}
      <div className="flex items-center justify-between gap-2 bg-surface p-3 sm:p-4 rounded-card border border-border shadow-subtle overflow-x-auto">
        {[
          { num: 1, label: '1. Upload File', shortLabel: 'Upload' },
          { num: 2, label: '2. Map Columns', shortLabel: 'Map' },
          { num: 3, label: '3. Validate Data', shortLabel: 'Validate' },
          { num: 4, label: '4. Import Summary', shortLabel: 'Summary' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > s.num
                  ? 'bg-fairway-600 text-white'
                  : step === s.num
                  ? 'bg-fairway-100 text-fairway-900 border-2 border-fairway-600'
                  : 'bg-surface-muted text-foreground-muted'
              }`}
            >
              {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : s.num}
            </div>
            <span className={`text-[11px] sm:text-xs whitespace-nowrap ${step === s.num ? 'font-bold text-foreground' : 'text-foreground-muted'}`}>
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.shortLabel}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ================= STEP 1: UPLOAD ================= */}
      {step === 1 && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-fairway-50 text-fairway-600 flex items-center justify-center mx-auto border border-fairway-200">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Upload your CSV or Excel Spreadsheet</h3>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Upload historical inquiry databases, expo lead lists, or broker client logs to bulk import into Fairway CRM.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <label className="w-full flex items-center justify-center px-4 py-2.5 bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold rounded-button cursor-pointer transition-colors shadow-subtle">
                <UploadCloud className="w-4 h-4 mr-2" />
                <span>Select CSV File</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>

              <Button variant="secondary" size="sm" onClick={handleLoadSample} leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>
                Load Demo Sample Dataset (5 Rows)
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ================= STEP 2: MAP COLUMNS ================= */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Step 2: Map Spreadsheet Columns to CRM Fields</CardTitle>
              <p className="text-xs text-foreground-muted">Verify auto-detected columns or re-assign fields</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded">
              {parsedRows.length} Rows Detected
            </span>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">Company Name *</label>
              <select
                value={columnMapping.companyName}
                onChange={(e) => setColumnMapping({ ...columnMapping, companyName: e.target.value })}
                className="w-full bg-surface border border-border rounded-input p-2 text-xs"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Required Area (sq.ft) *</label>
              <select
                value={columnMapping.requiredAreaSqFt}
                onChange={(e) => setColumnMapping({ ...columnMapping, requiredAreaSqFt: e.target.value })}
                className="w-full bg-surface border border-border rounded-input p-2 text-xs"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Target City / Location</label>
              <select
                value={columnMapping.city}
                onChange={(e) => setColumnMapping({ ...columnMapping, city: e.target.value })}
                className="w-full bg-surface border border-border rounded-input p-2 text-xs"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Industry</label>
              <select
                value={columnMapping.industry}
                onChange={(e) => setColumnMapping({ ...columnMapping, industry: e.target.value })}
                className="w-full bg-surface border border-border rounded-input p-2 text-xs"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Contact Person</label>
              <select
                value={columnMapping.contactName}
                onChange={(e) => setColumnMapping({ ...columnMapping, contactName: e.target.value })}
                className="w-full bg-surface border border-border rounded-input p-2 text-xs"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Phone Number</label>
              <select
                value={columnMapping.phone}
                onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                className="w-full bg-surface border border-border rounded-input p-2 text-xs"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-6 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" size="sm" onClick={handleValidateAndProceed} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Validate & Preview Rows
            </Button>
          </div>
        </Card>
      )}

      {/* ================= STEP 3: VALIDATION ================= */}
      {step === 3 && (
        <Card className="space-y-4">
          <CardHeader>
            <div>
              <CardTitle>Step 3: Preview & Diagnostic Validation</CardTitle>
              <p className="text-xs text-foreground-muted">
                System checks required fields, area numeric parsing, and duplicate account names.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded">
              Ready to Import
            </span>
          </CardHeader>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-border rounded-lg max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-[11px] font-bold uppercase text-foreground-muted sticky top-0">
                <tr>
                  <th className="p-2.5">Row</th>
                  <th className="p-2.5">Company</th>
                  <th className="p-2.5">Industry</th>
                  <th className="p-2.5">City</th>
                  <th className="p-2.5">Area</th>
                  <th className="p-2.5">Contact</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedRows.map((r, i) => {
                  const companyName = r[columnMapping.companyName];
                  const areaStr = r[columnMapping.requiredAreaSqFt];
                  const area = parseInt(areaStr, 10);
                  const isInvalid = !companyName || isNaN(area) || area <= 0;

                  return (
                    <tr key={i} className={isInvalid ? 'bg-rose-50/40 text-rose-900' : 'hover:bg-surface-muted/30'}>
                      <td className="p-2.5 font-mono">{i + 1}</td>
                      <td className="p-2.5 font-bold">{companyName || '⚠️ Missing'}</td>
                      <td className="p-2.5">{r[columnMapping.industry]}</td>
                      <td className="p-2.5">{r[columnMapping.city]}</td>
                      <td className="p-2.5 font-mono">{isNaN(area) || area <= 0 ? '⚠️ Invalid Area' : `${area.toLocaleString()} sq.ft`}</td>
                      <td className="p-2.5">{r[columnMapping.contactName]}</td>
                      <td className="p-2.5">
                        {isInvalid ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                            Will Skip
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
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
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              Back to Mapping
            </Button>
            <Button variant="primary" size="sm" onClick={handleExecuteImport} leftIcon={<UploadCloud className="w-4 h-4" />}>
              Confirm & Execute Migration
            </Button>
          </div>
        </Card>
      )}

      {/* ================= STEP 4: RESULT SUMMARY ================= */}
      {step === 4 && importResult && (
        <Card className="space-y-6">
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-card flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">Migration Batch Completed Successfully!</h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Imported <strong>{importResult.importedCount}</strong> records into Fairway CRM database.
                {importResult.skippedCount > 0 && ` (${importResult.skippedCount} invalid rows skipped).`}
              </p>
            </div>
          </div>

          {/* Diagnostics Error Report Table (Mandated by Section 11 / Section 27) */}
          {importResult.errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-2">
              <h4 className="font-bold text-rose-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Diagnostic Error Report ({importResult.errors.length} skipped)</span>
              </h4>
              <div className="space-y-1">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="p-2 bg-white rounded border border-rose-200 flex items-center justify-between">
                    <span>Row {err.row}: <strong>{err.field}</strong> — {err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Import Another File
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onNavigateToCompanies} leftIcon={<Building2 className="w-3.5 h-3.5" />}>
                View Companies
              </Button>
              <Button variant="primary" size="sm" onClick={onNavigateToInquiries} leftIcon={<FileText className="w-3.5 h-3.5" />}>
                View Inquiries Pipeline
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export const ImportWizardPage = ImportWizardView;
export default ImportWizardPage;
