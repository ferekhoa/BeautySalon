// src/pages/admin/StaffHoursSection.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ConfirmModal from '../../components/ConfirmModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffHoursSection() {
    const [staff, setStaff] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [delHours, setDelHours] = useState({ open: false, id: null, label: '' });

    // NEW: allow selecting multiple days
    const [form, setForm] = useState({
        staff_id: '',
        weekdays: [],         // e.g. [1,2,3]
        start_time: '10:00',
        end_time: '18:00',
    });

    async function load() {
        setLoading(true);
        const [{ data: st }, { data: hrs }] = await Promise.all([
            supabase.from('staff').select('id,full_name').eq('is_active', true).order('full_name'),
            supabase.from('staff_hours').select('id,staff_id,weekday,start_time,end_time').order('weekday')
        ]);
        setStaff(st || []);
        setRows(hrs || []);
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    function toggleWeekday(i) {
        setForm(f => {
            const has = f.weekdays.includes(i);
            return { ...f, weekdays: has ? f.weekdays.filter(x => x !== i) : [...f.weekdays, i] };
        });
    }

    async function add(e) {
        e.preventDefault();
        if (!form.staff_id) return alert('Pick staff');
        if (!form.weekdays.length) return alert('Pick at least one weekday');

        const payload = form.weekdays.map(w => ({
            staff_id: form.staff_id,
            weekday: Number(w),
            start_time: form.start_time,
            end_time: form.end_time,
        }));

        const { error } = await supabase.from('staff_hours').insert(payload);
        if (error) alert(error.message); else load();
    }

    function remove(id) {
        const row = rows.find(r => r.id === id);
        const staffName = staff.find(s => s.id === row?.staff_id)?.full_name || '—';
        const label = `${staffName} • ${WEEKDAYS[row.weekday]} ${row.start_time}–${row.end_time}`;
        setDelHours({ open: true, id, label });
    }

    return (
        <section>
            <form onSubmit={add} className="card mb-4 grid gap-3">
                <div className="grid md:grid-cols-5 gap-3">
                    <select
                        className="border rounded-xl px-3 py-2"
                        value={form.staff_id}
                        onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                    >
                        <option value="">— Staff —</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>

                    <input type="time" className="border rounded-xl px-3 py-2"
                        value={form.start_time}
                        onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                    <input type="time" className="border rounded-xl px-3 py-2"
                        value={form.end_time}
                        onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                    <div className="md:col-span-2">
                        <div className="text-sm text-gray-600 mb-1">Weekdays</div>
                        <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map((d, i) => (
                                <label key={i} className={`px-3 py-1 rounded-full border cursor-pointer ${form.weekdays.includes(i) ? 'bg-black text-white border-black' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={form.weekdays.includes(i)}
                                        onChange={() => toggleWeekday(i)}
                                    />
                                    {d}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button className="btn btn-primary">Add Hours for Selected Days</button>
                </div>
            </form>

            {loading && <div>Loading…</div>}
            {!loading && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b">
                                <th className="py-2 pr-3">Staff</th>
                                <th className="py-2 pr-3">Weekday</th>
                                <th className="py-2 pr-3">Start</th>
                                <th className="py-2 pr-3">End</th>
                                <th className="py-2 pr-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-b">
                                    <td className="py-2 pr-3">{staff.find(s => s.id === r.staff_id)?.full_name || '—'}</td>
                                    <td className="py-2 pr-3">{WEEKDAYS[r.weekday]}</td>
                                    <td className="py-2 pr-3">{r.start_time}</td>
                                    <td className="py-2 pr-3">{r.end_time}</td>
                                    <td className="py-2 pr-3 text-right">
                                        <button type="button" className="btn" onClick={() => remove(r.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <ConfirmModal
                open={delHours.open}
                onClose={() => setDelHours({ open: false, id: null, label: '' })}
                onConfirm={async () => {
                    const { error } = await supabase.from('staff_hours').delete().eq('id', delHours.id);
                    setDelHours({ open: false, id: null, label: '' });
                    if (error) alert(error.message); else load();
                }}
                title="Delete hours row?"
                confirmText="Delete"
                destructive
            >
                <p>Remove this hours entry?<br /><span className="font-medium">{delHours.label}</span></p>
            </ConfirmModal>
        </section>
    );
}
