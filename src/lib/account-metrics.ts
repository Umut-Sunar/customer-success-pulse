import type { AccountWithClients } from '../types/account.types';
import type { MeetingMaster, RiskSignal, CustomerInsight, PMScore } from '../types/meeting.types';
import type { SalesOrderLive } from '../types/sales.types';
import { computePmCrmAlignment } from './pm-identity';

export interface AccountMetrics {
  health_score: number;
  satisfaction_score: number;
  churn_risk: 'none' | 'low' | 'medium' | 'high';
  escalation_risk: 'none' | 'low' | 'medium' | 'high';
  engagement_14d: number;
  touch_status: 'Touched' | 'Untouched';
  last_meeting_date: string | null;
  last_sentiment: string | null;
  pm_match_avg: number;
  meeting_count_30d: number;
  mrr_from_orders: number | null;
  /** % of PM-scored customer meetings whose PM matches CRM project_manager (null if no CRM PM or no scores). */
  pm_crm_alignment_percent: number | null;
  pm_crm_meetings_scored: number;
  pm_crm_meetings_matched: number;
  /** Distinct canonical PM keys from pm_scores for this account's customer meetings. */
  meeting_pm_keys: string[];
}

function normalizeAccountName(name: string): string {
  return (name || '').trim().toLowerCase();
}

function matchesAccount(rowAccountName: string, accountName: string): boolean {
  const a = normalizeAccountName(rowAccountName);
  const b = normalizeAccountName(accountName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function daysBetween(dateStr: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(dateStr).getTime()) / 86_400_000);
}

const SENTIMENT_MAP: Record<string, number> = {
  positive: 100,
  neutral: 60,
  mixed: 40,
  negative: 20,
};

const CHURN_MAP: Record<string, number> = { none: 100, low: 75, medium: 40, high: 10 };
const ESCALATION_MAP: Record<string, number> = { none: 100, low: 80, medium: 50, high: 15 };

function sentimentComponent(insights: CustomerInsight[]): number {
  if (insights.length === 0) return 50;
  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;
  for (const ci of insights) {
    const d = new Date(ci.date).getTime();
    if (isNaN(d)) continue;
    const daysAgo = (now - d) / 86_400_000;
    const w = daysAgo <= 30 ? 1.0 : daysAgo <= 60 ? 0.7 : daysAgo <= 90 ? 0.4 : 0.2;
    const score =
      (ci.sentiment_score && ci.sentiment_score > 0)
        ? Math.min(100, ci.sentiment_score)
        : (SENTIMENT_MAP[ci.sentiment] ?? 60);
    weightedSum += score * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

function engagementComponent(meetingCount14d: number): number {
  if (meetingCount14d === 0) return 20;
  if (meetingCount14d === 1) return 60;
  if (meetingCount14d === 2) return 80;
  return 100;
}

function riskInverseComponent(
  churnRisk: string,
  escalationRisk: string
): number {
  const c = CHURN_MAP[churnRisk] ?? 100;
  const e = ESCALATION_MAP[escalationRisk] ?? 100;
  return c * 0.6 + e * 0.4;
}

function pmMatchComponent(insights: CustomerInsight[]): number {
  const scores = insights
    .map((ci) => ci.pm_client_match_score)
    .filter((s) => s > 0);
  if (scores.length === 0) return 50;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(100, avg * 10);
}

export function computeAccountMetrics(
  account: AccountWithClients,
  meetings: MeetingMaster[],
  riskSignals: RiskSignal[],
  customerInsights: CustomerInsight[],
  liveOrders: SalesOrderLive[],
  pmScores: PMScore[]
): AccountMetrics {
  const now = new Date();
  const name = account.account_name;

  const acctMeetings = meetings
    .filter((m) => matchesAccount(m.account_name, name))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const acctRisk = riskSignals
    .filter((r) => matchesAccount(r.account_name, name))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const acctInsights = customerInsights
    .filter((ci) => matchesAccount(ci.account_name, name))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const acctOrders = liveOrders.filter((o) => matchesAccount(o.account_name, name));

  const lastMeeting = acctMeetings[0];
  const lastRisk = acctRisk[0];
  const lastInsight = acctInsights[0];

  const lastMeetingDate = lastMeeting?.date ?? null;
  const touchStatus: AccountMetrics['touch_status'] =
    lastMeetingDate && daysBetween(lastMeetingDate, now) <= 14 ? 'Touched' : 'Untouched';

  const churnRisk = (lastRisk?.churn_risk ?? 'none') as AccountMetrics['churn_risk'];
  const escalationRisk = (lastRisk?.escalation_risk ?? 'none') as AccountMetrics['escalation_risk'];
  const lastSentiment = lastInsight?.sentiment ?? null;

  const engagement14d = acctMeetings.filter(
    (m) => m.is_customer_meeting && daysBetween(m.date, now) <= 14
  ).length;

  const meeting30d = acctMeetings.filter(
    (m) => daysBetween(m.date, now) <= 30
  ).length;

  const mrrFromOrders = acctOrders.length
    ? acctOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0)
    : null;

  const pmMatchAvgRaw = acctInsights
    .map((ci) => ci.pm_client_match_score)
    .filter((s) => s > 0);
  const pmMatchAvg = pmMatchAvgRaw.length > 0
    ? pmMatchAvgRaw.reduce((a, b) => a + b, 0) / pmMatchAvgRaw.length
    : 0;

  const sentComp = sentimentComponent(acctInsights);
  const engComp = engagementComponent(engagement14d);
  const riskComp = riskInverseComponent(churnRisk, escalationRisk);
  const pmComp = pmMatchComponent(acctInsights);

  const satisfaction = Math.round(
    sentComp * 0.35 + engComp * 0.25 + riskComp * 0.25 + pmComp * 0.15
  );

  const health = Math.round(
    Math.max(0, Math.min(100,
      satisfaction * 0.50 + riskComp * 0.30 + engComp * 0.20
    ))
  );

  const customerMeetingIds = new Set(
    acctMeetings.filter((m) => m.is_customer_meeting).map((m) => m.meeting_id)
  );
  const pmAlign = computePmCrmAlignment(account, customerMeetingIds, pmScores);

  return {
    health_score: health,
    satisfaction_score: satisfaction,
    churn_risk: churnRisk,
    escalation_risk: escalationRisk,
    engagement_14d: engagement14d,
    touch_status: touchStatus,
    last_meeting_date: lastMeetingDate,
    last_sentiment: lastSentiment,
    pm_match_avg: Math.round(pmMatchAvg * 10) / 10,
    meeting_count_30d: meeting30d,
    mrr_from_orders: mrrFromOrders,
    pm_crm_alignment_percent: pmAlign.alignmentPercent,
    pm_crm_meetings_scored: pmAlign.pmScoreRowsForAccount,
    pm_crm_meetings_matched: pmAlign.matchedRows,
    meeting_pm_keys: pmAlign.meetingPmKeys,
  };
}

export function enrichAccounts(
  accounts: AccountWithClients[],
  meetings: MeetingMaster[],
  riskSignals: RiskSignal[],
  customerInsights: CustomerInsight[],
  liveOrders: SalesOrderLive[],
  pmScores: PMScore[]
): (AccountWithClients & AccountMetrics)[] {
  return accounts.map((a) => {
    const metrics = computeAccountMetrics(a, meetings, riskSignals, customerInsights, liveOrders, pmScores);
    return {
      ...a,
      ...metrics,
      total_mrr: metrics.mrr_from_orders !== null ? metrics.mrr_from_orders : a.total_mrr,
    };
  });
}
