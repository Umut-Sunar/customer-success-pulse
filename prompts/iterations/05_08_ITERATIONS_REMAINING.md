# İterasyon 5 — Knowledge Base

## Durum Takibi
```
[ ] 5.1 — KnowledgeBase.tsx
[ ] 5.2 — MeetingIntelligenceLayout tab bağlama
```

---

## Cursor'a Verilecek Prompt

```
Continue CCS Intelligence Dashboard. Iterations 1-4 complete.
Implement the Knowledge Base tab.
Data source: useDataStore().knowledgeItems
DO NOT modify existing files.

## Step 5.1 — Create src/components/meeting-intelligence/KnowledgeBase.tsx

### Section A — Stats Row
- Recurring Issues: count of knowledgeItems where is_recurring === true
- Documented FAQ Patterns: total count of customer_faq_patterns items across all knowledge items
- Feature Demands: total count of new_feature_demands items
- Documentation Gaps: total count of documentation_gaps items

### Section B — Recurring Issues
- List of knowledge items where is_recurring === true
- Each card:
  - Account name + date badge
  - Issue description (recurring_description)
  - Root cause hint in highlighted box
  - Recurrence evidence (italic, muted)
  - Meeting type chip
- Sort: most recent first
- Title: "Recurring Issues"

### Section C — Customer FAQ Patterns
- Parse customer_faq_patterns with safeParseJSON
- Table:
  | Question Pattern | Topic | Account | Self-Service? | Date |
- Self-Service: green badge "Can be documented" if true, gray "Complex" if false
- Group by topic
- Title: "Frequently Asked Questions"

### Section D — Feature Demands Ranked
- Parse new_feature_demands with safeParseJSON
- Aggregate same features across accounts
- Card per unique feature:
  - Feature name (bold)
  - Impact badge (high=red, medium=yellow, low=green)
  - Business justification text
  - Accounts requesting it (tags)
  - Count badge
- Sort by: high impact first, then by account count
- Title: "Feature Demands"

### Section E — Documentation Gaps
- Parse documentation_gaps with safeParseJSON
- Simple list with warning icon per item
- Group by account
- Title: "Documentation Gaps"

### Section F — Topic Trend
- Parse topics_trend with safeParseJSON
- Aggregate topic frequencies across all knowledge items
- Horizontal bar chart (Recharts)
- Top 10 topics by frequency
- Color by category: product=blue, integration=orange, process=green, infrastructure=gray, training=purple
- Title: "Topic Trends"

## Step 5.2 — Update MeetingIntelligenceLayout.tsx
Replace Knowledge Base placeholder with <KnowledgeBase />

## Verification Checklist
1. knowledge_management.csv uploaded via modal
2. Knowledge Base tab shows all 4 stat cards
3. Recurring issues list populated
4. FAQ patterns table renders
5. Feature demands cards visible
6. Build passes
```

---

---

# İterasyon 6 — Sales Orders

## Durum Takibi
```
[ ] 6.1 — SalesOrders.tsx (main component)
[ ] 6.2 — SalesOrdersLayout.tsx güncelleme
```

---

## Cursor'a Verilecek Prompt

```
Continue CCS Intelligence Dashboard. Iterations 1-5 complete.
Implement the Sales Orders module.
Data sources: useDataStore().liveOrders + useDataStore().pipelineOrders
DO NOT modify existing files.

## Step 6.1 — Create src/components/sales/SalesOrders.tsx

### Section A — Summary KPI Cards
1. Live Orders (Active): count of liveOrders | total Grand Total sum formatted as "$XXX,XXX" | green
2. Pipeline Orders: count of pipelineOrders | total Grand Total | blue
3. Setup Orders: count where status === 'Setup' | yellow
4. Hold Orders: count where status === 'Hold' | orange

### Section B — Filters Row
- PM filter: dropdown with all unique Project Manager names (from both datasets combined) + "All PMs"
- Status filter (pipeline only): All / Setup / Hold
- Search: text input searches Subject and Account Name

### Section C — Two-column layout

#### Left: Live Orders Table
Title: "Active (Live)" + green badge with count
Columns:
- Subject (truncated to 40 chars, full title in tooltip)
- Account Name
- Project Manager (PM initials badge colored)
- Grand Total (formatted currency)
- Committed Live Date
- Tenant Name (muted)

Footer: "Total MRR: $XXX,XXX"

#### Right: Pipeline Orders Table  
Title: "Pipeline (Setup / Hold)" + blue badge with count
Columns:
- Subject
- Account Name
- Project Manager
- Grand Total
- Status badge (Setup=blue, Hold=orange)
- Due Date (red if overdue)
- Tenant Name (muted)

Footer: "Total Pipeline: $XXX,XXX"

Both tables:
- Sortable by Grand Total (default: desc)
- Filtered by PM filter and search simultaneously
- Paginated: show 15 rows, "Load more" button

### Section D — PM Workload Chart
- Recharts BarChart
- X axis: PM names (from liveOrders.project_manager)
- Bars: Live order count per PM (green) | Pipeline order count per PM (blue)
- Secondary Y axis: total Grand Total value (line)
- Title: "Orders by Project Manager"

### Section E — Timeline View
- List of recent orders by Created Time (last 30 days from both datasets)
- Each entry: date | account name | subject | PM | status badge | amount
- Sort: newest first
- Title: "Recent Activity"

## Step 6.2 — Update SalesOrdersLayout.tsx
Replace placeholder with <SalesOrders />
Show EmptyState if both liveOrders and pipelineOrders are empty

## Verification Checklist
1. Upload both Sales_Orders.csv and Sales_Orders_2.csv
2. KPI cards show correct counts and totals
3. Both tables populated
4. PM filter works on both tables simultaneously
5. PM workload chart shows 6 PMs with correct data
6. Build passes
```

---

---

# İterasyon 7 — Dashboard Entegrasyonu + CustomerDetail Güncelleme

## Durum Takibi
```
[ ] 7.1 — DashboardOverview.tsx genişletme
[ ] 7.2 — CustomerDetail.tsx Meeting Intel tab ekleme
[ ] 7.3 — Sidebar badge'leri
```

---

## Cursor'a Verilecek Prompt

```
Continue CCS Intelligence Dashboard. Iterations 1-6 complete.
Now integrate Meeting Intelligence data into the existing Dashboard Overview and Customer Detail components.
BE CAREFUL: Modify only what is specified. Keep all existing functionality intact.

## Step 7.1 — Extend DashboardOverview.tsx

ADD a new section at the BOTTOM of the existing DashboardOverview component.
Do NOT move or modify any existing sections (Stats Cards, Charts, Urgent Actions, Onboarding Pipeline).

Add this section titled "⚡ Intelligence Highlights":

Only show this section if useDataStore().meetings.length > 0. Otherwise show nothing.

Contents:
1. Three alert cards in a row:
   - High Churn Risk: count of unique accounts with churn_risk === 'high' from riskSignals | red card
   - Upsell Opportunities: count of accounts with non-empty upsell array | green card
   - Recurring Issues: count of recurring knowledge items | orange card

2. "Recent High-Risk Meetings" mini-table:
   - Last 5 meetings where account appears in riskSignals with high/medium risk
   - Columns: Date | Account | PM | Churn Risk | Escalation Risk
   - "View All" link → navigates to Risk & Churn tab in Meeting Intel

## Step 7.2 — Extend CustomerDetail.tsx

In the existing Tabs section (Overview, Tickets, Notes, Onboarding),
ADD a new tab "Meeting Intel" using the same tab pattern.

Show "No data" EmptyState if no customer insights exist for this customer
(match by customer.name or customer.domain against account_name / customer_domain in customerInsights).

If data exists, show:
- Last sentiment score + badge
- Last 3 meetings in a mini timeline
- Pain points list (top 3 by severity)
- Active upsell opportunities (from riskSignals)
- Latest PM feedback

## Step 7.3 — Sidebar notification badges

In App.tsx sidebar navigation:
- "Meeting Intel" nav item: show red dot badge if any account has churn_risk === 'high'
- "Sales Orders" nav item: show count badge of pipeline orders that are overdue (due_date < today)

## Verification Checklist
1. Dashboard Overview still loads and shows all existing sections
2. Intelligence Highlights section appears at bottom when data is uploaded
3. Customer detail modal has new Meeting Intel tab
4. Clicking a customer with matching account data shows their meeting intel
5. Sidebar badges appear when relevant data exists
6. Build passes with zero TS errors
```

---

---

# İterasyon 8 — Polish, Vercel Deploy, Env Setup

## Durum Takibi
```
[ ] 8.1 — Loading skeletons
[ ] 8.2 — Error boundaries
[ ] 8.3 — Responsive fixes
[ ] 8.4 — vercel.json güncelleme
[ ] 8.5 — Deploy
```

---

## Cursor'a Verilecek Prompt

```
Final iteration for CCS Intelligence Dashboard.
Add polish, error handling, and prepare for Vercel deployment.

## Step 8.1 — Loading skeletons

Create src/components/shared/SkeletonCard.tsx:
- Animated shimmer effect (Tailwind animate-pulse)
- Variants: 'card' | 'table-row' | 'chart'

Use SkeletonCard in:
- MeetingOverview: while data is loading (after file upload, before parse completes)
- PMPerformance: while parsing pm_scores
- SalesOrders: while parsing sales CSVs

## Step 8.2 — Error boundaries

Wrap MeetingIntelligenceLayout and SalesOrdersLayout with a React ErrorBoundary.
On error: show a friendly "Something went wrong" card with "Try re-uploading data" button that calls clearAllData().

## Step 8.3 — Responsive fixes

Ensure these work on tablet (768px):
- DataUploadModal: 2-column grid on tablet, 1-column on mobile
- Meeting Intel tabs: horizontal scroll on mobile
- Sales Orders: stacked layout (live orders above pipeline) on tablet

## Step 8.4 — Vercel config

Verify vercel.json has:
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}

Ensure all environment variables are documented in a .env.example file:
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
VITE_ADMIN_EMAILS=
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

## Step 8.5 — Final verification

Run: npm run build
Expected: zero errors, zero warnings
Bundle size: check that chunks are reasonable (< 2MB total)

## Deployment Steps (User runs these manually)
1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel Dashboard
4. Deploy

## Progress Log
- Date completed: ___
- Build size: ___
- Vercel URL: ___
- Notes: ___
```

---

## ⚠️ Son Kullanıcı Etkileşimi — Production'da Veri Yükleme Akışı

Deploy sonrası her kullanıcı şunu yapacak:
1. Uygulamaya Clerk ile giriş yap (alo-tech.com veya callcenterstudio.com)
2. Header'daki "Update Data" butonuna tıkla
3. Google Sheets'ten her sheet'i CSV olarak indir:
   - Sheets → File → Download → Comma Separated Values (.csv)
   - 5 ayrı sheet için 5 ayrı CSV
4. Sales Orders CRM'den CSV olarak dışa aktar
5. Her slot'a ilgili CSV'yi sürükle veya yükle
6. Dashboard otomatik dolacak

**Veri state tarayıcı oturumunda tutulur — sayfa yenilenince tekrar yüklemek gerekir.**
Eğer kalıcı depolama istenirse: İterasyon 9 olarak localStorage veya IndexedDB eklenebilir.
