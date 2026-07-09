// =====================================================================
// Supabase Edge Function: send-campaign
// Sends an email campaign to the shop's opted-in subscribers via Resend.
// Only STAFF (profiles.is_staff = true) can call it — verified server-side
// from the caller's Supabase session, so customers can never blast the list.
//
// Called from the admin Campaigns tab:  sb.functions.invoke('send-campaign', {...})
//
// Deploy (Dashboard ▸ Edge Functions ▸ send-campaign ▸ paste ▸ Deploy),
//   or CLI:  supabase functions deploy send-campaign
// Uses secrets you already set for notify-lead:
//   RESEND_API_KEY   (required)
// Optional:
//   CAMPAIGN_FROM    e.g. "Outback Arms <deals@outbackarms.com>"
//                    (REQUIRED to email anyone other than your own Resend
//                     account address — needs a verified domain in Resend)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by the Supabase runtime.
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (s: string) =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

// Wrap the staff-written plain-text body in a branded, inbox-safe HTML shell.
function emailHtml(subject: string, bodyText: string, preheader: string) {
  const paras = String(bodyText)
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#2a2a2a;font-size:15px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader || "")}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6e1d8">
      <tr><td style="background:#0d0e0f;padding:22px 28px">
        <span style="font-weight:bold;font-size:22px;color:#fff;letter-spacing:1px">OUTBACK <span style="color:#ef6c1f">ARMS</span></span>
        <div style="color:#a8a69c;font-size:11px;letter-spacing:2px;margin-top:5px">376 MAIN ST · PLYMPTON, MASSACHUSETTS</div>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="font-size:21px;color:#141414;margin:0 0 16px">${esc(subject)}</h1>
        ${paras}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#f4f1ea;color:#8a8a8a;font-size:12px;line-height:1.6;border-top:1px solid #e6e1d8">
        Outback Arms · 376 Main St, Plympton MA 02367 · 781-585-6615<br>
        You're receiving this because you opted in at outbackarms.com.
        <a href="mailto:deals@outbackarms.com?subject=Unsubscribe" style="color:#8a8a8a">Unsubscribe</a>.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND = Deno.env.get("RESEND_API_KEY");
  const FROM = Deno.env.get("CAMPAIGN_FROM") ?? Deno.env.get("ALERT_EMAIL_FROM") ?? "Outback Arms <onboarding@resend.dev>";

  // ---- Auth: caller must be a signed-in STAFF user ----
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "missing auth" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ error: "invalid session" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: prof } = await admin.from("profiles").select("is_staff").eq("id", user.id).single();
  if (!prof?.is_staff) return json({ error: "not authorized (staff only)" }, 403);

  if (!RESEND) return json({ error: "RESEND_API_KEY not set" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }
  const subject = (body.subject ?? "").toString().trim();
  const text = (body.body ?? "").toString();
  const preheader = (body.preheader ?? "").toString();
  const testEmail = (body.testEmail ?? "").toString().trim().toLowerCase();
  if (!subject) return json({ error: "subject required" }, 400);
  if (!text.trim()) return json({ error: "body required" }, 400);

  const html = emailHtml(subject, text, preheader);

  // ---- Recipients ----
  let recipients: string[] = [];
  if (testEmail) {
    recipients = [testEmail];
  } else {
    const { data: rows, error } = await admin
      .from("leads")
      .select("payload")
      .in("type", ["newsletter", "email_signup"]);
    if (error) return json({ error: "recipient query failed: " + error.message }, 500);
    const set = new Set<string>();
    for (const r of rows ?? []) {
      const p = (r as any).payload || {};
      const e = (p.emEmail || p.email || p.inEmail || p.cEmail || "").toString().trim().toLowerCase();
      if (e && /.+@.+\..+/.test(e)) set.add(e);
    }
    recipients = [...set];
  }
  if (!recipients.length) return json({ ok: true, recipients: 0, sent: 0, note: "no subscribers yet" });

  // ---- Send via Resend (one individual email per recipient, batches of 100) ----
  const finalSubject = testEmail ? `[TEST] ${subject}` : subject;
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const batch = chunk.map((to) => ({ from: FROM, to: [to], subject: finalSubject, html }));
    try {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (r.ok) sent += chunk.length;
      else errors.push(`batch@${i}: ${r.status} ${await r.text()}`);
    } catch (e) {
      errors.push(`batch@${i}: ${e}`);
    }
  }

  return json({ ok: errors.length === 0, recipients: recipients.length, sent, test: !!testEmail, errors });
});
