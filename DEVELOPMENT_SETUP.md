# Development Mode Setup

## CSV Yükleme ve Eşleştirme Mantığı

### ✅ Mevcut Özellikler

1. **CSV Parser** (`lib/csv-parser.ts`)
   - PapaParse ile CSV parsing
   - Header normalization (Tenant Name, Account, Tenant Owner)
   - Data validation ve cleaning

2. **CSV Import API** (`api/tenants/import.ts`)
   - CSV dosyasını parse eder
   - Duplicate kontrolü yapar (Tenant Name + Account kombinasyonu)
   - Sadece yeni tenant'ları ekler
   - Import summary döner (total, new, skipped, errors)

3. **Customer-Tenant Eşleştirme** (`api/customers/[id]/tenants.ts`)
   - Customer name veya domain ile tenant'ları eşleştirir
   - Account field'ı = Customer name veya domain kontrolü yapar
   - Sadece aktif tenant'ları döner

4. **Admin Panel** (`components/admin/`)
   - CSV upload component
   - Tenant listesi ve active/inactive toggle
   - Import sonuçları gösterimi

5. **Customer Detail** (`components/CustomerDetail.tsx`)
   - Tenant bilgilerini gösterir
   - Tenant Name (clickable, küçük font)
   - Tenant Owner bilgisi

## Development Mode'da Çalıştırma

### Önerilen: Frontend + local API (tek komut)

Vite (`npm run dev`) yalnızca UI sunar; `/api/*` istekleri `vite.config.ts` içindeki proxy ile **localhost:3001**’deki `server.js` API’sine gider. API çalışmıyorsa tarayıcıda `/api/customers` vb. hata alırsınız.

**Standart geliştirme komutu (önerilen):**

```bash
npm run dev:full
```

Bu komut `concurrently` ile hem Vite’ı (port **3000**) hem `server.js` (port **3001**) başlatır.

**Ayrı terminallerde:**

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:api
```

### Sağlık kontrolü

API ayakta mı:

```bash
curl -s http://localhost:3001/api/health
```

Beklenen: `{"ok":true,"service":"local-api-server"}`.

### Alternatif: Vercel Dev

Vercel CLI ile tüm stack:

```bash
npm i -g vercel
vercel dev
```

## Test CSV Dosyası

Test için örnek CSV dosyası oluşturun:

```csv
Tenant Name,Account,Tenant Owner
Acme Corp Tenant,Acme Corp,John Doe
Globex Tenant,Globex Inc,Jane Smith
Soylent Tenant,Soylent Corp,Bob Johnson
```

## Development Checklist

- [x] CSV parser implementasyonu
- [x] CSV import API endpoint
- [x] Duplicate detection logic
- [x] Customer-Tenant matching logic
- [x] Admin panel UI
- [x] Customer detail tenant gösterimi
- [ ] Development mode'da API routes testi
- [ ] Database connection testi
- [ ] CSV upload end-to-end testi

## Sonraki Adımlar

1. **Development'ta test et:**
   ```bash
   npm run dev:full
   ```
   - Admin panel'e git
   - CSV yükle
   - Tenant listesini kontrol et
   - Customer detail'de tenant bilgilerini gör

2. **Database'i initialize et:**
   - İlk API call'da otomatik olacak
   - Veya `/api/init-db` endpoint'ini çağır

3. **Production'a deploy:**
   - Vercel'e push et
   - Environment variables ekle
   - Database connection string'leri ayarla

## Notlar

- Yerelde API için `npm run dev:api` veya `npm run dev:full` kullanın; yalnızca `npm run dev` ile `/api/*` proxy’si 3001’e bağlanamaz ve istekler düşer.
- Production'da Vercel serverless functions (`api/`) otomatik çalışır
- Database connection string'leri `.env.local`'de olmalı
- Vercel deploy'da environment variables manuel eklenmeli

