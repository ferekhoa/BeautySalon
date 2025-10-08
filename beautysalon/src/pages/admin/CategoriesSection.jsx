// src/pages/admin/CategoriesSection.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ConfirmModal from '../../components/ConfirmModal';

export default function CategoriesSection() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');

    // per-row editing
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    // delete modal
    const [delCat, setDelCat] = useState({ open: false, id: null, name: '' });

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

    function startEdit(row) {
        setEditingId(row.id);
        setEditValue(row.name);
    }
    function cancelEdit() {
        setEditingId(null);
        setEditValue('');
    }
    async function saveEdit(id) {
        const v = editValue.trim();
        if (!v) return alert('Name is required');
        await rename(id, v);
        cancelEdit();
    }

    // 🟢 open styled modal instead of window.confirm
    function askDelete(id, name) {
        setDelCat({ open: true, id, name });
    }

    return (
        <section>
            <form onSubmit={add} className="card mb-4 grid md:grid-cols-4 gap-3">
                <input
                    className="border rounded-xl px-3 py-2 md:col-span-3"
                    placeholder="New category name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <button className="btn btn-primary">Add Category</button>
            </form>

            {loading && <div>Loading…</div>}
            {!loading && (
                <div className="grid gap-3">
                    {rows.map(r => {
                        const isEditing = editingId === r.id;
                        return (
                            <div key={r.id} className="card flex items-center justify-between gap-3">
                                {/* Left: name (or input if editing) */}
                                <div className="flex-1">
                                    {isEditing ? (
                                        <input
                                            className="border rounded-xl px-3 py-2 w-full"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="font-medium">{r.name}</div>
                                    )}
                                </div>

                                {/* Right: actions */}
                                <div className="inline-flex gap-2">
                                    {isEditing ? (
                                        <>
                                            <button type="button" className="btn" onClick={cancelEdit}>Cancel</button>
                                            <button type="button" className="btn btn-primary" onClick={() => saveEdit(r.id)}>Save</button>
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" className="btn" onClick={() => startEdit(r)}>Edit</button>
                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() => askDelete(r.id, r.name)}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ✅ Styled confirm modal — must be inside the component's return */}
            <ConfirmModal
                open={delCat.open}
                onClose={() => setDelCat({ open: false, id: null, name: '' })}
                onConfirm={async () => {
                    const { error } = await supabase.from('service_categories').delete().eq('id', delCat.id);
                    setDelCat({ open: false, id: null, name: '' });
                    if (error) alert(error.message); else load();
                }}
                title="Delete category?"
                confirmText="Delete"
                destructive
            >
                <p>
                    You’re about to delete category <span className="font-medium">{delCat.name}</span>.
                    Services linked to it may be orphaned or removed depending on your DB rules.
                </p>
            </ConfirmModal>
        </section>
    );
}
