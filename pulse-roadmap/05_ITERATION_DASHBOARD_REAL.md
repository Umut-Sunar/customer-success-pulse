# İterasyon 5 — Dashboard → Gerçek Veriye Bağla

## Durum
```
[x] 5.1 — DashboardOverview.tsx stats kartları gerçek veri
[x] 5.2 — Urgent Actions → gerçek churn sinyalleri
[x] 5.3 — Account Health pie chart → gerçek status dağılımı
[x] 5.4 — Weekly Touch Status → gerçek dokunma oranı
[x] 5.5 — Historical Implementations → sales_live'dan go-live'lar
[x] 5.6 — Onboarding Pipeline (fetch onboarding_details per customer)
```

---

## ⚠️ Önemli Kural

`MOCK_CUSTOMERS` hâlâ `constants.ts`'de duruyor ama artık Dashboard bunu kullanmayacak.
Bu iterasyonda `constants.ts` dosyasını silmiyoruz — Iteration 8'de silinecek.

---

## Cursor Prompt

```
Continue Pulse CS. Iterations 1-4 complete.
Now replace mock data in DashboardOverview.tsx with real data from useEnrichedCustomers and useDataStore.
The component is at components/DashboardOverview.tsx.
Replace mock-driven sections with real data, but keep the UI structure exactly the same.
Do NOT change layout, CSS classes, or component hierarchy.

## Step 5.1 — Replace stats cards

DashboardOverview currently receives `customers: Customer[]` as a prop from App.tsx.

Change the component to:
1. Call `useEnrichedCustomers()` internally (remove the prop dependency for stats)
2. Replace the 4 stats cards:

| Card | Old Source | New Source |
|------|-----------|------------|
| Total MRR | `customers.reduce(...)` (mock) | `stats.totalMRR` from `useEnrichedCustomers` |
| Touch Rate (MRR) | mock | `stats.touchedMRR / stats.totalMRR * 100` |
| Touch Rate (Count) | mock | `stats.touchedCount / enriched.length * 100` |
| Onboarding | mock | `stats.onboardingCount` |
| At Risk | mock | `stats.atRiskCount` |

Show "—" or skeleton when `loading === true`.
Show "No data — upload CSVs" helper text when enriched.length === 0 AND loading === false.

## Step 5.2 — Replace Urgent Actions

Old: Shows hardcoded onboarding bottlenecks and mock at-risk customers.

New:
```typescript
const { riskSignals, meetings } = useDataStore();
const { customers } = useEnrichedCustomers();

// At Risk: customers where churn_risk is 'high' or 'medium'
const atRiskCustomers = customers
  .filter(c => c.churn_risk === 'high' || c.churn_risk === 'medium')
  .slice(0, 5);

// Onboarding bottlenecks: customers where status='Onboarding' and no recent meeting
const onboardingBottlenecks = customers
  .filter(c => c.status === 'Onboarding' && c.touch_status === 'Untouched')
  .slice(0, 3);
```

Each at-risk item shows: customer name, churn_risk badge (red/orange), last meeting date, churn evidence (first 80 chars from riskSignals).

## Step 5.3 — Replace Account Health pie chart

Old: `['Onboarding', 'Active', 'At Risk', 'Churned']` with mock percentages.

New:
```typescript
const { customers } = useEnrichedCustomers();
const pieData = [
  { name: 'Onboarding', value: customers.filter(c => c.status === 'Onboarding').length, fill: '#3b82f6' },
  { name: 'Active', value: customers.filter(c => c.status === 'Active' && c.churn_risk === 'none').length, fill: '#10b981' },
  { name: 'At Risk', value: customers.filter(c => c.churn_risk === 'high' || c.churn_risk === 'medium').length, fill: '#ef4444' },
  { name: 'Churned', value: customers.filter(c => c.status === 'Churned').length, fill: '#64748b' },
].filter(d => d.value > 0);
```

## Step 5.4 — Replace Weekly Touch Status chart

Old: Mock touched/untouched per week.

New: Use `meetings` from Zustand to calculate weekly touch events.
For each of the last 8 weeks:
- Group meetings by week
- Count unique customer domains that had a meeting (= "Touched" events)
- Untouched = total customers - touched that week

```typescript
const { meetings } = useDataStore();
const { customers } = useEnrichedCustomers();

const weeklyData = Array.from({ length: 8 }, (_, i) => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - (7 * (7 - i)));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekMeetings = meetings.filter(m => {
    const d = new Date(m.date);
    return d >= weekStart && d <= weekEnd && m.is_customer_meeting;
  });

  const touchedDomains = new Set(weekMeetings.map(m => m.customer_domain));
  return {
    week: `W${weekStart.getDate()}/${weekStart.getMonth()+1}`,
    Touched: touchedDomains.size,
    Untouched: Math.max(0, customers.length - touchedDomains.size),
  };
});
```

## Step 5.5 — Replace Historical Implementations

Old: Hardcoded monthly go-live entries with mock MRR.

New: Use `liveOrders` from Zustand, grouped by committed_live_date month:
```typescript
const { liveOrders } = useDataStore();

// Group live orders by month of order_date or committed_live_date
const byMonth = liveOrders.reduce((acc, order) => {
  const date = order.committed_live_date || order.order_date || order.created_time;
  if (!date) return acc;
  const month = date.substring(0, 7); // YYYY-MM
  if (!acc[month]) acc[month] = { month, count: 0, mrr: 0 };
  acc[month].count++;
  acc[month].mrr += order.grand_total || 0;
  return acc;
}, {} as Record<string, { month: string; count: number; mrr: number }>);

const monthlyData = Object.values(byMonth)
  .sort((a, b) => a.month.localeCompare(b.month))
  .slice(-6); // last 6 months
```

## Step 5.6 — Onboarding Pipeline

Old: Hardcoded progress bars from mock data.

New: Use `customers` with status='Onboarding' + `onboarding_details` from DB.
Fetch onboarding details alongside customers:

```typescript
// In useCustomers hook or a new useOnboardingPipeline hook:
const onboardingCustomers = customers.filter(c => c.status === 'Onboarding');
// For each, fetch GET /api/customers/[id] which includes onboarding_details
```

Show: Customer name, stage, committed_live_date, progress bar (from onboarding_details.progress),
bottleneck alert (if onboarding_details.bottleneck exists → red badge).

If no onboarding_details exist for a customer, show progress=0 and stage='Requirements'.

## Verification Checklist
- [ ] Dashboard stats show real numbers from DB + CSV
- [ ] Urgent Actions shows real at-risk customers (not mock)
- [ ] When no CSV uploaded, urgent actions shows "Upload CSVs to see risk signals"
- [ ] Account Health pie reflects real customer statuses from DB
- [ ] Historical Implementations shows real order dates from sales CSV
- [ ] Build passes, no TS errors
- [ ] console.log for enriched data removed

## Progress Log
- Date: ___
- Real customers in DB: ___
- Dashboard MRR showing: ___
- Notes: ___
```
