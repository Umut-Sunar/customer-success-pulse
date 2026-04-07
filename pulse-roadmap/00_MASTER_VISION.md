# Pulse CS — Master Vision & Yeniden Mimari

## Mevcut Sorun

Uygulama şu an iki kopuk pipeline'dan oluşuyor:

```
Pipeline 1 (Mock):
  constants.ts → Dashboard, CustomerTable, CustomerDetail
  ↑ Hiç değişmiyor, 6 hardcoded müşteri var

Pipeline 2 (CSV/Zustand):
  CSV Upload → Zustand Store → Meeting Intel, Sales Orders
  ↑ Sayfa yenilenince sıfırlanıyor
```

Dashboard, Meeting Intel ve Sales Orders'ı **bilmiyor**. Urgent Actions mock veri gösteriyor.
Churn sinyali olan müşteriler Dashboard'da görünmüyor. MRR, health, status hesaplanmıyor.

---

## Hedef Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    VERİ KAYNAKLARI                       │
├──────────────┬──────────────┬──────────────────────────┤
│  Database    │  CSV Uploads  │  Excel Import            │
│  (Postgres)  │  (Zustand +  │  (Tenant + Onboarding)   │
│              │   IndexedDB) │                           │
│ - customers  │ - meetings   │ - tenant_name             │
│ - tenants    │ - pm_scores  │ - account                 │
│ - customer_  │ - customer_  │ - committed_live_date     │
│   tenant_map │   insights   │ - status                  │
│              │ - risk_signals│                          │
│              │ - knowledge  │                           │
│              │ - sales_live │                           │
│              │ - sales_pipe │                           │
└──────┬───────┴──────┬───────┴──────────────────────────┘
       │              │
       ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              HESAPLAMA KATMANI                           │
│  Account Health = f(meeting_freq, churn_risk, sentiment) │
│  Touch Status   = f(last_meeting_date)                  │
│  MRR            = sum(sales_live.grand_total per account)│
│  At Risk        = churn_risk IN ('high','medium')       │
│  Onboarding     = status='Onboarding' + timeline        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD                             │
│  Stats: Real MRR | Real Touch Rate | Real Onboarding    │
│  Urgent Actions: Real churn signals + real accounts     │
│  Onboarding Pipeline: Real tenant/CSV data              │
│  Intelligence Highlights: Meeting Intel bağlı           │
└─────────────────────────────────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
  All Accounts   Meeting Intel   Sales Orders
  (Real DB)      (CSV → Zustand  (CSV → Zustand
                  + IndexedDB)    + IndexedDB)
```

---

## İterasyon Planı

| # | Başlık | Kapsam | Süre |
|---|--------|--------|------|
| **1** | DB Schema + Customers API | `customers` tablosu, CRUD API, seed | 1 gün |
| **2** | Customer Import | Excel/CSV'den customer yükle, Admin panelde import | 1 gün |
| **3** | IndexedDB Persistence | CSV verisini sayfa yenilemeye karşı koru | 1 gün |
| **4** | Health & Touch Hesaplama | DB + Zustand'tan computed metrics | 1 gün |
| **5** | Dashboard Bağlantısı | Dashboard → gerçek veri, mock kaldır | 2 gün |
| **6** | CustomerTable + Detail | DB'den gerçek müşteri listesi | 1 gün |
| **7** | Onboarding Pipeline | Tenant Excel + CSV'den onboarding | 1 gün |
| **8** | Mock Temizlik + Polish | constants.ts kaldır, test, deploy | 1 gün |

---

## Değişmeyecek Şeyler (DO NOT TOUCH)

- Clerk auth (`useEmailDomainCheck`, `useAdminAccess`)
- Admin tenant CRUD API'leri (`/api/tenants/*`)
- Mevcut `src/` altındaki Meeting Intel ve Sales modülleri
- `src/store/dataStore.ts` yapısı (sadece genişletilecek)
- `vercel.json`, `vite.config.ts`

---

## Yeni DB Tabloları

```sql
-- Mevcut: tenants, customer_tenant_mapping

-- YENİ:
customers (
  id, name, domain, segment, mrr, status,
  contract_start, contract_end, account_manager,
  created_at, updated_at
)

onboarding_details (
  id, customer_id, stage, go_live_date,
  committed_live_date, bottleneck, progress, notes
)
```

---

## Veri Akış Kuralları

1. **customers tablosu** → CustomerTable, CustomerDetail header, Dashboard stats
2. **risk_signals (Zustand/IndexedDB)** → Dashboard urgent actions, sidebar badge
3. **meetings + pm_scores (Zustand/IndexedDB)** → Touch status hesaplama, health skoru
4. **sales_live (Zustand/IndexedDB)** → MRR per account (customer registry ile eşleşme)
5. **tenants (DB)** → CustomerDetail tenant listesi (mevcut)
6. **onboarding_details (DB)** → Dashboard Onboarding Pipeline
