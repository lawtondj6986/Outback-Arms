// =====================================================================
// Supabase Edge Function: notify-lead
// Emails staff (via Resend) and optionally texts them (via Twilio) the
// instant a new row is inserted into public.leads. Trigger it with a
// Database Webhook on the leads table (see NOTIFICATIONS.md).
//
// Deploy:
//   supabase functions deploy notify-lead --no-verify-jwt
// Required secrets (email):
//   supabase secrets set RESEND_API_KEY=re_xxx ALERT_EMAIL_TO=you@shop.com
// Optional secrets:
//   ALERT_EMAIL_FROM   (defaults to Resend's onboarding sender)
//   WEBHOOK_SECRET     (require an x-webhook-secret header)
//   TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_FROM ALERT_SMS_TO  (SMS)
// =====================================================================

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// Pull a readable contact out of the free-form lead payload.
function contactFrom(p: Record<string, any> = {}) {
  const name = [p.inFirst, p.inLast].filter(Boolean).join(" ") || p.hName || p.cName || p.name || "Unknown";
  const email = p.inEmail || p.cEmail || p.emEmail || p.email || "";
  const phone = p.inPhone || p.hPhone || p.smsPhone || p.phone || "";
  return { name, email, phone };
}
function summaryFrom(type: string, p: Record<string, any> = {}) {
  switch (type) {
    case "hold": return `Hold request: ${p.item ?? "—"}`;
    case "inquiry": return `${p.inNeed ?? "Inquiry"}${p.inDetails ? " — " + p.inDetails : ""}`;
    case "class_signup": return `Class signup${p.cDate ? " for " + p.cDate : ""}`;
    case "sms_signup": return `SMS opt-in${p.smsZip ? " (ZIP " + p.smsZip + ")" : ""}`;
    case "email_signup":
    case "newsletter": return "Email / newsletter opt-in";
    default: return type;
  }
}
const esc = (s: string) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Optional shared-secret gate (set WEBHOOK_SECRET + send it as x-webhook-secret)
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-webhook-secret") !== secret) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }

  // Database Webhooks wrap the row in { type, table, record, ... }
  const lead = body?.record ?? body ?? {};
  const type: string = lead.type ?? "lead";
  const payload = lead.payload ?? {};
  const { name, email, phone } = contactFrom(payload);
  const summary = summaryFrom(type, payload);
  const when = lead.created_at ?? new Date().toISOString();

  const subject = `🎯 New ${type.replace("_", " ")} lead — ${name}`;
  const text = [
    `New website lead: ${type}`,
    `Name: ${name}`,
    email ? `Email: ${email}` : "",
    phone ? `Phone: ${phone}` : "",
    `Details: ${summary}`,
    Array.isArray(payload.interests) ? `Interested in: ${payload.interests.join(", ")}` : "",
    ``,
    `Received: ${when}`,
    `Manage it in the admin Leads inbox.`,
  ].filter(Boolean).join("\n");

  const results: Record<string, unknown> = {};

  // ---- Email via Resend ----
  const RESEND = Deno.env.get("RESEND_API_KEY");
  const TO = Deno.env.get("ALERT_EMAIL_TO");
  const FROM = Deno.env.get("ALERT_EMAIL_FROM") ?? "Outback Arms <onboarding@resend.dev>";
  if (RESEND && TO) {
    const html =
      `<h2 style="font-family:sans-serif;margin:0 0 12px">New ${esc(type.replace("_", " "))} lead</h2>` +
      `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">` +
      `<tr><td style="padding:2px 10px 2px 0"><b>Name</b></td><td>${esc(name)}</td></tr>` +
      (email ? `<tr><td style="padding:2px 10px 2px 0"><b>Email</b></td><td>${esc(email)}</td></tr>` : "") +
      (phone ? `<tr><td style="padding:2px 10px 2px 0"><b>Phone</b></td><td>${esc(phone)}</td></tr>` : "") +
      `<tr><td style="padding:2px 10px 2px 0" valign="top"><b>Details</b></td><td>${esc(summary)}</td></tr>` +
      `</table>` +
      `<p style="font-family:sans-serif;color:#888;font-size:12px;margin-top:14px">Received ${esc(when)}. Manage it in the admin Leads inbox.</p>`;
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: TO.split(",").map((s) => s.trim()), subject, text, html }),
      });
      results.email = r.ok ? "sent" : `error ${r.status}: ${await r.text()}`;
    } catch (e) { results.email = `error ${e}`; }
  } else {
    results.email = "skipped (set RESEND_API_KEY + ALERT_EMAIL_TO)";
  }

  // ---- SMS via Twilio (optional) ----
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const SMS_FROM = Deno.env.get("TWILIO_FROM");
  const SMS_TO = Deno.env.get("ALERT_SMS_TO");
  if (SID && TOKEN && SMS_FROM && SMS_TO) {
    try {
      const form = new URLSearchParams({
        To: SMS_TO, From: SMS_FROM,
        Body: `New ${type} lead: ${name}${phone ? " " + phone : email ? " " + email : ""}`,
      });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(`${SID}:${TOKEN}`), "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      results.sms = r.ok ? "sent" : `error ${r.status}`;
    } catch (e) { results.sms = `error ${e}`; }
  } else {
    results.sms = "skipped (optional Twilio env not set)";
  }

  return json({ ok: true, lead: type, ...results });
});
