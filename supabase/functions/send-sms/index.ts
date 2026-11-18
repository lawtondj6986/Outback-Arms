// =====================================================================
// Supabase Edge Function: send-sms
// Texts an SMS alert to the shop's opted-in SMS subscribers via Twilio.
// Only STAFF (profiles.is_staff = true) can call it — verified server-side
// from the caller's Supabase session, so customers can never blast the list.
//
// Called from Admin ▸ Campaigns ▸ "Send an SMS Alert":
//   sb.functions.invoke('send-sms', { body: { message, testPhone } })
//
// Deploy: Dashboard ▸ Edge Functions ▸ send-sms ▸ paste ▸ Deploy
//   (or CLI:  supabase functions deploy send-sms)
//
// Secrets (Edge Functions ▸ Manage secrets):
//   TWILIO_ACCOUNT_SID   required
//   TWILIO_AUTH_TOKEN    required
//   TWILIO_FROM          required — your Twilio number, e.g. +17815550123
//   SMS_STOP_FOOTER      optional — default " Reply STOP to opt out."
// SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY are injected by the runtime.
//
// ⚠️ US carriers will NOT deliver business SMS until you register an
//    A2P 10DLC brand + campaign in Twilio. See deploy/SMS-SETUP.md.
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// US-centric E.164 normalizer. Returns null if it can't make a valid number.
function toE164(raw: string): string | null {
  let d = String(raw || "").trim().replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return /^\+\d{8,15}$/.test(d) ? d : null;
  d = d.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const FROM = Deno.env.get("TWILIO_FROM");
  const FOOTER = Deno.env.get("SMS_STOP_FOOTER") ?? " Reply STOP to opt out.";

  // ---- Auth: caller must be a signed-in STAFF user ----
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "missing auth" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ error: "invalid session" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: prof } = await admin.from("profiles").select("is_staff").eq("id", user.id).single();
  if (!prof?.is_staff) return json({ error: "not authorized (staff only)" }, 403);

  if (!SID || !TOKEN || !FROM)
    return json({ error: "Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }
  let message = (body.message ?? "").toString().trim();
  const testPhone = (body.testPhone ?? "").toString().trim();
  if (!message) return json({ error: "message required" }, 400);
  if (message.length > 320) return json({ error: "message too long (max 320)" }, 400);
  // append opt-out footer unless the author already wrote STOP language
  if (!/\bSTOP\b/i.test(message)) message = message + FOOTER;

  // ---- Recipients: ONLY opted-in SMS subscribers (type sms_signup) ----
  // Item-specific holds/restocks are intentionally excluded from broadcasts —
  // those customers consented to one item's updates, not marketing blasts.
  let numbers: string[] = [];
  if (testPhone) {
    const e = toE164(testPhone);
    if (!e) return json({ error: "invalid test phone" }, 400);
    numbers = [e];
  } else {
    const { data: rows, error } = await admin.from("leads").select("payload").eq("type", "sms_signup");
    if (error) return json({ error: "recipient query failed: " + error.message }, 500);
    const set = new Set<string>();
    for (const r of rows ?? []) {
      const p = (r as any).payload || {};
      const e = toE164(p.smsPhone || p.phone || p.inPhone || "");
      if (e) set.add(e);
    }
    numbers = [...set];
  }
  if (!numbers.length) return json({ ok: true, recipients: 0, sent: 0, note: "no SMS subscribers yet" });

  // ---- Send via Twilio (one request per number) ----
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
  const authB64 = btoa(`${SID}:${TOKEN}`);
  let sent = 0;
  const errors: string[] = [];
  for (const to of numbers) {
    try {
      const form = new URLSearchParams({ To: to, From: FROM, Body: message });
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Basic ${authB64}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      if (r.ok) sent++;
      else errors.push(`${to}: ${r.status} ${(await r.text()).slice(0, 160)}`);
    } catch (e) {
      errors.push(`${to}: ${e}`);
    }
  }
  return json({ ok: errors.length === 0, recipients: numbers.length, sent, test: !!testPhone, errors: errors.slice(0, 20) });
});
