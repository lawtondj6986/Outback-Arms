# Outback Arms v3 — Deploy & Performance Guide

The site is a single self-contained `OutbackArms-v3.html`. Rename it to
`index.html` and drop the whole folder on any static host.

## 1. Fastest path (no backend)
1. Rename `OutbackArms-v3.html` → `index.html`.
2. Drag the folder into **Netlify Drop** (app.netlify.com/drop) or run `vercel`.
3. Done. It runs in localStorage demo mode until you add Supabase keys.

Included host configs: `netlify.toml` and `vercel.json` (security headers +
cache rules: HTML never cached, images/CSS/JS cached 1 year).
Also included: `robots.txt`, `sitemap.xml` (update the domain).

## 2. Turn on the backend (Supabase — Step 2)
1. supabase.com → new project → copy Project URL + anon key.
2. Paste into `SUPABASE_URL` / `SUPABASE_ANON_KEY` near the top of the script.
3. Run `supabase-schema.sql` in the SQL editor (tables + RLS + seed + leads).
4. Auth ▸ Users ▸ add a staff email/password (replaces admin/outback2026).
5. (Optional) create a public Storage bucket `product-photos` for uploads.

## 3. Analytics (Step 4)
- Set `GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'` in the script. It stays dormant
  when blank and honors Do-Not-Track.
- Events already wired: `view_item`, `add_to_wishlist`, `hold_start`,
  `generate_lead`, `filter_products`, `trade_estimate`. Mark `generate_lead`
  and `hold_start` as **conversions** in GA4.
- Prefer privacy-first? Swap the body of `track()` for Plausible/Fathom —
  one function, one line (commented in place).

## 4. Lead delivery (Step 3)
- With Supabase: leads land in the `leads` table (staff-read-only via RLS).
  View them in the Table editor, or build a simple staff inbox later.
- Without Supabase: set `LEAD_WEBHOOK` to a Formspree/Zapier/Make URL.
- Spam is blocked by a honeypot + 1.5s min fill-time (no CAPTCHA needed).
  To add reCAPTCHA v3, see the note beside `submitLead()`.

## 5. Performance notes
- Product images are `loading="lazy"` + `decoding="async"`; the hero image is
  `fetchpriority="high"`. Aspect-ratios are locked to avoid layout shift.
- Fonts already load **non-render-blocking** (preload + `media="print"`
  swap, with a `<noscript>` fallback), and body text falls back to system
  fonts instantly — so text paints immediately.
- **Optional last mile — self-host the fonts** (removes the Google Fonts
  request entirely):
  1. Download Oswald (500/600/700) + Inter (400/500/600/700) as `woff2`.
  2. Drop them in `/fonts` and replace the three font `<link>` tags with local
     `@font-face` rules using `font-display: swap`.
- Everything else is inline in one file → 1 HTML request + fonts + images.
  Expect 95+ Lighthouse once real images are sized (and ~100 once fonts are
  self-hosted).

## 6. Custom domain + SEO
- Point `www.outbackarms.com` at your host; enable HTTPS (automatic on
  Netlify/Vercel).
- Update the domain in `sitemap.xml`, `robots.txt`, and the `<link rel=canonical>`
  / `og:url` / structured-data URLs in the HTML.
- Submit the sitemap in Google Search Console and link your Google Business
  Profile (the LocalBusiness/GunStore schema is already in the `<head>`).
