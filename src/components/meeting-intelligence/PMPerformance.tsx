import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { useDataStore } from '../../store/dataStore';
import { aggregatePMScores, normalizeNumber } from '../../lib/meeting-parsers';
import type { PMScoreAggregated } from '../../types/meeting.types';
import { SkeletonCard } from '../shared/SkeletonCard';
import { ChartShell } from '../shared/ChartShell';

const RADAR_AXES = [
  { key: 'preparation', label: 'Preparation' },
  { key: 'customer_mgmt', label: 'Customer Mgmt' },
  { key: 'tech_mastery', label: 'Technical Mastery' },
  { key: 'action_quality', label: 'Action Quality' },
  { key: 'communication', label: 'Communication' },
] as const;

const ENGLISH_LEVEL_MAP: Record<string, number> = {
  A1: 20,
  A2: 35,
  B1: 50,
  B2: 65,
  C1: 80,
  C2: 95,
  native: 100,
  'N/A': 0,
};

function englishToPercent(level: string): number {
  const key = level?.trim() || 'N/A';
  return ENGLISH_LEVEL_MAP[key] ?? 0;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getOverallColor(avg: number): string {
  if (avg < 6) return 'text-red-600 font-medium';
  if (avg <= 7.5) return 'text-amber-600 font-medium';
  return 'text-green-600 font-medium';
}

export function PMPerformance() {
  const pmScores = useDataStore((s) => s.pmScores);
  const isParsingPmScores = useDataStore((s) => s.isParsingPmScores);
  const meetings = useDataStore((s) => s.meetings);

  const isLoading = pmScores.length === 0 && isParsingPmScores;

  const [selectedPmKey, setSelectedPmKey] = useState<string | null>(null);

  const aggregated = useMemo(() => aggregatePMScores(pmScores), [pmScores]);

  const meetingDurationByPm = useMemo(() => {
    const map = new Map<string, number>();
    const meetingDurations = new Map<string, number>();
    meetings.forEach((m) => {
      meetingDurations.set(m.meeting_id, m.duration_min ?? 0);
    });
    pmScores.forEach((s) => {
      const key = s.pm_email || s.pm_name;
      const dur = meetingDurations.get(s.meeting_id) ?? 0;
      map.set(key, (map.get(key) ?? 0) + dur);
    });
    return map;
  }, [meetings, pmScores]);

  const aggregatedWithDuration = useMemo(() => {
    return aggregated.map((a) => {
      const key = a.pm_email || a.pm_name;
      const totalMin = meetingDurationByPm.get(key) ?? 0;
      return { ...a, total_duration_min: totalMin };
    });
  }, [aggregated, meetingDurationByPm]);

  const selectedPmScores = useMemo(() => {
    if (!selectedPmKey) return [];
    return pmScores
      .filter((s) => (s.pm_email || s.pm_name) === selectedPmKey)
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, 12);
  }, [pmScores, selectedPmKey]);

  const selectedPmAgg = useMemo(() => {
    if (!selectedPmKey) return null;
    return aggregated.find((a) => (a.pm_email || a.pm_name) === selectedPmKey) ?? null;
  }, [aggregated, selectedPmKey]);

  const radarData = useMemo(() => {
    if (!selectedPmAgg) return [];
    return RADAR_AXES.map(({ key, label }) => {
      const val = selectedPmAgg[key as keyof PMScoreAggregated];
      const num = typeof val === 'number' ? val : 0;
      return { subject: label, value: Math.round(num * 10) / 10, benchmark: 7, fullMark: 10 };
    });
  }, [selectedPmAgg]);

  const trendData = useMemo(() => {
    return selectedPmScores.map((s) => {
      const meeting = meetings.find((m) => m.meeting_id === s.meeting_id);
      return {
        date: s.date,
        overall: s.overall ?? 0,
        title: meeting?.title ?? 'Meeting',
        feedback: (s.feedback ?? '').slice(0, 80),
      };
    }).reverse();
  }, [selectedPmScores, meetings]);

  const meetingLoadData = useMemo(() => {
    return aggregatedWithDuration.map((a) => ({
      name: a.pm_name || a.pm_email || 'Unknown',
      customer: a.customer_meeting_count,
      internal: a.internal_meeting_count,
      hours: Math.round((a.total_duration_min ?? 0) / 60 * 10) / 10,
    }));
  }, [aggregatedWithDuration]);

  const clientMatchByPm = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    pmScores.forEach((s) => {
      const key = s.pm_email || s.pm_name;
      if (!map.has(key)) map.set(key, { sum: 0, count: 0 });
      const r = map.get(key)!;
      r.sum += normalizeNumber(s.pm_client_match_score);
      r.count += 1;
    });
    return map;
  }, [pmScores]);

  type PmTableSortKey = keyof PMScoreAggregated | 'client_match' | 'englishLevel';
  const [sortKey, setSortKey] = useState<PmTableSortKey>('meeting_count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedTable = useMemo(() => {
    const withClient = aggregatedWithDuration.map((a) => {
      const key = a.pm_email || a.pm_name;
      const cm = clientMatchByPm.get(key);
      const clientMatchAvg = cm && cm.count > 0 ? cm.sum / cm.count : 0;
      const englishLevel = (() => {
        const scores = pmScores.filter((s) => (s.pm_email || s.pm_name) === key);
        if (scores.length === 0) return 'N/A';
        return scores[scores.length - 1].english_level || 'N/A';
      })();
      return { ...a, clientMatchAvg, englishLevel };
    });
    return [...withClient].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortKey === 'client_match') {
        aVal = (a as { clientMatchAvg: number }).clientMatchAvg;
        bVal = (b as { clientMatchAvg: number }).clientMatchAvg;
      } else if (sortKey === 'englishLevel') {
        aVal = (a as { englishLevel: string }).englishLevel;
        bVal = (b as { englishLevel: string }).englishLevel;
      } else {
        aVal = a[sortKey as keyof PMScoreAggregated] as number | string;
        bVal = b[sortKey as keyof PMScoreAggregated] as number | string;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [aggregatedWithDuration, clientMatchByPm, pmScores, sortKey, sortDir]);

  const mostRecentEnglish = useMemo(() => {
    if (selectedPmScores.length === 0) return null;
    const s = selectedPmScores[0];
    const vocab = typeof s.english_vocabulary === 'number' ? s.english_vocabulary : parseFloat(String(s.english_vocabulary)) || 0;
    const grammar = typeof s.english_grammar === 'number' ? s.english_grammar : parseFloat(String(s.english_grammar)) || 0;
    const fluency = typeof s.english_fluency === 'number' ? s.english_fluency : parseFloat(String(s.english_fluency)) || 0;
    const technical = typeof s.english_technical === 'number' ? s.english_technical : parseFloat(String(s.english_technical)) || 0;
    return {
      level: s.english_level || 'N/A',
      vocabulary: Number.isNaN(vocab) ? englishToPercent(s.english_level) : Math.min(100, vocab * 10),
      grammar: Number.isNaN(grammar) ? englishToPercent(s.english_level) : Math.min(100, grammar * 10),
      fluency: Number.isNaN(fluency) ? englishToPercent(s.english_level) : Math.min(100, fluency * 10),
      technical: Number.isNaN(technical) ? englishToPercent(s.english_level) : Math.min(100, technical * 10),
    };
  }, [selectedPmScores]);

  const pmKeys = useMemo(() => aggregated.map((a) => a.pm_email || a.pm_name), [aggregated]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="animate-pulse bg-slate-200 rounded h-6 w-32 mb-3" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard variant="card" />
          <SkeletonCard variant="card" />
          <SkeletonCard variant="card" />
        </div>
        <SkeletonCard variant="chart" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section A — PM Selector */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPmKey(null)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
              selectedPmKey === null
                ? 'ring-2 ring-slate-800 bg-slate-800 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
            title="All PMs"
          >
            All
          </button>
          {aggregated.map((a) => {
            const key = a.pm_email || a.pm_name;
            const isSelected = selectedPmKey === key;
            const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
            const color = colors[pmKeys.indexOf(key) % colors.length];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPmKey(key)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white transition-all ${color} ${
                  isSelected ? 'ring-2 ring-offset-2 ring-slate-800' : 'hover:opacity-90'
                }`}
                title={a.pm_name || a.pm_email}
              >
                {getInitials(a.pm_name || a.pm_email || '')}
              </button>
            );
          })}
        </div>
      </div>

      {selectedPmKey ? (
        <>
          {/* Section B — Radar (single PM) */}
          {selectedPmAgg && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-800">
                Performance Radar — {selectedPmAgg.pm_name || selectedPmAgg.pm_email}
              </h3>
              <ChartShell
                heightClass="h-80"
                empty={radarData.length === 0}
                emptyTitle="No radar data"
                emptyDescription="Select a PM with score data to see the radar chart."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                    <Radar name="Benchmark (7)" dataKey="benchmark" stroke="#94a3b8" fill="transparent" strokeDasharray="4 4" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
          )}

          {/* Section C — Score Trend (single PM) */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Score Trend — Last 12 Meetings</h3>
            <ChartShell
              heightClass="h-64"
              empty={trendData.length === 0}
              emptyTitle="No score trend"
              emptyDescription="No PM score history for this selection yet."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-md">
                          <p className="text-xs text-slate-500">{payload[0].payload.date}</p>
                          <p className="font-medium">{payload[0].payload.title}</p>
                          <p className="text-xs text-slate-600 mt-1">{payload[0].payload.feedback}</p>
                        </div>
                      ) : null
                    }
                  />
                  <Line type="monotone" dataKey="overall" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Overall" />
                </LineChart>
              </ResponsiveContainer>
            </ChartShell>
          </div>

          {/* Section D — English Proficiency (single PM) */}
          {mostRecentEnglish && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-800">English Proficiency</h3>
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 p-4">
                <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
                  {mostRecentEnglish.level}
                </span>
                <div className="flex-1 space-y-3 min-w-[200px]">
                  {[
                    { label: 'Vocabulary', value: mostRecentEnglish.vocabulary },
                    { label: 'Grammar', value: mostRecentEnglish.grammar },
                    { label: 'Fluency', value: mostRecentEnglish.fluency },
                    { label: 'Technical', value: mostRecentEnglish.technical },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                        <span>{label}</span>
                        <span>{Math.round(value)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(100, value)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Section E — Meeting Load (All PMs) */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Monthly Meeting Load by PM</h3>
            <ChartShell
              heightClass="h-72"
              empty={meetingLoadData.length === 0}
              emptyTitle="No meeting load data"
              emptyDescription="Upload PM scores and meetings to see load by PM."
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={meetingLoadData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="customer" name="Customer" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="internal" name="Internal" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="hours" name="Total hours" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartShell>
          </div>

          {/* Section F — PM Comparison Table */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">PM Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    {[
                      { key: 'pm_name', label: 'PM Name' },
                      { key: 'meeting_count', label: 'Meetings' },
                      { key: 'avg_overall', label: 'Avg Overall' },
                      { key: 'avg_preparation', label: 'Avg Prep' },
                      { key: 'avg_customer_mgmt', label: 'Avg Cust Mgmt' },
                      { key: 'avg_tech_mastery', label: 'Avg Tech' },
                      { key: 'englishLevel', label: 'English' },
                      { key: 'client_match', label: 'Client Match Avg' },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="cursor-pointer pb-2 pr-4 font-medium hover:text-slate-800"
                        onClick={() => {
                          setSortKey(key as PmTableSortKey);
                          setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.map((row) => {
                    const r = row as PMScoreAggregated & { clientMatchAvg: number; englishLevel: string };
                    return (
                      <tr key={r.pm_email || r.pm_name} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-800">{r.pm_name || r.pm_email}</td>
                        <td className="py-3 pr-4 text-slate-600">{r.meeting_count}</td>
                        <td className={`py-3 pr-4 ${getOverallColor(r.avg_overall)}`}>
                          {r.avg_overall.toFixed(1)}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{r.avg_preparation.toFixed(1)}</td>
                        <td className="py-3 pr-4 text-slate-600">{r.avg_customer_mgmt.toFixed(1)}</td>
                        <td className="py-3 pr-4 text-slate-600">{r.avg_tech_mastery.toFixed(1)}</td>
                        <td className="py-3 pr-4 text-slate-600">{r.englishLevel}</td>
                        <td className="py-3 text-slate-600">{r.clientMatchAvg.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedTable.length === 0 && (
                <p className="py-6 text-center text-slate-500">No PM data yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
