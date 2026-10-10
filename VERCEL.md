# OSIRIS Paywall — Vercel Preview Deployment

Deploy the monetized fork to a `*.vercel.app` URL for testing **before**
attaching a custom domain or Stripe keys. The repo is already Vercel-aware:
`next.config.ts` disables `standalone` output on Vercel (its adapter breaks
on Turbopack + standalone), and `postinstall` runs `prisma generate` so the
client exists at build time.

> Stripe is intentionally deferred. The landing page, pricing page, sign-in
> and the paywall gate all work without it; `/api/checkout` returns 500
> until `STRIPE_*` keys are added.

---

## 1. Push to your own repo

This is a monetized fork — keep it private.

```bash
cd ~/workspace/osiris
git remote remove origin            # detach from simplifaisoul/osiris
git remote add origin git@github.com:<you>/osiris-paywall.git
git add -A && git commit -m "Paywall foundation: Auth.js v5 + Stripe weekly pass"
git push -u origin main              # or master, matching your default branch
```

## 2. Provision Postgres (Neon, free tier)

1. https://neon.tech → new project → copy the **pooled** connection string.
2. It looks like:
   `postgresql://<user>:<pass>@<host>/osiris?sslmode=require`
3. Run the migration **from your machine** against the remote DB:

```bash
DATABASE_URL="<pooled-connection-string>" npx prisma migrate deploy
```

## 3. Create one OAuth app (GitHub, ~5 min)

Without this there is no sign-in, and the paywall gate can never open.

1. https://github.com/settings/developers → New OAuth App
2. Homepage URL: `https://<your-app>.vercel.app`
3. Authorization callback URL: `https://<your-app>.vercel.app/api/auth/callback/github`
4. Copy the Client ID + generate a Client Secret.

(Use the real preview URL from step 4 — you can create the Vercel project
first, then come back and fill in the callback URL.)

## 4. Import into Vercel

1. https://vercel.com/new → import `osiris-paywall`.
2. Framework preset: **Next.js** (auto-detected). Leave build settings default:
   - Build command: `npm run build` (`prebuild` vendors the MapLibre worker)
   - Output: default (`.next`)
3. Add environment variables (all environments, or at least Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | pooled Neon connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://<your-app>.vercel.app` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | from step 3 |
| `NEXT_PUBLIC_APP_URL` | `https://<your-app>.vercel.app` |

4. Deploy.

## 5. Smoke test (on your phone)

- `/` → landing page renders.
- `/pricing` → pricing page renders; "Get Weekly Access" → asks you to sign in first (401 → `/api/auth/signin`), then errors cleanly on missing Stripe keys. Expected until Stripe is connected.
- Sign in with GitHub → back to `/pricing`.
- Visit `/dashboard` while signed in with no subscription → **redirects to `/pricing?from=/dashboard`**. The gate works.
- `/api/webhooks/stripe` → not reachable through middleware (excluded by the matcher); direct POST without a signature returns 400. Expected.

## 6. Later: custom domain + Stripe

1. Vercel → Settings → Domains → add your domain (update `AUTH_URL`,
   `NEXT_PUBLIC_APP_URL`, and the GitHub OAuth callback URL).
2. Stripe dashboard → create the **weekly recurring** price → copy `price_...`.
3. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEEKLY_PRICE_ID`.
4. Register the webhook endpoint
   `https://<domain>/api/webhooks/stripe` for:
   `checkout.session.completed`, `invoice.payment_succeeded`,
   `invoice.payment_failed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
5. Test with a live-mode test clock or a real $9 charge, then refund it.

## Known Vercel-specific behavior (not bugs)

- **Umami analytics**: `src/middleware.ts` fires two requests at
  `http://umami-umami-1:3000` (Docker-only hostname). On Vercel the fetch
  fails and is `.catch()`-swallowed — the request continues normally.
  Set `UMAMI_WEBSITE_ID` to your own instance or ignore it.
- **intel service / nginx cache / CasaOS**: Docker Compose only, not used on Vercel.
- **WebGL/MapLibre**: the worker is vendored under `public/vendor/maplibre/`
  by the `prebuild` script and served with immutable caching — no config needed.
- **Region**: the Stripe webhook and DB are latency-sensitive; keep the
  Vercel project region close to your Neon region (both default to US East).
