import { Fragment, useState, useMemo, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
} from 'recharts';
import { useDataStore } from '../../store/dataStore';
import type { SalesOrderPipeline } from '../../types/sales.types';
import {
  getLiveOrderYear,
  getPipelineOrderYear,
  getSalesLiveDisplayDate,
  parseDateToMonthKey,
  parseDateToYear,
} from '../../lib/sales-utils';
import {
  computePmSalesSummaryRowsGrouped,
  computeMonthCloseAvgRowsGrouped,
  type MonthCloseAvgRow,
} from '../../lib/sales-pm-analytics';
import {
  buildLiveGroupUnits,
  buildPipelineGroupUnits,
  buildOrderedHierarchyRows,
  filterLiveGroupUnitsByDueDateYear,
} from '../../lib/sales-order-groups';
import { ChartShell } from '../shared/ChartShell';
import { SkeletonCard } from '../shared/SkeletonCard';
import { SalesOrderGroupingPanel } from './SalesOrderGroupingPanel';

const PAGE_SIZE = 15;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n ?? 0);
}

function getInitials(name: string): string {
  return (name || '')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d < new Date();
}

function pipelineStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'setup') return 'bg-blue-100 text-blue-800';
  if (s === 'hold') return 'bg-orange-100 text-orange-800';
  return 'bg-slate-100 text-slate-700';
}

const PM_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export function SalesOrders() {
  const liveOrders = useDataStore((s) => s.liveOrders);
  const pipelineOrders = useDataStore((s) => s.pipelineOrders);
  const liveParentByChildId = useDataStore((s) => s.liveParentByChildId);
  const pipelineParentByChildId = useDataStore((s) => s.pipelineParentByChildId);
  const isParsingSales = useDataStore((s) => s.isParsingSales);
  const deletePipelineOrder = useDataStore((s) => s.deletePipelineOrder);
  const updatePipelineOrder = useDataStore((s) => s.updatePipelineOrder);

  const [pmFilter, setPmFilter] = useState<string>('All PMs');
  /** Pipeline status: All veya CSV’deki tam status string’i */
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  /** Boş = tüm aylar; YYYY-MM = Active (Live) ay filtresi */
  const [liveMonthFilter, setLiveMonthFilter] = useState('');
  /** null = KPI + grafik + recent activity için tüm yıllar */
  const [summaryYear, setSummaryYear] = useState<number | null>(null);
  const [livePage, setLivePage] = useState(1);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [editingPipeline, setEditingPipeline] = useState<SalesOrderPipeline | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<SalesOrderPipeline> | null>(null);

  const allPms = useMemo(() => {
    const set = new Set<string>();
    liveOrders.forEach((o) => o.project_manager && set.add(o.project_manager));
    pipelineOrders.forEach((o) => o.project_manager && set.add(o.project_manager));
    return ['All PMs', ...Array.from(set).sort()];
  }, [liveOrders, pipelineOrders]);

  const summaryYearOptions = useMemo(() => {
    const ys = new Set<number>();
    liveOrders.forEach((o) => {
      const y = getLiveOrderYear(o);
      if (y != null) ys.add(y);
      const yDue = parseDateToYear((o.due_date || '').trim());
      if (yDue != null) ys.add(yDue);
    });
    pipelineOrders.forEach((o) => {
      const y = getPipelineOrderYear(o);
      if (y != null) ys.add(y);
    });
    return Array.from(ys).sort((a, b) => b - a);
  }, [liveOrders, pipelineOrders]);

  const liveForSummary = useMemo(() => {
    if (summaryYear === null) return liveOrders;
    return liveOrders.filter((o) => getLiveOrderYear(o) === summaryYear);
  }, [liveOrders, summaryYear]);

  const pipelineForSummary = useMemo(() => {
    if (summaryYear === null) return pipelineOrders;
    return pipelineOrders.filter((o) => getPipelineOrderYear(o) === summaryYear);
  }, [pipelineOrders, summaryYear]);

  const setupCount = useMemo(
    () => pipelineForSummary.filter((o) => (o.status || '').toLowerCase() === 'setup').length,
    [pipelineForSummary]
  );
  const holdCount = useMemo(
    () => pipelineForSummary.filter((o) => (o.status || '').toLowerCase() === 'hold').length,
    [pipelineForSummary]
  );

  const pipelineStatusOptions = useMemo(() => {
    const seen = new Set<string>();
    pipelineOrders.forEach((o) => {
      const s = (o.status || '').trim();
      if (s) seen.add(s);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [pipelineOrders]);

  const filteredLive = useMemo(() => {
    let list = liveOrders;
    if (pmFilter !== 'All PMs') list = list.filter((o) => o.project_manager === pmFilter);
    if (liveMonthFilter) {
      list = list.filter((o) => {
        const monthKey = parseDateToMonthKey(getSalesLiveDisplayDate(o));
        return monthKey === liveMonthFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.subject || '').toLowerCase().includes(q) ||
          (o.account_name || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.grand_total ?? 0) - (a.grand_total ?? 0));
  }, [liveOrders, pmFilter, liveMonthFilter, search]);

  const filteredPipeline = useMemo(() => {
    let list = pipelineOrders;
    if (pmFilter !== 'All PMs') list = list.filter((o) => o.project_manager === pmFilter);
    if (statusFilter !== 'All') {
      list = list.filter((o) => (o.status || '').trim() === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.subject || '').toLowerCase().includes(q) ||
          (o.account_name || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.grand_total ?? 0) - (a.grand_total ?? 0));
  }, [pipelineOrders, pmFilter, statusFilter, search]);

  useEffect(() => {
    setLivePage(1);
  }, [liveMonthFilter, pmFilter, search]);

  useEffect(() => {
    setPipelinePage(1);
  }, [statusFilter, pmFilter, search]);

  useEffect(() => {
    if (statusFilter !== 'All' && !pipelineStatusOptions.includes(statusFilter)) {
      setStatusFilter('All');
    }
  }, [statusFilter, pipelineStatusOptions]);

  const openEditPipeline = (o: SalesOrderPipeline) => {
    setEditingPipeline(o);
    setEditDraft({ ...o, last_status_comment: o.last_status_comment ?? '' });
  };

  const closeEditPipeline = () => {
    setEditingPipeline(null);
    setEditDraft(null);
  };

  const saveEditPipeline = () => {
    if (!editingPipeline || !editDraft) return;
    const gt =
      typeof editDraft.grand_total === 'number' && !Number.isNaN(editDraft.grand_total)
        ? editDraft.grand_total
        : Number(editDraft.grand_total) || 0;
    updatePipelineOrder(editingPipeline.record_id, { ...editDraft, grand_total: gt });
    closeEditPipeline();
  };

  const handleDeletePipeline = (o: SalesOrderPipeline) => {
    const label = (o.subject || o.account_name || o.record_id).slice(0, 120);
    if (window.confirm(`Remove this pipeline order?\n\n${label}`)) {
      deletePipelineOrder(o.record_id);
    }
  };

  const liveTotalAll = useMemo(
    () => liveForSummary.reduce((sum, o) => sum + (o.grand_total ?? 0), 0),
    [liveForSummary]
  );
  const pipelineTotalAll = useMemo(
    () => pipelineForSummary.reduce((sum, o) => sum + (o.grand_total ?? 0), 0),
    [pipelineForSummary]
  );
  const liveTotal = useMemo(
    () => filteredLive.reduce((sum, o) => sum + (o.grand_total ?? 0), 0),
    [filteredLive]
  );
  const pipelineTotal = useMemo(
    () => filteredPipeline.reduce((sum, o) => sum + (o.grand_total ?? 0), 0),
    [filteredPipeline]
  );

  const liveHierarchyRows = useMemo(
    () => buildOrderedHierarchyRows(liveOrders, liveParentByChildId, filteredLive),
    [liveOrders, liveParentByChildId, filteredLive]
  );
  const pipelineHierarchyRows = useMemo(
    () => buildOrderedHierarchyRows(pipelineOrders, pipelineParentByChildId, filteredPipeline),
    [pipelineOrders, pipelineParentByChildId, filteredPipeline]
  );

  const livePaginated = useMemo(
    () => liveHierarchyRows.slice(0, livePage * PAGE_SIZE),
    [liveHierarchyRows, livePage]
  );
  const pipelinePaginated = useMemo(
    () => pipelineHierarchyRows.slice(0, pipelinePage * PAGE_SIZE),
    [pipelineHierarchyRows, pipelinePage]
  );

  const liveGroupUnits = useMemo(
    () => buildLiveGroupUnits(liveOrders, liveParentByChildId),
    [liveOrders, liveParentByChildId]
  );
  const pipelineGroupUnits = useMemo(
    () => buildPipelineGroupUnits(pipelineOrders, pipelineParentByChildId),
    [pipelineOrders, pipelineParentByChildId]
  );
  const liveGroupUnitsForPm = useMemo(
    () => filterLiveGroupUnitsByDueDateYear(liveGroupUnits, summaryYear),
    [liveGroupUnits, summaryYear]
  );

  const pmSalesSummaryRows = useMemo(
    () => computePmSalesSummaryRowsGrouped(liveGroupUnitsForPm, pipelineGroupUnits, pmFilter),
    [liveGroupUnitsForPm, pipelineGroupUnits, pmFilter]
  );

  const monthCloseAvgChartData = useMemo(
    () => computeMonthCloseAvgRowsGrouped(liveGroupUnitsForPm, pmFilter),
    [liveGroupUnitsForPm, pmFilter]
  );

  const monthCloseChartPoints = useMemo(
    () =>
      monthCloseAvgChartData.map((r) => ({
        ...r,
        avgBar: r.avgPlannedDays ?? 0,
      })),
    [monthCloseAvgChartData]
  );

  const pmWorkloadData = useMemo(() => {
    const pms = new Set<string>();
    liveForSummary.forEach((o) => o.project_manager && pms.add(o.project_manager));
    pipelineForSummary.forEach((o) => o.project_manager && pms.add(o.project_manager));
    return Array.from(pms).map((name) => {
      const live = liveForSummary.filter((o) => o.project_manager === name);
      const pipeline = pipelineForSummary.filter((o) => o.project_manager === name);
      const liveSum = live.reduce((s, o) => s + (o.grand_total ?? 0), 0);
      const pipelineSum = pipeline.reduce((s, o) => s + (o.grand_total ?? 0), 0);
      return {
        name,
        liveCount: live.length,
        pipelineCount: pipeline.length,
        totalGrand: liveSum + pipelineSum,
      };
    });
  }, [liveForSummary, pipelineForSummary]);

  const recentActivity = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const list: { date: string; account_name: string; subject: string; pm: string; status: string; amount: number; type: string }[] = [];
    liveForSummary.forEach((o) => {
      const t = o.created_time ? new Date(o.created_time) : null;
      if (t && t >= cutoff)
        list.push({
          date: o.created_time || '',
          account_name: o.account_name || '',
          subject: o.subject || '',
          pm: o.project_manager || '',
          status: o.status || 'Live',
          amount: o.grand_total ?? 0,
          type: 'live',
        });
    });
    pipelineForSummary.forEach((o) => {
      const t = o.created_time ? new Date(o.created_time) : null;
      if (t && t >= cutoff)
        list.push({
          date: o.created_time || '',
          account_name: o.account_name || '',
          subject: o.subject || '',
          pm: o.project_manager || '',
          status: o.status || '',
          amount: o.grand_total ?? 0,
          type: 'pipeline',
        });
    });
    return list.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [liveForSummary, pipelineForSummary]);

  const isLoading = liveOrders.length === 0 && pipelineOrders.length === 0 && isParsingSales;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard variant="card" />
          <SkeletonCard variant="card" />
          <SkeletonCard variant="card" />
          <SkeletonCard variant="card" />
        </div>
        <SkeletonCard variant="chart" />
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="animate-pulse bg-slate-200 rounded h-5 w-48 mb-4" />
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="pb-2 pr-4 font-medium">Account</th>
                <th className="pb-2 pr-4 font-medium">Count</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Fragment key={i}>
                  <SkeletonCard variant="table-row" />
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* Summary year — KPI / workload vs Due Date year for PM performance block */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="sales-summary-year" className="text-sm font-medium text-slate-700">
          Summary year
        </label>
        <select
          id="sales-summary-year"
          value={summaryYear === null ? '' : String(summaryYear)}
          onChange={(e) => {
            const v = e.target.value;
            setSummaryYear(v === '' ? null : Number(v));
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All years</option>
          {summaryYearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {summaryYear !== null ? (
          <span className="text-xs text-slate-500">
            KPI, workload chart &amp; recent activity use Live/Pipeline year {summaryYear}. PM performance below filters Live
            by Due Date year {summaryYear}.
          </span>
        ) : null}
      </div>

      {/* Section A — KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="text-sm font-medium text-green-800">Live Orders (Active)</div>
          <div className="text-2xl font-bold text-green-900">{liveForSummary.length}</div>
          <div className="text-sm text-green-700">{formatCurrency(liveTotalAll)}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-medium text-blue-800">Pipeline Orders</div>
          <div className="text-2xl font-bold text-blue-900">{pipelineForSummary.length}</div>
          <div className="text-sm text-blue-700">{formatCurrency(pipelineTotalAll)}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-medium text-amber-800">Setup Orders</div>
          <div className="text-2xl font-bold text-amber-900">{setupCount}</div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="text-sm font-medium text-orange-800">Hold Orders</div>
          <div className="text-2xl font-bold text-orange-900">{holdCount}</div>
        </div>
      </div>
      <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
        <span className="font-medium text-slate-600">Dashboard vs Sales:</span> Weekly Overview &quot;Total MRR&quot; sums
        per-customer MRR (live orders matched to account names, else DB). The numbers above are the full Sales Live /
        Pipeline CSV totals (respecting summary year when set). Historical go-live months on the Dashboard use the same
        Live Date rule as the Live month filter here.
      </p>

      {/* Section B — Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={pmFilter}
          onChange={(e) => setPmFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          aria-label="Filter by project manager"
        >
          {allPms.map((pm) => (
            <option key={pm} value={pm}>
              {pm}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Pipeline status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Filter pipeline by status"
          >
            <option value="All">All statuses</option>
            {pipelineStatusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder="Search Subject or Account..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-56"
        />
      </div>

      <SalesOrderGroupingPanel />

      {/* Section B2 — PM closure (Live) + Setup pipeline snapshot */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">PM performance (Live closures &amp; Setup load)</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-4xl leading-relaxed">
            <span className="font-medium text-slate-600">Closed Live</span>, Setup counts, and averages use{' '}
            <span className="font-medium text-slate-600">deduplicated project groups</span> when you link child SOs under
            a parent (one project per group; MRR summed). Dates use the parent&apos;s Due Date when set, otherwise the
            latest Due Date in the group. Summary year = Due Date calendar year (KPI cards still use order/live-date
            attribution). Average days = Due Date − Order Date on the <span className="font-medium text-slate-600">parent</span>{' '}
            row when present.
            {summaryYear !== null ? (
              <span className="block mt-1">
                PM table and chart use <span className="font-medium text-slate-600">Due Date year {summaryYear}</span>. PM
                filter narrows rows and the chart.
              </span>
            ) : (
              <span className="block mt-1">
                Use &quot;All years&quot; for all Live rows by Due Date, or pick a year (includes years from Due Date in
                the dropdown).
              </span>
            )}
          </p>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-slate-100">
          <table className="w-full text-left text-sm min-w-[32rem]">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-3 py-2 font-medium">PM</th>
                <th className="px-3 py-2 font-medium text-right">Setup (pipeline)</th>
                <th className="px-3 py-2 font-medium text-right">Closed Live (Due Date month)</th>
                <th className="px-3 py-2 font-medium text-right">Avg days (Due − Order)</th>
              </tr>
            </thead>
            <tbody>
              {pmSalesSummaryRows.map((row) => (
                <tr key={row.pm} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{row.pm}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.setupPipelineCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.closedLiveCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {row.avgPlannedDays === null ? '—' : row.avgPlannedDays.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pmSalesSummaryRows.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">No PM rows for the current filters.</p>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">
            Average planned days by Due Date month (Live){' '}
            {pmFilter !== 'All PMs' ? `— ${pmFilter}` : ''}
          </h4>
          <ChartShell
            heightClass="h-72"
            empty={monthCloseAvgChartData.length === 0}
            emptyTitle="No rows with Due Date month"
            emptyDescription="Upload Live orders or pick another year / PM. Rows without a parseable Due Date are excluded from this chart."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthCloseChartPoints} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="monthKey"
                  tick={{ fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  height={56}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload as MonthCloseAvgRow & { avgBar: number };
                    const avg =
                      p?.avgPlannedDays === null || p?.avgPlannedDays === undefined
                        ? '—'
                        : p.avgPlannedDays.toFixed(1);
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                        <div className="font-semibold text-slate-800">Month {label}</div>
                        <div className="text-slate-600">Closed Live: {p?.closedCount ?? 0}</div>
                        <div className="text-slate-600">
                          Avg Due − Order: {avg} days ({p?.avgSampleSize ?? 0} orders with both dates)
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="avgBar" name="Avg days" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>
      </div>

      {/* Section C — Active + Pipeline tables (stacked, full width) */}
      <div className="grid grid-cols-1 gap-6 w-full">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800">Active (Live)</h3>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {filteredLive.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="sales-live-month" className="text-slate-600">
                Live month
              </label>
              <input
                id="sales-live-month"
                type="month"
                value={liveMonthFilter}
                onChange={(e) => setLiveMonthFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              {liveMonthFilter ? (
                <button
                  type="button"
                  onClick={() => setLiveMonthFilter('')}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  All months
                </button>
              ) : null}
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-200">
                <tr className="text-slate-600">
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">PM</th>
                  <th className="px-3 py-2 font-medium">Grand Total</th>
                  <th className="px-3 py-2 font-medium">Live Date</th>
                  <th className="px-3 py-2 font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody>
                {livePaginated.map(({ row: o, depth }) => (
                  <tr
                    key={o.record_id}
                    className={`border-b border-slate-100 ${depth ? 'bg-slate-50/60' : ''}`}
                  >
                    <td className="px-3 py-2" title={o.subject} style={{ paddingLeft: depth ? 20 : 12 }}>
                      {depth ? (
                        <span className="mr-1.5 inline-block text-slate-400 select-none" aria-hidden>
                          ↳
                        </span>
                      ) : null}
                      {(o.subject || '').slice(0, 40)}
                      {(o.subject || '').length > 40 ? '…' : ''}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{o.account_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: PM_COLORS[allPms.indexOf(o.project_manager) % PM_COLORS.length] || '#64748b',
                        }}
                      >
                        {getInitials(o.project_manager)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{formatCurrency(o.grand_total)}</td>
                    <td className="px-3 py-2 text-slate-600">{getSalesLiveDisplayDate(o)}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{o.tenant_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-sm font-medium text-slate-700">Total MRR: {formatCurrency(liveTotal)}</span>
            {liveHierarchyRows.length > livePage * PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setLivePage((p) => p + 1)}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Load more
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="font-semibold text-slate-800">Pipeline (Setup / Hold)</h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {filteredPipeline.length}
            </span>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[5%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="min-w-0 w-[32%]" />
                <col className="w-[10%]" />
                <col className="w-[4rem]" />
              </colgroup>
              <thead className="sticky top-0 bg-white border-b border-slate-200">
                <tr className="text-slate-600">
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">PM</th>
                  <th className="px-3 py-2 font-medium">Grand Total</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Due Date</th>
                  <th className="px-3 py-2 font-medium">Son durum</th>
                  <th className="px-3 py-2 font-medium">Tenant</th>
                  <th className="px-3 py-2 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pipelinePaginated.map(({ row: o, depth }) => (
                  <tr
                    key={o.record_id}
                    className={`border-b border-slate-100 ${depth ? 'bg-slate-50/60' : ''}`}
                  >
                    <td className="px-3 py-2 text-slate-800" style={{ paddingLeft: depth ? 20 : 12 }}>
                      {depth ? (
                        <span className="mr-1.5 inline-block text-slate-400 select-none" aria-hidden>
                          ↳
                        </span>
                      ) : null}
                      {o.subject}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{o.account_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: PM_COLORS[allPms.indexOf(o.project_manager) % PM_COLORS.length] || '#64748b',
                        }}
                      >
                        {getInitials(o.project_manager)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{formatCurrency(o.grand_total)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${pipelineStatusBadgeClass(o.status || '')}`}
                      >
                        {o.status || '—'}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 ${isOverdue(o.due_date) ? 'font-medium text-red-600' : 'text-slate-600'}`}
                    >
                      {o.due_date}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-600 text-sm break-words whitespace-normal min-w-0">
                      {(o.last_status_comment ?? '').trim() || '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{o.tenant_name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEditPipeline(o)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                          title="Edit"
                          aria-label="Edit pipeline order"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePipeline(o)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          title="Delete"
                          aria-label="Delete pipeline order"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-sm font-medium text-slate-700">Total Pipeline: {formatCurrency(pipelineTotal)}</span>
            {pipelineHierarchyRows.length > pipelinePage * PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setPipelinePage((p) => p + 1)}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Load more
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section D — PM Workload Chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Orders by Project Manager</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pmWorkloadData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="liveCount" name="Live" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="pipelineCount" name="Pipeline" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalGrand"
                name="Total $"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section E — Timeline */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Recent Activity</h3>
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {recentActivity.map((item, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-2 rounded border border-slate-100 px-3 py-2 text-sm"
            >
              <span className="text-slate-500 shrink-0">{item.date}</span>
              <span className="font-medium text-slate-800">{item.account_name}</span>
              <span className="text-slate-600 truncate max-w-[120px]" title={item.subject}>
                {item.subject}
              </span>
              <span className="text-slate-600">{item.pm}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.type === 'live' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {item.status}
              </span>
              <span className="font-medium text-slate-800">{formatCurrency(item.amount)}</span>
            </li>
          ))}
          {recentActivity.length === 0 && (
            <p className="py-4 text-center text-slate-500">No recent activity in the last 30 days.</p>
          )}
        </ul>
      </div>

      {editingPipeline && editDraft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pipeline-edit-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 id="pipeline-edit-title" className="mb-4 text-lg font-semibold text-slate-800">
              Edit pipeline order
            </h3>
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto text-sm">
              <label className="grid gap-1">
                <span className="text-slate-600">Subject</span>
                <input
                  type="text"
                  value={editDraft.subject ?? ''}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, subject: e.target.value } : d))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-600">Account</span>
                <input
                  type="text"
                  value={editDraft.account_name ?? ''}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, account_name: e.target.value } : d))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-600">Project manager</span>
                <input
                  type="text"
                  value={editDraft.project_manager ?? ''}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, project_manager: e.target.value } : d))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-600">Grand total</span>
                <input
                  type="number"
                  step="0.01"
                  value={editDraft.grand_total ?? 0}
                  onChange={(e) =>
                    setEditDraft((d) =>
                      d ? { ...d, grand_total: parseFloat(e.target.value) || 0 } : d
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-600">Status</span>
                <input
                  type="text"
                  value={editDraft.status ?? ''}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, status: e.target.value } : d))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-600">Due date</span>
                <input
                  type="text"
                  value={editDraft.due_date ?? ''}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, due_date: e.target.value } : d))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-600">Tenant</span>
                <input
                  type="text"
                  value={editDraft.tenant_name ?? ''}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, tenant_name: e.target.value } : d))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-600">Son durum</span>
                <textarea
                  rows={4}
                  value={editDraft.last_status_comment ?? ''}
                  onChange={(e) =>
                    setEditDraft((d) => (d ? { ...d, last_status_comment: e.target.value } : d))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 font-sans"
                  placeholder="Son not / güncel durum…"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditPipeline}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditPipeline}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
