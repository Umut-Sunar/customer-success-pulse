<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/11kYUsKbt2KmvcBcFlVcuuWnhx3sG4Ucj

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in [.env.local](.env.local):
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

3. Configure Clerk Authentication:
   - See [CLERK_SETUP.md](CLERK_SETUP.md) for detailed setup instructions
   - Enable Google OAuth in Clerk Dashboard
   - Configure email domain restrictions for `@alo-tech.com` and `@callcenterstudio.com`

4. Run the app (UI + local API — recommended for `/api/customers`, tenants, etc.):
   ```bash
   npm run dev:full
   ```
   This starts Vite on port **3000** and the local API server on **3001** (see [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)).

   UI only (API calls will fail unless you also run `npm run dev:api` in another terminal):
   ```bash
   npm run dev
   ```

5. Optional: verify the local API:
   ```bash
   curl -s http://localhost:3001/api/health
   ```

## Authentication

This app uses Clerk for authentication with Google OAuth. Only users with `@alo-tech.com` or `@callcenterstudio.com` email addresses can sign in.

For detailed Clerk setup instructions, see [CLERK_SETUP.md](CLERK_SETUP.md).

For **production vs development** Clerk keys and deploy checklist, see [CLERK_DEPLOYMENT.md](CLERK_DEPLOYMENT.md).

## Database Setup

This app uses Vercel Postgres for data storage. To set up:

1. Create a Vercel Postgres database in your Vercel dashboard
2. Copy the connection strings to `.env.local`:
   ```env
   POSTGRES_URL=your_postgres_url
   POSTGRES_PRISMA_URL=your_prisma_url
   POSTGRES_URL_NON_POOLING=your_non_pooling_url
   ```
3. The database schema will be automatically created on first API call

## Admin Panel

Admin panel is accessible to users with emails listed in `VITE_ADMIN_EMAILS` environment variable (comma-separated).

To set up admin access:
```env
VITE_ADMIN_EMAILS=admin@alo-tech.com,admin@callcenterstudio.com
```

## Tenant Management

1. Go to Admin panel (visible only to admins)
2. Upload CSV file with columns: `Tenant Name`, `Account`, `Tenant Owner`
3. System will automatically:
   - Parse the CSV
   - Check for duplicates (by Tenant Name + Account)
   - Insert only new tenants
   - Show import summary

Tenants are matched to customers by the `Account` field matching customer `name` or `domain`.
