# Clerk Authentication Kurulum Rehberi

Bu proje Clerk authentication kullanmaktadır. Google OAuth ile giriş yapılabilir ve sadece belirli email domain'lerine izin verilir.

## Gereksinimler

- Clerk hesabı (https://clerk.com)
- Google OAuth credentials (Clerk Dashboard'da yapılandırılacak)

## Kurulum Adımları

### 1. Clerk Paketini Yükle

```bash
npm install @clerk/clerk-react
```

**Not:** Bu proje Vite + React kullanıyor (Next.js değil), bu yüzden `@clerk/clerk-react` paketi kullanılıyor. Next.js için `@clerk/nextjs` kullanılır, ancak bu proje için doğru paket `@clerk/clerk-react`'tir.

### 2. Clerk Dashboard'da Uygulama Oluştur

1. [Clerk Dashboard](https://dashboard.clerk.com)'a giriş yapın
2. Yeni bir uygulama oluşturun veya mevcut bir uygulamayı seçin
3. **API Keys** bölümünden `Publishable Key` ve `Secret Key` değerlerini kopyalayın

### 3. Environment Variables Ayarla

`.env.local` dosyasını düzenleyin:

```env
GEMINI_API_KEY=your_gemini_api_key

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

**Önemli:** Vite projelerinde environment variable'lar `VITE_` prefix'i ile başlamalıdır. Bu yüzden `VITE_CLERK_PUBLISHABLE_KEY` kullanıyoruz (Next.js'teki `NEXT_PUBLIC_` gibi).

### 4. Google OAuth Provider'ı Etkinleştir

Clerk Dashboard'da:

1. **User & Authentication** > **Social Connections** bölümüne gidin
2. **Google** provider'ını bulun ve **Enable** butonuna tıklayın
3. Google OAuth credentials'larınızı girin (Client ID ve Client Secret)
   - Google Cloud Console'dan alabilirsiniz: https://console.cloud.google.com

### 5. Email Domain Restriction Ayarla

Clerk Dashboard'da:

1. **User & Authentication** > **Email, Phone, Username** bölümüne gidin
2. **Allowed email domains** bölümüne şu domain'leri ekleyin:
   - `alo-tech.com`
   - `callcenterstudio.com`

Alternatif olarak, **Restrictions** bölümünden **Blocked email domains** ile diğer domain'leri engelleyebilirsiniz.

### 6. Uygulamayı Çalıştır

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## Email Domain Kontrolü

Uygulama iki seviyede email domain kontrolü yapar:

1. **Clerk Dashboard'da**: Clerk seviyesinde domain restriction
2. **Frontend'de**: `useEmailDomainCheck` hook'u ile ek kontrol

İzin verilen domain'ler:
- `@alo-tech.com`
- `@callcenterstudio.com`

Bu domain'lerin dışındaki email adresleri ile giriş yapılamaz.

## Sorun Giderme

### "Missing Clerk Publishable Key" Hatası

`.env.local` dosyasında `VITE_CLERK_PUBLISHABLE_KEY` değerinin doğru olduğundan emin olun.

### Google OAuth Çalışmıyor

1. Clerk Dashboard'da Google provider'ının etkin olduğundan emin olun
2. Google Cloud Console'da OAuth consent screen'in yapılandırıldığından emin olun
3. Redirect URI'lerin doğru yapılandırıldığından emin olun

### Email Domain Kontrolü Çalışmıyor

1. Clerk Dashboard'da email domain restriction'larının ayarlandığından emin olun
2. Browser console'da hata mesajlarını kontrol edin
3. `useEmailDomainCheck` hook'unun doğru çalıştığından emin olun

