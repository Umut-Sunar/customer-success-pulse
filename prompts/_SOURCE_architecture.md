# CCS Intelligence Dashboard — Master Architecture

## Genel Bakış

**CCS Intelligence Dashboard**, Call Center Studio'nun müşteri başarı ve operasyonel zeka platformudur.
Mevcut **Customer Success Pulse** uygulamasını genişleterek Meeting Intelligence, PM Performance ve Sales Pipeline verilerini tek bir platformda birleştirir.

---

## Veri Kaynakları

| Kaynak | Tür | Nasıl Alınır |
|--------|-----|--------------|
| `meetings_master` | Google Sheets CSV export | Manuel upload / Google Sheets API |
| `pm_scores` | Google Sheets CSV export | Manuel upload |
| `customer_insights` | Google Sheets CSV export | Manuel upload |
| `risk_signals` | Google Sheets CSV export | Manuel upload |
| `knowledge_management` | Google Sheets CSV export | Manuel upload |
| `customer_registry` | Google Sheets CSV export | Manuel upload |
| `Sales_Orders (Pipeline)` | CSV (Zoho CRM export) | Manuel upload |
| `Sales_Orders_2 (Live)` | CSV (Zoho CRM export) | Manuel upload |
| Tenant verisi | Mevcut DB (SQLite/Postgres) | Otomatik (mevcut API) |

---

## Tech Stack (Mevcut Customer Success Pulse üzerine)

```
Frontend:   React 19 + TypeScript + Vite
UI:         Tailwind CSS + Lucide React
Charts:     Recharts
Auth:       Clerk (email domain: alo-tech.com / callcenterstudio.com)
Backend:    Vercel Serverless Functions
Database:   SQLite (dev) / Vercel Postgres (prod)
Deploy:     Vercel
```

---

## Modül Yapısı

```
src/
├── components/
│   ├── admin/                    # Mevcut — değişmez
│   ├── meeting-intelligence/     # YENİ
│   │   ├── MeetingOverview.tsx
│   │   ├── PMPerformance.tsx
│   │   ├── CustomerIntelligence.tsx
│   │   ├── RiskDashboard.tsx
│   │   └── KnowledgeBase.tsx
│   ├── sales/                    # YENİ
│   │   ├── SalesOrders.tsx
│   │   └── PipelineKanban.tsx
│   ├── shared/                   # YENİ
│   │   ├── DataUploadModal.tsx
│   │   ├── MetricCard.tsx
│   │   ├── RiskBadge.tsx
│   │   └── EmptyState.tsx
│   ├── CustomerDetail.tsx        # Mevcut — genişletilecek
│   ├── CustomerTable.tsx         # Mevcut — değişmez
│   ├── DashboardOverview.tsx     # Mevcut — genişletilecek
│   └── SignIn.tsx                # Mevcut — değişmez
│
├── hooks/
│   ├── useAdminAccess.ts         # Mevcut
│   ├── useEmailDomainCheck.ts    # Mevcut
│   ├── useMeetingData.ts         # YENİ — Google Sheets CSV parse
│   └── useSalesData.ts           # YENİ — Sales Orders CSV parse
│
├── lib/
│   ├── db.ts                     # Mevcut
│   ├── csv-parser.ts             # Mevcut — genişletilecek
│   └── meeting-parsers.ts        # YENİ — JSON alanları parse et
│
├── store/
│   └── dataStore.ts              # YENİ — Zustand global state
│
├── types/
│   ├── tenant.ts                 # Mevcut
│   ├── types.ts                  # Mevcut
│   ├── meeting.types.ts          # YENİ
│   └── sales.types.ts            # YENİ
│
└── App.tsx                       # Mevcut — navigation genişletilecek
```

---

## Navigation Yapısı (Güncellenmiş)

```
Sidebar
├── 🏠 Dashboard          (mevcut DashboardOverview — genişletilecek)
├── 👥 Accounts           (mevcut CustomerTable)
├── 🧠 Meeting Intel      (YENİ)
│   ├── Overview
│   ├── PM Performance
│   ├── Customer Intelligence
│   ├── Risk & Churn
│   └── Knowledge Base
├── 📦 Sales Orders       (YENİ)
└── ⚙️  Admin             (mevcut — değişmez)
```

---

## İterasyon Planı

| # | Modül | Dosya |
|---|-------|-------|
| 1 | Temel altyapı (types, store, parsers) | `01_ITERATION_FOUNDATION.md` |
| 2 | Data Upload Modal + CSV pipeline | `02_ITERATION_DATA_UPLOAD.md` |
| 3 | Meeting Intelligence — Overview & PM | `03_ITERATION_MEETING_OVERVIEW.md` |
| 4 | Customer Intelligence & Risk | `04_ITERATION_CUSTOMER_RISK.md` |
| 5 | Knowledge Base | `05_ITERATION_KNOWLEDGE.md` |
| 6 | Sales Orders | `06_ITERATION_SALES.md` |
| 7 | Dashboard entegrasyonu + CustomerDetail güncelleme | `07_ITERATION_INTEGRATION.md` |
| 8 | Polish, deploy, env vars | `08_ITERATION_DEPLOY.md` |

---

## Kritik Kurallar (Her İterasyonda Geçerli)

1. **Mevcut kodu kırma** — CustomerTable, DashboardOverview, Admin, Auth dokunulmaz
2. **JSON parse her zaman try/catch içinde** — Sheets'ten gelen JSON string alanları hatalı olabilir
3. **Empty state her component'ta zorunlu** — Veri yokken güzel bir "Upload data to get started" göster
4. **Tüm sayısal değerler null-safe** — `value ?? 0` pattern kullan
5. **Clerk auth korunur** — Her yeni route protected
