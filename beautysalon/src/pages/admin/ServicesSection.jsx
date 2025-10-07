import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';


export default function ServicesSection() {
    const [cats, setCats] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCat, setFilterCat] = useState('');


    const [form, setForm] = useState({ name: '', duration_min: 60, price_cents: 0, category_id: '' });


    async function load() {
        setLoading(true);
        const [{ data: c }, { data: s }] = await Promise.all([
            supabase.from('service_categories').select('id,name').order('name'),
            supabase.from('services').select('id,name,duration_min,price_cents,is_active,category_id').order('name')
        ]);
        setCats(c || []);
        setRows(s || []);
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => rows.filter(r => !filterCat || r.category_id === filterCat), [rows, filterCat]);


    async function add(e) {
        e.preventDefault();
        const payload = { ...form, price_cents: Number(form.price_cents) || 0, duration_min: Number(form.duration_min) || 0 };
        if (!payload.name || !payload.category_id) return alert('Pick category and name');
        const { error } = await supabase.from('services').insert(payload);
        if (error) alert(error.message); else { setForm({ name: '', duration_min: 60, price_cents: 0, category_id: filterCat || '' }); load(); }
    }


    async function save(row) {
        const { error } = await supabase.from('services').update({
            name: row.name,
            duration_min: row.duration_min,
            price_cents: row.price_cents,
            is_active: row.is_active,
            category_id: row.category_id,
        }).eq('id', row.id);
        if (error) alert(error.message); else load();
    }


    async function remove(id) {
        if (!confirm('Delete this service?')) return;
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) alert(error.message); else load();
    }

    return (
        <section>
            <form onSubmit={add} className="card mb-4 grid md:grid-cols-6 gap-3">
                <select className="border rounded-xl px-3 py-2" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">— Category —</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input className="border rounded-xl px-3 py-2" placeholder="Service name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <input type="number" className="border rounded-xl px-3 py-2" placeholder="Duration (min)" value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: Number(e.target.value) }))} />
                <input type="number" className="border rounded-xl px-3 py-2" placeholder="Price (cents)" value={form.price_cents} onChange={e => setForm(f => ({ ...f, price_cents: Number(e.target.value) }))} />
                <div className="flex items-center gap-2">
                    <label className="text-sm">Active</label>
                    <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                </div>
                <button className="btn btn-primary">Add Service</button>
            </form>


            <div className="card mb-4 flex items-center gap-3">
                <div className="text-sm text-gray-600">Filter by category</div>
                <select className="border rounded-xl px-3 py-2" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="">All</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {loading && <div>Loading…</div>}
            {!loading && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b">
                                <th className="py-2 pr-3">Name</th>
                                <th className="py-2 pr-3">Category</th>
                                <th className="py-2 pr-3">Duration</th>
                                <th className="py-2 pr-3">Price</th>
                                <th className="py-2 pr-3">Active</th>
                                <th className="py-2 pr-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <EditableRow key={r.id} row={r} cats={cats} onSave={save} onDelete={remove} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function EditableRow({ row, cats, onSave, onDelete }) {
    const [e, setE] = useState(row);
    useEffect(() => setE(row), [row.id]);


    return (
        <tr className="border-b">
            <td className="py-2 pr-3">
                <input className="border rounded-xl px-2 py-1 w-full" value={e.name} onChange={ev => setE({ ...e, name: ev.target.value })} />
            </td>
            <td className="py-2 pr-3">
                <select className="border rounded-xl px-2 py-1" value={e.category_id} onChange={ev => setE({ ...e, category_id: ev.target.value })}>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </td>
            <td className="py-2 pr-3 w-24">
                <input type="number" className="border rounded-xl px-2 py-1 w-full" value={e.duration_min} onChange={ev => setE({ ...e, duration_min: Number(ev.target.value) })} />
            </td>
            <td className="py-2 pr-3 w-28">
                <input type="number" className="border rounded-xl px-2 py-1 w-full" value={e.price_cents} onChange={ev => setE({ ...e, price_cents: Number(ev.target.value) })} />
            </td>
            <td className="py-2 pr-3">
                <input type="checkbox" checked={!!e.is_active} onChange={ev => setE({ ...e, is_active: ev.target.checked })} />
            </td>
            <td className="py-2 pr-3 text-right whitespace-nowrap">
                <button className="btn mr-2" onClick={() => onSave(e)}>Save</button>
                <button className="btn" onClick={() => onDelete(e.id)}>Delete</button>
            </td>
        </tr>
    );
}