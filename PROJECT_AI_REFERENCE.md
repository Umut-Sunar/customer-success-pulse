# Pulse CS (Customer Success Pulse) — Yapay Zeka / Geliştirici Referansı

Bu belge, projeyi başka bir LLM veya geliştiriciye devrederken **tam bağlam** sağlamak için yazılmıştır. Kod yolları repoya göredir; değişmiş olabilir — kritik dosyaları `grep` ile doğrulayın.

---

## 1. Ürün özeti

**Pulse CS**, Alo-Tech / CCS ekibi için **Customer Success Intelligence** paneli: hesap (account) sağlığı, toplantı analitiği, PM performansı, risk/churn sinyalleri, bilgi tabanı özeti, Zoho satış siparişleri (pipeline + live) ve (yetkili kullanıcılar için) tenant/admin işlemleri tek arayüzde toplanır.

- **Kimlik:** Clerk (e-posta domain kısıtı `useEmailDomainCheck` ile).
- **Ön yüz:** React 19 + TypeScript + Vite + Tailwind + Lucide + Recharts.
- **İstemci verisi:** Çoğu analitik veri **CSV yükleme** → **PapaParse** → **Zustand `useDataStore`** → **IndexedDB** kalıcılığı ile çalışır (tarayıcıda offline-benzeri).
- **Sunucu verisi:** Account’lar (müşteri/tenant ilişkisi), notlar vb. **REST API** + SQLite (dev) / Postgres (prod) — `hooks/useAccounts.ts` ve `api/` altı.

---

## 2. Depo yapısı (iki “kök” dikkat)

| Alan | Konum | Rol |
|------|--------|-----|
| Kök bileşenler | `components/*.tsx`, `components/admin/*` | Dashboard, AccountTable/Detail, SignIn, Admin |
| Hooks (kök) | `hooks/*.ts` | `useAccounts`, `useEnrichedAccounts`, `useAdminAccess`, `useEmailDomainCheck` |
| Yeni modüller | `src/components/meeting-intelligence/*`, `src/components/sales/*`, `src/components/shared/*` | Meeting Intel, Sales, paylaşılan UI |
| Durum & lib | `src/store/dataStore.ts`, `src/lib/*`, `src/types/*` | Zustand, CSV, metrikler, tipler |
| API | `api/**/*.ts` | Vercel serverless / `server.js` ile dev |
| Eski / sunucu DB | `lib/db.ts`, `lib/db-local.ts` | Postgres + SQLite köprüsü (API tarafı) |

**Import örnekleri:** Kök bileşenler sıklıkla `../src/store/dataStore` ve `../src/lib/...` kullanır. `src/` altındaki dosyalar genelde `../../store/...` veya göreli `../lib/...` kullanır.

---

## 3. Uygulama akışı (`App.tsx`)

1. **Clerk** oturumu yoksa veya e-posta domain’i uygun değilse → `components/SignIn.tsx`.
2. Mount’ta `hydrateFromIndexedDB(useDataStore.getState())` — IndexedDB’den meeting/sales/gruplama verisi yüklenir.
3. **Sidebar sekmeleri:**
   - `dashboard` — `DashboardOverview` + altta `AccountTable`
   - `accounts` — sadece `AccountTable`
   - `meeting-intel` — `MeetingIntelligenceLayout` (`ErrorBoundary` içinde)
   - `sales-orders` — `SalesOrdersLayout` (`ErrorBoundary` içinde)
   - `admin` — yalnızca `useAdminAccess().isAdmin` ise `AdminPanel`
4. **Üst bar:** “Update Data” → `DataUploadModal`; “Clear Data” → `clearAllData()` + reload.
5. Hesap satırı seçilince → `AccountDetail` modal (Overview / Clients / Meeting Intel / Sales Orders sekmeleri).

**Sidebar göstergeleri:** `riskSignals` içinde `churn_risk === 'high'` varsa Meeting Intel’de kırmızı nokta; pipeline’da `due_date < bugün` sayısı Sales Orders’ta rozet.

---

## 4. Veri katmanı

### 4.1 Zustand store (`src/store/dataStore.ts`)

| Alan | Tip / anlam |
|------|-------------|
| `meetings` | `MeetingMaster[]` — toplantı ana tablo |
| `pmScores` | `PMScore[]` — PM skor satırları |
| `customerInsights` | `CustomerInsight[]` |
| `riskSignals` | `RiskSignal[]` |
| `knowledgeItems` | `KnowledgeItem[]` |
| `pipelineOrders` | `SalesOrderPipeline[]` |
| `liveOrders` | `SalesOrderLive[]` |
| `liveParentByChildId` / `pipelineParentByChildId` | Alt SO → üst SO `record_id` eşlemesi (Sales gruplama) |
| `uploadedFiles` | Hangi CSV slotlarının dolduğu |
| `isHydrated`, `isParsingMeetings`, … | UI yükleme durumları |

**Aksiyonlar:** `setMeetings`, `setPmScores`, … her biri ilgili IndexedDB store’una `idbSave` yapar. `setSoParent(kind, childId, parentId | null)` gruplama + `soGrouping` kalıcılığı. `clearAllData` tüm store + IndexedDB temizler.

### 4.2 IndexedDB (`src/lib/indexeddb.ts`)

- DB adı: `PulseCS_Data`, sürüm **2+** (Sales SO gruplama için `soGrouping` store’u eklendi).
- Store isimleri: `meetings`, `pmScores`, `customerInsights`, `riskSignals`, `knowledgeItems`, `pipelineOrders`, `liveOrders`, `soGrouping`.
- `idbSave`: diziyi temizleyip satır satır `_idb_id` ile yazar; `soGrouping` tek kayıt: `{ liveParentByChildId, pipelineParentByChildId }`.

### 4.3 CSV yükleme (`src/components/shared/DataUploadModal.tsx` + `src/lib/upload-datasets.ts`)

`UPLOAD_DATASETS` dizisi tek kaynak: her öğe `key`, `title`, `parser` (`src/lib/csv-parser.ts`), `setterKey` (store setter adı).

Sıra / anahtarlar:

1. `meetings_master` → `setMeetings`
2. `pm_scores` → `setPmScores`
3. `customer_insights` → `setCustomerInsights`
4. `risk_signals` → `setRiskSignals`
5. `knowledge_management` → `setKnowledgeItems`
6. `sales_pipeline` → `setPipelineOrders`
7. `sales_live` → `setLiveOrders`

Parser ayrıntıları: `src/lib/csv-parser.ts` (kolon eşleme, tip dönüşümleri).

---

## 5. Meeting Intelligence (detaylı)

### 5.1 Giriş noktası

- **Layout:** `src/components/meeting-intelligence/MeetingIntelligenceLayout.tsx`
- **Koşul:** `meetings.length === 0` ve parse değilse → `EmptyState` + “Upload Data Files”.
- **Sekmeler (sabit sıra):** `overview` | `pm` | `customer` | `risk` | `knowledge`
- **Dış kontrol:** `App.tsx` `meetingIntelTab` / `setMeetingIntelTab` ile sekmeler senkron (ör. Dashboard’dan Risk’e atlama).

### 5.2 Sekme → bileşen → veri kaynağı

| Sekme | Bileşen | Ana `useDataStore` kaynakları |
|--------|---------|-------------------------------|
| Overview | `MeetingOverview.tsx` | `meetings` (toplantı türleri, hacim, zaman dağılımı; Recharts + `ChartShell`) |
| PM Performance | `PMPerformance.tsx` | `pmScores` (`aggregatePMScores` vb. `meeting-parsers`) |
| Customer Intel | `CustomerIntelligence.tsx` | `customerInsights`, `meetings`; drawer state layout’ta (`drawerAccount`) |
| Risk & Churn | `RiskDashboard.tsx` | `riskSignals`; hesap detayına geçiş için `onViewAccountDetails` → Customer sekmesi |
| Knowledge Base | `KnowledgeBase.tsx` | `knowledgeItems` |

### 5.3 Tipler (`src/types/meeting.types.ts`)

- **MeetingMaster:** `meeting_id`, `title`, `date`, `duration_min`, `organizer_email`, `participants`, `is_customer_meeting`, `customer_domain`, `account_name`, `meeting_type`, …
- **PMScore:** çok sayıda sayısal alan (preparation, customer_mgmt, tech_mastery, …), `overall`, JSON string alanları (`key_strengths`, `improvement_areas`, …).
- **CustomerInsight:** `sentiment`, `pain_points`, `key_needs`, `feature_requests` (çoğu JSON string), PM–müşteri eşleşme skorları.
- **RiskSignal:** `churn_risk`, `escalation_risk`, göstergeler JSON string.
- **KnowledgeItem:** tekrarlayan konular, FAQ, dokümantasyon açıkları, `next_steps` JSON dizileri.

### 5.4 Yardımcı kütüphane (`src/lib/meeting-parsers.ts`)

- `safeParseJSON`, `parsePainPoints`, `parseUpsellOpportunities`, `parseFeatureRequests`, `parseStringArray`
- `aggregatePMScores` — PM bazlı ortalama / dağılım
- Dashboard ve AccountDetail upsell/risk metinlerinde kullanılır.

### 5.5 PM kimliği (`src/lib/pm-identity.ts`)

Farklı ekranlarda PM adı/e-posta eşlemesi için ortak normalizasyon (Sales PM filtresi ile uyum notları kodda).

### 5.6 Renk / UX kuralları (`.cursor/rules` ve mimari dokümanlar)

Müşteri toplantısı mavi, iç toplantı slate, risk seviyeleri kırmızı/turuncu/sarı/yeşil; Recharts’ta `ResponsiveContainer`; mümkünse `ChartShell` (genişlik 0 uyarılarını önlemek için).

---

## 6. Sales Orders

### 6.1 Yerleşim

- `src/components/sales/SalesOrdersLayout.tsx` — veri yoksa boş durum; varsa `SalesOrders.tsx`.
- `SalesOrders.tsx`: özet yıl, KPI kartları, filtreler, **SO gruplama paneli**, PM performance + ay grafiği, Live/Pipeline tabloları, PM workload grafiği, recent activity, pipeline düzenleme modalı.

### 6.2 Veri modelleri (`src/types/sales.types.ts`)

- **SalesOrderLive:** `record_id`, `subject`, `account_name`, `committed_live_date`, `due_date`, `order_date`, `grand_total`, `project_manager`, `status`, `tenant_name`, …
- **SalesOrderPipeline:** `due_date`, `status`, `last_status_comment`, …

### 6.3 Tarih ve PM kuralları (`src/lib/sales-utils.ts`, `sales-pm-analytics.ts`)

- Live “görünür tarih”: `getSalesLiveDisplayDate` (önce `committed_live_date`, yoksa `due_date`).
- Dashboard / Live ay filtresi ile uyumlu bucket: `getLiveOrderDateForBucket`.
- **PM performance bloğu:** kapanış ayı ve özet yıl **CSV Due Date** (`due_date`) ve **gruplanmış proje birimleri** üzerinden (aşağıda).

### 6.4 SO hiyerarşisi (parent / child)

- **Tipler:** `src/types/sales-grouping.types.ts` — `SoChildToParentMap`.
- **Mantık:** `src/lib/sales-order-groups.ts` — kök bulma, döngü kontrolü, `buildLiveGroupUnits` / `buildPipelineGroupUnits`, temsilci Due Date (önce kök, yoksa üyeler arası en geç), temsilci PM (önce kök, yoksa çoğunluk), tablo için `buildOrderedHierarchyRows`.
- **UI:** `SalesOrderGroupingPanel.tsx` — Live / Pipeline sekmesi, Child + Parent seç, Link / Unlink.
- **PM metrikleri:** `computePmSalesSummaryRowsGrouped`, `computeMonthCloseAvgRowsGrouped` — grup başına tek sayım, MRR toplamları grupta; Setup pipeline da gruplanmış.

---

## 7. Dashboard ve Accounts

### 7.1 `components/DashboardOverview.tsx`

- `useEnrichedAccounts()` ile gerçek hesap listesi + metrikler.
- `useDataStore`: `meetings`, `riskSignals`, `liveOrders`, `pipelineOrders`, `pmScores`, `knowledgeItems`.
- Pipeline **Setup** satırları ile MRR/toplamlar (Sales sekmesi ile aynı Setup kuralı).
- Tarihsel go-live ayları: `getLiveOrderDateForBucket` + `parseDateToMonthKey`.
- Risk’e atlama: `onNavigateToRisk` → App’te Meeting Intel `risk` sekmesi.

### 7.2 `hooks/useEnrichedAccounts.ts`

- `useAccounts()` → API’den `AccountWithClients[]`.
- `enrichAccounts(...)` (`src/lib/account-metrics.ts`): meetings, riskSignals, customerInsights, liveOrders, pmScores ile **MRR, touch status, churn risk, health score, dominant status** vb. hesaplanır.

### 7.3 `components/AccountTable.tsx` / `AccountDetail.tsx`

- Tablo: zenginleştirilmiş hesaplar; tıklanınca modal.
- **AccountDetail sekmeleri:** Overview, Clients, Meeting Intel (insights + meetings eşleşmesi), Sales Orders (live/pipeline `account_name` eşleşmesi).
- Eşleme: `matchesAccount` — normalize, `includes` ile esnek isim eşlemesi.

---

## 8. Admin ve API

- **Admin:** `components/admin/AdminPanel.tsx` ve alt bileşenler — tenant / import vb. (kurallarda genelde “dokunma” denmiş; değişiklik bilinçli olmalı).
- **Dev API:** `server.js` (port **3001**), `api/**/*.ts` handler’larını dinamik import eder; path eşlemesi dosya içinde açıklanmış.
- **Prod:** Vercel serverless + `@vercel/postgres`; yerel SQLite `lib/db-local.ts` / `lib/db.ts` API route’larında kullanılır.

---

## 9. Ortak UI bileşenleri (`src/components/shared/`)

- `DataUploadModal.tsx` — CSV slotları
- `ChartShell.tsx` — Recharts için boyut/empty guard
- `EmptyState.tsx`, `SkeletonCard.tsx`, `ErrorBoundary.tsx`

---

## 10. Bilinen kural çakışmaları (AI için)

Repoda birden fazla `.cursorrules` / rules dosyası olabilir; bazıları **aynı dosyaya dokunma** derken biri **genişlet** der. Değişiklik öncesi hangi kuralın geçerli olduğunu kullanıcıya sorun veya PR’da açıkça belirtin.

---

## 11. Komutlar

| Komut | Açıklama |
|--------|-----------|
| `npm run dev` | Vite ön yüz |
| `npm run dev:api` | Yerel API (`server.js`) |
| `npm run dev:full` | İkisi birlikte |
| `npm run build` | Üretim derlemesi |
| `npm run typecheck` | `tsc --noEmit` |

---

## 12. Özellik → dosya hızlı indeks

| Özellik | Dosyalar |
|---------|-----------|
| Meeting Overview | `src/components/meeting-intelligence/MeetingOverview.tsx` |
| PM skor grafikleri | `PMPerformance.tsx`, `meeting-parsers.ts` |
| Müşteri içgörü | `CustomerIntelligence.tsx` |
| Risk | `RiskDashboard.tsx`, `meeting.types.ts` → `RiskSignal` |
| Bilgi tabanı | `KnowledgeBase.tsx` |
| CSV parse | `src/lib/csv-parser.ts` |
| Sales tabloları + PM | `SalesOrders.tsx`, `sales-pm-analytics.ts`, `sales-utils.ts` |
| SO gruplama | `sales-order-groups.ts`, `SalesOrderGroupingPanel.tsx`, `dataStore` + `soGrouping` IDB |
| Hesap zenginleştirme | `account-metrics.ts`, `useEnrichedAccounts.ts` |
| Global state | `src/store/dataStore.ts` |
| Kalıcılık | `src/lib/indexeddb.ts` |

---

*Son güncelleme: bu belge kod tabanının anlık görüntüsüne göre üretilmiştir; yeni modül eklendikçe “Özellik → dosya” bölümünü güncelleyin.*
