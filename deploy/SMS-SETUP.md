# Outback Arms — SMS Alerts Setup (Twilio + A2P 10DLC)

Your site **already collects** SMS opt-ins (the "Join SMS Alerts" form) and has a
**live sender** built in (Admin → Campaigns → "Send an SMS Alert"). It stays in
"not connected" mode until you complete the Twilio steps below.

> ⚠️ **Read this first — SMS has real legal rules.** You may only text people who
> **opted in**, every message needs **STOP/HELP** handling, and US carriers
> require **A2P 10DLC registration** before they'll deliver business texts.
> TCPA fines are **$500–$1,500 per text** for messaging people who didn't opt in.
> The build handles consent + STOP footer for you — but you must register (below).

---

## 1. Create a Twilio account + get a number
1. Sign up at **twilio.com** and add a little balance (SMS is ~$0.01–0.02/text).
2. **Phone Numbers → Buy a number** → pick a local (781/508) number with **SMS** enabled.

## 2. Register A2P 10DLC (required — do this early, it takes a few days)
In Twilio: **Messaging → Regulatory Compliance → A2P 10DLC**.
1. **Register your Brand** — your business name (Outback Arms LLC), EIN, address.
2. **Create a Campaign** — use case **"Marketing"** or **"Mixed"**. Describe it plainly,
   e.g. *"Customers opt in on our website to receive restock and new-arrival alerts."*
3. **Sample messages** — paste a couple, including the opt-out, e.g.
   *"Outback Arms: Just in — Ruger 10/22, in stock now. Reply STOP to opt out."*
4. **Opt-in description** — *"Users check a consent box and submit their mobile number
   on outbackarms.com to receive recurring marketing texts."*
5. Attach your number to the campaign.

> 💡 **Firearms note:** keep message content about the *store, stock, and events* —
> avoid graphic or prohibited wording. Carriers scrutinize firearm SMS; plain
> "new inventory / call us / stop by" messaging sails through.

## 3. Deploy the function
**Supabase → Edge Functions → Create function → `send-sms`** → paste
`supabase/functions/send-sms/index.ts` → **Deploy**.
(Or CLI: `supabase functions deploy send-sms`.)

## 4. Set the secrets
**Edge Functions → Manage secrets:**
```
TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxx      # Twilio Console dashboard
TWILIO_AUTH_TOKEN  = your_auth_token          # Twilio Console dashboard
TWILIO_FROM        = +17815550123             # the number you bought (E.164)
# optional:
SMS_STOP_FOOTER    =  Reply STOP to opt out.  # default already set
```

## 5. Test, then go live
1. Admin → **Campaigns → Send an SMS Alert** → type a short message.
2. Put **your own mobile** in the test box → **"Send test to my phone."**
3. Get the text? 🎉 Then **"Send to all SMS subscribers →"** blasts your opted-in list.

---

## Go-live checklist
- [ ] A2P brand + campaign **approved** in Twilio (status: registered)
- [ ] `send-sms` deployed; `TWILIO_*` secrets set
- [ ] Test text received on your phone
- [ ] STOP works (reply STOP → you stop getting texts; Twilio auto-handles it)
- [ ] You only ever text people who checked the opt-in box (the sender enforces this)

## How recipients are chosen (built-in compliance)
- Blasts go **only** to leads of type `sms_signup` — people who explicitly opted in.
- Per-item "Notify me" holds/restocks are **excluded** from blasts (they consented to
  one item's updates, not marketing).
- A **"Reply STOP to opt out"** footer is appended automatically unless you wrote your own.

## Grow the list (so there's someone to text)
- Print the **"Scan to review us" QR**'s cousin — a **"Text JOIN for drop alerts"** card at the register.
- Mention it at checkout: *"Want first dibs on new arrivals? Join our texts."*
- The more opted-in numbers, the more a single "Colt Python just dropped" text sells.
