# İterasyon 3 — Meeting Intelligence: Overview & PM Performance

## Durum Takibi
```
[ ] 3.1 — MeetingOverview.tsx
[ ] 3.2 — PMPerformance.tsx
[ ] 3.3 — MeetingIntelligenceLayout tabs bağlama
```

---

## ⚠️ Kullanıcı Etkileşimi

Bu iterasyonu test etmek için önce şunları yükle:
- `meetings_master.csv`
- `pm_scores.csv`

---

## Cursor'a Verilecek Prompt

```
Continue the CCS Intelligence Dashboard. Foundation (iter 1) and DataUpload (iter 2) are complete.
Now implement the Meeting Intelligence module — Overview and PM Performance tabs.
Use data from useDataStore(). 
All charts use Recharts. All styling uses Tailwind CSS.
DO NOT touch existing app files.

## Step 3.1 — Create src/components/meeting-intelligence/MeetingOverview.tsx

Data source: useDataStore().meetings + useDataStore().pmScores

### Section A — Summary KPI Cards (top row, 4 cards)
1. Total Meetings (this month)
   - Value: count of meetings where date is current month
   - Subtitle: "X customer | Y internal"
   - Icon: Calendar
   - Color: blue

2. Total Meeting Hours (this month)
   - Value: sum of duration_min / 60, formatted as "Xh Ym"
   - Subtitle: "Avg per meeting: X min"
   - Icon: Clock
   - Color: indigo

3. AI Processed Rate
   - Value: percentage of meetings where ai_processed === true
   - Format: "X%"
   - Subtitle: "X meetings analyzed"
   - Icon: Brain
   - Color: purple

4. Avg PM Score (this month)
   - Value: average of pm_scores.overall for current month
   - Format: "X.X / 10"
   - Subtitle: "Across X meetings"
   - Icon: TrendingUp
   - Color: green

### Section B — Meeting Volume Chart
- Recharts BarChart
- X axis: last 8 weeks (week label: "W12", "W13" etc.)
- Two bars per week: Customer (blue) and Internal (gray)
- Y axis: meeting count
- Title: "Weekly Meeting Volume"

### Section C — Meeting Type Distribution
- Recharts PieChart / DonutChart
- Types: KICKOFF, TECHNICAL, ONBOARDING, REQUEST, REVIEW, INCIDENT, GENERAL, INTERNAL_SYNC, INTERNAL_DAILY
- Each type gets a distinct color
- Show legend on right side
- Title: "Meeting Types"

### Section D — Top Active Accounts Table
- Table: Account Name | Total Meetings | Avg Sentiment Score | Last Meeting Date | Churn Risk
- Join meetings with customerInsights and riskSignals on account_name
- Sort by total meetings desc
- Show top 10 rows
- Churn risk shown as colored badge (high=red, medium=yellow, low=green, none=gray)
- Title: "Most Active Accounts"

## Step 3.2 — Create src/components/meeting-intelligence/PMPerformance.tsx

Data source: useDataStore().pmScores + useDataStore().meetings
Use aggregatePMScores() from lib/meeting-parsers.ts

### Section A — PM Selector
- Row of PM avatar buttons (initials in colored circle)
- Clicking a PM filters all sections below to show that PM's data
- "All PMs" option to show aggregated view

### Section B — PM Scorecard (when single PM selected)
- Radar chart (Recharts RadarChart) with 5 axes:
  Preparation | Customer Mgmt | Technical Mastery | Action Quality | Communication
- Value: PM's average score per dimension
- Show benchmark line at 7.0
- Title: "Performance Radar — [PM Name]"

### Section C — Score Trend Chart (single PM)
- Recharts LineChart
- X axis: date (last 12 meetings)
- Line: overall score
- Dots on each point, hoverable tooltip showing meeting title and feedback snippet
- Title: "Score Trend — Last 12 Meetings"

### Section D — English Proficiency (single PM)
- Show: Level badge (A1-C2), Vocabulary, Grammar, Fluency, Technical Terminology
- Each as a horizontal progress bar 0-100 (map A1=20, A2=35, B1=50, B2=65, C1=80, C2=95, native=100)
- Most recent assessment shown
- Title: "English Proficiency"

### Section E — Meeting Load (All PMs view)
- Grouped bar chart
- X axis: PM names
- Bars: Customer meetings (blue) | Internal meetings (gray) | Total hours (line, secondary Y axis)
- Title: "Monthly Meeting Load by PM"

### Section F — PM Comparison Table (All PMs view)
- Columns: PM Name | Meetings | Avg Overall | Avg Prep | Avg Cust Mgmt | Avg Tech | English Level | Client Match Avg
- Sortable columns
- Color-code the Overall column: <6 red, 6-7.5 yellow, >7.5 green
- Title: "PM Performance Comparison"

## Step 3.3 — Update MeetingIntelligenceLayout.tsx

Replace the placeholder "Coming soon" in Overview and PM Performance tabs with:
- <MeetingOverview /> for Overview tab
- <PMPerformance /> for PM Performance tab
- Keep EmptyState guard: if meetings.length === 0, show EmptyState

## Verification Checklist
1. Upload meetings_master.csv and pm_scores.csv via the modal
2. Overview tab shows all 4 KPI cards with real numbers
3. Weekly chart shows data
4. Meeting type donut shows categories
5. PM Performance tab shows PM selector
6. Selecting a PM shows their radar chart and trend line
7. "All PMs" shows comparison table
8. Build passes with zero TS errors
9. No existing functionality broken

## Progress Log
- Date completed: ___
- PMs visible in selector: ___
- Notes: ___
```
