import { useState, type ChangeEvent, type DragEvent } from 'react';
import { X, Upload, CheckCircle, RefreshCw } from 'lucide-react';
import {
  UPLOAD_DATASETS,
  BORDER_COLORS,
  type UploadDatasetKey,
} from '../../lib/upload-datasets';
import { useDataStore } from '../../store/dataStore';

export interface DataUploadModalProps {
  open: boolean;
  onClose: () => void;
}

type UploadState = { filename: string; count: number; uploadedAt: number } | null;

function formatUploadTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

export function DataUploadModal({ open, onClose }: DataUploadModalProps) {
  const {
    uploadedFiles,
    markFileUploaded,
    meetings,
    pmScores,
    customerInsights,
    riskSignals,
    knowledgeItems,
    pipelineOrders,
    liveOrders,
    setMeetings,
    setPmScores,
    setCustomerInsights,
    setRiskSignals,
    setKnowledgeItems,
    setPipelineOrders,
    setLiveOrders,
    setParsingMeetings,
    setParsingPmScores,
    setParsingSales,
  } = useDataStore();

  const [slotState, setSlotState] = useState<Record<string, UploadState>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const rowCountFromStore = (key: UploadDatasetKey): number => {
    switch (key) {
      case 'meetings_master':
        return meetings.length;
      case 'pm_scores':
        return pmScores.length;
      case 'customer_insights':
        return customerInsights.length;
      case 'risk_signals':
        return riskSignals.length;
      case 'knowledge_management':
        return knowledgeItems.length;
      case 'sales_pipeline':
        return pipelineOrders.length;
      case 'sales_live':
        return liveOrders.length;
      default: {
        const _exhaustive: never = key;
        return _exhaustive;
      }
    }
  };

  async function processFile(
    slotKey: UploadDatasetKey,
    parser: (file: File) => Promise<unknown[]>,
    setter: (data: unknown) => void,
    file: File
  ) {
    setLoading(slotKey);
    setToast(null);
    if (slotKey === 'meetings_master') setParsingMeetings(true);
    else if (slotKey === 'pm_scores') setParsingPmScores(true);
    else if (slotKey === 'sales_pipeline' || slotKey === 'sales_live') setParsingSales(true);
    try {
      const data = await parser(file);
      setter(data);
      markFileUploaded(slotKey);
      setSlotState((prev) => ({
        ...prev,
        [slotKey]: { filename: file.name, count: data.length, uploadedAt: Date.now() },
      }));
      setToast({ message: `${file.name}: ${data.length} rows loaded` });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setLoading(null);
      if (slotKey === 'meetings_master') setParsingMeetings(false);
      else if (slotKey === 'pm_scores') setParsingPmScores(false);
      else if (slotKey === 'sales_pipeline' || slotKey === 'sales_live') setParsingSales(false);
    }
  }

  const setters = {
    setMeetings,
    setPmScores,
    setCustomerInsights,
    setRiskSignals,
    setKnowledgeItems,
    setPipelineOrders,
    setLiveOrders,
  };

  const handleDrop = (slot: (typeof UPLOAD_DATASETS)[number], e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) processFile(slot.key, slot.parser, setters[slot.setterKey], file);
  };

  const handleInputChange = (slot: (typeof UPLOAD_DATASETS)[number], e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(slot.key, slot.parser, setters[slot.setterKey], file);
    e.target.value = '';
  };

  const uploadedCount = UPLOAD_DATASETS.filter((s) => uploadedFiles[s.key]).length;
  const allUploaded = uploadedCount === 7;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl flex flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Upload Data Files</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {UPLOAD_DATASETS.map((slot) => {
              const state = slotState[slot.key];
              const isUploaded = !!uploadedFiles[slot.key];
              const borderColor = BORDER_COLORS[slot.color] ?? BORDER_COLORS.slate;
              const isLoading = loading === slot.key;
              const displayRows = state != null ? state.count : isUploaded ? rowCountFromStore(slot.key) : 0;
              const filenameLabel =
                state?.filename ?? (isUploaded ? 'Restored from saved data' : '');
              const lastUploadLabel = state?.uploadedAt != null ? formatUploadTime(state.uploadedAt) : null;

              return (
                <div
                  key={slot.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(slot, e)}
                  className={`group relative rounded-lg border-2 border-dashed p-4 transition-colors ${borderColor}`}
                >
                  <label className="flex min-w-0 cursor-pointer flex-col gap-2">
                    <input
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={(e) => handleInputChange(slot, e)}
                      disabled={isLoading}
                    />

                    <div className="min-w-0 w-full">
                      <p
                        className="truncate font-mono text-[10px] font-medium uppercase tracking-wide text-slate-500"
                        title={slot.key}
                      >
                        {slot.key}
                      </p>
                      <p className="break-words text-sm font-semibold leading-snug text-slate-800">
                        {slot.title}
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                        {slot.description}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        <span className="text-slate-400">Example columns:</span> {slot.columnHints}
                      </p>
                    </div>

                    {!isUploaded ? (
                      <div className="flex min-w-0 items-start gap-2 pt-1 text-slate-600">
                        <Upload className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                        <span className="text-sm leading-snug">Drop CSV here or click to upload</span>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-col gap-2 border-t border-slate-200/80 pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Uploaded
                          </span>
                        </div>
                        <div className="min-w-0 break-all text-sm text-slate-700" title={filenameLabel}>
                          {filenameLabel}
                        </div>
                        <div className="text-sm text-slate-600">
                          {displayRows} {displayRows === 1 ? 'row' : 'rows'}
                        </div>
                        {lastUploadLabel && (
                          <div className="text-xs text-slate-500">Last upload: {lastUploadLabel}</div>
                        )}
                        <div className="flex justify-end pt-0.5">
                          <span className="inline-flex items-center gap-1 text-sm text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
                            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
                            Re-upload
                          </span>
                        </div>
                      </div>
                    )}
                  </label>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
                      <span className="text-sm font-medium text-slate-600">Loading…</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {toast && (
            <div className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm text-green-800">{toast.message}</div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4">
          {allUploaded && (
            <div className="rounded-lg bg-green-100 px-4 py-2 text-center text-sm font-medium text-green-800">
              All data loaded — dashboard is ready!
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">
              {uploadedCount} of 7 files uploaded
            </span>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
