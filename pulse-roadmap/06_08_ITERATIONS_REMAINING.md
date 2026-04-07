# İterasyon 6 — CustomerTable + CustomerDetail → Gerçek DB Verisi

## Durum
```
[x] 6.1 — CustomerTable → useEnrichedCustomers
[x] 6.2 — CustomerDetail header → DB verisi
[x] 6.3 — CustomerDetail Overview tab → gerçek metrikler
```

---

## Cursor Prompt

```
Continue Pulse CS. Iterations 1-5 complete.
Replace mock data in CustomerTable and CustomerDetail with real DB + computed data.
CustomerTable is at components/CustomerTable.tsx.
CustomerDetail is at components/CustomerDetail.tsx.

## Step 6.1 — CustomerTable.tsx

Currently receives `customers: Customer[]` prop from App.tsx (mock data).

Change:
1. Remove the prop — fetch internally with `useEnrichedCustomers()`
2. Update each row to use real computed fields:
   - `customer.health_score` → progress bar (was mock)
   - `customer.touch_status` → green/amber dot (was mock)
   - `customer.mrr` → currency (was mock)
   - `customer.status` → badge (was mock, now DB value)
3. Keep the same UI structure, search, and filter logic
4. Add loading skeleton (3 skeleton rows) while `loading === true`
5. Add "No customers found" empty state when `customers.length === 0`

## Step 6.2 — CustomerDetail.tsx

Currently receives a `Customer` object from MOCK_CUSTOMERS.
After this change, it receives an `EnrichedCustomer` from DB.

When a row is clicked in CustomerTable, pass the EnrichedCustomer object to CustomerDetail.

Update the header section:
- `customer.name` → DB value
- `customer.domain` → DB value
- `customer.mrr` → DB/computed value
- `customer.status` → DB value (badge)
- `customer.contract_end` → DB value
- Health Score badge → `customer.health_score` (computed)
- `customer.segment` → DB value

Update the 4 metric cards:
| Card | Old | New |
|------|-----|-----|
| Churn Risk | mock | `customer.churn_risk` from computed |
| Satisfaction | mock hardcoded | `customer.last_sentiment` mapped to score |
| Open Tickets | mock | Keep as-is (no Zoho integration yet) |
| SLA Score | mock | Keep as-is |

The Tickets, Notes, and Onboarding tabs keep their mock structure for now
(they'll be addressed in Iteration 7).

The Meeting Intel tab already works (from the previous implementation).

## Step 6.3 — Update App.tsx

Remove the mock data prop passing:
```typescript
// OLD:
<CustomerTable customers={MOCK_CUSTOMERS} />
<DashboardOverview customers={MOCK_CUSTOMERS} />

// NEW: these components fetch their own data
<CustomerTable />
<DashboardOverview />
```

Keep MOCK_CUSTOMERS import in constants.ts for now — it's removed in Iteration 8.

## Verification Checklist
- [ ] CustomerTable shows real customers from DB
- [ ] Filter by status works with real data
- [ ] Clicking a row opens CustomerDetail with real data
- [ ] CustomerDetail header shows real name, domain, MRR, status
- [ ] Health score in CustomerDetail header shows computed value
- [ ] Churn Risk card shows real risk from CSV signals
- [ ] Build passes

## Progress Log
- Date: ___
- Notes: ___
```

---

---

# İterasyon 7 — Onboarding Pipeline Gerçek Veri + Notes

## Durum
```
[x] 7.1 — Onboarding tab in CustomerDetail → DB data
[x] 7.2 — customer_notes schema + GET/POST /api/customers/[id]/notes
[x] 7.3 — Notes tab (list + optimistic add)
[x] 7.4 — Dashboard Onboarding Pipeline → fetch ?status=Onboarding + detail
```

---

## Cursor Prompt

```
Continue Pulse CS. Iterations 1-6 complete.
Now wire up the Onboarding and Notes tabs in CustomerDetail, and improve the Dashboard onboarding section.

## Step 7.1 — CustomerDetail Onboarding Tab

Currently shows hardcoded onboarding details from MOCK_CUSTOMERS.

Change: Fetch onboarding_details from GET /api/customers/[id] (which already returns joined onboarding data from Iteration 1).

In CustomerDetail, when the Onboarding tab is active:
- Fetch from `/api/customers/${customer.id}` to get onboarding_details
- Show: Stage badge, Progress bar (onboarding_details.progress %), 
  Go-Live Date (go_live_date), Committed Date (committed_live_date),
  Bottleneck alert (if bottleneck exists → red warning box with bottleneck text),
  Notes text area
- If no onboarding_details exist → show "No onboarding data — add it below" + Edit form
- Edit form: PUT /api/customers/[id]/onboarding

## Step 7.2 — Create api/customers/notes.ts

Simple notes stored in DB. Add to schema in lib/db.ts (append to initDatabase):

```sql
CREATE TABLE IF NOT EXISTS customer_notes (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_customer ON customer_notes(customer_id);
```

API: GET /api/customers/[id]/notes → list notes (newest first)
     POST /api/customers/[id]/notes → create note { content, author }

## Step 7.3 — CustomerDetail Notes Tab

Currently shows hardcoded notes from MOCK_CUSTOMERS.

Change:
- Fetch from GET /api/customers/[id]/notes
- Show list of notes with: content, author, relative time ("2 days ago")
- "Add Note" form at bottom: textarea + submit button
- POST to /api/customers/[id]/notes on submit
- Optimistic UI update (prepend to list)

## Step 7.4 — Dashboard Onboarding Pipeline section

Old: Hardcoded 4 clients with mock progress bars.

New: Fetch all customers with status='Onboarding' + their onboarding_details.

```typescript
// In DashboardOverview, add:
const [onboardingPipeline, setOnboardingPipeline] = useState([]);

useEffect(() => {
  fetch('/api/customers?status=Onboarding')
    .then(r => r.json())
    .then(async (customers) => {
      const withDetails = await Promise.all(
        customers.map(async (c) => {
          const detail = await fetch(`/api/customers/${c.id}`).then(r => r.json());
          return { ...c, onboarding: detail };
        })
      );
      setOnboardingPipeline(withDetails);
    });
}, []);
```

Show each customer as a row:
- Customer name + domain
- Stage badge
- Progress bar (onboarding_details.progress %)
- Committed live date
- Bottleneck alert icon (if exists)

If no onboarding customers → show "No active onboarding projects"

## Verification Checklist
- [ ] CustomerDetail Onboarding tab shows real DB data
- [ ] Edit form saves to DB and refreshes
- [ ] CustomerDetail Notes tab shows/creates real notes
- [ ] Dashboard Onboarding Pipeline shows real customers
- [ ] Build passes

## Progress Log
- Date: ___
- Notes: ___
```

---

---

# İterasyon 8 — Mock Temizlik + Final Polish + Deploy

## Durum
```
[x] 8.1 — MOCK_CUSTOMERS kaldırıldı (DB tabanlı müşteri eşlemesi, constants.ts kaldırıldı)
[x] 8.2 — Boş durum metinleri (Dashboard, CustomerTable, vb.) + roadmap’daki mesajlar
[x] 8.3 — `npm run typecheck` yeşil; ErrorBoundary + @types/react; Recharts/PMPerformance düzeltmeleri
[x] 8.4 — `npm run build` OK (ana JS ~938 KB, gzip ~257 KB — 1 MB altı)
[x] 8.5 — `.env.example` güncel (Clerk, admin e-postaları, Postgres)
[ ] 8.6 — Vercel deploy (manuel; repoda push + env + /api/init-db)
```

---

## Cursor Prompt

```
Final iteration for Pulse CS real-data migration.
Everything now uses real DB data or CSV uploads. Remove all mock data dependencies.

## Step 8.1 — Remove MOCK_CUSTOMERS

In constants.ts:
- Remove the MOCK_CUSTOMERS array export
- Keep any other constants (color mappings, segment lists, etc.) that are still used

In App.tsx:
- Remove MOCK_CUSTOMERS import
- Remove any remaining props that pass mock data to components

In DashboardOverview.tsx, CustomerTable.tsx, CustomerDetail.tsx:
- Remove any remaining MOCK_CUSTOMERS references
- Replace with proper "no data" empty states

Search the entire codebase for `MOCK_CUSTOMERS` and remove all references.
Also search for `constants.ts` imports and remove unused ones.

## Step 8.2 — Empty States Audit

Ensure every data section has a proper empty state:

| Section | Empty State Message |
|---------|-------------------|
| CustomerTable | "No customers yet. Import customers from Admin → Customers tab." |
| Dashboard Stats | Shows "—" with helper "Add customers in Admin" |
| Urgent Actions | "No risk signals detected. Upload risk_signals.csv to see alerts." |
| Onboarding Pipeline | "No active onboarding projects." |
| Historical Implementations | "No live orders data. Upload Sales Live CSV." |

## Step 8.3 — Final Type Safety

Run TypeScript check:
```
npx tsc --noEmit
```
Fix ALL type errors. No `any` types allowed in new code.

## Step 8.4 — Bundle check
```
npm run build
```
Check dist/ output. If any chunk > 1MB, investigate and split.

## Step 8.5 — Environment Variables (.env.example update)

Ensure .env.example has all required variables:
```
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
VITE_ADMIN_EMAILS=admin@alo-tech.com
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
```

## Step 8.6 — Vercel Deploy Checklist

1. Push to GitHub
2. Vercel → Import Project → Connect repo
3. Set all env vars in Vercel Dashboard
4. Deploy
5. After deploy: visit /api/init-db (POST) once to initialize DB
6. Admin panel → Customers tab → Import your customer CSV
7. Upload meeting CSVs via the Update Data button

## Final Verification Checklist
- [ ] MOCK_CUSTOMERS completely removed
- [ ] Dashboard shows real data (or empty states)
- [ ] CustomerTable shows real DB customers
- [ ] CustomerDetail shows real data in all tabs
- [ ] Meeting Intel works with CSV upload
- [ ] Sales Orders works with CSV upload
- [ ] Admin tenant + customer management works
- [ ] Auth restricts to alo-tech.com + callcenterstudio.com
- [ ] Page refresh keeps CSV data (IndexedDB)
- [ ] npx tsc --noEmit passes
- [ ] npm run build succeeds
- [ ] Vercel deploy live
```

## Progress Log
- Date: 2026-03-18
- Vercel URL: _(deploy sonrası)_
- Notes: `npm run typecheck` + `npm run build` geçiyor; devDependency: `@types/react`, `@types/react-dom`. İsteğe bağlı: API’de kalan `console.log` azaltma.
