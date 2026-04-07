# İterasyon 4 — Customer Intelligence & Risk Dashboard

## Durum Takibi
```
[ ] 4.1 — CustomerIntelligence.tsx
[ ] 4.2 — RiskDashboard.tsx
[ ] 4.3 — MeetingIntelligenceLayout tabs bağlama
```

---

## ⚠️ Kullanıcı Etkileşimi

Test için şunları yükle:
- `customer_insights.csv`
- `risk_signals.csv`
- `meetings_master.csv` (önceki iterasyondan yüklü olmalı)

---

## Cursor'a Verilecek Prompt

```
Continue the CCS Intelligence Dashboard. Iterations 1-3 are complete.
Now implement Customer Intelligence and Risk & Churn tabs.
Use Recharts, Tailwind, and data from useDataStore().
Import parsers from lib/meeting-parsers.ts — use safeParseJSON, parsePainPoints, parseUpsellOpportunities, parseFeatureRequests.
DO NOT modify any existing files.

## Step 4.1 — Create src/components/meeting-intelligence/CustomerIntelligence.tsx

Data source: useDataStore().customerInsights + useDataStore().riskSignals

### Section A — Account Selector + Search
- Search input to filter by account name
- Dropdown to filter by sentiment (All / Positive / Neutral / Negative / Mixed)
- Results count: "Showing X accounts"

### Section B — Customer Sentiment Table
Main table, sortable by all columns:

| Account | Last Meeting | Meetings | Sentiment | Score | Pain Points | Feature Requests | Churn Risk |
|---------|-------------|----------|-----------|-------|-------------|-----------------|------------|

- Account: bold text + domain as subtitle
- Last Meeting: formatted date
- Meetings: count of meetings for this account
- Sentiment: colored badge
  - positive = green, negative = red, neutral = gray, mixed = yellow
- Score: 0-10 progress bar + number
- Pain Points: count badge (red if > 0)
- Feature Requests: count badge (blue if > 0)
- Churn Risk: colored badge from risk_signals, worst risk across all meetings shown
- Click row → opens Account Detail Drawer (see below)

### Section C — Account Detail Drawer (slide-over from right)
Triggered by clicking a row.

Header:
- Account name + domain
- Sentiment badge + Churn risk badge side by side
- Close button

Tabs inside drawer:
1. **Pain Points** tab:
   - List of all pain points from parsePainPoints(customer_insights.pain_points)
   - Each item: severity badge (high/med/low) | issue description | category chip | quote in italic
   - Grouped by severity (High first)

2. **Needs & Requests** tab:
   - Key Needs list: urgency badge | need description | current_status chip
   - Feature Requests list: feature name | context | maps_to_product badge (colored by product)

3. **Meeting History** tab:
   - Timeline of meetings for this account (from meetings)
   - Each entry: date | meeting type | PM name | sentiment score | duration

4. **PM Match** tab:
   - pm_client_match_score as large circular score (colored)
   - pm_client_assessment text
   - pm_client_strengths as green bullet list
   - pm_client_gaps as orange bullet list
   - pm_client_recommendation in highlighted box

### Section D — Pain Point Analysis
- Horizontal bar chart (Recharts BarChart, layout="vertical")
- X axis: count
- Y axis: pain point categories (product_bug, integration, usability, process, performance, communication)
- Color by severity: red=high, orange=medium, yellow=low
- Title: "Pain Points by Category"

### Section E — Feature Demand Mapping
- Grid of cards, one per CCS product:
  CX Insight | CX Quality | AMD | WhatsApp Call | Video Call | Agent Assist | Custom Development
- Each card shows:
  - Product name
  - Count of feature requests mapped to this product
  - Account names requesting it (tags)
- Sorted by request count desc
- Title: "Feature Demand by Product"

## Step 4.2 — Create src/components/meeting-intelligence/RiskDashboard.tsx

Data source: useDataStore().riskSignals + useDataStore().customerInsights + useDataStore().meetings

### Section A — Risk KPI Cards (top row)
1. High Churn Risk: count of accounts with churn_risk === 'high' | red background
2. Medium Churn Risk: count | orange background
3. High Escalation Risk: count | red background
4. Upsell Opportunities: count of accounts with at least 1 upsell opportunity | green background

### Section B — Risk Matrix (Scatter Plot)
- Recharts ScatterChart
- X axis: Escalation Risk (0=none, 1=low, 2=medium, 3=high)
- Y axis: Churn Risk (0=none, 1=low, 2=medium, 3=high)
- Each dot = one account
- Dot size = number of meetings (bigger = more meetings)
- Dot color: high+high = darkred, high+med = red, med+med = orange, else = yellow
- Tooltip: account name + evidence
- Background quadrants:
  - Top-right: red tint "Critical Zone"
  - Bottom-left: green tint "Safe Zone"
- Title: "Risk Matrix — Churn vs Escalation"

### Section C — High Risk Accounts List
- Filter: churn_risk in ['high', 'medium'] OR escalation_risk in ['high', 'medium']
- Card per account:
  - Account name (bold) + domain (muted)
  - Two risk badges: Churn Risk + Escalation Risk
  - Churn evidence (first 150 chars, expandable)
  - Escalation triggers as chips
  - Last meeting date
  - "View Details" button (links to Account Detail Drawer from CustomerIntelligence)
- Sort: high churn first, then high escalation
- Title: "Accounts Requiring Attention"

### Section D — Upsell Opportunities Table
- Parse upsell field using parseUpsellOpportunities()
- Aggregate all opportunities across all accounts
- Table:
  | Account | Product | Confidence | Signal | Suggested Pitch |
- Confidence badge: high=green, medium=yellow, low=gray
- Sort by confidence desc
- Group by product (show product as section header)
- Title: "Upsell Opportunities"

### Section E — Churn Risk Trend
- Line chart
- X axis: monthly (last 6 months)
- Lines: High risk count, Medium risk count
- Title: "Churn Risk Trend"

## Step 4.3 — Update MeetingIntelligenceLayout.tsx

Replace placeholders in "Customer Intel" and "Risk & Churn" tabs with:
- <CustomerIntelligence /> for Customer Intel tab
- <RiskDashboard /> for Risk & Churn tab

## Verification Checklist
1. Upload customer_insights.csv and risk_signals.csv via modal
2. Customer Intel tab shows sentiment table with accounts
3. Click account row → drawer opens with 4 tabs
4. Pain Points tab shows parsed items with severity badges
5. Risk tab shows 4 KPI cards
6. Risk Matrix scatter plot renders
7. High risk accounts listed below matrix
8. Upsell table grouped by product
9. Build passes with zero TS errors

## Progress Log
- Date completed: ___
- Accounts visible in table: ___
- High risk accounts count: ___
- Notes: ___
```
