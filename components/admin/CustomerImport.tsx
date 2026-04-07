import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react';

const REQUIRED_HEADERS = ['name'];
const OPTIONAL_HEADERS = ['domain', 'segment', 'mrr', 'status', 'contract_start', 'contract_end', 'account_manager'];
const TEMPLATE_HEADERS = ['name', 'domain', 'segment', 'mrr', 'status', 'contract_start', 'contract_end', 'account_manager'];

interface CustomerImportProps {
  onImportComplete?: () => void;
}

function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    n[k.toLowerCase().trim()] = String(v ?? '').trim();
  }
  return n;
}

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',');
  const example = 'Acme Corp,acme.com,Mid-Market,5000,Active,2024-01-01,2024-12-31,Alice Smith';
  const csv = [header, example].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'customers-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

export const CustomerImport: React.FC<CustomerImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setValidationWarning(null);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map(normalizeRow);
        setParsedRows(rows);
        const first = rows[0];
        if (first && !REQUIRED_HEADERS.every((h) => h in first)) {
          setValidationWarning('Required column "name" is missing or empty in some rows.');
        } else {
          setValidationWarning(null);
        }
      },
      error: (err) => {
        setError(err.message || 'Failed to parse CSV');
        setParsedRows([]);
      },
    });
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      setError('No valid rows to import');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const payload = parsedRows.map((row) => ({
        name: row.name ?? '',
        domain: row.domain ?? '',
        segment: row.segment ?? 'Mid-Market',
        mrr: row.mrr ?? '0',
        status: row.status ?? 'Active',
        contract_start: row.contract_start || undefined,
        contract_end: row.contract_end || undefined,
        account_manager: row.account_manager || undefined,
      }));
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = JSON.parse(text || '{}');
      if (!res.ok) {
        setError(data.error || res.statusText);
        return;
      }
      setResult({ added: data.added ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? [] });
      if (data.added > 0 && onImportComplete) onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const previewRows = parsedRows.slice(0, 5);
  const hasNameColumn = parsedRows.length > 0 && 'name' in parsedRows[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <FileText size={20} />
        Import Customers from CSV
      </h3>
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <div className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 transition-colors">
              <Upload size={20} className="text-slate-400" />
              <span className="text-slate-600">{file ? file.name : 'Choose CSV file...'}</span>
            </div>
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
          >
            <Download size={18} />
            Download Template
          </button>
        </div>

        {validationWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            {validationWarning}
          </div>
        )}

        {previewRows.length > 0 && (
          <>
            <p className="text-sm text-slate-600">Preview (first 5 rows)</p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {TEMPLATE_HEADERS.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {TEMPLATE_HEADERS.map((h) => (
                        <td key={h} className="px-3 py-2 text-slate-700">
                          {row[h.toLowerCase()] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={uploading || !hasNameColumn}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import {parsedRows.length} customers
                </>
              )}
            </button>
          </>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Import failed</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-emerald-800 font-medium">Import completed</p>
                <div className="mt-2 space-y-1 text-sm text-emerald-700">
                  <p>Added: {result.added}</p>
                  <p>Skipped: {result.skipped}</p>
                  {result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-2">Errors ({result.errors.length})</p>
                      <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto bg-white rounded border border-emerald-200 p-2 text-red-700 text-xs">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
