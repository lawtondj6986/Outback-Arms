# 🚀 Getting Your Website Online — Plain-English Guide

No coding needed. Pick **one** host below and click the button. Both are free
to start and both auto-update every time the site changes. If you're not sure,
**use Vercel** (top option).

---

## Option A — Vercel (recommended)

**1. Click this button:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lawtondj6986/Outback-Arms)

**2.** Sign in with your **GitHub** account (the same one that owns the repo).

**3.** It will show the **Outback-Arms** project. Just click **Deploy** —
don't change any settings.

**4.** Wait ~30 seconds. You'll get a live web address like
`outback-arms.vercel.app`. **That's your website. It's live.** 🎉

**5. Automatic updates:** From now on, any change saved to the site updates the
live site by itself, usually within a minute. You never repeat these steps.

---

## Option B — Netlify

**1. Click this button:**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/lawtondj6986/Outback-Arms)

**2.** Sign in with **GitHub**, then click **Save & Deploy** (don't change
settings).

**3.** You'll get an address like `outback-arms.netlify.app`. Live! Same deal —
it auto-updates on every change.

---

## After it's live — 3 quick checks

1. **Open your new web address on your phone.** It should look sharp and load fast.
2. **Scroll to the "Admin" section**, click into it, and sign in with the
   **staff email + password** you created in Supabase. Add a test product —
   it should appear on the storefront and stay there (it's saved in your
   database). Delete it after.
3. **Try the "Get in Touch" form.** Submissions land in your Supabase
   **`leads`** table (Supabase dashboard ▸ Table Editor ▸ leads).

---

## Getting your own domain (e.g. outbackarms.com)

Once you've bought a domain (GoDaddy, Namecheap, Google Domains, etc.):

- **Vercel:** Project ▸ **Settings ▸ Domains ▸ Add** → type your domain →
  follow the two DNS lines it gives you.
- **Netlify:** Site ▸ **Domain management ▸ Add a domain** → same idea.

Both give you free HTTPS (the padlock) automatically. Then update the web
address in `sitemap.xml`, `robots.txt`, and the `<link rel="canonical">` line
near the top of `index.html` (or ask me and I'll do it).

---

## Common questions

**Do I have to pay?** No — the free tier is plenty for a shop website. You only
pay if you want extras or huge traffic.

**Which one should I keep?** Either is great. Pick one and stick with it — no
need to run both.

**Something looks wrong / I'm stuck.** Send me the web address and a screenshot
and I'll sort it out.

---

### For a developer (optional, ignore if that's not you)
The `.github/workflows/` folder has ready-made CI deploy jobs for both hosts.
They stay dormant (green, skipped) until you add the matching secrets under
**Settings ▸ Secrets and variables ▸ Actions**. See the top of each YAML file.
For most owners, the one-click buttons above are simpler and already
auto-deploy — you don't need these.
