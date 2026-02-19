# Vercel Deploy Düzeltmesi

## Sorun
Vercel deploy sırasında "Function Runtimes must have a valid version" hatası alınıyor.

## Çözüm

Vercel'de Vite projesi için API routes'ları otomatik olarak algılanır. `vercel.json` dosyasından runtime ayarını kaldırdık.

## Deploy Adımları

1. **GitHub'a push edin** (eğer henüz yapmadıysanız):
   ```bash
   git add .
   git commit -m "Fix Vercel deployment configuration"
   git push
   ```

2. **Vercel Dashboard'da**:
   - Project Settings → General
   - Framework Preset: **Vite** olarak ayarlayın
   - Build Command: `npm run build` (otomatik algılanır)
   - Output Directory: `dist` (otomatik algılanır)

3. **Environment Variables ekleyin**:
   - Project Settings → Environment Variables
   - Şu değişkenleri ekleyin:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
     - `VITE_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `VITE_ADMIN_EMAILS`
     - `ALLOWED_IP`
     - `ALLOW_LOCALHOST`

4. **Vercel Postgres Database oluşturun**:
   - Storage → Create Database → Postgres
   - Connection string'leri environment variables'a ekleyin

5. **Redeploy yapın**:
   - Deployments → En son deployment → ... → Redeploy

## API Routes

Vercel, `api/` klasöründeki dosyaları otomatik olarak serverless functions olarak algılar. Runtime otomatik olarak Node.js olarak ayarlanır.

## Notlar

- API routes'ları `/api/tenants`, `/api/tenants/import` gibi endpoint'ler olarak çalışır
- Vercel otomatik olarak TypeScript dosyalarını transpile eder
- Database connection string'leri environment variables'dan okunur

