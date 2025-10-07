import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';


export default function CategoriesSection() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');


    async function load() {
        setLoading(true);
        const { data, error } = await supabase.from('service_categories').select('id,name').order('name');
        if (!error) setRows(data || []);
        setLoading(false);
    }
    useEffect(() => { load(); }, []);


    async function add(e) {
        e.preventDefault();
        if (!name.trim()) return;
        const { error } = await supabase.from('service_categories').insert({ name: name.trim() });
        if (error) alert(error.message); else { setName(''); load(); }
    }


    async function rename(id, newName) {
        const { error } = await supabase.from('service_categories').update({ name: newName }).eq('id', id);
        if (error) alert(error.message); else load();
    }


    async function remove(id) {
        if (!confirm('Delete this category? All services inside will be deleted.')) return;
        const { error } = await supabase.from('service_categories').delete().eq('id', id);
        if (error) alert(error.message); else load();
    }

    return (
        <section>
            <form onSubmit={add} className="card mb-4 grid md:grid-cols-4 gap-3">
                <input className="border rounded-xl px-3 py-2 md:col-span-3" placeholder="New category name" value={name} onChange={e => setName(e.target.value)} />
                <button className="btn btn-primary">Add Category</button>
            </form>


            {loading && <div>Loading…</div>}
            {!loading && (
                <div className="grid gap-3">
                    {rows.map(r => (
                        <div key={r.id} className="card flex items-center justify-between gap-3">
                            <EditableText value={r.name} onSave={(v) => rename(r.id, v)} />
                            <button className="btn" onClick={() => remove(r.id)}>Delete</button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function EditableText({ value, onSave }) {
    const [v, setV] = useState(value);
    const [edit, setEdit] = useState(false);
    return edit ? (
        <div className="flex items-center gap-2 w-full">
            <input className="border rounded-xl px-3 py-2 w-full" value={v} onChange={e => setV(e.target.value)} />
            <button className="btn btn-primary" onClick={() => { onSave(v); setEdit(false); }}>Save</button>
            <button className="btn" onClick={() => { setV(value); setEdit(false); }}>Cancel</button>
        </div>
    ) : (
        <div className="flex items-center gap-3 w-full">
            <div className="font-medium">{value}</div>
            <button className="btn" onClick={() => setEdit(true)}>Edit</button>
        </div>
    );
}