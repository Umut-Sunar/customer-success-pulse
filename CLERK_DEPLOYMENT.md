# Clerk keys — dev vs production

## Goal

Avoid using **development** Clerk instances in production (browser shows: “Clerk has been loaded with development keys…”).

## Environment separation

| Environment | Publishable key prefix | Where |
|-------------|------------------------|--------|
| Local dev | `pk_test_…` | `.env.local` |
| Preview / staging | `pk_test_…` or dedicated Clerk instance | Vercel Preview env |
| Production | `pk_live_…` | Vercel Production env |

- `VITE_CLERK_PUBLISHABLE_KEY` must match the Clerk Dashboard **Frontend API** for that deployment.
- `CLERK_SECRET_KEY` must be the **secret** key for the **same** Clerk instance (never commit real values).

## Pre-deploy checklist

1. In Vercel → Project → Settings → Environment Variables:
   - **Production** uses `pk_live_…` and matching `sk_live_…`.
   - **Preview** can use test keys or a separate Clerk application.
2. Redeploy after changing env vars (or trigger a new deployment).
3. Open the production URL in an incognito window and confirm the Clerk dev-keys warning does **not** appear in the console.

## Local development

Use test keys in `.env.local` only. Do not paste production secrets into chat or commit them.

See also: [README.md](README.md) and [.env.example](.env.example).
