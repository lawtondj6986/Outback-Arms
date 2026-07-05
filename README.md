# Outback Arms — Retail Website

Conversion-optimized, single-file storefront for Outback Arms, a family-run
FFL gun shop in Plympton, MA. Dark tactical design, mobile-first, with a live
inventory admin, customer portal, lead capture, and Supabase backend.

## 🚀 Put it online (1 click)

New here? Read **[GO-LIVE.md](GO-LIVE.md)** — a plain-English, no-code guide.
Or just click a button below, sign in with GitHub, and hit **Deploy**:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lawtondj6986/Outback-Arms) &nbsp;
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/lawtondj6986/Outback-Arms)

Both are free, auto-deploy on every push, and give free HTTPS. Pick one.

## Contents

| File | Purpose |
|------|---------|
| `index.html` | The entire site — self-contained (HTML + CSS + JS in one file) |
| `supabase-schema.sql` | Run in the Supabase SQL editor: `products`, `wishlists`, `leads`, `orders` tables + RLS + Storage bucket + seed data |
| `supabase/functions/notify-lead/` | Edge Function that emails/texts staff on each new lead |
| `NOTIFICATIONS.md` | How to turn on new-lead alerts (no-code or Edge Function) |
| `GO-LIVE.md` | Plain-English, no-code hosting guide |
| `DEPLOY.md` | Deploy, backend, analytics, and performance guide |
| `COMPLIANCE.md` | Legal/compliance checklist for attorney review |
| `netlify.toml` / `vercel.json` | Host configs (security headers + cache rules) |
| `robots.txt` / `sitemap.xml` | SEO (update the domain before launch) |
| `og-image.png` | 1200×630 social share image |

## Admin console

Sign into the **Admin** section (staff email/password from Supabase Auth, or
`admin` / `outback2026` in demo mode) for:
**Inventory** (CRUD + photo upload to Storage) · **Leads inbox** (form
submissions) · **Orders** (holds → pickup → shipped tracking) · **Site
settings** · Inventory-value KPI.

> **After pulling updates, re-run `supabase-schema.sql`** — it's guarded, so
> re-running is safe and adds any new tables/buckets (e.g. `orders`,
> `product-photos`). Then optionally set up alerts via `NOTIFICATIONS.md`.

## Backend

Wired to Supabase (project `iqtsmhcyfaohkmwduamf`). Keys live at the top of the
script in `index.html`:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — the anon key is **public and safe**
  to commit; data is protected by Row-Level-Security policies in the schema.
- If the keys are blank or the DB is unreachable, the site automatically runs
  in a localStorage demo mode — nothing breaks.

### First-time setup
1. In Supabase, open the SQL editor and run `supabase-schema.sql`.
2. Create a staff login in **Authentication ▸ Users** (email + password).
   That replaces the demo `admin` / `outback2026` login.
3. (Optional) create a public Storage bucket `product-photos` for uploads.
4. (Optional) set `GA_MEASUREMENT_ID` in the script to enable GA4 analytics.

## Local preview
Open `index.html` in any browser. No build step, no dependencies to install.

## Deploy
Connect this repo to Netlify or Vercel (configs included) and set the publish
directory to the repo root. See `DEPLOY.md` for details.

## Admin (demo)
Scroll to the **Admin** section. Demo login: `admin` / `outback2026`
(disabled once a real Supabase staff user exists).
