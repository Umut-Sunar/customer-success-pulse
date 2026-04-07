# İterasyon 4 — Health, Touch & MRR Hesaplama Katmanı

## Durum
```
[x] 4.1 — src/lib/computed-metrics.ts oluştur
[x] 4.2 — useEnrichedCustomers hook
[x] 4.3 — Test in DashboardOverview (console.log); no /api/customers/enriched (client-side only)
```

---

## Amaç

DB'deki customers + Zustand'daki CSV verisi birleştirilerek hesaplanan metrikler:

| Metrik | Kaynak | Hesaplama |
|--------|--------|-----------|
| `health_score` | meetings + risk_signals + customer_insights | Aşağıda |
| `touch_status` | meetings | Son 14 günde toplantı var mı? |
| `churn_risk` | risk_signals | En son toplantıdaki risk seviyesi |
| `last_meeting_date` | meetings | En son meeting.date |
| `mrr` (override) | sales_live | grand_total sum per account |

### Health Score Formülü

```
health_score = 100
- churn_risk_penalty:   high=-30, medium=-15, low=-5, none=0
- sentiment_penalty:    negative=-20, mixed=-10, neutral=0, positive=+10
- touch_penalty:        untouched (>14 gün)=-15
- escalation_penalty:   high=-20, medium=-10
MAX 100, MIN 0
```

---

## Cursor Prompt

```
Continue Pulse CS. Iterations 1-3 complete.
Now create the computed metrics layer that enriches DB customers with CSV data.
DO NOT modify any existing components yet — just create the lib and hook.

## Step 4.1 — Create src/lib/computed-metrics.ts

```typescript
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

  // Match by account_name OR domain
  const matchFn = (accountName: string, domain: string) =>
    accountName?.toLowerCase().includes(customer.name.toLowerCase()) ||
    customer.name.toLowerCase().includes(accountName?.toLowerCase() || '') ||
    (customer.domain && domain?.toLowerCase().includes(customer.domain.toLowerCase()));

  // Meetings for this customer
  const custMeetings = meetings.filter(m =>
    matchFn(m.account_name, m.customer_domain)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Risk signals
  const custRisk = riskSignals
    .filter(r => matchFn(r.account_name, r.customer_domain))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Customer insights
  const custInsights = customerInsights
    .filter(ci => matchFn(ci.account_name, ci.customer_domain))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Live orders
  const custOrders = liveOrders.filter(o =>
    o.account_name?.toLowerCase().includes(customer.name.toLowerCase()) ||
    customer.name.toLowerCase().includes(o.account_name?.toLowerCase() || '')
  );

  // ── Computed values ──
  const lastMeeting = custMeetings[0];
  const lastRisk = custRisk[0];
  const lastInsight = custInsights[0];

  const lastMeetingDate = lastMeeting?.date ?? null;
  const touchStatus: 'Touched' | 'Untouched' =
    lastMeetingDate && daysBetween(lastMeetingDate, now) <= 14 ? 'Touched' : 'Untouched';

  const churnRisk = (lastRisk?.churn_risk ?? 'none') as ComputedMetrics['churn_risk'];
  const escalationRisk = (lastRisk?.escalation_risk ?? 'none') as ComputedMetrics['escalation_risk'];
  const lastSentiment = lastInsight?.sentiment ?? null;

  const meeting30d = custMeetings.filter(m =>
    lastMeetingDate && daysBetween(m.date, now) <= 30
  ).length;

  const mrrFromOrders = custOrders.length
    ? custOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0)
    : null;

  // ── Health score ──
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
  return customers.map(c => ({
    ...c,
    ...computeMetricsForCustomer(c, meetings, riskSignals, customerInsights, liveOrders),
    mrr: (() => {
      const computed = computeMetricsForCustomer(c, meetings, riskSignals, customerInsights, liveOrders);
      return computed.mrr_from_orders !== null ? computed.mrr_from_orders : c.mrr;
    })(),
  }));
}
```

## Step 4.2 — Create hooks/useEnrichedCustomers.ts

```typescript
import { useMemo } from 'react';
import { useCustomers } from './useCustomers';
import { useDataStore } from '../src/store/dataStore';
import { enrichCustomers } from '../src/lib/computed-metrics';
import { Customer } from '../src/types/customer.types';
import { ComputedMetrics } from '../src/lib/computed-metrics';

export type EnrichedCustomer = Customer & ComputedMetrics;

export function useEnrichedCustomers(status?: string) {
  const { customers, loading, error, refetch } = useCustomers(status);
  const { meetings, riskSignals, customerInsights, liveOrders } = useDataStore();

  const enriched = useMemo(() => {
    if (!customers.length) return [];
    return enrichCustomers(customers, meetings, riskSignals, customerInsights, liveOrders);
  }, [customers, meetings, riskSignals, customerInsights, liveOrders]);

  // Summary stats
  const stats = useMemo(() => ({
    totalMRR: enriched.reduce((s, c) => s + c.mrr, 0),
    touchedCount: enriched.filter(c => c.touch_status === 'Touched').length,
    touchedMRR: enriched.filter(c => c.touch_status === 'Touched').reduce((s, c) => s + c.mrr, 0),
    onboardingCount: enriched.filter(c => c.status === 'Onboarding').length,
    atRiskCount: enriched.filter(c => c.churn_risk === 'high' || c.churn_risk === 'medium').length,
    highChurnCount: enriched.filter(c => c.churn_risk === 'high').length,
  }), [enriched]);

  return { customers: enriched, loading, error, refetch, stats };
}
```

## Step 4.3 — Test the hook (no UI changes yet)

Add a temporary test in the existing Dashboard that console.logs the enriched data:

In DashboardOverview.tsx, ADD at the top (temporary, remove in Iteration 5):
```typescript
import { useEnrichedCustomers } from '../hooks/useEnrichedCustomers';
// inside component:
const { customers: enriched, stats } = useEnrichedCustomers();
console.log('Enriched customers:', enriched);
console.log('Stats:', stats);
```

This lets you verify the computation works before switching the UI.

## Verification Checklist
- [ ] Upload meetings_master.csv and risk_signals.csv via modal
- [ ] Console shows enriched customers with health_score, touch_status, churn_risk
- [ ] Customers with recent meetings show touch_status = 'Touched'
- [ ] Customers in high risk signals show churn_risk = 'high'
- [ ] health_score varies based on risk/sentiment data
- [ ] Build passes

## Progress Log
- Date: ___
- Sample enriched customer: ___
- Notes: ___
```
