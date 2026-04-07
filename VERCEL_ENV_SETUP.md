# Vercel Environment Variables Setup

## Database Connection Strings

Aşağıdaki environment variables'ları Vercel Dashboard'a ekleyin:

### 1. Vercel Dashboard'a Gidin
- Project Settings → Environment Variables

### 2. Aşağıdaki Variables'ları Ekleyin

#### Database Variables:
```
DATABASE_URL=postgres://020aec49f9c9cba64668b84be0d8d58a492ae6b35fbb772ede25553f953ae33f:sk_0DCYitraZcMghMMI6nqKs@db.prisma.io:5432/postgres?sslmode=require

POSTGRES_URL=postgres://020aec49f9c9cba64668b84be0d8d58a492ae6b35fbb772ede25553f953ae33f:sk_0DCYitraZcMghMMI6nqKs@db.prisma.io:5432/postgres?sslmode=require

PRISMA_DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza18wRENZaXRyYVpjTWdoTU1JNm5xS3MiLCJhcGlfa2V5IjoiMDFLSFQ5UzNEWEg1OVJGNlk4OFI3RERUQkMiLCJ0ZW5hbnRfaWQiOiIwMjBhZWM0OWY5YzljYmE2NDY2OGI4NGJlMGQ4ZDU4YTQ5MmFlNmIzNWZiYjc3MmVkZTI1NTUzZjk1M2FlMzNmIiwiaW50ZXJuYWxfc2VjcmV0IjoiZDE5MTk1MmMtOWYxOC00NGYyLThlZjUtODljODg5ODM1YzdmIn0.1Rf0OXWxEnXB7F9HAK4DtWAm0_URxHaSHGW6-vT4XpU

POSTGRES_PRISMA_URL=postgres://020aec49f9c9cba64668b84be0d8d58a492ae6b35fbb772ede25553f953ae33f:sk_0DCYitraZcMghMMI6nqKs@db.prisma.io:5432/postgres?sslmode=require

POSTGRES_URL_NON_POOLING=postgres://020aec49f9c9cba64668b84be0d8d58a492ae6b35fbb772ede25553f953ae33f:sk_0DCYitraZcMghMMI6nqKs@db.prisma.io:5432/postgres?sslmode=require
```

#### Clerk Authentication:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_c3VwcmVtZS1raWQtODAuY2xlcmsuYWNjb3VudHMuZGV2JA

CLERK_SECRET_KEY=sk_test_HthRcbnxoLewbIoXsrm3OILJv7uKS73jjfeelYPkio
```

#### Admin Access:
```
VITE_ADMIN_EMAILS=admin@alo-tech.com,admin@callcenterstudio.com
```

#### IP Whitelist:
```
ALLOWED_IP=188.119.9.106

ALLOW_LOCALHOST=false
```

#### Other:
```
GEMINI_API_KEY=PLACEHOLDER_API_KEY
```

### 3. Environment Seçimi

Her variable için **Environment** seçin:
- ✅ **Production**
- ✅ **Preview** 
- ✅ **Development** (opsiyonel)

### 4. Deploy

Environment variables'ları ekledikten sonra:
1. **Deployments** sekmesine gidin
2. En son deployment'ı bulun
3. **...** → **Redeploy** seçin

## Önemli Notlar

- `.env.local` dosyası local development için kullanılır
- Vercel'deki environment variables production'da kullanılır
- Connection string'ler hassas bilgilerdir, asla GitHub'a commit etmeyin
- `.env.local` zaten `.gitignore`'da olduğu için güvende

## Database Initialization

İlk deploy'dan sonra database schema otomatik olarak oluşturulacak. Eğer sorun olursa:

1. Vercel Dashboard → Functions → Logs
2. `/api/init-db` endpoint'ini manuel çağırabilirsiniz
3. Veya ilk API call'da otomatik initialize olacak

