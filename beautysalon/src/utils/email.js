// src/utils/email.js
export function buildConfirmationEmail({ to, salonName = "Beauty Salon", salonPhone = "+961 70 000 000", salonAddress = "Hamra, Beirut", whenLabel, serviceName, staffName }) {
    const subject = `${salonName} – Your appointment on ${whenLabel}`;
    const lines = [
        `Hi${to ? "" : ""},`,
        ``,
        `This is your booking confirmation at ${salonName}.`,
        serviceName ? `Service: ${serviceName}` : null,
        staffName ? `Staff: ${staffName}` : null,
        `When: ${whenLabel}`,
        ``,
        `Location: ${salonAddress}`,
        `Phone: ${salonPhone}`,
        ``,
        `Need to reschedule? Just reply to this email.`,
        ``,
        `See you soon,`,
        `${salonName}`,
    ].filter(Boolean);

    const body = lines.join("\n");
    const addr = encodeURIComponent(to || "");
    const sub = encodeURIComponent(subject);
    const bdy = encodeURIComponent(body);
    return `mailto:${addr}?subject=${sub}&body=${bdy}`;
}