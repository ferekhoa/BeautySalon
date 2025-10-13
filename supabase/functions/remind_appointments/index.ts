

// supabase/functions/remind_appointments/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const REMINDER_FROM = Deno.env.get("REMINDER_FROM") ?? "reminders@yourdomain.com";
const SALON_NAME = Deno.env.get("SALON_NAME") ?? "Beauty Salon";
const SALON_PHONE = Deno.env.get("SALON_PHONE") ?? "+961 70 000 000";
const SALON_ADDRESS = Deno.env.get("SALON_ADDRESS") ?? "Hamra, Beirut";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type Appointment = {
  id: string;
  staff_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  status: "booked" | "done" | "no_show" | "cancelled";
  created_at: string; // added by migration
};

// Minimal staff lookup to show the name in the email (optional)
type Staff = {
  id: string;
  full_name: string;
};

async function sendResendEmail(to: string, subject: string, html: string, text?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: REMINDER_FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }
}

function fmtDateTime(dt: Date) {
  // Example: Mon, Oct 13 at 15:30
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

serve(async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

  // Pull candidate appointments in the 1-hour window.
  const { data: appts, error } = await supabase
    .from("appointments")
    .select("id, staff_id, customer_name, customer_email, starts_at, ends_at, status, created_at")
    .eq("status", "booked")
    .is("reminder_email_sent_at", null)
    .gte("starts_at", windowStart.toISOString())
    .lt("starts_at", windowEnd.toISOString());

  if (error) {
    console.error("Query error:", error);
    return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
  }

  if (!appts || appts.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }));
  }

  // Fetch staff names to include in the email
  const staffIds = Array.from(new Set(appts.map(a => a.staff_id).filter(Boolean))) as string[];
  let staffMap = new Map<string, string>();
  if (staffIds.length) {
    const { data: staffRows } = await supabase
      .from("staff")
      .select("id, full_name")
      .in("id", staffIds);
    (staffRows || []).forEach((s: Staff) => staffMap.set(s.id, s.full_name));
  }

  let sent = 0;
  for (const a of appts as Appointment[]) {
    try {
      if (!a.customer_email) continue;

      // Enforce “booked at least 2 hours ahead of start”
      const createdAt = new Date(a.created_at);
      const startsAt = new Date(a.starts_at);
      const bookedLeadMs = startsAt.getTime() - createdAt.getTime();
      if (bookedLeadMs < 2 * 60 * 60 * 1000) {
        // Skip: the booking was made < 2h before start
        continue;
      }

      const staffName = (a.staff_id && staffMap.get(a.staff_id)) || "our specialist";

      const startStr = fmtDateTime(new Date(a.starts_at));
      const endStr = new Date(a.ends_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

      const subj = `Reminder: your appointment at ${SALON_NAME} in 1 hour`;
      const html = `
        <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height:1.5;">
          <h2 style="margin:0 0 8px 0;">See you soon!</h2>
          <p style="margin:0 0 12px 0;">This is a friendly reminder that your appointment is in <b>1 hour</b>.</p>
          <div style="padding:12px 14px;border:1px solid #eee;border-radius:12px;">
            <div><b>When:</b> ${startStr} – ${endStr}</div>
            <div><b>With:</b> ${staffName}</div>
            <div><b>Where:</b> ${SALON_NAME}, ${SALON_ADDRESS} • ${SALON_PHONE}</div>
          </div>
          <p style="font-size:12px;color:#666;margin-top:12px;">
            If you can’t make it, please reply to this email or call us at ${SALON_PHONE}.
          </p>
        </div>
      `;
      const text = `Reminder: your appointment at ${SALON_NAME} is in 1 hour.
When: ${startStr} – ${endStr}
With: ${staffName}
Where: ${SALON_NAME}, ${SALON_ADDRESS} • ${SALON_PHONE}`;

      await sendResendEmail(a.customer_email, subj, html, text);

      // mark as sent
      const { error: updErr } = await supabase
        .from("appointments")
        .update({ reminder_email_sent_at: new Date().toISOString() })
        .eq("id", a.id);
      if (updErr) throw updErr;

      sent++;
    } catch (e) {
      console.error(`Failed to process appointment ${a.id}:`, e);
      // (Optional) Write to a logs table
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }));
});
