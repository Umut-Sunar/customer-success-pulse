import React, { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Plane,
  CheckCircle,
  Zap,
  RefreshCw,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useDataStore } from '../src/store/dataStore';
import {
  getLiveOrderDateForBucket,
  getSalesLiveDisplayDate,
  parseDateToMonthKey,
} from '../src/lib/sales-utils';
import { parseUpsellOpportunities } from '../src/lib/meeting-parsers';
import { useEnrichedAccounts } from '../hooks/useEnrichedAccounts';

interface DashboardOverviewProps {
  onNavigateToRisk?: () => void;
}

const COLORS = {
  Setup: '#3b82f6',
  Live: '#10b981',
  AtRisk: '#ef4444',
  Churned: '#64748b',
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateToRisk }) => {
  const [expandedHistoricalMonth, setExpandedHistoricalMonth] = useState<string | null>(null);
  const { accounts: enriched, loading, stats } = useEnrichedAccounts();
  const meetings = useDataStore((s) => s.meetings);
  const riskSignals = useDataStore((s) => s.riskSignals);
  const liveOrders = useDataStore((s) => s.liveOrders);
  const pipelineOrders = useDataStore((s) => s.pipelineOrders);
  const pmScores = useDataStore((s) => s.pmScores);
  const knowledgeItems = useDataStore((s) => s.knowledgeItems);

  /** Sales CRM pipeline — same rule as Sales Orders tab (status Setup). */
  const setupPipelineRows = useMemo(
    () =>
      pipelineOrders.filter((o) => (o.status || '').trim().toLowerCase() === 'setup'),
    [pipelineOrders]
  );
  const setupPipelineTotal = useMemo(
    () => setupPipelineRows.reduce((sum, o) => sum + (o.grand_total ?? 0), 0),
    [setupPipelineRows]
  );

  // Stats for cards (real data)
  const totalMRR = stats.totalMRR;
  const touchedMRR = enriched
    .filter((a) => a.touch_status === 'Touched')
    .reduce((s, a) => s + a.total_mrr, 0);
  const touchRateMRR = stats.totalMRR > 0 ? Math.round((touchedMRR / stats.totalMRR) * 100) : 0;
  const touchRateCount = enriched.length > 0 ? Math.round((stats.touchedCount / enriched.length) * 100) : 0;
  const setupCount = stats.setupCount;
  const atRiskCount = stats.highChurnCount;

  // Urgent Actions: high-churn + setup untouched accounts
  const atRiskAccounts = enriched
    .filter((a) => a.churn_risk === 'high' || a.churn_risk === 'medium')
    .slice(0, 5);
  const setupUntouched = enriched
    .filter((a) => a.dominant_status === 'Setup' && a.touch_status === 'Untouched')
    .slice(0, 3);
  const urgentList = useMemo(() => {
    const atRiskItems = atRiskAccounts.map((a) => ({
      id: a.id,
      name: a.account_name,
      type: 'churn' as const,
      churn_risk: a.churn_risk,
      last_meeting_date: a.last_meeting_date ?? null,
      churn_evidence: (() => {
        const sig = riskSignals
          .filter((r) => {
            const rn = r.account_name?.toLowerCase() ?? '';
            const an = a.account_name.toLowerCase();
            return rn.includes(an) || an.includes(rn);
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        return sig?.churn_evidence ? sig.churn_evidence.slice(0, 80) : null;
      })(),
    }));
    const setupItems = setupUntouched.map((a) => ({
      id: a.id,
      name: a.account_name,
      type: 'bottleneck' as const,
    }));
    return [...atRiskItems, ...setupItems];
  }, [atRiskAccounts, setupUntouched, riskSignals]);

  // Account Health pie (status + churn risk)
  const healthData = useMemo(() => {
    const pieData = [
      { name: 'Setup', value: enriched.filter((a) => a.dominant_status === 'Setup').length, fill: COLORS.Setup },
      { name: 'Live', value: enriched.filter((a) => a.dominant_status === 'Live' && a.churn_risk !== 'high' && a.churn_risk !== 'medium').length, fill: COLORS.Live },
      { name: 'At Risk', value: enriched.filter((a) => a.churn_risk === 'high' || a.churn_risk === 'medium').length, fill: COLORS.AtRisk },
      { name: 'Churned', value: enriched.filter((a) => a.dominant_status === 'Churned').length, fill: COLORS.Churned },
    ].filter((d) => d.value > 0);
    return pieData;
  }, [enriched]);

  // Weekly Touch Status (last 8 weeks from meetings)
  const weeklyTouchData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7 * (7 - i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekMeetings = meetings.filter((m) => {
        const d = new Date(m.date);
        return d >= weekStart && d <= weekEnd && m.is_customer_meeting;
      });
      const touchedDomains = new Set(weekMeetings.map((m) => m.customer_domain));
      return {
        week: `W${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        Touched: touchedDomains.size,
        Untouched: Math.max(0, enriched.length - touchedDomains.size),
      };
    });
  }, [meetings, enriched.length]);

  // Historical Implementations — same month bucket rule as Sales (getLiveOrderDateForBucket → YYYY-MM)
  const historicalByMonth = useMemo(() => {
    const byMonth = liveOrders.reduce(
      (acc, order) => {
        const month = parseDateToMonthKey(getLiveOrderDateForBucket(order));
        if (!month) return acc;
        if (!acc[month]) acc[month] = { month, count: 0, mrr: 0, orders: [] as typeof liveOrders };
        acc[month].count++;
        acc[month].mrr += order.grand_total || 0;
        acc[month].orders.push(order);
        return acc;
      },
      {} as Record<string, { month: string; count: number; mrr: number; orders: typeof liveOrders }>
    );
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [liveOrders]);

  const liveCsvGrandTotal = useMemo(
    () => liveOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0),
    [liveOrders]
  );

  // Intelligence Highlights (only when meeting data exists)
  const intelligenceHighlights = useMemo(() => {
    if (meetings.length === 0) return null;
    const highChurnAccounts = new Set(
      riskSignals.filter((r) => r.churn_risk === 'high').map((r) => r.account_name || r.customer_domain)
    );
    const upsellAccounts = new Set(
      riskSignals
        .filter((r) => parseUpsellOpportunities(r.upsell).length > 0)
        .map((r) => r.account_name || r.customer_domain)
    );
    const recurringCount = knowledgeItems.filter((k) => k.is_recurring === true).length;

    const highMediumRiskSignals = riskSignals.filter(
      (r) => r.churn_risk === 'high' || r.churn_risk === 'medium'
    );
    const riskByMeeting = new Map(highMediumRiskSignals.map((r) => [r.meeting_id, r]));
    const pmByMeeting = new Map(pmScores.map((p) => [p.meeting_id, p]));
    const meetingIdsAtRisk = new Set(riskByMeeting.keys());
    const recentHighRiskMeetings = meetings
      .filter((m) => meetingIdsAtRisk.has(m.meeting_id))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5)
      .map((m) => {
        const risk = riskByMeeting.get(m.meeting_id);
        const pm = pmByMeeting.get(m.meeting_id);
        return {
          date: m.date,
          account_name: m.account_name || risk?.account_name || '—',
          pm_name: pm?.pm_name || '—',
          churn_risk: risk?.churn_risk ?? '—',
          escalation_risk: risk?.escalation_risk ?? '—',
        };
      });

    return {
      highChurnCount: highChurnAccounts.size,
      upsellCount: upsellAccounts.size,
      recurringCount,
      recentHighRiskMeetings,
    };
  }, [meetings, riskSignals, pmScores, knowledgeItems]);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards — Total MRR = customer-level; Live CSV = sum of all Sales Live rows (matches Sales Orders) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Total MRR</p>
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '—' : enriched.length === 0 ? '—' : `$${totalMRR.toLocaleString()}`}
            </p>
            {!loading && enriched.length > 0 && (
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                Across {enriched.length} accounts
              </p>
            )}
            {!loading && enriched.length === 0 && (
              <p className="text-xs text-slate-400">— Add accounts in Admin</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-cyan-50 text-cyan-700 rounded-full">
            <ShoppingBag size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Live CSV total</p>
            <p className="text-2xl font-bold text-slate-800">
              {liveOrders.length === 0 ? '—' : `$${liveCsvGrandTotal.toLocaleString()}`}
            </p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">
              Sum of all Sales Live rows — same basis as Sales Orders tab
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500 mb-1">Touch Rate</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-slate-800">
                  {loading ? '—' : enriched.length === 0 ? '—' : `${touchRateMRR}%`}
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">MRR</p>
              </div>
              <div className="h-8 w-px bg-slate-100 mx-2" />
              <div>
                <p className="text-xl font-bold text-slate-700">
                  {loading ? '—' : enriched.length === 0 ? '—' : `${touchRateCount}%`}
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Count</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-full">
            <Plane size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Pipeline (Setup)</p>
            <p className="text-2xl font-bold text-slate-800">{setupPipelineRows.length}</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">
              ${setupPipelineTotal.toLocaleString()} · Sales Pipeline CSV (IndexedDB)
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
            <Clock size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Accounts — Setup</p>
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '—' : setupCount}
            </p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">Dominant status = Setup</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">At Risk</p>
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '—' : atRiskCount}
            </p>
          </div>
        </div>
      </div>
      {!loading && enriched.length === 0 && (
        <p className="text-center text-sm text-slate-500 -mt-2">
          No dashboard metrics yet. Add accounts in Admin, then upload meeting and sales CSVs via Update Data.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Touch Status — last 8 weeks from meetings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Weekly Touch Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTouchData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Touched" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Untouched" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Account Health Overview — real status + churn distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Account Health Overview</h3>
          <div className="h-64">
            {healthData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm px-4 text-center">
                <span>No account data</span>
                <span className="text-xs mt-2">Add accounts in Admin</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Urgent Actions — real at-risk + onboarding bottlenecks */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} /> Urgent Actions
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {enriched.length === 0 && !loading ? (
              <div className="text-center text-slate-400 py-10 text-sm px-2">
                No accounts yet. Import accounts in Admin, then upload risk_signals.csv.
              </div>
            ) : urgentList.length === 0 ? (
              <div className="text-center text-slate-400 py-10">No urgent actions required. Good job!</div>
            ) : (
              urgentList.map((item) => (
                <div key={item.id} className="p-3 border-l-4 border-red-500 bg-red-50 rounded-r-md">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span
                      className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        item.type === 'bottleneck'
                          ? 'text-red-600 bg-red-100'
                          : item.type === 'churn' && (item as { churn_risk?: string }).churn_risk === 'high'
                            ? 'text-red-700 bg-red-200'
                            : 'text-amber-700 bg-amber-100'
                      }`}
                    >
                      {item.type === 'bottleneck' ? 'Bottleneck' : `Churn ${(item as { churn_risk?: string }).churn_risk ?? 'Risk'}`}
                    </span>
                  </div>
                  {item.type === 'churn' && (
                    <>
                      {item.last_meeting_date && (
                        <p className="text-xs text-slate-500 mt-0.5">Last meeting: {item.last_meeting_date}</p>
                      )}
                      {item.churn_evidence && (
                        <p className="text-sm text-slate-600 mt-1">{item.churn_evidence}</p>
                      )}
                    </>
                  )}
                  {item.type === 'bottleneck' && (
                    <p className="text-sm text-slate-600 mt-1">Setup — no recent touch</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Onboarding pipeline (Setup) — from Sales Pipeline CSV / IndexedDB, same as Sales Orders tab */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Plane className="text-blue-600" size={20} />
              Onboarding pipeline (Setup)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              CRM pipeline rows with status Setup — pre-live / implementation queue (Update Data → Sales Pipeline CSV).
            </p>
          </div>

          <div className="flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider mr-2 text-blue-500">Setup total</span>
            <span className="text-lg font-bold">${setupPipelineTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                <th className="pb-3 pl-2">Account</th>
                <th className="pb-3">Subject</th>
                <th className="pb-3">Opportunity</th>
                <th className="pb-3">Grand total</th>
                <th className="pb-3">Due date</th>
                <th className="pb-3">PM</th>
                <th className="pb-3 min-w-[8rem]">Son durum</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {setupPipelineRows.map((row) => (
                <tr key={row.record_id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-3 pl-2 font-medium text-slate-800">{row.account_name || '—'}</td>
                  <td className="py-3 text-slate-700 max-w-[12rem] break-words">{row.subject || '—'}</td>
                  <td className="py-3 text-slate-600 max-w-[10rem] break-words">{row.opportunity_name || '—'}</td>
                  <td className="py-3 font-medium text-slate-800">${(row.grand_total ?? 0).toLocaleString()}</td>
                  <td className="py-3 text-slate-600 whitespace-nowrap">{row.due_date || '—'}</td>
                  <td className="py-3 text-slate-600">{row.project_manager || '—'}</td>
                  <td className="py-3 text-slate-600 text-xs max-w-[14rem] break-words align-top">
                    {(row.last_status_comment ?? '').trim() || '—'}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100">
                      Setup
                    </span>
                  </td>
                </tr>
              ))}
              {setupPipelineRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No Setup pipeline orders. Upload Sales Pipeline CSV via Update Data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Historical Implementations — from liveOrders by month (bucket = Sales Live Date rules) */}
        <div className="border-t border-slate-100 pt-8">
          <h4 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={20} />
            Monthly Implementation History (Go-Lives)
          </h4>
          <p className="text-xs text-slate-500 mb-5">
            Each order is grouped by month using the same date as Sales Orders (committed live → due → then order / created).{' '}
            <span className="text-slate-400">Line dates show Live Date when available.</span>
          </p>
          {historicalByMonth.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">
              No live orders data. Upload Sales Live CSV.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {historicalByMonth.map((data) => {
                const monthLabel = new Date(data.month + '-01').toLocaleString('default', {
                  month: 'long',
                  year: 'numeric',
                });
                const isOpen = expandedHistoricalMonth === data.month;
                const panelId = `historical-go-live-${data.month}`;
                return (
                  <div
                    key={data.month}
                    className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
                  >
                    <button
                      type="button"
                      id={`${panelId}-trigger`}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() =>
                        setExpandedHistoricalMonth((prev) => (prev === data.month ? null : data.month))
                      }
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                        )}
                        <span className="font-semibold text-slate-800">{monthLabel}</span>
                        <span className="text-xs font-medium text-slate-500">
                          {data.count} {data.count === 1 ? 'order' : 'orders'}
                        </span>
                      </span>
                      <span className="shrink-0 rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                        ${data.mrr.toLocaleString()}
                      </span>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={`${panelId}-trigger`}
                      className={isOpen ? 'border-t border-slate-200 px-4 pb-4 pt-2' : 'hidden'}
                    >
                      <ul className="space-y-3">
                        {data.orders.map((order) => (
                          <li key={order.record_id} className="flex justify-between items-start text-sm">
                            <div>
                              <div className="font-medium text-slate-700">
                                {order.account_name || order.subject || '—'}
                              </div>
                              <div className="text-xs text-slate-400">
                                {getSalesLiveDisplayDate(order) ||
                                  order.order_date ||
                                  order.created_time ||
                                  '—'}
                              </div>
                            </div>
                            <span className="font-medium text-slate-600">
                              ${(order.grand_total || 0).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Intelligence Highlights — only when meeting data exists */}
        {intelligenceHighlights && (
          <div className="border-t border-slate-100 pt-8">
            <h4 className="text-md font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              Intelligence Highlights
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">High Churn Risk</p>
                  <p className="text-2xl font-bold text-red-800">{intelligenceHighlights.highChurnCount}</p>
                  <p className="text-xs text-red-600">unique accounts</p>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-full">
                  <TrendingUp className="text-emerald-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-emerald-700 font-medium">Upsell Opportunities</p>
                  <p className="text-2xl font-bold text-emerald-800">{intelligenceHighlights.upsellCount}</p>
                  <p className="text-xs text-emerald-600">accounts</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-full">
                  <RefreshCw className="text-amber-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-amber-700 font-medium">Recurring Issues</p>
                  <p className="text-2xl font-bold text-amber-800">{intelligenceHighlights.recurringCount}</p>
                  <p className="text-xs text-amber-600">knowledge items</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <span className="font-semibold text-slate-800">Recent High-Risk Meetings</span>
                {onNavigateToRisk && (
                  <button
                    type="button"
                    onClick={onNavigateToRisk}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    View All
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600 font-medium">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Account</th>
                    <th className="px-4 py-2">PM</th>
                    <th className="px-4 py-2">Churn Risk</th>
                    <th className="px-4 py-2">Escalation Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {intelligenceHighlights.recentHighRiskMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No high-risk meetings in this period.
                      </td>
                    </tr>
                  ) : (
                    intelligenceHighlights.recentHighRiskMeetings.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{row.date}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{row.account_name}</td>
                        <td className="px-4 py-2 text-slate-700">{row.pm_name}</td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              row.churn_risk === 'high'
                                ? 'bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium'
                                : row.churn_risk === 'medium'
                                  ? 'bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium'
                                  : 'text-slate-600'
                            }
                          >
                            {String(row.churn_risk)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              row.escalation_risk === 'high'
                                ? 'bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium'
                                : row.escalation_risk === 'medium'
                                  ? 'bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium'
                                  : 'text-slate-600'
                            }
                          >
                            {String(row.escalation_risk)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};