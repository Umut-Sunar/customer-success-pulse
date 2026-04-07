import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDataStore } from '../../store/dataStore';
import {
  safeParseJSON,
  parsePainPoints,
  parseFeatureRequests,
} from '../../lib/meeting-parsers';
import type { CustomerInsight, PainPoint, FeatureRequest } from '../../types/meeting.types';
import { ChartShell } from '../shared/ChartShell';

const SENTIMENT_OPTIONS = ['All', 'positive', 'neutral', 'negative', 'mixed'] as const;
const PRODUCTS = [
  'CX Insight',
  'CX Quality',
  'AMD',
  'WhatsApp Call',
  'Video Call',
  'Agent Assist',
  'Custom Development',
];

function sentimentBadgeClass(s: string): string {
  switch (s) {
    case 'positive':
      return 'bg-green-100 text-green-800';
    case 'negative':
      return 'bg-red-100 text-red-800';
    case 'mixed':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function churnBadgeClass(r: string): string {
  switch (r) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-amber-100 text-amber-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function severityBadgeClass(s: string): string {
  switch (s) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

const RISK_ORDER = { high: 4, medium: 3, low: 2, none: 1 };

export interface CustomerIntelligenceProps {
  drawerAccount?: { account_name: string; customer_domain: string } | null;
  onOpenDrawer?: (account: { account_name: string; customer_domain: string } | null) => void;
  onCloseDrawer?: () => void;
}

export function CustomerIntelligence({
  drawerAccount: controlledDrawerAccount,
  onOpenDrawer,
  onCloseDrawer,
}: CustomerIntelligenceProps = {}) {
  const customerInsights = useDataStore((s) => s.customerInsights);
  const riskSignals = useDataStore((s) => s.riskSignals);
  const meetings = useDataStore((s) => s.meetings);
  const pmScores = useDataStore((s) => s.pmScores);

  const [search, setSearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<(typeof SENTIMENT_OPTIONS)[number]>('All');
  const [internalDrawer, setInternalDrawer] = useState<{
    account_name: string;
    customer_domain: string;
  } | null>(null);
  const drawerAccount = onOpenDrawer != null ? controlledDrawerAccount ?? null : internalDrawer;
  const setDrawerAccount = onOpenDrawer ?? setInternalDrawer;
  const closeDrawer = onCloseDrawer ?? (() => setInternalDrawer(null));
  const [drawerTab, setDrawerTab] = useState<'pain' | 'needs' | 'history' | 'pm'>('pain');
  const [sortCol, setSortCol] = useState<string>('account_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const accountRows = useMemo(() => {
    const byAccount = new Map<
      string,
      {
        account_name: string;
        customer_domain: string;
        lastMeeting: string;
        meetings: number;
        sentiment: CustomerInsight['sentiment'];
        score: number;
        painCount: number;
        featureRequestCount: number;
        churnRisk: 'none' | 'low' | 'medium' | 'high';
        insights: CustomerInsight[];
      }
    >();
    customerInsights.forEach((c) => {
      const name = c.account_name || 'Unknown';
      const domain = c.customer_domain || '';
      if (!byAccount.has(name)) {
        byAccount.set(name, {
          account_name: name,
          customer_domain: domain,
          lastMeeting: c.date,
          meetings: 0,
          sentiment: c.sentiment,
          score: c.sentiment_score ?? 0,
          painCount: 0,
          featureRequestCount: 0,
          churnRisk: 'none',
          insights: [],
        });
      }
      const row = byAccount.get(name)!;
      row.insights.push(c);
      if (c.date > row.lastMeeting) row.lastMeeting = c.date;
      row.score = c.sentiment_score ?? row.score;
      row.sentiment = c.sentiment;
      const pains = parsePainPoints(c.pain_points);
      row.painCount += pains.length;
      const reqs = parseFeatureRequests(c.feature_requests);
      row.featureRequestCount += reqs.length;
    });
    const meetingCountByAccount = new Map<string, number>();
    meetings.forEach((m) => {
      const name = m.account_name || 'Unknown';
      meetingCountByAccount.set(name, (meetingCountByAccount.get(name) ?? 0) + 1);
    });
    byAccount.forEach((row) => {
      row.meetings = meetingCountByAccount.get(row.account_name) ?? row.insights.length;
    });
    riskSignals.forEach((r) => {
      const name = r.account_name || 'Unknown';
      if (!byAccount.has(name)) return;
      const row = byAccount.get(name)!;
      if (RISK_ORDER[r.churn_risk] > RISK_ORDER[row.churnRisk]) row.churnRisk = r.churn_risk;
    });
    return Array.from(byAccount.values());
  }, [customerInsights, riskSignals, meetings]);

  const filteredRows = useMemo(() => {
    let list = accountRows.filter((r) => {
      const matchSearch =
        !search || r.account_name.toLowerCase().includes(search.toLowerCase());
      const matchSentiment =
        sentimentFilter === 'All' || r.sentiment === sentimentFilter;
      return matchSearch && matchSentiment;
    });
    list = [...list].sort((a, b) => {
      const aVal = a[sortCol as keyof typeof a];
      const bVal = b[sortCol as keyof typeof a];
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      const numA = Number(aVal) ?? 0;
      const numB = Number(bVal) ?? 0;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });
    return list;
  }, [accountRows, search, sentimentFilter, sortCol, sortDir]);

  const painByCategory = useMemo(() => {
    const byCat: Record<string, { count: number; severity: string }> = {};
    const categories = [
      'product_bug',
      'integration',
      'usability',
      'process',
      'performance',
      'communication',
    ];
    categories.forEach((c) => (byCat[c] = { count: 0, severity: 'low' }));
    customerInsights.forEach((c) => {
      parsePainPoints(c.pain_points).forEach((p) => {
        const cat = p.category?.trim() || 'other';
        if (!byCat[cat]) byCat[cat] = { count: 0, severity: 'low' };
        byCat[cat].count += 1;
        if (p.severity === 'high' || (p.severity === 'medium' && byCat[cat].severity === 'low'))
          byCat[cat].severity = p.severity;
      });
    });
    return Object.entries(byCat)
      .filter(([, v]) => v.count > 0)
      .map(([name, v]) => ({ category: name, count: v.count, severity: v.severity }))
      .sort((a, b) => b.count - a.count);
  }, [customerInsights]);

  const featureDemandByProduct = useMemo(() => {
    const byProduct: Record<string, { count: number; accounts: Set<string> }> = {};
    PRODUCTS.forEach((p) => (byProduct[p] = { count: 0, accounts: new Set() }));
    customerInsights.forEach((c) => {
      parseFeatureRequests(c.feature_requests).forEach((f) => {
        const product = f.maps_to_product?.trim() || 'Other';
        if (!byProduct[product]) byProduct[product] = { count: 0, accounts: new Set() };
        byProduct[product].count += 1;
        byProduct[product].accounts.add(c.account_name || 'Unknown');
      });
    });
    return Object.entries(byProduct)
      .filter(([, v]) => v.count > 0)
      .map(([product, v]) => ({
        product,
        count: v.count,
        accounts: Array.from(v.accounts),
      }))
      .sort((a, b) => b.count - a.count);
  }, [customerInsights]);

  const drawerInsights = useMemo(() => {
    if (!drawerAccount) return [];
    return customerInsights
      .filter((c) => c.account_name === drawerAccount.account_name)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [customerInsights, drawerAccount]);

  const drawerMeetings = useMemo(() => {
    if (!drawerAccount) return [];
    const accountMeetings = meetings
      .filter((m) => m.account_name === drawerAccount.account_name)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
    return accountMeetings.map((m) => {
      const pm = pmScores.find((s) => s.meeting_id === m.meeting_id);
      const insight = customerInsights.find((c) => c.meeting_id === m.meeting_id);
      return {
        date: m.date,
        meeting_type: m.meeting_type,
        pm_name: pm?.pm_name ?? '—',
        sentiment_score: insight?.sentiment_score ?? '—',
        duration_min: m.duration_min ?? 0,
      };
    });
  }, [drawerAccount, meetings, pmScores, customerInsights]);

  const allPainPoints = useMemo(() => {
    const list: PainPoint[] = [];
    drawerInsights.forEach((c) => list.push(...parsePainPoints(c.pain_points)));
    return list.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    });
  }, [drawerInsights]);

  const keyNeedsList = useMemo(() => {
    const list: { urgency?: string; description?: string; current_status?: string }[] = [];
    drawerInsights.forEach((c) => {
      const parsed = safeParseJSON<
        { urgency?: string; description?: string; current_status?: string }[]
      >(c.key_needs, []);
      if (Array.isArray(parsed)) list.push(...parsed);
    });
    return list;
  }, [drawerInsights]);

  const featureRequestsList = useMemo(() => {
    const list: FeatureRequest[] = [];
    drawerInsights.forEach((c) => list.push(...parseFeatureRequests(c.feature_requests)));
    return list;
  }, [drawerInsights]);

  const latestInsight = drawerInsights.length > 0 ? drawerInsights[0] : null;
  const drawerSentiment = latestInsight?.sentiment ?? 'neutral';
  const drawerChurn = riskSignals.find((r) => r.account_name === drawerAccount?.account_name)
    ?.churn_risk ?? 'none';

  const handleSort = (col: string) => {
    setSortDir(sortCol === col && sortDir === 'asc' ? 'desc' : 'asc');
    setSortCol(col);
  };

  return (
    <div className="space-y-8">
      {/* Section A — Account Selector + Search */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search by account name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64"
        />
        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value as typeof sentimentFilter)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {SENTIMENT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o === 'All' ? 'All' : o.charAt(0).toUpperCase() + o.slice(1)}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-600">Showing {filteredRows.length} accounts</span>
      </div>

      {/* Section B — Customer Sentiment Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              {[
                'account_name',
                'lastMeeting',
                'meetings',
                'sentiment',
                'score',
                'painCount',
                'featureRequestCount',
                'churnRisk',
              ].map((col) => (
                <th
                  key={col}
                  className="cursor-pointer px-4 py-3 font-medium hover:text-slate-800"
                  onClick={() => handleSort(col)}
                >
                  {col === 'account_name' && 'Account'}
                  {col === 'lastMeeting' && 'Last Meeting'}
                  {col === 'meetings' && 'Meetings'}
                  {col === 'sentiment' && 'Sentiment'}
                  {col === 'score' && 'Score'}
                  {col === 'painCount' && 'Pain Points'}
                  {col === 'featureRequestCount' && 'Feature Requests'}
                  {col === 'churnRisk' && 'Churn Risk'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.account_name}
                onClick={() => setDrawerAccount({ account_name: row.account_name, customer_domain: row.customer_domain })}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800">{row.account_name}</div>
                  {row.customer_domain && (
                    <div className="text-xs text-slate-500">{row.customer_domain}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.lastMeeting}</td>
                <td className="px-4 py-3 text-slate-600">{row.meetings}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sentimentBadgeClass(row.sentiment)}`}>
                    {row.sentiment}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, (row.score / 10) * 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-600">{(row.score ?? 0).toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.painCount > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {row.painCount}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.featureRequestCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {row.featureRequestCount}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${churnBadgeClass(row.churnRisk)}`}>
                    {row.churnRisk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <p className="py-8 text-center text-slate-500">No accounts match the filters.</p>
        )}
      </div>

      {/* Section D — Pain Point Analysis */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Pain Points by Category</h3>
        <ChartShell
          heightClass="h-64"
          empty={painByCategory.length === 0}
          emptyTitle="No pain point data yet"
          emptyDescription="Upload customer insights with pain points to see this chart."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={painByCategory}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 80, bottom: 8 }}
            >
              <XAxis type="number" />
              <YAxis type="category" dataKey="category" width={76} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                {painByCategory.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.severity === 'high'
                        ? '#ef4444'
                        : entry.severity === 'medium'
                          ? '#f97316'
                          : '#eab308'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* Section E — Feature Demand Mapping */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Feature Demand by Product</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureDemandByProduct.map((item) => (
            <div
              key={item.product}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="font-medium text-slate-800">{item.product}</div>
              <div className="mt-1 text-2xl font-bold text-slate-700">{item.count}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {item.accounts.slice(0, 5).map((acc) => (
                  <span
                    key={acc}
                    className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {acc}
                  </span>
                ))}
                {item.accounts.length > 5 && (
                  <span className="text-xs text-slate-500">+{item.accounts.length - 5} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {featureDemandByProduct.length === 0 && (
          <p className="py-4 text-center text-slate-500">No feature demand data yet.</p>
        )}
      </div>

      {/* Section C — Account Detail Drawer */}
      {drawerAccount && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col max-h-screen overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{drawerAccount.account_name}</h2>
                {drawerAccount.customer_domain && (
                  <p className="text-sm text-slate-500">{drawerAccount.customer_domain}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sentimentBadgeClass(drawerSentiment)}`}>
                    {drawerSentiment}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${churnBadgeClass(drawerChurn)}`}>
                    {drawerChurn} churn
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex border-b border-slate-200">
              {(['pain', 'needs', 'history', 'pm'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDrawerTab(tab)}
                  className={`px-4 py-2 text-sm font-medium ${
                    drawerTab === tab ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500'
                  }`}
                >
                  {tab === 'pain' && 'Pain Points'}
                  {tab === 'needs' && 'Needs & Requests'}
                  {tab === 'history' && 'Meeting History'}
                  {tab === 'pm' && 'PM Match'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {drawerTab === 'pain' && (
                <ul className="space-y-3">
                  {allPainPoints.map((p, i) => (
                    <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityBadgeClass(p.severity)}`}>
                          {p.severity}
                        </span>
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{p.category}</span>
                      </div>
                      <p className="mt-1 font-medium text-slate-800">{p.issue}</p>
                      {p.quote && <p className="mt-1 italic text-slate-600 text-sm">"{p.quote}"</p>}
                    </li>
                  ))}
                  {allPainPoints.length === 0 && <p className="text-slate-500">No pain points.</p>}
                </ul>
              )}
              {drawerTab === 'needs' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Key Needs</h4>
                    <ul className="space-y-2">
                      {keyNeedsList.map((n, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                          {n.urgency && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs">{n.urgency}</span>
                          )}
                          <span>{n.description ?? JSON.stringify(n)}</span>
                          {n.current_status && (
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{n.current_status}</span>
                          )}
                        </li>
                      ))}
                      {keyNeedsList.length === 0 && <p className="text-slate-500">No key needs.</p>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Feature Requests</h4>
                    <ul className="space-y-2">
                      {featureRequestsList.map((f, i) => (
                        <li key={i} className="rounded border border-slate-200 p-2 text-sm">
                          <span className="font-medium">{f.feature}</span>
                          {f.context && <p className="text-slate-600">{f.context}</p>}
                          {f.maps_to_product && (
                            <span className="mt-1 inline-block rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
                              {f.maps_to_product}
                            </span>
                          )}
                        </li>
                      ))}
                      {featureRequestsList.length === 0 && <p className="text-slate-500">No feature requests.</p>}
                    </ul>
                  </div>
                </div>
              )}
              {drawerTab === 'history' && (
                <ul className="space-y-2">
                  {drawerMeetings.map((m, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-2 text-sm">
                      <span className="text-slate-600">{m.date}</span>
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{m.meeting_type}</span>
                      <span>{m.pm_name}</span>
                      <span>Score: {m.sentiment_score}</span>
                      <span>{m.duration_min} min</span>
                    </li>
                  ))}
                  {drawerMeetings.length === 0 && <p className="text-slate-500">No meetings.</p>}
                </ul>
              )}
              {drawerTab === 'pm' && latestInsight && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div
                      className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white"
                      style={{
                        backgroundColor:
                          (latestInsight.pm_client_match_score ?? 0) >= 7
                            ? '#10b981'
                            : (latestInsight.pm_client_match_score ?? 0) >= 5
                              ? '#f59e0b'
                              : '#ef4444',
                      }}
                    >
                      {(latestInsight.pm_client_match_score ?? 0).toFixed(1)}
                    </div>
                  </div>
                  <p className="text-slate-700">{latestInsight.pm_client_assessment || '—'}</p>
                  <div>
                    <h4 className="font-medium text-green-800 mb-1">Strengths</h4>
                    <ul className="list-inside list-disc text-sm text-green-700">
                      {(safeParseJSON<string[]>(latestInsight.pm_client_strengths, [])).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-800 mb-1">Gaps</h4>
                    <ul className="list-inside list-disc text-sm text-orange-700">
                      {(safeParseJSON<string[]>(latestInsight.pm_client_gaps, [])).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                    {latestInsight.pm_client_recommendation || '—'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
