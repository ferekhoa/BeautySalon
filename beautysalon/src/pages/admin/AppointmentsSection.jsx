// src/pages/admin/AppointmentsSection.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AppointmentsSection() {
    const [rows, setRows] = useState([]);
    const [staff, setStaff] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');

    async function load() {
        setLoading(true);
        const [a, b, c] = await Promise.all([
            supabase
                .from('appointments')
                .select('id,service_id,staff_id,customer_name,customer_phone,starts_at,ends_at,status,remarks,reminder_email_sent_at,reminder_sms_sent_at')
                .order('starts_at', { ascending: false })
                .limit(200),
            supabase.from('staff').select('id,full_name'),
            supabase.from('services').select('id,name'),
        ]);
        setRows(a.data || []);
        setStaff(b.data || []);
        setServices(c.data || []);
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    const filtered = useMemo(
        () => rows.filter(r => !status || r.status === status),
        [rows, status]
    );

    function nm(tbl, id) {
        return (tbl.find(x => x.id === id)?.name) || (tbl.find(x => x.id === id)?.full_name) || '—';
    }

    // Update status; when set to "cancelled", the booking UI frees the slot
    // (Book.jsx already excludes cancelled items when calculating overlaps).
    async function setRowStatus(row, newStatus) {
        const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', row.id);
        if (error) { alert(error.message); return; }

        try {
            if (newStatus === 'no_show') {
                await supabase.rpc('record_no_show', {
                    p_name: row.customer_name || '',
                    p_phone: row.customer_phone || '',
                });
            }
        } finally {
            load();
        }
    }

    function ReminderBadge({ emailAt, smsAt }) {
        const hasEmail = !!emailAt;
        const hasSms = !!smsAt;
        if (!hasEmail && !hasSms) return <span className="badge">—</span>;

        return (
            <div className="flex gap-1 flex-wrap">
                {hasEmail && (
                    <span className="badge">Email {new Date(emailAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
                {hasSms && (
                    <span className="badge">SMS {new Date(smsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
            </div>
        );
    }
    function buildWhenLabel(startsAt, endsAt) {
        const s = new Date(startsAt);
        const e = new Date(endsAt);
        const day = s.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const sHM = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const eHM = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day} at ${sHM}–${eHM}`;
    }

    function mailtoForRow(row, serviceName, staffName, opts = {}) {
        const {
            salonName = "Beauty Salon",
            salonPhone = "+961 70 000 000",
            salonAddress = "Hamra, Beirut",
            cc,
            bcc,
        } = opts;

        const whenLabel = buildWhenLabel(row.starts_at, row.ends_at);
        const subject = `${salonName} – Your appointment on ${whenLabel}`;
        const body = [
            `Hi ${row.customer_name || ''},`,
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
        ].filter(Boolean).join('\n');

        const params = new URLSearchParams();
        if (cc) params.set("cc", cc);
        if (bcc) params.set("bcc", bcc);
        params.set("subject", subject);
        params.set("body", body);

        return `mailto:${encodeURIComponent(row.customer_email || "")}?${params.toString()}`;
    }

    return (
        <section>
            {/* Filter — stacks on mobile */}
            <div className="card mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-gray-600">Filter by status</div>
                <select
                    className="border rounded-xl px-3 py-2 w-full md:w-64"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                >
                    <option value="">All</option>
                    <option value="booked">Booked</option>
                    <option value="done">Done</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {loading && <div>Loading…</div>}

            {!loading && (
                <>
                    {/* Mobile cards */}
                    <div className="md:hidden grid gap-3">
                        {filtered.map(r => (
                            <AppointmentCardMobile
                                key={r.id}
                                row={r}
                                staff={staff}
                                services={services}
                                onChangeStatus={setRowStatus}
                            />
                        ))}
                        {!filtered.length && (
                            <div className="text-sm text-gray-500 text-center py-6">No appointments.</div>
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left border-b">
                                    <th className="py-2 pr-3">When</th>
                                    <th className="py-2 pr-3">Service</th>
                                    <th className="py-2 pr-3">Staff</th>
                                    <th className="py-2 pr-3">Customer</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2 pr-3">Remarks</th>
                                    <th className="py-2 pr-3">Reminder</th>
                                    <th className="py-2 pr-3">Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr key={r.id} className="border-b">
                                        <td className="py-2 pr-3">
                                            {new Date(r.starts_at).toLocaleString()} – {new Date(r.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-2 pr-3">{nm(services, r.service_id)}</td>
                                        <td className="py-2 pr-3">{nm(staff, r.staff_id)}</td>
                                        <td className="py-2 pr-3">{r.customer_name} • {r.customer_phone}</td>
                                        <td className="py-2 pr-3">
                                            <select
                                                className="border rounded-xl px-2 py-1"
                                                value={r.status}
                                                onChange={e => setRowStatus(r, e.target.value)}
                                            >
                                                <option value="booked">Booked</option>
                                                <option value="done">Done</option>
                                                <option value="no_show">No Show</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="py-2 pr-3">{r.remarks || ''}</td>
                                        <td className="py-2 pr-3">
                                            <ReminderBadge emailAt={r.reminder_email_sent_at} smsAt={r.reminder_sms_sent_at} />
                                        </td>
                                        <td className="py-2 pr-3">
                                            {r.customer_email ? (
                                                <a
                                                    href={mailtoForRow(
                                                        r,
                                                        services.find(s => s.id === r.service_id)?.name || '',
                                                        staff.find(s => s.id === r.staff_id)?.full_name || '',
                                                        // Optional: auto-BCC the owner
                                                        { bcc: "owner@example.com" }
                                                    )}
                                                    className="link"
                                                    title="Compose confirmation email"
                                                >
                                                    Compose
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}

/** Mobile card component (no Delete button) */
function AppointmentCardMobile({ row, staff, services, onChangeStatus }) {
    const when =
        `${new Date(row.starts_at).toLocaleDateString()} • ` +
        `${new Date(row.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–` +
        `${new Date(row.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const staffName = staff.find(s => s.id === row.staff_id)?.full_name || '—';
    const serviceName = services.find(s => s.id === row.service_id)?.name || '—';

    return (
        <div className="card">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-medium">{when}</div>
                    <div className="text-xs text-gray-600">{staffName}</div>
                </div>
            </div>

            <div className="mt-2 text-sm">
                <div className="text-gray-600">{serviceName}</div>
                <div className="text-gray-800">{row.customer_name} • {row.customer_phone}</div>
                {row.remarks && <div className="text-gray-600 mt-1">“{row.remarks}”</div>}
            </div>

            <div className="mt-3">
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                    className="border rounded-xl px-3 py-2 w-full"
                    value={row.status}
                    onChange={e => onChangeStatus(row, e.target.value)}
                >
                    <option value="booked">Booked</option>
                    <option value="done">Done</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Reminder:</span>{' '}
                {row.reminder_email_sent_at || row.reminder_sms_sent_at ? (
                    <>
                        {row.reminder_email_sent_at && <>Email at {new Date(row.reminder_email_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
                        {row.reminder_email_sent_at && row.reminder_sms_sent_at && ' • '}
                        {row.reminder_sms_sent_at && <>SMS at {new Date(row.reminder_sms_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
                    </>
                ) : '—'}
            </div>
        </div>
    );
}
