import { Fragment, useMemo } from 'react';
import { Calendar, Clock, Brain, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useDataStore } from '../../store/dataStore';
import type { MeetingMaster } from '../../types/meeting.types';
import { SkeletonCard } from '../shared/SkeletonCard';
import { ChartShell } from '../shared/ChartShell';

const MEETING_TYPE_COLORS: Record<string, string> = {
  KICKOFF: '#3b82f6',
  TECHNICAL: '#8b5cf6',
  ONBOARDING: '#06b6d4',
  REQUEST: '#f59e0b',
  REVIEW: '#10b981',
  INCIDENT: '#ef4444',
  GENERAL: '#64748b',
  INTERNAL_SYNC: '#94a3b8',
  INTERNAL_DAILY: '#cbd5e1',
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function isCurrentMonth(dateStr: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}


function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getChurnBadgeClass(risk: string): string {
  switch (risk) {
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

export function MeetingOverview() {
  const meetings = useDataStore((s) => s.meetings);
  const isParsingMeetings = useDataStore((s) => s.isParsingMeetings);
  const pmScores = useDataStore((s) => s.pmScores);
  const customerInsights = useDataStore((s) => s.customerInsights);
  const riskSignals = useDataStore((s) => s.riskSignals);

  const isLoading = meetings.length === 0 && isParsingMeetings;

  const thisMonthMeetings = useMemo(
    () => meetings.filter((m) => isCurrentMonth(m.date)),
    [meetings]
  );
  const customerCount = useMemo(
    () => thisMonthMeetings.filter((m) => m.is_customer_meeting).length,
    [thisMonthMeetings]
  );
  const internalCount = thisMonthMeetings.length - customerCount;

  const totalMinutesThisMonth = useMemo(
    () => thisMonthMeetings.reduce((sum, m) => sum + (m.duration_min ?? 0), 0),
    [thisMonthMeetings]
  );
  const avgMinutesPerMeeting =
    thisMonthMeetings.length > 0
      ? Math.round(totalMinutesThisMonth / thisMonthMeetings.length)
      : 0;

  const aiProcessedCount = useMemo(
    () => meetings.filter((m) => m.ai_processed).length,
    [meetings]
  );
  const aiProcessedRate =
    meetings.length > 0 ? Math.round((aiProcessedCount / meetings.length) * 100) : 0;

  const thisMonthPmScores = useMemo(
    () => pmScores.filter((s) => isCurrentMonth(s.date)),
    [pmScores]
  );
  const avgPmOverall =
    thisMonthPmScores.length > 0
      ? thisMonthPmScores.reduce((sum, s) => sum + (s.overall ?? 0), 0) / thisMonthPmScores.length
      : 0;

  const weeklyVolume = useMemo(() => {
    const byKey = new Map<string, { week: string; customer: number; internal: number; sortKey: number }>();
    meetings.forEach((m) => {
      const d = parseDate(m.date);
      if (!d) return;
      const y = d.getFullYear();
      const wn = getWeekNumber(d);
      const key = `${y}-W${wn}`;
      if (!byKey.has(key)) byKey.set(key, { week: `W${wn}`, customer: 0, internal: 0, sortKey: y * 100 + wn });
      const row = byKey.get(key)!;
      if (m.is_customer_meeting) row.customer += 1;
      else row.internal += 1;
    });
    return Array.from(byKey.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-8)
      .map(({ week, customer, internal }) => ({ week, customer, internal }));
  }, [meetings]);

  const meetingTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    meetings.forEach((m) => {
      const t = m.meeting_type?.trim() || 'OTHER';
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: MEETING_TYPE_COLORS[name] ?? '#94a3b8',
    }));
  }, [meetings]);

  const topAccounts = useMemo(() => {
    const byAccount = new Map<
      string,
      { accountName: string; meetings: MeetingMaster[]; lastDate: string }
    >();
    meetings.forEach((m) => {
      const name = m.account_name || 'Unknown';
      if (!byAccount.has(name)) {
        byAccount.set(name, { accountName: name, meetings: [], lastDate: m.date });
      }
      const row = byAccount.get(name)!;
      row.meetings.push(m);
      if (m.date > row.lastDate) row.lastDate = m.date;
    });
    const insightsByAccount = new Map<string, { sum: number; count: number }>();
    customerInsights.forEach((c) => {
      const name = c.account_name || 'Unknown';
      if (!insightsByAccount.has(name)) insightsByAccount.set(name, { sum: 0, count: 0 });
      const r = insightsByAccount.get(name)!;
      r.sum += c.sentiment_score ?? 0;
      r.count += 1;
    });
    const riskByAccount = new Map<string, string>();
    riskSignals.forEach((r) => {
      const name = r.account_name || 'Unknown';
      if (!riskByAccount.has(name) || r.churn_risk === 'high' || r.churn_risk === 'medium') {
        riskByAccount.set(name, r.churn_risk);
      }
    });
    return Array.from(byAccount.values())
      .map((row) => {
        const ins = insightsByAccount.get(row.accountName);
        const avgSentiment =
          ins && ins.count > 0 ? (ins.sum / ins.count).toFixed(1) : '—';
        const churn = riskByAccount.get(row.accountName) ?? 'none';
        return {
          accountName: row.accountName,
          totalMeetings: row.meetings.length,
          avgSentimentScore: avgSentiment,
          lastMeetingDate: row.lastDate,
          churnRisk: churn,
        };
      })
      .sort((a, b) => b.totalMeetings - a.totalMeetings)
      .slice(0, 10);
  }, [meetings, customerInsights, riskSignals]);

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
        <SkeletonCard variant="chart" />
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="animate-pulse bg-slate-200 rounded h-5 w-48 mb-4" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="pb-2 pr-4 font-medium">Account Name</th>
                  <th className="pb-2 pr-4 font-medium">Total Meetings</th>
                  <th className="pb-2 pr-4 font-medium">Avg Sentiment Score</th>
                  <th className="pb-2 pr-4 font-medium">Last Meeting Date</th>
                  <th className="pb-2 font-medium">Churn Risk</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Fragment key={i}>
                    <SkeletonCard variant="table-row" />
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section A — KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Total Meetings (this month)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{thisMonthMeetings.length}</p>
          <p className="text-sm text-slate-500">
            {customerCount} customer | {internalCount} internal
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">Total Meeting Hours (this month)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {formatDuration(totalMinutesThisMonth)}
          </p>
          <p className="text-sm text-slate-500">Avg per meeting: {avgMinutesPerMeeting} min</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600">
            <Brain className="h-5 w-5" />
            <span className="text-sm font-medium">AI Processed Rate</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{aiProcessedRate}%</p>
          <p className="text-sm text-slate-500">{aiProcessedCount} meetings analyzed</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Avg PM Score (this month)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {avgPmOverall.toFixed(1)} / 10
          </p>
          <p className="text-sm text-slate-500">Across {thisMonthPmScores.length} meetings</p>
        </div>
      </div>

      {/* Section B — Weekly Volume */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Weekly Meeting Volume</h3>
        <ChartShell
          heightClass="h-64"
          empty={weeklyVolume.length === 0}
          emptyTitle="No weekly volume data"
          emptyDescription="Upload meeting data to see weekly volume."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVolume} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="customer" name="Customer" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="internal" name="Internal" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* Section C — Meeting Type Distribution */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Meeting Types</h3>
        <ChartShell
          heightClass="h-72"
          empty={meetingTypeData.length === 0}
          emptyTitle="No meeting type distribution"
          emptyDescription="Upload meeting data to see type distribution."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={meetingTypeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {meetingTypeData.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* Section D — Top Active Accounts */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Most Active Accounts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="pb-2 pr-4 font-medium">Account Name</th>
                <th className="pb-2 pr-4 font-medium">Total Meetings</th>
                <th className="pb-2 pr-4 font-medium">Avg Sentiment Score</th>
                <th className="pb-2 pr-4 font-medium">Last Meeting Date</th>
                <th className="pb-2 font-medium">Churn Risk</th>
              </tr>
            </thead>
            <tbody>
              {topAccounts.map((row) => (
                <tr key={row.accountName} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-800">{row.accountName}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.totalMeetings}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.avgSentimentScore}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.lastMeetingDate}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getChurnBadgeClass(row.churnRisk)}`}
                    >
                      {row.churnRisk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {topAccounts.length === 0 && (
            <p className="py-6 text-center text-slate-500">No account data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
