// supabase/functions/send_booking_confirmation/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const REMINDER_FROM = Deno.env.get("REMINDER_FROM") ?? "Bookings <bookings@yourdomain.com>";
const SALON_NAME = Deno.env.get("SALON_NAME") ?? "Beauty Salon";
const SALON_PHONE = Deno.env.get("SALON_PHONE") ?? "+961 70 000 000";
const SALON_ADDRESS = Deno.env.get("SALON_ADDRESS") ?? "Hamra, Beirut";

type ReqBody = { appointmentId: string };

function buildWhenLabel(starts_at: string, ends_at: string) {
  const s = new Date(starts_at);
  const e = new Date(ends_at);
  const date = s.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
  const sHM = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const eHM = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} at ${sHM}–${eHM}`;
}

function emailHtml(opts: { customerName?: string; whenLabel: string; serviceName?: string; staffName?: string }) {
  const { customerName, whenLabel, serviceName, staffName } = opts;
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.5">
    <h2 style="margin:0 0 8px 0;">Your appointment is confirmed</h2>
    <p style="margin:0 0 8px 0;">${customerName ? `Hi ${customerName},` : "Hello,"}</p>
    <p style="margin:0 0 8px 0;">This is your booking confirmation at <strong>${SALON_NAME}</strong>.</p>
    <ul style="margin:0 0 12px 18px; padding:0;">
      <li><strong>When:</strong> ${whenLabel}</li>
      ${serviceName ? `<li><strong>Service:</strong> ${serviceName}</li>` : ""}
      ${staffName ? `<li><strong>Staff:</strong> ${staffName}</li>` : ""}
    </ul>
    <p style="margin:0 0 8px 0;"><strong>Location:</strong> ${SALON_ADDRESS}<br/>
       <strong>Phone:</strong> ${SALON_PHONE}</p>
    <p style="margin:12px 0 8px 0;">Need to reschedule? Just reply to this email.</p>
    <p style="margin:16px 0 0 0;">See you soon,<br/>${SALON_NAME}</p>
  </div>`;
}

function emailText(opts: { customerName?: string; whenLabel: string; serviceName?: string; staffName?: string }) {
  const { customerName, whenLabel, serviceName, staffName } = opts;
  return [
    customerName ? `Hi ${customerName},` : "Hello,",
    "",
    `This is your booking confirmation at ${SALON_NAME}.`,
    serviceName ? `Service: ${serviceName}` : undefined,
    staffName ? `Staff: ${staffName}` : undefined,
    `When: ${whenLabel}`,
    "",
    `Location: ${SALON_ADDRESS}`,
    `Phone: ${SALON_PHONE}`,
    "",
    "Need to reschedule? Just reply to this email.",
    "",
    "See you soon,",
    `${SALON_NAME}`,
  ]
    .filter(Boolean)
    .join("\n");
}

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.appointmentId) {
      return new Response(JSON.stringify({ ok: false, stage: "bad_request", error: "appointmentId required" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Load appointment
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("id, customer_email, customer_name, starts_at, ends_at, staff_id")
      .eq("id", body.appointmentId)
      .maybeSingle();

    if (apptErr) return new Response(JSON.stringify({ ok: false, stage: "load_appointment", error: apptErr.message }), { status: 500 });
    if (!appt) return new Response(JSON.stringify({ ok: false, stage: "not_found", error: "Appointment not found" }), { status: 404 });
    if (!appt.customer_email) return new Response(JSON.stringify({ ok: false, stage: "no_email", error: "No customer email" }), { status: 400 });

    // 2) Staff
    let staffName = "";
    if (appt.staff_id) {
      const { data: staff } = await supabase.from("staff").select("full_name").eq("id", appt.staff_id).maybeSingle();
      staffName = staff?.full_name ?? "";
    }

    // 3) Services (from appointment_items join)
    const { data: items } = await supabase
      .from("appointment_items")
      .select("services(name)")
      .eq("appointment_id", appt.id);
    const serviceName = (items ?? []).map((i: any) => i.services?.name).filter(Boolean).join(", ");

    // 4) Compose
    const whenLabel = buildWhenLabel(appt.starts_at, appt.ends_at);
    const subject = `${SALON_NAME} – Your appointment on ${whenLabel}`;
    const html = emailHtml({ customerName: appt.customer_name ?? "", whenLabel, serviceName, staffName });
    const text = emailText({ customerName: appt.customer_name ?? "", whenLabel, serviceName, staffName });

    // 5) Send via Resend
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: REMINDER_FROM,
        to: [appt.customer_email],
        subject,
        html,
        text,
      }),
    });

    const json = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, stage: "resend", status: resp.status, error: json }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, id: json.id }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, stage: "exception", error: String(e) }), { status: 500 });
  }
});
