import { useState } from 'react';
import CategoriesSection from './admin/CategoriesSection';
import ServicesSection from './admin/ServicesSection';
import StaffSection from './admin/StaffSection';
import StaffHoursSection from './admin/StaffHoursSection';
import AppointmentsSection from './admin/AppointmentsSection';
import { supabase } from '../../src/lib/supabase'; // adjust relative path if needed

const TABS = [
    { key: 'categories', label: 'Categories' },
    { key: 'services', label: 'Services' },
    { key: 'staff', label: 'Staff' },
    { key: 'staffHours', label: 'Staff Hours' },
    { key: 'appointments', label: 'Appointments' },
];

export default function Admin() {
    const [tab, setTab] = useState('categories');

    async function signOut() {
        await supabase.auth.signOut();
        location.href = '/'; // back to home
    }

    return (
        <main className="container-slim py-8">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Admin</h1>
                <button className="btn" onClick={signOut}>Sign out</button>
            </div>

            {/* Sticky, swipeable tabs */}
            <div className="md:static sticky top-0 z-20 mb-4 -mx-4 px-4 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="overflow-x-auto no-scrollbar -mx-1">
                    <div className="inline-flex gap-2 border rounded-xl p-1 bg-white snap-x snap-mandatory">
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium snap-start ${tab === t.key ? 'bg-black text-white' : 'hover:bg-gray-100'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {tab === 'categories' && <CategoriesSection />}
            {tab === 'services' && <ServicesSection />}
            {tab === 'staff' && <StaffSection />}
            {tab === 'staffHours' && <StaffHoursSection />}
            {tab === 'appointments' && <AppointmentsSection />}
        </main>
    );
}
