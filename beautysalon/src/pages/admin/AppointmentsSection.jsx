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
            supabase.from('appointments')
                .select('id,service_id,staff_id,customer_name,customer_phone,starts_at,ends_at,status,remarks')
                .order('starts_at', { ascending: false })
                .limit(200),
            supabase.from('staff').select('id,full_name'),
            supabase.from('services').select('id,name')
        ]);
        setRows(a.data || []);
        setStaff(b.data || []);
        setServices(c.data || []);
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => rows.filter(r => !status || r.status === status), [rows, status]);

    function nm(tbl, id) { return (tbl.find(x => x.id === id)?.name) || (tbl.find(x => x.id === id)?.full_name) || '—'; }

    async function setRowStatus(row, newStatus) {
        // 1) update the appointment status
        const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', row.id);
        if (error) { alert(error.message); return; }

        // 2) extra behaviors
        try {
            if (newStatus === 'no_show') {
                // record a no-show; server function will increment and auto-block at >=2
                await supabase.rpc('record_no_show', {
                    p_name: row.customer_name || '',
                    p_phone: row.customer_phone || ''
                });
            }
            // If cancelled: no extra write needed. The booking UI will reopen the slot by ignoring 'cancelled' appts.
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
            <div className="card mb-4 flex items-center gap-3">
                <div className="text-sm text-gray-600">Filter by status</div>
                <select className="border rounded-xl px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All</option>
                    <option value="booked">Booked</option>
                    <option value="done">Done</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {loading && <div>Loading…</div>}
            {!loading && (
                <div className="overflow-x-auto">
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
                                        <select className="border rounded-xl px-2 py-1" value={r.status} onChange={e => setRowStatus(r, e.target.value)}>
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
            )}
        </section>
    );
}
