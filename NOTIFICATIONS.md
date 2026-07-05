# 🔔 Get alerted the moment a lead comes in

When someone requests a hold, asks a question, or signs up, you want to know
**now** — not next time you log in. Pick one path.

---

## Path A — No-code (easiest, ~5 min) ✅ recommended for most owners

Uses Supabase's built-in **Database Webhook** + a free automation tool
(Zapier, Make, or n8n) to email/text you. No coding, no deploys.

1. In Supabase: **Database ▸ Webhooks ▸ Enable webhooks**, then **Create a new hook**.
   - Table: **`leads`**, Events: **Insert**
   - Type: **HTTP Request**, Method: **POST**
2. In **Zapier** (or Make): create a Zap with a **"Webhooks by Zapier → Catch Hook"**
   trigger. It gives you a URL.
3. Paste that URL into the Supabase webhook's **URL** field and save.
4. In Zapier, add a second step: **Email** (or **SMS** / **Gmail** / your choice)
   and map the lead fields (`record.type`, `record.payload`) into the message.
5. Submit a test form on your site → you get an alert. Done.

---

## Path B — Supabase Edge Function (free, self-contained, a bit technical)

Sends the email itself via **Resend** (free tier) and optional **SMS** via
Twilio. The function is already written for you at
`supabase/functions/notify-lead/`. You'll need the **Supabase CLI** once.

### 1. Install the CLI & link your project
```bash
npm i -g supabase           # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref iqtsmhcyfaohkmwduamf
```

### 2. Add your email sender
- Create a free account at **resend.com**, verify a sending domain (or use their
  test sender), and copy an **API key**.
```bash
supabase secrets set RESEND_API_KEY=re_your_key ALERT_EMAIL_TO=you@outbackarms.com
# optional nicer "from" once your domain is verified in Resend:
supabase secrets set ALERT_EMAIL_FROM="Outback Arms <alerts@outbackarms.com>"
# optional: require a shared secret on the webhook
supabase secrets set WEBHOOK_SECRET=some-long-random-string
```

### 3. (Optional) Add SMS via Twilio
```bash
supabase secrets set TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... \
                     TWILIO_FROM=+1XXXXXXXXXX ALERT_SMS_TO=+1YYYYYYYYYY
```

### 4. Deploy the function
```bash
supabase functions deploy notify-lead --no-verify-jwt
```
Your function URL is:
`https://iqtsmhcyfaohkmwduamf.functions.supabase.co/notify-lead`

### 5. Fire it on every new lead (Database Webhook)
In Supabase: **Database ▸ Webhooks ▸ Create a new hook**
- Table: **`leads`**, Events: **Insert**
- Type: **Supabase Edge Functions**, choose **notify-lead**
- If you set `WEBHOOK_SECRET`, add an HTTP header
  `x-webhook-secret: <the same value>`

### 6. Test
Submit any form on the live site (or run):
```bash
curl -X POST https://iqtsmhcyfaohkmwduamf.functions.supabase.co/notify-lead \
  -H "Content-Type: application/json" \
  -d '{"record":{"type":"hold","payload":{"item":"Sig Cross 6.5","hName":"Test","hPhone":"5085550149"},"created_at":"now"}}'
```
You should get an email within seconds. Check function logs in
**Edge Functions ▸ notify-lead ▸ Logs** if not.

---

### Which should I use?
- **Just want it working fast?** Path A (no-code).
- **Want it free & fully in-house, and comfortable with a terminal?** Path B.

Either way, leads are always saved in the `leads` table and visible in the
admin **Leads inbox** — notifications are just the extra nudge.
