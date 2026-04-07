# .cursorrules — Pulse CS Real Data Migration

## Proje Bağlamı

Pulse CS, Alo-Tech / CCS ekibinin Customer Success Intelligence Dashboard'u.
Mevcut app React 19 + TypeScript + Vite + Tailwind + Clerk + Vercel Postgres + Zustand.

Bu migration'ın amacı: Mock data'yı kaldırıp gerçek DB + CSV pipeline'ına geçmek.

## ASLA Dokunulmaması Gereken Dosyalar (Until Iteration 8)

- `components/SignIn.tsx`
- `components/admin/*` (tenant management — tamamen çalışıyor)
- `hooks/useEmailDomainCheck.ts`
- `hooks/useAdminAccess.ts`
- `lib/csv-parser.ts` (legacy tenant parser)
- `api/tenants/*`
- `vercel.json`
- `vite.config.ts`
- `src/components/meeting-intelligence/*` (zaten çalışıyor)
- `src/components/sales/*` (zaten çalışıyor)
- `src/store/dataStore.ts` (sadece iteration 3'te extend edilecek)
- `src/lib/csv-parser.ts` (sadece iteration 3'te extend edilecek)

## Kod Standartları

1. TypeScript strict — `any` kullanma, proper type her yerde
2. Tüm API çağrıları `try/catch` içinde
3. Her veri bölümünde `loading` ve `empty` state zorunlu
4. `fetch()` çağrıları custom hook içinde, direkt component'ta değil
5. DB sorguları `ensureDatabaseInitialized()` çağrısından sonra

## DB Kuralı

SQLite (dev) ve Postgres (prod) aynı SQL interface'i kullanıyor (`lib/db.ts`).
Yeni tablo eklerken `CREATE TABLE IF NOT EXISTS` kullan — idempotent olmalı.
Foreign key constraint'leri her iki DB'de çalışıyor — kullan.

## Veri Öncelik Sırası (hangi kaynak önce gelir)

```
customers.mrr → sales_live'dan hesaplanan MRR > DB'deki mrr alanı
customer.status → DB'den (manuel set edilir)
customer.churn_risk → CSV risk_signals'dan computed (DB'de saklanmaz)
customer.health_score → computed (DB'de saklanmaz)
customer.touch_status → computed meetings'ten (DB'de saklanmaz)
```

## Bileşen Import Kuralları

```typescript
import { useEnrichedCustomers, EnrichedCustomer } from '../hooks/useEnrichedCustomers';
import { computeMetricsForCustomer } from '../src/lib/computed-metrics';
import { useDataStore } from '../src/store/dataStore';
import type { Customer, CustomerStatus } from '../src/types/customer.types';
```

## Progress Tracking

| İterasyon | Durum | Tarih |
|-----------|-------|-------|
| 1 — DB Schema | ⬜ | |
| 2 — Customer Import | ⬜ | |
| 3 — IndexedDB | ⬜ | |
| 4 — Computed Metrics | ⬜ | |
| 5 — Dashboard Real Data | ⬜ | |
| 6 — CustomerTable + Detail | ⬜ | |
| 7 — Onboarding + Notes | ⬜ | |
| 8 — Mock Cleanup + Deploy | ⬜ | |
