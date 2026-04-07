import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDataStore } from '../../store/dataStore';
import { safeParseJSON } from '../../lib/meeting-parsers';
import { ChartShell } from '../shared/ChartShell';

type FaqPattern = { question_pattern?: string; topic?: string; account?: string; self_service?: boolean; date?: string };
type FeatureDemand = { feature?: string; impact?: string; business_justification?: string; accounts?: string[] };
type DocGap = string | { gap?: string; account?: string };

function toSafeText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  return String(value ?? '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const TOPIC_CATEGORY_COLORS: Record<string, string> = {
  product: '#3b82f6',
  integration: '#f97316',
  process: '#10b981',
  infrastructure: '#64748b',
  training: '#8b5cf6',
};

function impactBadgeClass(impact: string): string {
  switch (toSafeText(impact).toLowerCase()) {
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

function getTopicColor(topic: string): string {
  const t = toSafeText(topic).toLowerCase();
  const key = Object.keys(TOPIC_CATEGORY_COLORS).find((k) => t.includes(k));
  return key ? TOPIC_CATEGORY_COLORS[key] : '#94a3b8';
}

export function KnowledgeBase() {
  const knowledgeItems = useDataStore((s) => s.knowledgeItems);

  const recurringCount = useMemo(
    () => knowledgeItems.filter((k) => k.is_recurring).length,
    [knowledgeItems]
  );

  const faqPatternsTotal = useMemo(() => {
    let count = 0;
    knowledgeItems.forEach((k) => {
      const arr = safeParseJSON<unknown>(k.customer_faq_patterns, []);
      count += Array.isArray(arr) ? arr.length : 0;
    });
    return count;
  }, [knowledgeItems]);

  const featureDemandsTotal = useMemo(() => {
    let count = 0;
    knowledgeItems.forEach((k) => {
      const arr = safeParseJSON<unknown>(k.new_feature_demands, []);
      count += Array.isArray(arr) ? arr.length : 0;
    });
    return count;
  }, [knowledgeItems]);

  const docGapsTotal = useMemo(() => {
    let count = 0;
    knowledgeItems.forEach((k) => {
      const arr = safeParseJSON<unknown>(k.documentation_gaps, []);
      count += Array.isArray(arr) ? arr.length : 0;
    });
    return count;
  }, [knowledgeItems]);

  const recurringList = useMemo(() => {
    return knowledgeItems
      .filter((k) => k.is_recurring)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [knowledgeItems]);

  const faqPatternsFlat = useMemo(() => {
    const list: (FaqPattern & { account_name: string; date: string })[] = [];
    knowledgeItems.forEach((k) => {
      const arr = safeParseJSON<unknown>(k.customer_faq_patterns, []);
      if (!Array.isArray(arr)) return;
      arr.forEach((raw) => {
        if (!isRecord(raw)) return;
        const item = raw as FaqPattern;
        list.push({
          ...item,
          account_name: k.account_name || '',
          date: k.date || '',
        });
      });
    });
    return list;
  }, [knowledgeItems]);

  const faqByTopic = useMemo(() => {
    const map = new Map<string, (FaqPattern & { account_name: string; date: string })[]>();
    faqPatternsFlat.forEach((item) => {
      const topic = toSafeText(item.topic) || 'Other';
      if (!map.has(topic)) map.set(topic, []);
      map.get(topic)!.push(item);
    });
    return Array.from(map.entries());
  }, [faqPatternsFlat]);

  const featureDemandsAggregated = useMemo(() => {
    const byFeature = new Map<
      string,
      { feature: string; impact: string; justification: string; accounts: Set<string>; count: number }
    >();
    knowledgeItems.forEach((k) => {
      const arr = safeParseJSON<unknown>(k.new_feature_demands, []);
      if (!Array.isArray(arr)) return;
      arr.forEach((raw) => {
        if (!isRecord(raw)) return;
        const item = raw as FeatureDemand;
        const name = toSafeText(item.feature) || 'Unknown';
        if (!byFeature.has(name)) {
          byFeature.set(name, {
            feature: name,
            impact: toSafeText(item.impact) || 'low',
            justification: toSafeText(item.business_justification),
            accounts: new Set(),
            count: 0,
          });
        }
        const row = byFeature.get(name)!;
        row.count += 1;
        if (k.account_name) row.accounts.add(k.account_name);
        const accList = item.accounts;
        if (Array.isArray(accList)) {
          accList.forEach((a) => row.accounts.add(toSafeText(a)));
        }
      });
    });
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return Array.from(byFeature.values())
      .sort((a, b) => {
        const ia = impactOrder[toSafeText(a.impact).toLowerCase() as keyof typeof impactOrder] ?? 2;
        const ib = impactOrder[toSafeText(b.impact).toLowerCase() as keyof typeof impactOrder] ?? 2;
        if (ia !== ib) return ia - ib;
        return b.count - a.count;
      })
      .map((r) => ({ ...r, accounts: Array.from(r.accounts) }));
  }, [knowledgeItems]);

  const docGapsByAccount = useMemo(() => {
    const map = new Map<string, string[]>();
    knowledgeItems.forEach((k) => {
      const arr = safeParseJSON<unknown>(k.documentation_gaps, []);
      const account = toSafeText(k.account_name) || 'Unknown';
      if (!map.has(account)) map.set(account, []);
      if (!Array.isArray(arr)) return;
      arr.forEach((item) => {
        const text = typeof item === 'string' ? item : isRecord(item) ? toSafeText((item as { gap?: unknown }).gap) : '';
        if (text) map.get(account)!.push(text);
      });
    });
    return Array.from(map.entries());
  }, [knowledgeItems]);

  const topicTrendData = useMemo(() => {
    const counts: Record<string, number> = {};
    knowledgeItems.forEach((k) => {
      const arr = safeParseJSON<unknown>(k.topics_trend, []);
      if (!Array.isArray(arr)) return;
      arr.forEach((topic) => {
        const t = toSafeText(topic) || 'Other';
        counts[t] = (counts[t] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ topic: name, count, fill: getTopicColor(name) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [knowledgeItems]);

  return (
    <div className="space-y-8">
      {/* Section A — Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600">Recurring Issues</div>
          <div className="text-2xl font-bold text-slate-800">{recurringCount}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600">Documented FAQ Patterns</div>
          <div className="text-2xl font-bold text-slate-800">{faqPatternsTotal}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600">Feature Demands</div>
          <div className="text-2xl font-bold text-slate-800">{featureDemandsTotal}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600">Documentation Gaps</div>
          <div className="text-2xl font-bold text-slate-800">{docGapsTotal}</div>
        </div>
      </div>

      {/* Section B — Recurring Issues */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Recurring Issues</h3>
        <div className="space-y-4">
          {recurringList.map((item) => (
            <div key={item.meeting_id + item.date} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{item.account_name}</span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{item.date}</span>
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">{item.meeting_type}</span>
              </div>
              <p className="mt-2 text-slate-700">{item.recurring_description || '—'}</p>
              {item.root_cause_hint && (
                <div className="mt-2 rounded bg-amber-50 border border-amber-200 p-2 text-sm text-amber-900">
                  {item.root_cause_hint}
                </div>
              )}
              {item.recurrence_evidence && (
                <p className="mt-2 italic text-slate-500 text-sm">{item.recurrence_evidence}</p>
              )}
            </div>
          ))}
          {recurringList.length === 0 && (
            <p className="py-4 text-center text-slate-500">No recurring issues.</p>
          )}
        </div>
      </div>

      {/* Section C — Customer FAQ Patterns */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Frequently Asked Questions</h3>
        <div className="space-y-6">
          {faqByTopic.map(([topic, items]) => (
            <div key={topic}>
              <h4 className="mb-2 font-medium text-slate-700">{topic}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-2 pr-4 font-medium">Question Pattern</th>
                      <th className="pb-2 pr-4 font-medium">Account</th>
                      <th className="pb-2 pr-4 font-medium">Self-Service?</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-800">{toSafeText(row.question_pattern) || '—'}</td>
                        <td className="py-2 pr-4 text-slate-600">
                          {toSafeText(row.account_name) || toSafeText(row.account) || '—'}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.self_service ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.self_service ? 'Can be documented' : 'Complex'}
                          </span>
                        </td>
                        <td className="py-2 text-slate-600">{toSafeText(row.date) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {faqByTopic.length === 0 && (
            <p className="py-4 text-center text-slate-500">No FAQ patterns.</p>
          )}
        </div>
      </div>

      {/* Section D — Feature Demands Ranked */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Feature Demands</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featureDemandsAggregated.map((item) => (
            <div key={item.feature} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-800">{item.feature}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${impactBadgeClass(item.impact)}`}>
                  {item.impact}
                </span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{item.count}</span>
              </div>
              {item.justification && <p className="mt-2 text-sm text-slate-600">{item.justification}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {item.accounts.slice(0, 5).map((acc) => (
                  <span key={acc} className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                    {acc}
                  </span>
                ))}
                {item.accounts.length > 5 && (
                  <span className="text-xs text-slate-500">+{item.accounts.length - 5} more</span>
                )}
              </div>
            </div>
          ))}
          {featureDemandsAggregated.length === 0 && (
            <p className="py-4 text-center text-slate-500">No feature demands.</p>
          )}
        </div>
      </div>

      {/* Section E — Documentation Gaps */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Documentation Gaps</h3>
        <div className="space-y-4">
          {docGapsByAccount.map(([account, gaps]) => (
            <div key={account}>
              <h4 className="mb-2 font-medium text-slate-700">{account}</h4>
              <ul className="space-y-1">
                {gaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {docGapsByAccount.length === 0 && (
            <p className="py-4 text-center text-slate-500">No documentation gaps.</p>
          )}
        </div>
      </div>

      {/* Section F — Topic Trend */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Topic Trends</h3>
        <ChartShell
          heightClass="h-72"
          empty={topicTrendData.length === 0}
          emptyTitle="No topic data"
          emptyDescription="Upload knowledge data with topic trends to see this chart."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topicTrendData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 100, bottom: 8 }}
            >
              <XAxis type="number" />
              <YAxis type="category" dataKey="topic" width={96} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                {topicTrendData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
}
