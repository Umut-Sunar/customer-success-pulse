import { Customer } from '../types/customer.types';
import { MeetingMaster, RiskSignal, CustomerInsight } from '../types/meeting.types';
import { SalesOrderLive } from '../types/sales.types';

export interface ComputedMetrics {
  health_score: number;
  touch_status: 'Touched' | 'Untouched';
  churn_risk: 'none' | 'low' | 'medium' | 'high';
  escalation_risk: 'none' | 'low' | 'medium' | 'high';
  last_meeting_date: string | null;
  last_sentiment: string | null;
  meeting_count_30d: number;
  mrr_from_orders: number | null;
}

function daysBetween(date1: string, date2: Date): number {
  return Math.floor((date2.getTime() - new Date(date1).getTime()) / (1000 * 60 * 60 * 24));
}

export function computeMetricsForCustomer(
  customer: Customer,
  meetings: MeetingMaster[],
  riskSignals: RiskSignal[],
  customerInsights: CustomerInsight[],
  liveOrders: SalesOrderLive[]
): ComputedMetrics {
  const now = new Date();

  const matchFn = (accountName: string, domain: string) =>
    accountName?.toLowerCase().includes(customer.name.toLowerCase()) ||
    customer.name.toLowerCase().includes(accountName?.toLowerCase() || '') ||
    (!!customer.domain && domain?.toLowerCase().includes(customer.domain.toLowerCase()));

  const custMeetings = meetings
    .filter((m) => matchFn(m.account_name, m.customer_domain))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const custRisk = riskSignals
    .filter((r) => matchFn(r.account_name, r.customer_domain))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const custInsights = customerInsights
    .filter((ci) => matchFn(ci.account_name, ci.customer_domain))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const custOrders = liveOrders.filter(
    (o) =>
      o.account_name?.toLowerCase().includes(customer.name.toLowerCase()) ||
      customer.name.toLowerCase().includes(o.account_name?.toLowerCase() || '')
  );

  const lastMeeting = custMeetings[0];
  const lastRisk = custRisk[0];
  const lastInsight = custInsights[0];

  const lastMeetingDate = lastMeeting?.date ?? null;
  const touchStatus: 'Touched' | 'Untouched' =
    lastMeetingDate && daysBetween(lastMeetingDate, now) <= 14 ? 'Touched' : 'Untouched';

  const churnRisk = (lastRisk?.churn_risk ?? 'none') as ComputedMetrics['churn_risk'];
  const escalationRisk = (lastRisk?.escalation_risk ?? 'none') as ComputedMetrics['escalation_risk'];
  const lastSentiment = lastInsight?.sentiment ?? null;

  const meeting30d = custMeetings.filter(
    (m) => lastMeetingDate && daysBetween(m.date, now) <= 30
  ).length;

  const mrrFromOrders = custOrders.length
    ? custOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0)
    : null;

  const riskPenalty = { high: -30, medium: -15, low: -5, none: 0 };
  const sentimentBonus = { positive: 10, neutral: 0, mixed: -10, negative: -20 };
  const escPenalty = { high: -20, medium: -10, low: -3, none: 0 };

  let health = 100;
  health += riskPenalty[churnRisk] ?? 0;
  health += sentimentBonus[lastSentiment as keyof typeof sentimentBonus] ?? 0;
  health += escPenalty[escalationRisk] ?? 0;
  if (touchStatus === 'Untouched') health -= 15;
  health = Math.max(0, Math.min(100, health));

  return {
    health_score: health,
    touch_status: touchStatus,
    churn_risk: churnRisk,
    escalation_risk: escalationRisk,
    last_meeting_date: lastMeetingDate,
    last_sentiment: lastSentiment,
    meeting_count_30d: meeting30d,
    mrr_from_orders: mrrFromOrders,
  };
}

export function enrichCustomers(
  customers: Customer[],
  meetings: MeetingMaster[],
  riskSignals: RiskSignal[],
  customerInsights: CustomerInsight[],
  liveOrders: SalesOrderLive[]
): (Customer & ComputedMetrics)[] {
  return customers.map((c) => {
    const computed = computeMetricsForCustomer(
      c,
      meetings,
      riskSignals,
      customerInsights,
      liveOrders
    );
    return {
      ...c,
      ...computed,
      mrr: computed.mrr_from_orders !== null ? computed.mrr_from_orders : c.mrr,
    };
  });
}
