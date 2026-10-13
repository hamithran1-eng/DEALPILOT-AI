import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, FileText, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api/client';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [csvText, setCsvText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    job_title: string;
    company_name: string;
    industry: string;
    deal_value: string;
    notes: string;
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_name: '',
    industry: '',
    deal_value: '',
    notes: '',
  });

  const [step, setStep] = useState<'input' | 'mapping' | 'result'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total_processed: number;
    imported: number;
    duplicates: number;
    errors: number;
  } | null>(null);

  if (!isOpen) return null;

  const parseCsv = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row.');
    }

    // CSV parser handling quoted commas
    const parseLine = (line: string): string[] => {
      const tokens: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          tokens.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      tokens.push(current.trim());
      return tokens;
    };

    const headers = parseLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const handleProcessCsv = () => {
    if (!csvText.trim()) {
      setError('Please paste or upload CSV data.');
      return;
    }

    try {
      setError(null);
      const { headers, rows } = parseCsv(csvText);
      setParsedHeaders(headers);
      setParsedRows(rows);

      // Auto-detect mappings
      const initialMap = { ...mapping };
      headers.forEach(h => {
        const low = h.toLowerCase();
        if (/first.*name|fname|first/i.test(low)) initialMap.first_name = h;
        if (/last.*name|lname|last|surname/i.test(low)) initialMap.last_name = h;
        if (/email|mail/i.test(low)) initialMap.email = h;
        if (/phone|mobile|cell/i.test(low)) initialMap.phone = h;
        if (/title|role|position|designation/i.test(low)) initialMap.job_title = h;
        if (/company|organization|account|firm/i.test(low)) initialMap.company_name = h;
        if (/industry|sector|vertical/i.test(low)) initialMap.industry = h;
        if (/value|deal|amount|arr|acv|inr|rupee/i.test(low)) initialMap.deal_value = h;
        if (/notes|note|comment|description/i.test(low)) initialMap.notes = h;
      });

      // fallback if only 'name' exists
      if (!initialMap.first_name && headers.some(h => /name/i.test(h))) {
        initialMap.first_name = headers.find(h => /name/i.test(h)) || '';
      }

      setMapping(initialMap);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!mapping.email) {
      setError('Please map the required Email field.');
      return;
    }

    setLoading(true);
    setError(null);

    // Transform rows
    const transformed = parsedRows.map(row => {
      let firstName = row[mapping.first_name] || '';
      let lastName = row[mapping.last_name] || '';

      if (!lastName && firstName.includes(' ')) {
        const parts = firstName.split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }

      return {
        first_name: firstName || 'Lead',
        last_name: lastName || 'Contact',
        email: row[mapping.email] || '',
        phone: row[mapping.phone] || undefined,
        job_title: row[mapping.job_title] || undefined,
        company_name: row[mapping.company_name] || undefined,
        industry: row[mapping.industry] || undefined,
        deal_value: row[mapping.deal_value] ? Number(row[mapping.deal_value].replace(/[^0-9.]/g, '')) : undefined,
        notes: row[mapping.notes] || undefined,
      };
    });

    try {
      const res = await api.importCsv(transformed);
      setResult(res);
      setStep('result');
      onImportComplete();
    } catch (err: any) {
      setError(err.message || 'CSV Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setCsvText(`First Name,Last Name,Email,Company,Title,Industry,Deal Value INR\nAarav,Sharma,aarav.sharma@tarento.in,Tarento Technologies,CTO,Enterprise SaaS,750000\nPriya,Nair,priya.nair@razorflow.co,Razorflow Analytics,Head of Product,Fintech,450000\nVikram,Malhotra,vikram@indusexchange.in,Indus Exchange,VP Revenue,B2B Logistics,1200000`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-modal rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/80 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4.5 border-b border-slate-100/80 bg-white/40 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-600 flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Import Verified Leads via CSV</h3>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                  ₹ INR Values
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Column auto-mapping, duplicate checking, and strict database insertion.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50/90 border border-rose-200/80 rounded-xl text-xs text-rose-700 flex items-center gap-2 backdrop-blur-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload CSV File or Paste Raw Text
                </label>
                <div className="border-2 border-dashed border-slate-200/90 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors glass-card">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 mb-1">
                    Drag and drop your Indian sales leads export, or browse files
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Or paste CSV text with INR opportunity headers:
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleData}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Load Indian B2B sample
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder="First Name,Last Name,Email,Company,Title,Industry,Deal Value INR&#10;Aarav,Sharma,aarav.sharma@tarento.in,Tarento Technologies,CTO,Enterprise SaaS,750000"
                  className="w-full px-3 py-2 text-xs font-mono glass-input rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-card rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessCsv}
                  disabled={!csvText.trim()}
                  className="px-4.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  Parse & Map Columns →
                </button>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50/80 p-3 rounded-xl border border-indigo-200/60 text-xs">
                <div>
                  <span className="font-bold text-indigo-950">Detected {parsedRows.length} Rows</span>
                  <span className="text-slate-500 ml-2">({parsedHeaders.length} columns)</span>
                </div>
                <span className="text-[11px] text-indigo-700 font-medium">Verify field mapping below</span>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {[
                  { key: 'first_name', label: 'First Name', required: true },
                  { key: 'last_name', label: 'Last Name', required: false },
                  { key: 'email', label: 'Corporate Email', required: true },
                  { key: 'phone', label: 'Phone Number', required: false },
                  { key: 'job_title', label: 'Job Title / Role', required: false },
                  { key: 'company_name', label: 'Company Name', required: false },
                  { key: 'industry', label: 'Industry', required: false },
                  { key: 'deal_value', label: 'Deal Value (₹ INR)', required: false },
                  { key: 'notes', label: 'Context Notes', required: false },
                ].map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      value={(mapping as any)[field.key]}
                      onChange={e =>
                        setMapping({ ...mapping, [field.key]: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs glass-input rounded-xl focus:outline-none bg-white/90"
                    >
                      <option value="">-- Do not map --</option>
                      {parsedHeaders.map(h => (
                        <option key={h} value={h}>
                          {h} (e.g. "{parsedRows[0]?.[h] || ''}")
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100/80">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-card rounded-xl hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={loading || !mapping.email}
                  className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Real Import ({parsedRows.length} Rows)</span>
                </button>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  CSV Import Operation Finished
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Database populated with verified prospect records and INR opportunity values.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 glass-card rounded-xl">
                  <span className="text-xs text-slate-500 block">Imported</span>
                  <span className="text-lg font-bold text-emerald-600 font-mono">
                    {result.imported}
                  </span>
                </div>
                <div className="p-3 glass-card rounded-xl">
                  <span className="text-xs text-slate-500 block">Duplicates</span>
                  <span className="text-lg font-bold text-slate-600 font-mono">
                    {result.duplicates}
                  </span>
                </div>
                <div className="p-3 glass-card rounded-xl">
                  <span className="text-xs text-slate-500 block">Invalid/Errors</span>
                  <span className="text-lg font-bold text-rose-600 font-mono">
                    {result.errors}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm"
                >
                  Done & View Leads (₹)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
