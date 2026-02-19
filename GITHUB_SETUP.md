# GitHub'a Publish Etme Adımları

## 1. Git Repository Initialize Et

Terminal'de proje klasörüne gidin ve şu komutları çalıştırın:

```bash
cd ~/customer-success-pulse

# Git repository initialize et (eğer yoksa)
git init

# Tüm dosyaları stage'e ekle
git add .

# İlk commit
git commit -m "Initial commit: Customer Success Pulse with Tenant Management"
```

## 2. GitHub'da Yeni Repository Oluştur

1. [GitHub.com](https://github.com)'a gidin ve giriş yapın
2. Sağ üstteki **+** butonuna tıklayın → **New repository**
3. Repository adı: `customer-success-pulse` (veya istediğiniz isim)
4. Description: "Customer Success Pulse Dashboard with Tenant Management"
5. **Public** veya **Private** seçin
6. **Initialize this repository with a README** seçeneğini işaretlemeyin (zaten README var)
7. **Create repository** butonuna tıklayın

## 3. GitHub Repository'ye Bağla ve Push Et

GitHub'da repository oluşturduktan sonra, size verilen komutları çalıştırın. Genellikle şöyle olur:

```bash
# Remote repository ekle (YOUR_USERNAME ve REPO_NAME'i değiştirin)
git remote add origin https://github.com/YOUR_USERNAME/customer-success-pulse.git

# Branch adını main olarak ayarla
git branch -M main

# GitHub'a push et
git push -u origin main
```

## 4. Önemli Notlar

### Environment Variables
`.env.local` dosyası `.gitignore`'da olduğu için GitHub'a yüklenmeyecek. Bu doğru!

Ancak Vercel'e deploy ederken environment variables'ları manuel olarak eklemeniz gerekecek:
- Vercel Dashboard → Project Settings → Environment Variables
- Şu değişkenleri ekleyin:
  - `POSTGRES_URL`
  - `POSTGRES_PRISMA_URL`
  - `POSTGRES_URL_NON_POOLING`
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `VITE_ADMIN_EMAILS`
  - `ALLOWED_IP`
  - `ALLOW_LOCALHOST`

### .gitignore Kontrolü
Aşağıdaki dosyalar GitHub'a yüklenmeyecek (güvenlik için):
- `.env.local`
- `node_modules/`
- `dist/`
- `.DS_Store`

## 5. Vercel'e Deploy

GitHub'a push ettikten sonra:

1. [Vercel Dashboard](https://vercel.com)'a gidin
2. **Add New Project** → GitHub repository'nizi seçin
3. **Import** butonuna tıklayın
4. Environment variables'ları ekleyin (yukarıdaki listeden)
5. **Deploy** butonuna tıklayın

## 6. Vercel Postgres Database Oluştur

Deploy'dan sonra:
1. Vercel Dashboard → Project → **Storage** sekmesi
2. **Create Database** → **Postgres** seçin
3. Database oluşturulduktan sonra connection string'leri kopyalayın
4. Project Settings → Environment Variables'a ekleyin
5. Yeni bir deploy yapın (environment variables değiştiği için)

## Troubleshooting

### Git push hatası alırsanız:
```bash
# Force push (dikkatli kullanın)
git push -u origin main --force
```

### Remote zaten ekliyse:
```bash
# Mevcut remote'u kontrol et
git remote -v

# Eğer yanlışsa, sil ve tekrar ekle
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/customer-success-pulse.git
```

