# Outback Arms v3 — Compliance & Legal Checklist

> **Not legal advice.** This is a build-side checklist to hand your attorney
> and to keep the site defensible. Firearms retail sits under overlapping
> federal, Massachusetts, marketing (TCPA/CAN-SPAM), and privacy law. Have
> counsel review before launch, and again whenever the law changes.

## Already handled in the build
- **Age gate / eligibility:** every lead + signup form has a required "I am
  21+ and legally permitted…" checkbox; forms won't submit without it.
- **SMS consent (TCPA):** opt-in is explicit and unchecked-by-default where
  it should be, with "Msg & data rates may apply," "Reply STOP to cancel,"
  "Reply HELP for help," and stated frequency (~4/mo).
- **Email (CAN-SPAM):** consent checkbox + "unsubscribe anytime"; the sample
  email footer includes physical address + unsubscribe/manage links.
- **Lead privacy:** with Supabase, the `leads` table is **staff-read-only**
  via Row Level Security — visitor contact info is never publicly queryable.
- **Analytics:** GA4 is off until you add an ID and honors Do-Not-Track.
- **MA guidance:** the Buyer's Guide + FAQ frame everything as "plain-English
  overview, not legal advice," and point to a phone call for specifics.
- **No online firearm sales/checkout:** the site captures *holds and leads*
  only — transfers/background checks happen in-store, as required.

## Have your attorney review / you must provide
1. **Real policy pages** — replace the placeholder `#` links in the footer:
   - Privacy Policy (what you collect, Supabase/analytics processors, retention)
   - Terms of Service
   - SMS Terms (program name, frequency, opt-out, carrier disclaimer)
   - Returns / Firearms Sale Policy (all sales subject to background check;
     firearms generally non-returnable)
2. **FFL details** — confirm the license number shown to customers is correct
   or masked appropriately; keep A&D records off the public site.
3. **MA roster & storage** — verify "MA-compliant roster" claims and the
   safe-storage / trigger-lock language against current MGL c.140 requirements.
4. **Safety class claims** — confirm "Mass-approved" certification wording and
   the LTC/FID application process description with your certifying authority.
5. **Advertising rules** — some platforms/states restrict firearm ad content;
   review promo copy ("Wacky Wednesday," discounts) for your ad channels.
6. **Data processing agreements** — sign DPAs with Supabase and any ESP/SMS
   provider (Klaviyo/Twilio); confirm they meet your privacy commitments.
7. **Cookie/consent banner** — if you enable analytics or ads and serve
   visitors subject to GDPR/CCPA, add a consent banner and wire `track()` to
   respect the choice (the single `track()` gate makes this a one-spot change).
8. **Accessibility** — the build targets WCAG 2.1 AA; a formal audit is
   recommended for ADA risk reduction.

## Recommended pre-launch sign-off
- [ ] Attorney reviewed all policy pages + SMS/email consent flows
- [ ] FFL compliance officer reviewed on-page legal claims
- [ ] Real Privacy/Terms/SMS/Returns pages published and linked
- [ ] DPAs signed with all data processors
- [ ] Test STOP/HELP keywords with your SMS provider
- [ ] Confirm no PII is logged to analytics event params
