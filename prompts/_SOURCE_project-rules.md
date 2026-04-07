# .cursorrules — CCS Intelligence Dashboard

## Proje Bağlamı
Bu proje mevcut "Customer Success Pulse" uygulamasının üzerine inşa ediliyor.
Mevcut app: React 19, TypeScript, Vite, Tailwind, Clerk Auth, Recharts, PapaParse, SQLite/Vercel Postgres.

## ASLA Dokunulmaması Gereken Dosyalar
- `components/CustomerTable.tsx`
- `components/CustomerDetail.tsx` (sadece İter 7'de belirtilen ekleme yapılabilir)
- `components/DashboardOverview.tsx` (sadece İter 7'de belirtilen ekleme yapılabilir)
- `components/SignIn.tsx`
- `components/admin/*` (tüm admin bileşenleri)
- `hooks/useAdminAccess.ts`
- `hooks/useEmailDomainCheck.ts`
- `lib/db.ts`
- `lib/db-local.ts`
- `api/*` (tüm API routes)
- `constants.ts`
- `server.js`
- `vercel.json` (sadece İter 8'de güncelleme)

## Kod Standartları
1. TypeScript strict mode — `any` kullanma
2. Tüm JSON parse işlemleri `safeParseJSON()` ile yapılmalı
3. Null/undefined safety: `value ?? 0` veya `value ?? ''` pattern
4. Component'ların tamamında EmptyState guard olmalı
5. Recharts'ta ResponsiveContainer her zaman kullanılmalı
6. Tailwind class'ları — inline style kullanma
7. Lucide React ikonları kullan — başka ikon kütüphanesi ekleme

## İmport Kuralları
- Store: `import { useDataStore } from '../../store/dataStore'`
- Parsers: `import { safeParseJSON, parsePainPoints, ... } from '../../lib/meeting-parsers'`
- CSV parsers: `import { parseMeetingsMasterCSV, ... } from '../../lib/csv-parser'`
- Types: `import type { MeetingMaster, PMScore, ... } from '../../types/meeting.types'`

## Renk Sistemi (Dashboard için)
```
Müşteri toplantısı:    #3b82f6 (blue-500)
İç toplantı:           #64748b (slate-500)
Yüksek risk:           #ef4444 (red-500)
Orta risk:             #f97316 (orange-500)
Düşük risk:            #eab308 (yellow-500)
Risk yok / pozitif:    #10b981 (emerald-500)
PM skoru < 6:          #ef4444 (red)
PM skoru 6-7.5:        #f97316 (orange)
PM skoru > 7.5:        #10b981 (green)
Upsell fırsatı:        #8b5cf6 (violet-500)
```

## Her İterasyon Sonrası Kontrol Listesi
- [ ] `npm run build` sıfır hata
- [ ] Mevcut Dashboard, Accounts, Admin sekmeleri çalışıyor
- [ ] Yeni component EmptyState gösteriyor (veri yok durumunda)
- [ ] Console'da error yok

## Progress Tracking
Her iterasyon tamamlandıktan sonra bu dosyayı güncelle:

| İterasyon | Durum | Tarih |
|-----------|-------|-------|
| 1 — Foundation | ⬜ Bekliyor | |
| 2 — Data Upload | ⬜ Bekliyor | |
| 3 — Meeting Overview & PM | ⬜ Bekliyor | |
| 4 — Customer Intel & Risk | ⬜ Bekliyor | |
| 5 — Knowledge Base | ⬜ Bekliyor | |
| 6 — Sales Orders | ⬜ Bekliyor | |
| 7 — Dashboard Entegrasyon | ⬜ Bekliyor | |
| 8 — Deploy | ⬜ Bekliyor | |
