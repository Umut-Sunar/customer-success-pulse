import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { TenantImportResult } from '../../types/tenant';

interface TenantUploadProps {
  onImportComplete: () => void;
}

export const TenantUpload: React.FC<TenantUploadProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<TenantImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use Vercel API route
      const response = await fetch('/api/tenants/import', {
        method: 'POST',
        body: formData,
      });

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to import tenants';
        try {
          if (text && contentType?.includes('application/json')) {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } else if (text) {
            errorMessage = text;
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        } catch (e) {
          // If JSON parse fails, use the text or status text
          errorMessage = text || response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse JSON response
      let importResult: TenantImportResult;
      try {
        if (text && contentType?.includes('application/json')) {
          importResult = JSON.parse(text);
        } else if (text) {
          // Try to parse anyway
          importResult = JSON.parse(text);
        } else {
          throw new Error('Empty response from server');
        }
      } catch (e) {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      setResult(importResult);
      
      if (importResult.newTenants > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <FileText size={20} />
        Import Tenants from CSV
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select CSV File
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 transition-colors">
                <Upload size={20} className="text-slate-400" />
                <span className="text-slate-600">
                  {file ? file.name : 'Choose CSV file...'}
                </span>
              </div>
            </label>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Upload Failed</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-emerald-800 font-medium">Import Completed</p>
                <div className="mt-2 space-y-1 text-sm text-emerald-700">
                  <p>Total rows processed: {result.totalRows}</p>
                  <p>New tenants added: {result.newTenants}</p>
                  <p>Duplicates skipped: {result.skippedDuplicates}</p>
                  {result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-2">Errors ({result.errors.length}):</p>
                      <div className="bg-white rounded border border-emerald-200 max-h-60 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-slate-600 font-semibold">Row</th>
                              <th className="px-3 py-2 text-left text-slate-600 font-semibold">Error</th>
                              <th className="px-3 py-2 text-left text-slate-600 font-semibold">Available Data</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {result.errors.map((err, idx) => {
                              // Parse error message: "Row X: Error - Data..."
                              const match = err.match(/^Row (\d+): (.+?)(?: - (.+))?$/);
                              if (match) {
                                const [, rowNum, errorMsg, dataInfo] = match;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 font-mono text-slate-700">{rowNum}</td>
                                    <td className="px-3 py-2 text-red-600">{errorMsg}</td>
                                    <td className="px-3 py-2 text-slate-600 text-xs">
                                      {dataInfo || <span className="text-slate-400 italic">No data</span>}
                                    </td>
                                  </tr>
                                );
                              }
                              // Fallback for non-parsed errors
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-3 py-2" colSpan={3}>
                                    <span className="text-red-600">{err}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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

