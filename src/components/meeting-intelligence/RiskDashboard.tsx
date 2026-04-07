import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useDataStore } from '../../store/dataStore';
import { ChartShell } from '../shared/ChartShell';
import { parseUpsellOpportunities, parseStringArray } from '../../lib/meeting-parsers';
import type { UpsellOpportunity } from '../../types/meeting.types';

const RISK_NUM: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

function riskBadgeClass(r: string): string {
  switch (r) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-orange-100 text-orange-800';
    case 'low':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function confidenceBadgeClass(c: string): string {
  switch (c) {
    case 'high':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function dotColor(churn: number, escalation: number): string {
  if (churn === 3 && escalation === 3) return '#991b1b';
  if (churn === 3 || escalation === 3) return '#dc2626';
  if (churn === 2 && escalation === 2) return '#ea580c';
  return '#eab308';
}

export interface RiskDashboardProps {
  onViewAccountDetails?: (account: { account_name: string; customer_domain: string }) => void;
}

export function RiskDashboard({ onViewAccountDetails }: RiskDashboardProps) {
  const riskSignals = useDataStore((s) => s.riskSignals);
  const meetings = useDataStore((s) => s.meetings);

  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());

  const highChurnAccounts = useMemo(() => {
    const set = new Set<string>();
    riskSignals.forEach((r) => {
      if (r.churn_risk === 'high') set.add(r.account_name || 'Unknown');
    });
    return set.size;
  }, [riskSignals]);

  const mediumChurnAccounts = useMemo(() => {
    const set = new Set<string>();
    riskSignals.forEach((r) => {
      if (r.churn_risk === 'medium') set.add(r.account_name || 'Unknown');
    });
    return set.size;
  }, [riskSignals]);

  const highEscalationAccounts = useMemo(() => {
    const set = new Set<string>();
    riskSignals.forEach((r) => {
      if (r.escalation_risk === 'high') set.add(r.account_name || 'Unknown');
    });
    return set.size;
  }, [riskSignals]);

  const upsellAccounts = useMemo(() => {
    const set = new Set<string>();
    riskSignals.forEach((r) => {
      const opps = parseUpsellOpportunities(r.upsell);
      if (opps.length > 0) set.add(r.account_name || 'Unknown');
    });
    return set.size;
  }, [riskSignals]);

  const scatterData = useMemo(() => {
    const byAccount = new Map<
      string,
      { churn_risk: string; escalation_risk: string; churn_evidence: string; escalation_evidence: string; meetingCount: number; domain: string }
    >();
    riskSignals.forEach((r) => {
      const name = r.account_name || 'Unknown';
      const domain = r.customer_domain || '';
      if (!byAccount.has(name)) {
        byAccount.set(name, {
          churn_risk: r.churn_risk,
          escalation_risk: r.escalation_risk,
          churn_evidence: r.churn_evidence,
          escalation_evidence: r.escalation_evidence,
          meetingCount: 0,
          domain,
        });
      }
      const row = byAccount.get(name)!;
      if (RISK_NUM[r.churn_risk] > RISK_NUM[row.churn_risk]) row.churn_risk = r.churn_risk;
      if (RISK_NUM[r.escalation_risk] > RISK_NUM[row.escalation_risk]) row.escalation_risk = r.escalation_risk;
      if (r.churn_evidence) row.churn_evidence = r.churn_evidence;
      if (r.escalation_evidence) row.escalation_evidence = r.escalation_evidence;
    });
    meetings.forEach((m) => {
      const name = m.account_name || 'Unknown';
      if (byAccount.has(name)) byAccount.get(name)!.meetingCount += 1;
      else
        byAccount.set(name, {
          churn_risk: 'none',
          escalation_risk: 'none',
          churn_evidence: '',
          escalation_evidence: '',
          meetingCount: 1,
          domain: m.customer_domain || '',
        });
    });
    return Array.from(byAccount.entries()).map(([account_name, row]) => ({
      name: account_name,
      x: RISK_NUM[row.escalation_risk] ?? 0,
      y: RISK_NUM[row.churn_risk] ?? 0,
      z: Math.min(50, 10 + row.meetingCount * 4),
      ...row,
    }));
  }, [riskSignals, meetings]);

  const highRiskAccountsList = useMemo(() => {
    const byAccount = new Map<
      string,
      {
        account_name: string;
        customer_domain: string;
        churn_risk: string;
        escalation_risk: string;
        churn_evidence: string;
        escalation_triggers: string[];
        lastMeeting: string;
      }
    >();
    riskSignals.forEach((r) => {
      const name = r.account_name || 'Unknown';
      if (r.churn_risk !== 'high' && r.churn_risk !== 'medium' && r.escalation_risk !== 'high' && r.escalation_risk !== 'medium')
        return;
      if (!byAccount.has(name)) {
        byAccount.set(name, {
          account_name: name,
          customer_domain: r.customer_domain || '',
          churn_risk: r.churn_risk,
          escalation_risk: r.escalation_risk,
          churn_evidence: r.churn_evidence,
          escalation_triggers: parseStringArray(r.escalation_triggers),
          lastMeeting: r.date,
        });
      }
      const row = byAccount.get(name)!;
      if (RISK_NUM[r.churn_risk] > RISK_NUM[row.churn_risk]) row.churn_risk = r.churn_risk;
      if (RISK_NUM[r.escalation_risk] > RISK_NUM[row.escalation_risk]) row.escalation_risk = r.escalation_risk;
      if (r.date > row.lastMeeting) row.lastMeeting = r.date;
      row.churn_evidence = r.churn_evidence || row.churn_evidence;
      row.escalation_triggers = [...new Set([...row.escalation_triggers, ...parseStringArray(r.escalation_triggers)])];
    });
    return Array.from(byAccount.values()).sort((a, b) => {
      const c = RISK_NUM[b.churn_risk] - RISK_NUM[a.churn_risk];
      if (c !== 0) return c;
      return RISK_NUM[b.escalation_risk] - RISK_NUM[a.escalation_risk];
    });
  }, [riskSignals]);

  const upsellTable = useMemo(() => {
    const list: { account_name: string; product: string; confidence: string; signal: string; suggested_pitch: string }[] = [];
    riskSignals.forEach((r) => {
      parseUpsellOpportunities(r.upsell).forEach((o) => {
        list.push({
          account_name: r.account_name || 'Unknown',
          product: o.product || 'Other',
          confidence: o.confidence || 'low',
          signal: o.signal || '',
          suggested_pitch: o.suggested_pitch || '',
        });
      });
    });
    return list.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.confidence as keyof typeof order] ?? 2) - (order[b.confidence as keyof typeof order] ?? 2);
    });
  }, [riskSignals]);

  const upsellByProduct = useMemo(() => {
    const map = new Map<string, typeof upsellTable>();
    upsellTable.forEach((row) => {
      if (!map.has(row.product)) map.set(row.product, []);
      map.get(row.product)!.push(row);
    });
    return Array.from(map.entries());
  }, [upsellTable]);

  const churnTrendData = useMemo(() => {
    const now = new Date();
    const months: { month: string; high: number; medium: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let high = 0;
      let medium = 0;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      riskSignals.forEach((r) => {
        const rDate = new Date(r.date);
        if (rDate >= d && rDate <= nextMonth) {
          if (r.churn_risk === 'high') high += 1;
          if (r.churn_risk === 'medium') medium += 1;
        }
      });
      months.push({ month: monthKey, high, medium });
    }
    return months;
  }, [riskSignals]);

  const toggleEvidence = (key: string) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Section A — Risk KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-red-100 p-4 text-red-900">
          <div className="text-sm font-medium">High Churn Risk</div>
          <div className="text-2xl font-bold">{highChurnAccounts}</div>
          <div className="text-xs opacity-80">accounts</div>
        </div>
        <div className="rounded-lg bg-orange-100 p-4 text-orange-900">
          <div className="text-sm font-medium">Medium Churn Risk</div>
          <div className="text-2xl font-bold">{mediumChurnAccounts}</div>
          <div className="text-xs opacity-80">accounts</div>
        </div>
        <div className="rounded-lg bg-red-100 p-4 text-red-900">
          <div className="text-sm font-medium">High Escalation Risk</div>
          <div className="text-2xl font-bold">{highEscalationAccounts}</div>
          <div className="text-xs opacity-80">accounts</div>
        </div>
        <div className="rounded-lg bg-green-100 p-4 text-green-900">
          <div className="text-sm font-medium">Upsell Opportunities</div>
          <div className="text-2xl font-bold">{upsellAccounts}</div>
          <div className="text-xs opacity-80">accounts</div>
        </div>
      </div>

      {/* Section B — Risk Matrix */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Risk Matrix — Churn vs Escalation</h3>
        <div className="relative">
          <ChartShell
            heightClass="h-80"
            empty={scatterData.length === 0}
            emptyTitle="No risk matrix data"
            emptyDescription="Upload risk signals to populate the scatter chart."
          >
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
              <defs>
                <linearGradient id="criticalZone" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fecaca" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#fecaca" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="safeZone" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#bbf7d0" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              {/* Recharts v3 `Props` omits SVG `fill` but runtime applies it (defaultProps include fill). */}
              <ReferenceArea
                {...({
                  x1: 1.5,
                  y1: 1.5,
                  x2: 3.5,
                  y2: 3.5,
                  fill: 'url(#criticalZone)',
                } as Record<string, unknown>)}
              />
              <ReferenceArea
                {...({
                  x1: -0.5,
                  y1: -0.5,
                  x2: 1.5,
                  y2: 1.5,
                  fill: 'url(#safeZone)',
                } as Record<string, unknown>)}
              />
              <XAxis type="number" dataKey="x" domain={[0, 3]} tickFormatter={(v) => ['None', 'Low', 'Med', 'High'][v]} />
              <YAxis type="number" dataKey="y" domain={[0, 3]} tickFormatter={(v) => ['None', 'Low', 'Med', 'High'][v]} />
              <ZAxis type="number" dataKey="z" range={[50, 400]} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded border border-slate-200 bg-white p-2 shadow-md text-xs">
                      <p className="font-semibold">{payload[0].payload.name}</p>
                      <p className="text-slate-600 mt-1">{payload[0].payload.churn_evidence?.slice(0, 120)}</p>
                    </div>
                  ) : null
                }
              />
              <Scatter name="Accounts" data={scatterData}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={dotColor(entry.y, entry.x)} />
                ))}
              </Scatter>
            </ScatterChart>
            </ResponsiveContainer>
          </ChartShell>
          {scatterData.length > 0 && (
            <>
              <div className="pointer-events-none absolute right-4 top-4 rounded bg-red-100/90 px-2 py-1 text-xs font-medium text-red-800">
                Critical Zone
              </div>
              <div className="pointer-events-none absolute bottom-6 left-4 rounded bg-green-100/90 px-2 py-1 text-xs font-medium text-green-800">
                Safe Zone
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section C — High Risk Accounts List */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Accounts Requiring Attention</h3>
        <div className="space-y-4">
          {highRiskAccountsList.map((acc) => {
            const key = acc.account_name;
            const isExpanded = expandedEvidence.has(key);
            const evidence = acc.churn_evidence?.slice(0, isExpanded ? undefined : 150) ?? '';
            return (
              <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{acc.account_name}</p>
                    {acc.customer_domain && <p className="text-sm text-slate-500">{acc.customer_domain}</p>}
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskBadgeClass(acc.churn_risk)}`}>
                      Churn: {acc.churn_risk}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskBadgeClass(acc.escalation_risk)}`}>
                      Escalation: {acc.escalation_risk}
                    </span>
                  </div>
                </div>
                {acc.churn_evidence && (
                  <p className="mt-2 text-sm text-slate-600">
                    {evidence}
                    {acc.churn_evidence.length > 150 && (
                      <button
                        type="button"
                        onClick={() => toggleEvidence(key)}
                        className="ml-1 text-indigo-600 hover:underline"
                      >
                        {isExpanded ? 'Less' : 'More'}
                      </button>
                    )}
                  </p>
                )}
                {acc.escalation_triggers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {acc.escalation_triggers.map((t, i) => (
                      <span key={i} className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">Last meeting: {acc.lastMeeting}</p>
                {onViewAccountDetails && (
                  <button
                    type="button"
                    onClick={() => onViewAccountDetails({ account_name: acc.account_name, customer_domain: acc.customer_domain })}
                    className="mt-3 rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    View Details
                  </button>
                )}
              </div>
            );
          })}
          {highRiskAccountsList.length === 0 && (
            <p className="py-4 text-center text-slate-500">No high-risk accounts.</p>
          )}
        </div>
      </div>

      {/* Section D — Upsell Opportunities Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Upsell Opportunities</h3>
        <div className="space-y-6">
          {upsellByProduct.map(([product, rows]) => (
            <div key={product}>
              <h4 className="mb-2 font-medium text-slate-700">{product}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-2 pr-4 font-medium">Account</th>
                      <th className="pb-2 pr-4 font-medium">Confidence</th>
                      <th className="pb-2 pr-4 font-medium">Signal</th>
                      <th className="pb-2 font-medium">Suggested Pitch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium text-slate-800">{row.account_name}</td>
                        <td className="py-2 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass(row.confidence)}`}>
                            {row.confidence}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-600">{row.signal}</td>
                        <td className="py-2 text-slate-600">{row.suggested_pitch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {upsellByProduct.length === 0 && (
            <p className="py-4 text-center text-slate-500">No upsell opportunities.</p>
          )}
        </div>
      </div>

      {/* Section E — Churn Risk Trend */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Churn Risk Trend</h3>
        <ChartShell
          heightClass="h-64"
          empty={churnTrendData.length === 0}
          emptyTitle="No churn trend data"
          emptyDescription="Upload risk signals over time to see this trend."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={churnTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="high" name="High risk" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="medium" name="Medium risk" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
}
