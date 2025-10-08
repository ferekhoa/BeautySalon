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
                .select('id,service_id,staff_id,customer_name,customer_phone,starts_at,ends_at,status,remarks')
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

    async function remove(id) {
        if (!confirm('Delete this appointment?')) return;
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) alert(error.message); else load();
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
                                onDelete={remove}
                            />
                        ))}
                        {!filtered.length && (
                            <div className="text-sm text-gray-500 text-center py-6">No appointments.</div>
                        )}
                    </div>

                    {/* Desktop table (unchanged layout) */}
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
                                    <th className="py-2 pr-3"></th>
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
                                        <td className="py-2 pr-3 text-right">
                                            <button className="btn" onClick={() => remove(r.id)}>Delete</button>
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

/** Mobile card component */
function AppointmentCardMobile({ row, staff, services, onChangeStatus, onDelete }) {
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
                <button className="btn" onClick={() => onDelete(row.id)}>Delete</button>
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
        </div>
    );
}
