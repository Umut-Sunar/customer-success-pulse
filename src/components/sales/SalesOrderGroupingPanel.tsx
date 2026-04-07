import { useMemo, useState } from 'react';
import { Link2, Unlink } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { getRootRecordId } from '../../lib/sales-order-groups';

type Kind = 'live' | 'pipeline';

export function SalesOrderGroupingPanel() {
  const liveOrders = useDataStore((s) => s.liveOrders);
  const pipelineOrders = useDataStore((s) => s.pipelineOrders);
  const liveParentByChildId = useDataStore((s) => s.liveParentByChildId);
  const pipelineParentByChildId = useDataStore((s) => s.pipelineParentByChildId);
  const setSoParent = useDataStore((s) => s.setSoParent);

  const [kind, setKind] = useState<Kind>('live');
  const [childId, setChildId] = useState('');
  const [parentId, setParentId] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const orders = kind === 'live' ? liveOrders : pipelineOrders;
  const parentMap = kind === 'live' ? liveParentByChildId : pipelineParentByChildId;

  const orderOptions = useMemo(
    () =>
      [...orders].sort((a, b) =>
        (a.subject || '').localeCompare(b.subject || '', undefined, { sensitivity: 'base' })
      ),
    [orders]
  );

  const parentCandidates = useMemo(() => {
    if (!childId) return orderOptions;
    return orderOptions.filter((o) => o.record_id !== childId);
  }, [orderOptions, childId]);

  const currentParentLabel = useMemo(() => {
    if (!childId) return null;
    const p = parentMap[childId];
    if (!p) return '— (root)';
    const po = orders.find((o) => o.record_id === p);
    return po ? `${po.subject} (${p.slice(-8)}…)` : p;
  }, [childId, parentMap, orders]);

  const handleLink = () => {
    setMessage(null);
    if (!childId || !parentId) {
      setMessage({ type: 'err', text: 'Select both child and parent SO.' });
      return;
    }
    const r = setSoParent(kind, childId, parentId);
    if (!r.ok) {
      setMessage({ type: 'err', text: r.reason });
      return;
    }
    setMessage({ type: 'ok', text: 'Linked. Child appears under parent in tables.' });
    setParentId('');
  };

  const handleUnlink = () => {
    setMessage(null);
    if (!childId) {
      setMessage({ type: 'err', text: 'Select child SO to remove parent link.' });
      return;
    }
    if (!parentMap[childId]) {
      setMessage({ type: 'err', text: 'This SO has no parent link.' });
      return;
    }
    setSoParent(kind, childId, null);
    setMessage({ type: 'ok', text: 'Parent link removed.' });
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        Upload {kind === 'live' ? 'Live' : 'Pipeline'} CSV to manage SO groups.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-800">SO groups (parent / child)</h4>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setKind('live');
              setChildId('');
              setParentId('');
              setMessage(null);
            }}
            className={`rounded-md px-2 py-1 ${kind === 'live' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => {
              setKind('pipeline');
              setChildId('');
              setParentId('');
              setMessage(null);
            }}
            className={`rounded-md px-2 py-1 ${kind === 'pipeline' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          >
            Pipeline
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-600 max-w-3xl">
        Pick a <span className="font-medium">child</span> line (e.g. Kalam CX Telco) and a{' '}
        <span className="font-medium">parent</span> (e.g. Kalam CX). PM metrics count one project per group; MRR sums.
        Root = no parent.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-slate-600">
          Child SO
          <select
            value={childId}
            onChange={(e) => {
              setChildId(e.target.value);
              setMessage(null);
            }}
            className="min-w-[14rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">— Select —</option>
            {orderOptions.map((o) => (
              <option key={o.record_id} value={o.record_id}>
                {(o.subject || o.record_id).slice(0, 48)}
                {o.subject && o.subject.length > 48 ? '…' : ''} · {o.record_id.slice(-10)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-slate-600">
          Parent SO
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="min-w-[14rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">— Select —</option>
            {parentCandidates.map((o) => (
              <option key={o.record_id} value={o.record_id}>
                {(o.subject || o.record_id).slice(0, 48)}
                {o.subject && o.subject.length > 48 ? '…' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleLink}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Link2 className="h-4 w-4" />
          Link
        </button>
        <button
          type="button"
          onClick={handleUnlink}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Unlink className="h-4 w-4" />
          Unlink child
        </button>
      </div>
      {childId ? (
        <p className="text-xs text-slate-600">
          Current parent: <span className="font-medium text-slate-800">{currentParentLabel}</span> · Root id:{' '}
          <span className="font-mono text-xs">{getRootRecordId(childId, parentMap)}</span>
        </p>
      ) : null}
      {message ? (
        <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>
      ) : null}
    </div>
  );
}
