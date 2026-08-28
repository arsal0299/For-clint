# Child Reseller Site (built on the mother site's API)

Same theme, same UI, same core features as the mother site — but this
project has **no direct connection to any number/OTP/mail/SMM provider**.
Every one of those operations is fulfilled by calling the mother site's own
public API (`/api/v1/...`) with one admin-configured API key.

```
Browser (this site)
   ↓
This site's own Supabase (your users, wallets, admin, SMM catalog, coupons…)
   ↓
This site's serverless functions (/api/np, /api/smm, /api/admin …)
   ↓  (Authorization: Bearer <your Mother API key>)
Mother site  →  /api/v1/services, /request_number, /check_otp,
                /mail/generate, /smm/order, …
```

Your users never see or touch the mother site — they only ever interact
with your branded site, your wallet, your prices.

## 1. Set up your own Supabase project

1. Create a fresh project at supabase.com (do **not** reuse the mother
   site's project — this site needs its own users/wallets/admin).
2. SQL Editor → paste and run `supabase_schema.sql` from this repo.
3. Project Settings → API → copy the Project URL, `anon` key, and
   `service_role` key into your `.env` (see `.env.example`).

## 2. Get an API key from the mother site

On the **mother site**, log in and go to its "API Keys" page → create a
key (`nma_live_...`). This is the single key your child site will use to
fulfill every order — keep it secret, it's only ever read server-side.

## 3. Configure and deploy

1. `npm install`
2. Fill in `.env` (Supabase values are required; the Mother API values can
   be left blank here and set later from the admin panel instead).
3. Deploy to Vercel or Netlify (both configs are included —
   `vercel.json` / `netlify.toml`). Add the same env vars in your host's
   dashboard.
4. Sign up on your deployed site, then in Supabase SQL Editor run:
   ```sql
   update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
   ```
5. Log in, go to **Admin → Settings → Site & API**, and set:
   - Site name / logo (your branding)
   - **Mother API key** + **Mother API base URL**
   - Pricing, wallet, referral, withdrawal settings

## 4. Add SMM services (optional)

Go to the mother site's SMM catalog (or ask them for their service list),
note each **Service ID**, then in **Admin → SMM Services** on this site add
your own title/price and paste in the matching `mother_service_id`. Orders
you take get forwarded to the mother site using that ID.

## What's included (Phase 1)

- Auth (Supabase), wallet, wallet top-up with screenshot review (+ optional
  AI verification, same as the mother site)
- Buy numbers across servers 1–4, live OTP polling, release/refund on
  expiry — all fulfilled via the mother's `/api/v1` endpoints
- Disposable temp-mail inboxes (via mother's `/api/v1/mail/*`)
- SMM ordering with your own markup, forwarded to the mother's
  `/api/v1/smm/order`
- Referrals, coupons, withdrawals, admin dashboard/user management/audit
  log — all local to this site, unchanged from the mother site's design
- This site's own future public API key management (`api_keys` table) is
  scaffolded but this site doesn't expose its own `/api/v1` yet — see below

## What's intentionally left out

- **Live OTP feed / Live Access pages** — these showed the mother site's
  raw provider firehose, which the mother's public API doesn't expose to
  API-key holders, so there's nothing to show here. The regular "buy a
  number" flow works the same without them.
- **This site's own public `/api/v1`** for a *third-party* reseller of
  *this* site — the scaffolding (`api_keys` table, key generation) is in
  place, but the actual endpoint isn't built yet. Say the word and it's a
  quick follow-up.
- **SMM order auto-sync** — order status shown here reflects what the
  mother site returned when the order was placed; there's no polling job
  yet to keep it updated if it changes on their end afterward.

---
Created by Mr. Arslan.
