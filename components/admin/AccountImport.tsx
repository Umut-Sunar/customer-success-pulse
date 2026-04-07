import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react';

const TEMPLATE_HEADERS = [
  'account_name',
  'client_name',
  'tenant_name',
  'last_month_mrr',
  'project_manager',
  'status',
  'country',
  'service_country',
];

interface AccountImportProps {
  onImportComplete?: () => void;
}

function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    n[k.toLowerCase().trim().replace(/\s+/g, '_')] = String(v ?? '').trim();
  }
  return n;
}

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',');
  const rows = [
    'BPO Corp,Client A,tenant-a,5000,John Smith,Live,Turkey,Germany',
    'BPO Corp,Client B,tenant-b,3000,John Smith,Setup,Turkey,UK',
    'Direct Inc,Direct Inc,tenant-direct,10000,Alice Johnson,Live,US,US',
  ];
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'accounts-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

interface ImportResult {
  accounts_added: number;
  accounts_updated: number;
  clients_added: number;
  errors: string[];
}

export const AccountImport: React.FC<AccountImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
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
        if (first && !('account_name' in first)) {
          setValidationWarning('Required column "account_name" is missing. Please check your CSV headers.');
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
        account_name: row.account_name ?? '',
        client_name: row.client_name ?? row.account_name ?? '',
        tenant_name: row.tenant_name || undefined,
        mrr: row.last_month_mrr || row.mrr || '0',
        project_manager: row.project_manager || undefined,
        status: row.status || 'Setup',
        country: row.country || undefined,
        service_country: row.service_country || undefined,
      }));
      const res = await fetch('/api/accounts/import', {
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
      setResult({
        accounts_added: data.accounts_added ?? 0,
        accounts_updated: data.accounts_updated ?? 0,
        clients_added: data.clients_added ?? 0,
        errors: data.errors ?? [],
      });
      if ((data.accounts_added > 0 || data.accounts_updated > 0) && onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const uniqueAccounts = new Set(parsedRows.map((r) => r.account_name).filter(Boolean));
  const previewRows = parsedRows.slice(0, 8);
  const hasAccountNameColumn = parsedRows.length > 0 && 'account_name' in parsedRows[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <FileText size={20} />
        Import Accounts from CSV
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
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>Preview (first {previewRows.length} of {parsedRows.length} rows)</span>
              <span className="text-blue-600 font-medium">{uniqueAccounts.size} unique accounts</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {TEMPLATE_HEADERS.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-700 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {TEMPLATE_HEADERS.map((h) => (
                        <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                          {row[h] ?? '—'}
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
              disabled={uploading || !hasAccountNameColumn}
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
                  Import {uniqueAccounts.size} accounts ({parsedRows.length} clients)
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
                  <p>Accounts added: {result.accounts_added}</p>
                  <p>Accounts updated: {result.accounts_updated}</p>
                  <p>Clients added: {result.clients_added}</p>
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
