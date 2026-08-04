# Outback Arms — Deployment Package

Everything needed to stand up (or re-verify) the whole site. The **front end auto-deploys** on every `git push` to `main` (Vercel → outbackarms.com). The only manual pieces are the Supabase backend and the two Edge Functions — and this folder reduces those to a single paste + two deploys.

---

## 1. Front end (already automated ✅)
`git push origin main` → Vercel builds and deploys to **outbackarms.com** automatically. Nothing else to do. The whole site is one self-contained `index.html` (plus `logo.png`, favicons, `og-image.png`, `robots.txt`, `sitemap.xml`).

## 2. Database — one paste 🎯
Open **Supabase → SQL Editor → New query**, paste **`deploy/supabase-setup.sql`** in full, and **Run**.

- It's **idempotent** — safe on a fresh project *and* safe to re-run on the live one (nothing duplicates or drops your data).
- It creates: products, wishlists, leads, orders, page_views, storage bucket, customer **profiles**, the **`is_staff()`** gate + RLS lockdown, product **specs**, the **matches** table, and **site_config** (promo bar).
- ⚠️ **Before running:** in Section 2 there's a line marking your staff account by email — default `outbackarms@yahoo.com`. Change it if your admin login differs.
- **Staff login:** create it once in **Supabase → Authentication → Users → Add user** (email + password). That account is the only one that can reach the admin console.

## 3. Edge Functions (email) — two deploys
In **Supabase → Edge Functions**, create each function, paste the code, Deploy:

| Function | File | Purpose |
|---|---|---|
| `notify-lead` | `supabase/functions/notify-lead/index.ts` | emails staff when a new lead comes in |
| `send-campaign` | `supabase/functions/send-campaign/index.ts` | sends email campaigns to subscribers |

Then set **secrets** (Edge Functions → Manage secrets):
```
RESEND_API_KEY   = re_xxxxxxxx            # required (email delivery)
ALERT_EMAIL_TO   = outbackarms@yahoo.com  # where lead alerts + reply-to go
CAMPAIGN_FROM    = Outback Arms <deals@outbackarms.com>   # after verifying the domain in Resend
```
> To send email to anyone other than your own Resend account address, verify **outbackarms.com** in Resend (Domains → Add Domain → add the DNS records at GoDaddy) and set `CAMPAIGN_FROM`.

## 4. Domain (already done ✅)
GoDaddy DNS points to Vercel (A `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`). Email/MX records untouched.

## 5. Optional
- **Analytics:** create a GA4 property, drop the `G-XXXXXXXXXX` id into `GA_MEASUREMENT_ID` in `index.html`.
- **Promo bar:** Admin → Site Settings → Promo Bar (needs the site_config table from step 2).

---

## Go-live verification checklist
- [ ] `supabase-setup.sql` ran clean (Success, no errors)
- [ ] Staff user created in Supabase Auth; admin console loads with it
- [ ] Storefront shows products; add/edit/CSV-import all save
- [ ] A hold / inquiry / restock / component-alert form creates a lead in the admin Leads inbox
- [ ] `notify-lead` + `send-campaign` deployed; "Send test to me" works (after domain verify for real sends)
- [ ] Rich Results Test (search.google.com/test/rich-results) shows Local Business + FAQ + Product, no rating warnings
- [ ] Promo bar toggles on/off from admin; match calendar + precision specs appear once data is added

## Migration files (individual, if you ever need just one)
`supabase-schema.sql` · `customer-accounts.sql` · `precision-specs.sql` · `matches.sql` · `site-config.sql` — all folded, in order, into `deploy/supabase-setup.sql`.
