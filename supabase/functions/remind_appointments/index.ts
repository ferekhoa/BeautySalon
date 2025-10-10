// Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
// optional providers
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const TWILIO_SID = Deno.env.get("TWILIO_SID") || "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") || "";
const TWILIO_FROM = Deno.env.get("TWILIO_FROM") || "";

const sb = createClient(SB_URL, SB_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TIMEZONE = "Asia/Beirut"; // show local time in messages
const WINDOW_MIN_START = 50;
const WINDOW_MIN_END = 70;


type Row = {
  id: string;
  starts_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  reminder_email_sent_at: string | null;
  reminder_sms_sent_at: string | null;
  customer: { email: string | null } | null;
  staff: { full_name: string | null } | null;
};

function fmtLocal(dtIso: string) {
  const d = new Date(dtIso);
  return d.toLocaleString("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return; // skip if not configured
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Beauty Salon <noreply@yourdomain.com>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Resend error:", t);
  }
}

async function sendSMS(to: string, body: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.warn("Twilio env missing, SMS skipped");
    return { skipped: true };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Twilio error:", payload);
    return { error: true, payload };
  }
  return { ok: true, payload };
}

// in your tasks push:
const r = await sendSMS(e164, sms);
await sb.from("appointments").update({
  reminder_sms_sent_at: r?.ok ? new Date().toISOString() : null,
  reminder_sms_sid: r?.payload?.sid ?? null,
  reminder_sms_status: r?.payload?.status ?? (r?.error ? 'error' : null),
  reminder_sms_error: r?.error ? JSON.stringify(r.payload) : null
}).eq("id", a.id);


Deno.serve(async (req) => {
  console.log("remind_appointments invoked @", new Date().toISOString());

  const now = new Date();
  const start = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 70 * 60 * 1000).toISOString();

  console.log("window UTC:", { start, end });

  const { data, error } = await sb
    .from("appointments")
    .select(`
      id, starts_at, customer_name, customer_phone, customer_email,
      reminder_email_sent_at, reminder_sms_sent_at,
      customer:customer_id(email),
      staff:staff_id(full_name)
    `)
    .eq("status", "booked")
    .gte("starts_at", start)
    .lte("starts_at", end);

  if (error) {
    console.error("query error:", error);
    return new Response("query error", { status: 500 });
  }

  console.log(`matches: ${data?.length || 0}`);
  const tasks: Promise<any>[] = [];

  (data || []).forEach((a) => {
    const emailToUse = a.customer?.email || a.customer_email || "";
    const when = fmtLocal(a.starts_at);
    const staffName = a.staff?.full_name || "our specialist";
    const custName = a.customer_name || "there";

    if (!a.reminder_email_sent_at && emailToUse) {
      console.log("email→", a.id, emailToUse);
      const html = /* same HTML */;
      tasks.push((async () => {
        await sendEmail(emailToUse, "Reminder: your appointment in 1 hour", html);
        await sb.from("appointments")
          .update({ reminder_email_sent_at: new Date().toISOString() })
          .eq("id", a.id);
      })());
    } else {
      console.log("email skip→", a.id, { already: !!a.reminder_email_sent_at, emailToUse });
    }

    if (!a.reminder_sms_sent_at && a.customer_phone) {
      console.log("sms→", a.id, a.customer_phone);
      const sms = `Beauty Salon: Reminder — your appointment with ${staffName} is in ~1 hour, at ${when}. See you soon!`;
      tasks.push((async () => {
        await sendSMS(a.customer_phone, sms);
        await sb.from("appointments")
          .update({ reminder_sms_sent_at: new Date().toISOString() })
          .eq("id", a.id);
      })());
    } else {
      console.log("sms skip→", a.id, { already: !!a.reminder_sms_sent_at, phone: a.customer_phone });
    }
  });

  await Promise.allSettled(tasks);
  console.log("done");
  return new Response("ok", { status: 200 });
});
