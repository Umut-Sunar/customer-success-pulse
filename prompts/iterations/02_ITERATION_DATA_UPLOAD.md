# İterasyon 2 — Data Upload Modal + Sidebar Entegrasyonu

## Durum Takibi
```
[ ] 2.1 — DataUploadModal component
[ ] 2.2 — App.tsx navigation güncelleme
[ ] 2.3 — Upload button header'a ekleme
[ ] 2.4 — EmptyState shared component
```

---

## ⚠️ Kullanıcı Etkileşimi Noktası

Bu iterasyon tamamlandıktan sonra kullanıcı şunları yapabilmeli:

1. **Google Sheets'ten CSV nasıl alınır:**
   - Google Sheets → File → Download → CSV (.csv)
   - Her sheet için ayrı ayrı indirilmeli:
     - `meetings_master` sheet → meetings_master.csv
     - `pm_scores` sheet → pm_scores.csv
     - `customer_insights` sheet → customer_insights.csv
     - `risk_signals` sheet → risk_signals.csv
     - `knowledge_management` sheet → knowledge_management.csv

2. **Sales Orders CSV'leri:**
   - Pipeline (Setup/Hold) → Sales_Orders.csv
   - Live → Sales_Orders_2.csv

---

## Cursor'a Verilecek Prompt

```
Continue extending the Customer Success Pulse app. 
Iteration 1 (types, store, parsers) is already complete.
DO NOT modify Admin, CustomerTable, CustomerDetail, DashboardOverview, SignIn, or any auth logic.

## Step 2.1 — Create src/components/shared/EmptyState.tsx

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

Style: Centered container, dashed border, muted colors.
Use Lucide's `UploadCloud` icon as default.

## Step 2.2 — Create src/components/shared/DataUploadModal.tsx

This is a modal that allows users to upload all Google Sheets CSV exports and Sales Order CSVs.

Requirements:
- Full-screen overlay modal with a clean white panel (max-w-2xl)
- Header: "Upload Data Files" with X close button
- 7 upload slots, each is a labeled drag-drop zone:

  1. meetings_master.csv     → label: "Meetings Master"     → color: blue
  2. pm_scores.csv           → label: "PM Scores"           → color: purple
  3. customer_insights.csv   → label: "Customer Insights"   → color: green
  4. risk_signals.csv        → label: "Risk Signals"        → color: red
  5. knowledge_management.csv→ label: "Knowledge Base"      → color: orange
  6. Sales_Orders.csv        → label: "Sales Pipeline (Setup/Hold)" → color: yellow
  7. Sales_Orders_2.csv      → label: "Sales Live Orders"   → color: teal

- Each slot shows:
  - Upload icon + label when empty
  - Green checkmark + filename + row count when uploaded
  - "Re-upload" button on hover when already uploaded

- After file drop/select on each slot:
  - Call appropriate parser from csv-parser.ts
  - Call appropriate setter in useDataStore
  - Mark file as uploaded via markFileUploaded
  - Show success toast with row count

- Footer: 
  - Left: "X of 7 files uploaded" counter
  - Right: "Close" button
  - If all files uploaded: show green banner "All data loaded — dashboard is ready!"

- Import:
  - parseMeetingsMasterCSV, parsePMScoresCSV, parseCustomerInsightsCSV,
    parseRiskSignalsCSV, parseKnowledgeManagementCSV,
    parseSalesPipelineCSV, parseSalesLiveCSV from lib/csv-parser.ts
  - useDataStore from store/dataStore.ts

## Step 2.3 — Update App.tsx navigation

ADD these items to the existing sidebar navigation (do not remove existing items):

After "Accounts" nav item, add:
- "Meeting Intel" with Brain icon (Lucide) → opens MeetingIntelligenceLayout (placeholder for now)
- "Sales Orders" with ShoppingBag icon → opens SalesOrdersLayout (placeholder for now)

ADD an "Upload Data" button to the header area:
- UploadCloud icon + "Update Data" text
- Opens DataUploadModal when clicked
- Shows a green dot badge if uploadedFiles has any entries

ADD a data upload indicator:
- If no files are uploaded and user navigates to Meeting Intel or Sales Orders tab,
  show the EmptyState component with a "Upload Data Files" action button that opens the modal

Keep all existing navigation items and their functionality exactly as is.

## Step 2.4 — Create placeholder layouts

Create src/components/meeting-intelligence/MeetingIntelligenceLayout.tsx:
- Just a container with a tab bar: Overview | PM Performance | Customer Intel | Risk & Churn | Knowledge Base
- Each tab shows EmptyState if useDataStore().meetings.length === 0
- Otherwise renders a simple "Coming soon" placeholder for now

Create src/components/sales/SalesOrdersLayout.tsx:
- Shows EmptyState if useDataStore().liveOrders.length === 0 and useDataStore().pipelineOrders.length === 0
- Otherwise renders "Sales data loaded: X live orders, Y pipeline orders" for now

## Verification Checklist
1. Modal opens from header button
2. Each of the 7 upload slots accepts CSV files
3. After uploading meetings_master.csv, useDataStore().meetings is populated
4. After uploading all files, footer shows "7 of 7 files uploaded"
5. Meeting Intel tab shows EmptyState before upload, placeholder after upload
6. Build passes with zero TypeScript errors
7. Existing app functionality (Dashboard, Accounts, Admin) completely unchanged

## Progress Log
- Date completed: ___
- Files uploaded successfully in test: ___
- Notes: ___
```
