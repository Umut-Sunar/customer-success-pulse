# 🚀 Hızlı Başlangıç Rehberi

## Cursor'da Başlamadan Önce

### 1. Mevcut projeyi aç
Cursor'da `customer-success-pulse` klasörünü aç.

### 2. `.cursorrules` dosyasını projeye koy
`CURSORRULES.md` içeriğini projenin kök dizinine `.cursorrules` adıyla kaydet.
Cursor bu dosyayı otomatik okur ve her prompt'ta bağlam olarak kullanır.

### 3. İterasyon sırasını takip et
Her `.md` dosyasını sırayla kullan. Bir önceki tamamlanmadan sonrakine geçme.

---

## İterasyon Başlatma Şablonu

Her yeni iterasyon için Cursor'a şunu söyle:

```
[İTERASYON X BAŞLIYOR]

Mevcut tamamlanan iterasyonlar: [liste]
Şu an çalışıyorum: İterasyon X — [başlık]

Aşağıdaki spesifikasyonu takip et ve adım adım uygula.
Her adım tamamlandıktan sonra "✅ Step X.Y tamamlandı" yaz.
Bir hatayla karşılaşırsan dur ve açıkla.

[İterasyon dosyasının içeriğini buraya yapıştır]
```

---

## Kullanıcı Veri Yükleme Akışı (Her Oturumda)

### Google Sheets'ten CSV İndirme
1. Google Sheets'i aç: `CCS Meeting Intelligence`
2. Her sheet için:
   - Sheet sekmesine tıkla
   - File → Download → Comma Separated Values (.csv)
   - Dosyayı kaydet

İndirilecek sheet'ler:
```
meetings_master     → meetings_master.csv
pm_scores           → pm_scores.csv
customer_insights   → customer_insights.csv
risk_signals        → risk_signals.csv
knowledge_management → knowledge_management.csv
```

### Sales Orders CSV'leri
CRM'den (Zoho) export:
```
Pipeline orders (Setup/Hold) → Sales_Orders.csv
Live orders                  → Sales_Orders_2.csv
```

### Dashboard'a Yükleme
1. Uygulamaya giriş yap
2. Header'da "Update Data" butonuna tıkla
3. 7 slot'a ilgili CSV'leri yükle
4. Dashboard otomatik dolacak

---

## Sık Karşılaşılan Sorunlar

### "CSV parse error"
- Dosyanın UTF-8 encoding'de olduğundan emin ol
- Header satırının varlığını kontrol et
- Google Sheets'ten direkt CSV indir, Excel'den dönüştürme

### "TypeScript build error"
- `npm install` çalıştır
- `node_modules` sil ve tekrar `npm install`
- Cursor'a hatayı göster ve düzeltmesini iste

### Vercel deploy'da API hatası
- Environment variables Vercel Dashboard'da set edilmiş mi kontrol et
- `POSTGRES_URL` doğru mu kontrol et

---

## Önemli Notlar

1. **Veri kalıcı değil**: Sayfa yenilenince veriler kaybolur, tekrar upload gerekir
   → İter 8 sonrası `localStorage` kalıcılığı eklenebilir

2. **Auth**: Sadece `alo-tech.com` ve `callcenterstudio.com` email'leri erişebilir

3. **Admin Panel**: Admin email'leri `VITE_ADMIN_EMAILS` env var'ında tanımlı
