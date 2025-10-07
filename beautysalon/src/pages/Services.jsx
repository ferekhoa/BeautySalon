import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import CategorySection from '../components/CategorySection';


export default function Services() {
    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        (async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('service_categories')
                .select('id,name, services:services(id,name,duration_min,price_cents,is_active)')
                .order('name');
            if (!error) {
                const filtered = (data || []).map(c => ({
                    ...c,
                    services: (c.services || []).filter(s => s.is_active)
                }));
                setCats(filtered);
            }
            setLoading(false);
        })();
    }, []);

    return (
        <main className="container-slim py-10">
            <h1 className="text-2xl font-semibold mb-6">Services</h1>
            {loading && <div>Loading…</div>}
            {!loading && cats.map(c => (
                <CategorySection key={c.id} category={c} />
            ))}
        </main>
    );
}