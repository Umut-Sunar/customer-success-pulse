import React, { useState, useMemo } from 'react';
import type { EnrichedAccount } from '../hooks/useEnrichedAccounts';
import type { AccountClientStatus } from '../src/types/account.types';
import {
  X, ChevronLeft, ShieldAlert, Star, Brain, MessageSquare,
  Calendar, AlertTriangle, TrendingUp, User, CheckCircle, Clock,
  Globe, Users, ShoppingBag, Activity, Link2,
} from 'lucide-react';
import { useDataStore } from '../src/store/dataStore';
import { EmptyState } from '../src/components/shared/EmptyState';
import { parsePainPoints, parseUpsellOpportunities } from '../src/lib/meeting-parsers';

interface AccountDetailProps {
  account: EnrichedAccount;
  onClose: () => void;
}

type TabType = 'Overview' | 'Clients' | 'Meeting Intel' | 'Sales Orders';

function normalizeForMatch(s: string): string {
  return (s || '').trim().toLowerCase();
}

function matchesAccount(rowAccountName: string, accountName: string): boolean {
  const a = normalizeForMatch(rowAccountName);
  const b = normalizeForMatch(accountName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function getStatusColor(status: AccountClientStatus) {
  switch (status) {
    case 'Live':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Setup':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Churned':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function churnRiskColor(risk: string) {
  switch (risk) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-amber-500';
    case 'low': return 'text-emerald-500';
    default: return 'text-slate-400';
  }
}

function healthScoreColor(score: number) {
  if (score > 70) return 'bg-emerald-500';
  if (score > 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export const AccountDetail: React.FC<AccountDetailProps> = ({ account, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');

  const customerInsights = useDataStore((s) => s.customerInsights);
  const riskSignals = useDataStore((s) => s.riskSignals);
  const meetings = useDataStore((s) => s.meetings);
  const pmScores = useDataStore((s) => s.pmScores);
  const pipelineOrders = useDataStore((s) => s.pipelineOrders);
  const liveOrders = useDataStore((s) => s.liveOrders);

  const meetingIntelData = useMemo(() => {
    const name = account.account_name;
    const match = (row: { account_name?: string }) =>
      matchesAccount(row.account_name ?? '', name);

    const insights = customerInsights.filter(match);
    if (insights.length === 0) return null;

    const sortedInsights = [...insights].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latestInsight = sortedInsights[0];

    const customerMeetings = meetings
      .filter(match)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const customerMeetingIds = new Set(customerMeetings.map((m) => m.meeting_id));

    const allPainPoints = insights.flatMap((i) => parsePainPoints(i.pain_points));
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const topPainPoints = [...allPainPoints]
      .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3))
      .slice(0, 5);

    const accountRiskSignals = riskSignals.filter(match);
    const upsellOpps = accountRiskSignals.flatMap((r) => parseUpsellOpportunities(r.upsell));

    const customerPmScores = pmScores.filter((p) => customerMeetingIds.has(p.meeting_id));
    const latestPmScore = [...customerPmScores].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] ?? null;

    const sentimentTrend = sortedInsights.slice(0, 10).reverse().map((ci) => ({
      date: ci.date,
      sentiment: ci.sentiment,
      score: ci.sentiment_score,
    }));

    return {
      latestInsight,
      customerMeetings: customerMeetings.slice(0, 5),
      totalMeetings: customerMeetings.length,
      topPainPoints,
      upsellOpps,
      latestPmScore,
      sentimentTrend,
      insightCount: insights.length,
      riskCount: accountRiskSignals.length,
    };
  }, [account.account_name, customerInsights, meetings, riskSignals, pmScores]);

  const salesData = useMemo(() => {
    const name = account.account_name;
    const pipeline = pipelineOrders.filter((o) => matchesAccount(o.account_name, name));
    const live = liveOrders.filter((o) => matchesAccount(o.account_name, name));
    return { pipeline, live };
  }, [account.account_name, pipelineOrders, liveOrders]);

  const tabs: TabType[] = ['Overview', 'Clients', 'Meeting Intel', 'Sales Orders'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col">
        {/* Top nav */}
        <div className="pt-6 px-8 pb-2 flex justify-between items-center">
          <button
            onClick={onClose}
            className="flex items-center text-slate-400 hover:text-slate-600 text-sm font-medium"
          >
            <ChevronLeft size={18} className="mr-1" />
            Back to List
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Header */}
        <div className="px-8 pb-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-slate-800">{account.account_name}</h2>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(account.dominant_status)}`}>
                  {account.dominant_status}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  ${account.total_mrr.toLocaleString()}/mo MRR
                </span>
                {account.country && (
                  <>
                    <span className="text-sm text-slate-400">|</span>
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <Globe size={14} /> {account.country}
                    </span>
                  </>
                )}
                {account.service_country && account.service_country !== account.country && (
                  <>
                    <span className="text-sm text-slate-400">→</span>
                    <span className="text-sm text-slate-500">{account.service_country}</span>
                  </>
                )}
                <span className="text-sm text-slate-400">|</span>
                <span className="text-sm text-slate-500">
                  {account.client_count} client{account.client_count !== 1 ? 's' : ''}
                </span>
                {account.primary_pm && (
                  <>
                    <span className="text-sm text-slate-400">|</span>
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <User size={14} /> {account.primary_pm}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className={`${healthScoreColor(account.health_score)} text-white rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg`}>
              <span className="text-4xl font-bold">{account.health_score}</span>
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">Health</span>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-8 space-y-8 flex-1 bg-slate-50/50">
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-medium">
                <Star size={14} /> Satisfaction
              </div>
              <div className="text-2xl font-bold text-blue-600">{account.satisfaction_score}</div>
              <div className="text-xs text-slate-400">out of 100</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-medium">
                <ShieldAlert size={14} /> Churn Risk
              </div>
              <div className={`text-2xl font-bold uppercase ${churnRiskColor(account.churn_risk)}`}>
                {account.churn_risk}
              </div>
              <div className="text-xs text-slate-400">latest signal</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-medium">
                <Activity size={14} /> Engagement
              </div>
              <div className="text-2xl font-bold text-slate-800">{account.engagement_14d}</div>
              <div className="text-xs text-slate-400">meetings in 14d</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-medium">
                <Users size={14} /> PM Match
              </div>
              <div className="text-2xl font-bold text-violet-600">
                {account.pm_match_avg > 0 ? `${account.pm_match_avg}/10` : '—'}
              </div>
              <div className="text-xs text-slate-400">avg score</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-medium">
                <MessageSquare size={14} /> Sentiment
              </div>
              <div className={`text-2xl font-bold capitalize ${
                account.last_sentiment === 'positive' ? 'text-emerald-500' :
                account.last_sentiment === 'negative' ? 'text-red-500' :
                account.last_sentiment === 'mixed' ? 'text-amber-500' : 'text-slate-400'
              }`}>
                {account.last_sentiment ?? '—'}
              </div>
              <div className="text-xs text-slate-400">latest</div>
            </div>
          </div>

          {/* CRM ↔ Meeting Intel PM alignment */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Link2 size={18} className="text-indigo-500" />
              CRM vs Meeting Intel — Project Manager alignment
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Compares <strong>project_manager</strong> from your Account CSV to <strong>pm_name</strong> / <strong>pm_email</strong> in uploaded PM scores (same rules as PM Performance: email preferred when present).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Alignment</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {account.pm_crm_alignment_percent !== null
                    ? `${account.pm_crm_alignment_percent}%`
                    : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {account.pm_crm_meetings_scored > 0
                    ? `${account.pm_crm_meetings_matched} / ${account.pm_crm_meetings_scored} scored meetings`
                    : 'No PM scores for customer meetings'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">CRM (Account import)</p>
                <ul className="text-slate-700 space-y-1">
                  {Array.from(
                    new Set(
                      [
                        account.primary_pm,
                        ...account.clients.map((c) => c.project_manager),
                      ].filter(Boolean) as string[]
                    )
                  ).length === 0 ? (
                    <li className="text-slate-400">No PM on file</li>
                  ) : (
                    Array.from(
                      new Set(
                        [
                          account.primary_pm,
                          ...account.clients.map((c) => c.project_manager),
                        ].filter(Boolean) as string[]
                      )
                    ).map((pm) => (
                      <li key={pm} className="font-medium">
                        {pm}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Seen in meetings (PM scores)</p>
                {account.meeting_pm_keys.length === 0 ? (
                  <p className="text-slate-400">—</p>
                ) : (
                  <ul className="text-slate-700 space-y-1 break-all">
                    {account.meeting_pm_keys.map((k) => (
                      <li key={k} className="font-mono text-xs">
                        {k}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Escalation callout */}
          {(account.escalation_risk === 'high' || account.escalation_risk === 'medium') ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="text-amber-500" size={20} />
              <span className="text-amber-800 font-medium">
                Escalation risk: <strong>{account.escalation_risk}</strong>
              </span>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="text-emerald-500" size={20} />
              <span className="text-emerald-800 font-medium">No active escalation signals.</span>
            </div>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-2 border-b border-slate-200 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="animate-in fade-in duration-200">
              {/* OVERVIEW */}
              {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4">Account Summary</h4>
                    <ul className="space-y-3">
                      <li className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">Total MRR</span>
                        <span className="font-medium">${account.total_mrr.toLocaleString()}</span>
                      </li>
                      <li className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">Health Score</span>
                        <span className={`font-medium ${account.health_score > 70 ? 'text-emerald-600' : account.health_score > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {account.health_score}/100
                        </span>
                      </li>
                      <li className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">Satisfaction</span>
                        <span className="font-medium">{account.satisfaction_score}/100</span>
                      </li>
                      <li className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">Churn Risk</span>
                        <span className={`font-medium capitalize ${churnRiskColor(account.churn_risk)}`}>
                          {account.churn_risk}
                        </span>
                      </li>
                      <li className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">PM Match Avg</span>
                        <span className="font-medium">
                          {account.pm_match_avg > 0 ? `${account.pm_match_avg}/10` : '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-2">
                        <span className="text-slate-500">Country</span>
                        <span className="font-medium">{account.country ?? '—'}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4">Engagement</h4>
                    <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
                      <div className={`p-3 rounded-full ${
                        account.touch_status === 'Touched'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {account.touch_status === 'Touched' ? <CheckCircle size={32} /> : <Clock size={32} />}
                      </div>
                      <p className="font-medium text-slate-800">
                        {account.touch_status === 'Touched'
                          ? `Touched — ${account.engagement_14d} meeting${account.engagement_14d !== 1 ? 's' : ''} in last 14 days`
                          : 'Untouched — no meetings in last 14 days'}
                      </p>
                      {account.last_meeting_date && (
                        <p className="text-xs text-slate-500">Last meeting: {account.last_meeting_date}</p>
                      )}
                      <p className="text-xs text-slate-400">{account.meeting_count_30d} meetings in last 30 days</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CLIENTS */}
              {activeTab === 'Clients' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <h4 className="font-semibold text-slate-800">
                      Clients ({account.client_count})
                    </h4>
                  </div>
                  {account.clients.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      No clients under this account.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Client Name</th>
                            <th className="px-4 py-3 text-left font-medium">Tenant</th>
                            <th className="px-4 py-3 text-left font-medium">MRR</th>
                            <th className="px-4 py-3 text-left font-medium">PM</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {account.clients.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-800">{client.client_name}</td>
                              <td className="px-4 py-3 text-slate-500">{client.tenant_name ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-600">${client.mrr.toLocaleString()}</td>
                              <td className="px-4 py-3 text-slate-500">{client.project_manager ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                                  {client.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* MEETING INTEL */}
              {activeTab === 'Meeting Intel' && (
                <>
                  {!meetingIntelData ? (
                    <EmptyState
                      icon={<Brain className="h-12 w-12 text-slate-400" />}
                      title="No meeting data"
                      description="No customer insights found for this account. Upload Meeting Intelligence CSVs to see data here."
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Summary strip */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap gap-6 text-sm">
                        <span className="text-blue-800">
                          <strong>{meetingIntelData.totalMeetings}</strong> total meetings
                        </span>
                        <span className="text-blue-800">
                          <strong>{meetingIntelData.insightCount}</strong> insights
                        </span>
                        <span className="text-blue-800">
                          <strong>{meetingIntelData.riskCount}</strong> risk signals
                        </span>
                        {account.pm_crm_meetings_scored > 0 && (
                          <span className="text-blue-800">
                            CRM–PM alignment{' '}
                            <strong>
                              {account.pm_crm_alignment_percent !== null
                                ? `${account.pm_crm_alignment_percent}%`
                                : '—'}
                            </strong>
                            <span className="text-blue-600 font-normal">
                              {' '}
                              ({account.pm_crm_meetings_matched}/{account.pm_crm_meetings_scored} PM-scored customer meetings)
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Sentiment trend */}
                      {meetingIntelData.sentimentTrend.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <MessageSquare size={18} /> Sentiment Trend
                          </h4>
                          <div className="flex gap-2 flex-wrap">
                            {meetingIntelData.sentimentTrend.map((s, i) => (
                              <div key={i} className="flex flex-col items-center gap-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  s.sentiment === 'positive' ? 'bg-emerald-500' :
                                  s.sentiment === 'negative' ? 'bg-red-500' :
                                  s.sentiment === 'mixed' ? 'bg-amber-500' : 'bg-slate-400'
                                }`}>
                                  {s.score > 0 ? s.score : s.sentiment?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <span className="text-[10px] text-slate-400">{s.date?.slice(5) ?? ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Last sentiment */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3">Last Sentiment</h4>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            meetingIntelData.latestInsight.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                            meetingIntelData.latestInsight.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            meetingIntelData.latestInsight.sentiment === 'mixed' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {meetingIntelData.latestInsight.sentiment}
                          </span>
                          <span className="text-slate-600">Score: <strong>{meetingIntelData.latestInsight.sentiment_score}</strong></span>
                          <span className="text-slate-400 text-sm">{meetingIntelData.latestInsight.date}</span>
                        </div>
                      </div>

                      {/* Recent meetings */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <Calendar size={18} /> Recent Meetings
                        </h4>
                        {meetingIntelData.customerMeetings.length === 0 ? (
                          <p className="text-sm text-slate-500">No meetings found.</p>
                        ) : (
                          <ul className="space-y-2">
                            {meetingIntelData.customerMeetings.map((m, i) => (
                              <li key={m.meeting_id || i} className="flex items-center gap-3 text-sm py-1">
                                <span className="text-slate-400 shrink-0 w-20">{m.date}</span>
                                <span className="text-slate-700 flex-1">{m.title || m.meeting_type || 'Meeting'}</span>
                                <span className="text-xs text-slate-400">{m.duration_min}min</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Pain points */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <AlertTriangle size={18} /> Pain Points
                        </h4>
                        {meetingIntelData.topPainPoints.length === 0 ? (
                          <p className="text-sm text-slate-500">None identified.</p>
                        ) : (
                          <ul className="space-y-2">
                            {meetingIntelData.topPainPoints.map((pp, i) => (
                              <li key={i} className="text-sm">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                                  pp.severity === 'high' ? 'bg-red-100 text-red-700' :
                                  pp.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{pp.severity}</span>
                                {pp.issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Upsell */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <TrendingUp size={18} /> Upsell Opportunities
                        </h4>
                        {meetingIntelData.upsellOpps.length === 0 ? (
                          <p className="text-sm text-slate-500">None identified.</p>
                        ) : (
                          <ul className="space-y-2">
                            {meetingIntelData.upsellOpps.slice(0, 5).map((o, i) => (
                              <li key={i} className="text-sm text-slate-700">
                                <span className="font-medium">{o.product}</span>
                                {o.signal && <span className="text-slate-500"> — {o.signal}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* PM feedback */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <User size={18} /> Latest PM Feedback
                        </h4>
                        {!meetingIntelData.latestPmScore ? (
                          <p className="text-sm text-slate-500">No PM score data.</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-slate-400">Overall</p>
                                <p className="text-lg font-bold text-slate-800">{meetingIntelData.latestPmScore.overall}</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-slate-400">Match</p>
                                <p className="text-lg font-bold text-violet-600">{meetingIntelData.latestPmScore.pm_client_match_score}/10</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-slate-400">Communication</p>
                                <p className="text-lg font-bold text-slate-800">{meetingIntelData.latestPmScore.communication}</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-slate-400">Tech</p>
                                <p className="text-lg font-bold text-slate-800">{meetingIntelData.latestPmScore.tech_mastery}</p>
                              </div>
                            </div>
                            {(meetingIntelData.latestPmScore.pm_client_recommendation || meetingIntelData.latestPmScore.feedback) && (
                              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                                {meetingIntelData.latestPmScore.pm_client_recommendation || meetingIntelData.latestPmScore.feedback}
                              </p>
                            )}
                            <p className="text-xs text-slate-400">
                              {meetingIntelData.latestPmScore.pm_name} — {meetingIntelData.latestPmScore.date}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* SALES ORDERS */}
              {activeTab === 'Sales Orders' && (
                <div className="space-y-6">
                  {/* Live orders */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                      <ShoppingBag size={18} className="text-emerald-500" />
                      <h4 className="font-semibold text-slate-800">Live Orders ({salesData.live.length})</h4>
                    </div>
                    {salesData.live.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">No live orders found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Subject</th>
                              <th className="px-4 py-2 text-left font-medium">Tenant</th>
                              <th className="px-4 py-2 text-left font-medium">Total</th>
                              <th className="px-4 py-2 text-left font-medium">PM</th>
                              <th className="px-4 py-2 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesData.live.map((o) => (
                              <tr key={o.record_id} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-800">{o.subject}</td>
                                <td className="px-4 py-2 text-slate-500">{o.tenant_name || '—'}</td>
                                <td className="px-4 py-2 text-slate-600">${o.grand_total.toLocaleString()}</td>
                                <td className="px-4 py-2 text-slate-500">{o.project_manager || '—'}</td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    {o.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Pipeline orders */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                      <ShoppingBag size={18} className="text-blue-500" />
                      <h4 className="font-semibold text-slate-800">Pipeline Orders ({salesData.pipeline.length})</h4>
                    </div>
                    {salesData.pipeline.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">No pipeline orders found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Subject</th>
                              <th className="px-4 py-2 text-left font-medium">Opportunity</th>
                              <th className="px-4 py-2 text-left font-medium">Total</th>
                              <th className="px-4 py-2 text-left font-medium">Due</th>
                              <th className="px-4 py-2 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesData.pipeline.map((o) => (
                              <tr key={o.record_id} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-800">{o.subject}</td>
                                <td className="px-4 py-2 text-slate-500">{o.opportunity_name || '—'}</td>
                                <td className="px-4 py-2 text-slate-600">${o.grand_total.toLocaleString()}</td>
                                <td className="px-4 py-2 text-slate-500">{o.due_date || '—'}</td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                    {o.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
