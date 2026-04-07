# Customer Success Pulse - Mimari Dokümantasyon

## 1. Genel Bakış

**Customer Success Pulse**, müşteri başarı yönetimi için geliştirilmiş bir dashboard uygulamasıdır. Uygulama, müşteri hesaplarını, tenant'ları ve onboarding süreçlerini yönetmek için tasarlanmıştır.

### 1.1 Uygulama Özellikleri
- Müşteri hesapları ve durum takibi
- Tenant yönetimi ve CSV import
- Onboarding pipeline yönetimi
- Zoho Desk entegrasyonu (ticket istatistikleri)
- Churn risk analizi
- Admin paneli ile tenant yönetimi
- Email domain bazlı erişim kontrolü

---

## 2. Teknoloji Stack

### 2.1 Frontend
- **Framework**: React 19.2.4
- **Build Tool**: Vite 6.2.0
- **Language**: TypeScript 5.8.2
- **UI Library**: Lucide React (ikonlar)
- **Charts**: Recharts 3.7.0
- **Authentication**: Clerk React 5.0.0
- **Styling**: Tailwind CSS (inline classes)

### 2.2 Backend
- **Runtime**: Node.js
- **Server**: Custom HTTP Server (server.js)
- **API Framework**: Vercel Serverless Functions (production) / Custom Server (development)
- **File Parsing**: PapaParse 5.4.1
- **Form Handling**: Busboy 1.6.0

### 2.3 Veritabanı
- **Development**: SQLite (better-sqlite3 11.6.0)
- **Production**: Vercel Postgres (@vercel/postgres 0.5.0)
- **Database Abstraction**: Ortak SQL interface (db.ts)

### 2.4 Deployment
- **Platform**: Vercel
- **Configuration**: vercel.json

---

## 3. UI/UX Yapısı

### 3.1 Genel Layout

```
┌─────────────────────────────────────────────────┐
│  Sidebar (64px)  │  Main Content Area           │
│                  │                               │
│  - Logo          │  ┌─────────────────────────┐ │
│  - Navigation    │  │ Header (Sticky)          │ │
│    - Dashboard   │  │ - Title                  │ │
│    - Accounts    │  │ - User Menu              │ │
│    - Admin*      │  └─────────────────────────┘ │
│                  │                               │
│  - Settings      │  ┌─────────────────────────┐ │
│                  │  │ Content Area             │ │
│                  │  │ - Dashboard Overview    │ │
│                  │  │ - Customer Table        │ │
│                  │  │ - Customer Detail Modal │ │
│                  │  └─────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3.2 Bileşen Hiyerarşisi

```
App.tsx
├── SignIn (Authentication gerekliyse)
├── Sidebar Navigation
├── Header
│   ├── User Info
│   └── Notifications
└── Main Content
    ├── Dashboard Tab
    │   ├── DashboardOverview
    │   │   ├── Stats Cards (MRR, Touch Rate, Onboarding, At Risk)
    │   │   ├── Weekly Touch Status Chart
    │   │   ├── Account Health Pie Chart
    │   │   ├── Urgent Actions List
    │   │   └── Onboarding Pipeline Table
    │   └── CustomerTable
    │
    ├── Accounts Tab
    │   └── CustomerTable
    │
    ├── Admin Tab (Sadece admin kullanıcılar)
    │   ├── AdminPanel
    │   │   ├── TenantUpload
    │   │   └── TenantTable
    │
    └── CustomerDetail (Slide-over Modal)
        ├── Header Section
        ├── Metrics Grid
        ├── Technical Issues Panel
        └── Tabs
            ├── Overview
            ├── Tickets
            ├── Notes
            └── Onboarding
```

### 3.3 UI Bileşenleri Detayı

#### 3.3.1 DashboardOverview
**Konum**: `components/DashboardOverview.tsx`

**Özellikler**:
- 4 adet istatistik kartı (MRR, Touch Rate, Onboarding, At Risk)
- Weekly Touch Status (Bar Chart)
- Account Health Overview (Pie Chart)
- Urgent Actions List (Bottleneck ve Churn Risk)
- Onboarding Pipeline Table
- Historical Implementations (Aylık go-live geçmişi)

**Renk Şeması**:
- Onboarding: `#3b82f6` (blue-500)
- Active: `#10b981` (emerald-500)
- At Risk: `#ef4444` (red-500)
- Churned: `#64748b` (slate-500)

#### 3.3.2 CustomerTable
**Konum**: `components/CustomerTable.tsx`

**Özellikler**:
- Arama (Search) fonksiyonu
- Status filtreleme (All, Onboarding, Active, At Risk)
- Sütunlar:
  - Customer (name + domain)
  - Status (badge)
  - MRR
  - Touch Status (Touched/Untouched)
  - Health (progress bar veya health score)
  - Actions (detay butonu)
- Satır tıklama ile CustomerDetail açılır

#### 3.3.3 CustomerDetail
**Konum**: `components/CustomerDetail.tsx`

**Tip**: Slide-over Modal (sağdan açılan)

**Bölümler**:
1. **Header**: Müşteri bilgileri, tenant listesi, health score badge
2. **Metrics Grid**: 4 kart (Churn Risk, Satisfaction, Open Tickets, SLA Score)
3. **Technical Issues Panel**: Aktif teknik sorunlar veya "No issues" mesajı
4. **Tabs**:
   - **Overview**: Account Summary, Engagement durumu
   - **Tickets**: Ticket trend grafiği, response/resolution time
   - **Notes**: Son toplantı notları, account manager bilgisi
   - **Onboarding**: Onboarding timeline, progress, bottleneck bilgisi

#### 3.3.4 AdminPanel
**Konum**: `components/admin/AdminPanel.tsx`

**Bileşenler**:
- **TenantUpload**: CSV dosyası yükleme ve import
- **TenantTable**: Tenant listesi, filtreleme, CRUD işlemleri

#### 3.3.5 TenantUpload
**Konum**: `components/admin/TenantUpload.tsx`

**Özellikler**:
- CSV dosya seçimi
- Upload progress
- Import sonuçları:
  - Toplam satır sayısı
  - Yeni eklenen tenant sayısı
  - Duplicate atlanan sayısı
  - Hata listesi (detaylı)

#### 3.3.6 TenantTable
**Konum**: `components/admin/TenantTable.tsx`

**Özellikler**:
- Arama fonksiyonu
- Gelişmiş filtreleme (Account, Tenant Name, Tenant Owner, Status)
- Bulk selection (çoklu seçim)
- Bulk actions:
  - Add to Customers
  - Delete Selected
- Individual actions:
  - Toggle Active/Inactive
  - Delete
- Real-time state updates (sayfa yenileme yok)

### 3.4 UX Özellikleri

#### 3.4.1 Responsive Design
- Sidebar: Desktop'ta görünür, mobilde gizli
- Grid layout: Mobile (1 col), Tablet (2 col), Desktop (3-4 col)
- Table: Horizontal scroll (mobilde)

#### 3.4.2 Interactivity
- Hover effects (hover:bg-slate-50)
- Transition animations (transition-colors)
- Loading states (spinner icons)
- Disabled states (opacity-50, cursor-not-allowed)

#### 3.4.3 Visual Feedback
- Status badges (renk kodlu)
- Progress bars (onboarding, health)
- Alert panels (urgent actions, technical issues)
- Success/Error messages (import sonuçları)

---

## 4. Backend Mimarisi

### 4.1 Server Yapısı

#### 4.1.1 Development Server
**Dosya**: `server.js`

**Özellikler**:
- Port: 3001
- HTTP Server (Node.js native)
- API route handling
- Multipart form-data parsing (Busboy)
- CORS headers
- Request/Response transformation (Vercel format)

**Route Mapping**:
```
/api/tenants → api/tenants/index.ts
/api/tenants/import → api/tenants/import.ts
/api/tenants/[id] → api/tenants/[id].ts
/api/customers/[id]/tenants → api/customers/[id]/tenants.ts
```

#### 4.1.2 Production (Vercel)
- Serverless Functions
- Her API route ayrı function olarak deploy edilir
- Otomatik routing (Vercel)

### 4.2 API Endpoints

#### 4.2.1 Tenants API

**GET /api/tenants**
- Tüm tenant'ları listeler
- Response: `Tenant[]`

**POST /api/tenants**
- Yeni tenant oluşturur
- Body: `{ tenant_name, account, tenant_owner?, is_active? }`
- Response: `Tenant`

**PUT /api/tenants/[id]**
- Tenant günceller
- Body: `{ tenant_name?, account?, tenant_owner?, is_active? }`
- Response: `Tenant`

**DELETE /api/tenants/[id]**
- Tenant siler
- Response: `{ message: "Tenant deleted successfully" }`

**POST /api/tenants/import**
- CSV dosyasından tenant import eder
- Content-Type: `multipart/form-data`
- Body: `{ file: File }`
- Response: `TenantImportResult`

**POST /api/tenants/add-to-customers**
- Seçili tenant'ları customer'lara ekler
- Body: `{ tenantIds: number[] }`
- Response: `{ added: number, skipped: number }`

#### 4.2.2 Customers API

**GET /api/customers/[id]/tenants**
- Belirli bir customer'a ait tenant'ları getirir
- Response: `Tenant[]`

### 4.3 Database Abstraction Layer

**Dosya**: `lib/db.ts`

**Özellikler**:
- Environment-based database selection
- Development: SQLite
- Production: Vercel Postgres
- Ortak SQL interface
- Transaction support

**Fonksiyonlar**:
- `sql`: Template literal SQL queries
- `initDatabase()`: Schema initialization
- `ensureDatabaseInitialized()`: Auto-initialization
- `runInTransaction()`: Transaction wrapper

### 4.4 CSV Parser

**Dosya**: `lib/csv-parser.ts`

**Fonksiyonlar**:
- `parseCSV(file)`: CSV dosyasını parse eder
- `validateTenantRow(row)`: Row validation
- `cleanTenantData(row)`: Data cleaning (trim)

**Özellikler**:
- Header normalization
- Error handling
- Empty line skipping

---

## 5. Veritabanı Yapısı

### 5.1 Tablolar

#### 5.1.1 tenants

```sql
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- SQLite
  id SERIAL PRIMARY KEY,                 -- Postgres
  
  tenant_name VARCHAR(255) NOT NULL,
  account VARCHAR(255) NOT NULL,
  tenant_owner VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_name, account)
);
```

**Indexes**:
- `idx_tenants_account` ON `account`
- `idx_tenants_active` ON `is_active`

**Açıklama**:
- Tenant bilgilerini saklar
- `tenant_name` + `account` kombinasyonu unique
- Soft delete için `is_active` flag

#### 5.1.2 customer_tenant_mapping

```sql
CREATE TABLE customer_tenant_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- SQLite
  id SERIAL PRIMARY KEY,                  -- Postgres
  
  customer_id VARCHAR(255) NOT NULL,
  tenant_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(customer_id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

**Açıklama**:
- Customer ve Tenant arasındaki many-to-many ilişki
- `customer_id`: Customer ID (string, mock data'dan geliyor)
- `tenant_id`: Tenant ID (foreign key)
- Cascade delete: Tenant silinince mapping de silinir

### 5.2 Veri Akışı

#### 5.2.1 Tenant Import Süreci

```
CSV Upload
    ↓
Parse CSV (PapaParse)
    ↓
Validate Rows
    ↓
Clean Data (trim)
    ↓
De-duplicate (in-memory)
    ↓
Fetch Existing Tenants (DB)
    ↓
Filter New Tenants
    ↓
Bulk Insert (Transaction)
    ↓
Build Customer Mappings
    ↓
Bulk Insert Mappings (Transaction)
    ↓
Return Result
```

#### 5.2.2 Customer-Tenant Matching

- CSV'deki `Account` field'ı ile customer matching:
  - `customer.name` ile eşleşme
  - `customer.domain` ile eşleşme
- Eşleşen customer'lar için `customer_tenant_mapping` oluşturulur

### 5.3 Mock Data

**Dosya**: `constants.ts`

**Yapı**:
- `MOCK_CUSTOMERS`: Customer[] array
- Her customer şu bilgileri içerir:
  - Temel bilgiler (id, name, domain, segment)
  - Finansal (mrr, contractEndDate)
  - Durum (status, accountManager)
  - Zoho stats (ticket bilgileri)
  - Onboarding detayları
  - Active detayları (churn risk, health score)
  - Notes

---

## 6. Güvenlik

### 6.1 Authentication

**Provider**: Clerk

**Özellikler**:
- Google OAuth
- Email domain restriction:
  - `@alo-tech.com`
  - `@callcenterstudio.com`
- Otomatik sign-out (izin verilmeyen domain)

**Hook**: `useEmailDomainCheck`

### 6.2 Authorization

**Admin Access**:
- Environment variable: `VITE_ADMIN_EMAILS`
- Format: Comma-separated email listesi
- Hook: `useAdminAccess`
- Admin paneli sadece admin kullanıcılara görünür

### 6.3 IP Whitelisting (Development)

**Dosya**: `vite.config.ts`

**Özellikler**:
- Environment variable: `ALLOWED_IP`
- Default: `188.119.9.106`
- Localhost: Development mode'da otomatik izin
- Production: `ALLOW_LOCALHOST=false` önerilir

**Middleware**:
- IP detection (x-forwarded-for, x-real-ip, cf-connecting-ip)
- 403 response (unauthorized IP)

### 6.4 Data Validation

- CSV row validation (required fields)
- SQL injection protection (parameterized queries)
- File type validation (CSV only)
- Unique constraint (tenant_name + account)

---

## 7. Deployment

### 7.1 Vercel Configuration

**Dosya**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 7.2 Environment Variables

**Development (.env.local)**:
```env
VITE_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
VITE_ADMIN_EMAILS=admin@alo-tech.com,admin@callcenterstudio.com
POSTGRES_URL=... (production için)
POSTGRES_PRISMA_URL=...
POSTGRES_URL_NON_POOLING=...
ALLOWED_IP=188.119.9.106 (development)
ALLOW_LOCALHOST=true (development)
```

**Production (Vercel)**:
- Vercel Dashboard'dan environment variables ayarlanır
- `POSTGRES_URL` zorunlu
- `ALLOW_LOCALHOST=false` önerilir

### 7.3 Build Process

```bash
# Development
npm run dev          # Frontend (port 3000)
npm run dev:api      # Backend (port 3001)
npm run dev:full     # Both (concurrently)

# Production
npm run build        # Vite build
npm run vercel-build # Vercel build (alias)
```

### 7.4 Database Migration

- Otomatik schema initialization
- İlk API çağrısında `ensureDatabaseInitialized()` çalışır
- `CREATE TABLE IF NOT EXISTS` kullanılır (idempotent)

---

## 8. Dosya Yapısı

```
customer-success-pulse/
├── api/                          # API routes
│   ├── customers/
│   │   └── [id]/
│   │       └── tenants.ts
│   ├── tenants/
│   │   ├── [id].ts
│   │   ├── import.ts
│   │   ├── add-to-customers.ts
│   │   └── index.ts
│   └── init-db.ts
│
├── components/                   # React components
│   ├── admin/
│   │   ├── AdminPanel.tsx
│   │   ├── TenantTable.tsx
│   │   └── TenantUpload.tsx
│   ├── CustomerDetail.tsx
│   ├── CustomerTable.tsx
│   ├── DashboardOverview.tsx
│   └── SignIn.tsx
│
├── hooks/                        # Custom hooks
│   ├── useAdminAccess.ts
│   └── useEmailDomainCheck.ts
│
├── lib/                          # Utilities
│   ├── csv-parser.ts
│   ├── db.ts                     # Database abstraction
│   └── db-local.ts               # SQLite implementation
│
├── types/                        # TypeScript types
│   ├── tenant.ts
│   └── types.ts
│
├── App.tsx                       # Main app component
├── constants.ts                  # Mock data
├── index.tsx                     # Entry point
├── server.js                     # Development server
├── vite.config.ts                # Vite configuration
├── vercel.json                   # Vercel configuration
└── package.json
```

---

## 9. Performans Optimizasyonları

### 9.1 Database
- **Transaction Wrapping**: Bulk insert işlemleri tek transaction içinde
- **Indexing**: Sık kullanılan sorgular için index'ler
- **Batch Operations**: CSV import'ta toplu insert

### 9.2 Frontend
- **Lazy Loading**: Component-based code splitting (Vite)
- **State Management**: Local state (useState), gereksiz re-render yok
- **Optimistic Updates**: UI güncellemeleri API response beklemeden

### 9.3 CSV Import
- **In-Memory Processing**: Validation ve deduplication memory'de
- **Single Transaction**: Tüm insert'ler tek transaction
- **Progress Feedback**: Kullanıcıya detaylı sonuç gösterimi

---

## 10. Gelecek Geliştirmeler

### 10.1 Önerilen Özellikler
- Real-time notifications (WebSocket)
- Export functionality (CSV, PDF)
- Advanced filtering (date range, MRR range)
- Customer notes editing
- Tenant-Customer mapping UI
- Analytics dashboard (trends, forecasting)
- Email notifications (churn alerts, onboarding milestones)

### 10.2 Teknik İyileştirmeler
- State management library (Zustand/Redux)
- API client library (React Query)
- Error boundary components
- Unit tests (Vitest)
- E2E tests (Playwright)
- CI/CD pipeline

---

## 11. Sorun Giderme

### 11.1 Yaygın Sorunlar

**CSV Import Hatası**:
- Dosya formatı kontrolü (CSV)
- Header isimleri kontrolü (Tenant Name, Account, Tenant Owner)
- Encoding kontrolü (UTF-8)

**Database Connection**:
- Environment variables kontrolü
- Vercel Postgres connection string formatı
- SQLite file permissions (development)

**Authentication**:
- Clerk keys kontrolü
- Email domain whitelist kontrolü
- OAuth provider configuration

---

## 12. Referanslar

- **Clerk Docs**: https://clerk.com/docs
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Vite Docs**: https://vitejs.dev
- **Recharts Docs**: https://recharts.org
- **PapaParse Docs**: https://www.papaparse.com

---

**Son Güncelleme**: 2024
**Versiyon**: 1.0.0

