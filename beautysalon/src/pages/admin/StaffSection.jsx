import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';


export default function StaffSection() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');


    async function load() {
        setLoading(true);
        const { data } = await supabase.from('staff').select('id,full_name,is_active').order('full_name');
        setRows(data || []);
        setLoading(false);
    }
    useEffect(() => { load(); }, []);


    async function add(e) {
        e.preventDefault();
        if (!name.trim()) return;
        const { error } = await supabase.from('staff').insert({ full_name: name.trim(), is_active: true });
        if (error) alert(error.message); else { setName(''); load(); }
    }


    async function save(row) {
        const { error } = await supabase.from('staff').update({ full_name: row.full_name, is_active: row.is_active }).eq('id', row.id);
        if (error) alert(error.message); else load();
    }

    async function remove(id) {
        if (!confirm('Delete this staff member? Hours may cascade.')) return;
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) alert(error.message); else load();
    }


    return (
        <section>
            <form onSubmit={add} className="card mb-4 grid md:grid-cols-4 gap-3">
                <input className="border rounded-xl px-3 py-2 md:col-span-3" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
                <button className="btn btn-primary">Add Staff</button>
            </form>


            {loading && <div>Loading…</div>}
            {!loading && (
                <div className="grid gap-3">
                    {rows.map(r => <Row key={r.id} row={r} onSave={save} onDelete={remove} />)}
                </div>
            )}
        </section>
    );
}

function Row({ row, onSave, onDelete }) {
    const [e, setE] = useState(row);
    return (
        <div className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full">
                <input className="border rounded-xl px-3 py-2 w-full" value={e.full_name} onChange={ev => setE({ ...e, full_name: ev.target.value })} />
                <label className="text-sm flex items-center gap-2">
                    Active <input type="checkbox" checked={!!e.is_active} onChange={ev => setE({ ...e, is_active: ev.target.checked })} />
                </label>
            </div>
            <div className="flex gap-2">
                <button className="btn" onClick={() => onSave(e)}>Save</button>
                <button className="btn" onClick={() => onDelete(e.id)}>Delete</button>
            </div>
        </div>
    );
}