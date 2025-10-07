import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import SlotGrid from '../components/SlotGrid';
import { addMinutes, overlaps, toISODate } from '../utils/datetime';

export default function Book() {
    const params = new URLSearchParams(location.search);
    const initialServiceId = params.get('service');

    const [allServices, setAllServices] = useState([]);
    const [staff, setStaff] = useState([]);

    const [date, setDate] = useState(() => new Date());
    const [chosenStaff, setChosenStaff] = useState('');
    const [busy, setBusy] = useState([]);
    const [hours, setHours] = useState(null);
    const [slot, setSlot] = useState(null);

    // multi-service cart
    const [items, setItems] = useState([]); // {id,name,duration_min,price_cents}
    const totalDuration = useMemo(
        () => items.reduce((a, b) => a + (b.duration_min || 0), 0),
        [items]
    );
    const totalPrice = useMemo(
        () => items.reduce((a, b) => a + (b.price_cents || 0), 0),
        [items]
    );

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [remarks, setRemarks] = useState('');

    // Load catalog + staff
    useEffect(() => {
        (async () => {
            const [{ data: st }, { data: svc }] = await Promise.all([
                supabase
                    .from('staff')
                    .select('id,full_name,is_active')
                    .eq('is_active', true)
                    .order('full_name'),
                supabase
                    .from('services')
                    .select('id,name,duration_min,price_cents,is_active,category_id')
                    .eq('is_active', true)
                    .order('name'),
            ]);
            setStaff(st || []);
            setAllServices(svc || []);

            // preload from ?service=
            if (initialServiceId && (svc || []).length) {
                const s = (svc || []).find((x) => x.id === initialServiceId);
                if (s) setItems((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, s]));
            }
        })();
    }, [initialServiceId]);

    // Busy slots for chosen day/staff
    useEffect(() => {
        (async () => {
            if (!chosenStaff) {
                setBusy([]);
                return;
            }
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            const { data } = await supabase
                .from('appointments')
                .select('starts_at, ends_at, status')
                .eq('staff_id', chosenStaff)
                .gte('starts_at', start.toISOString())
                .lt('starts_at', end.toISOString());
            setBusy(data || []);

            const hasOverlap = busy
                .filter(b => b.status !== 'cancelled')  // <— ignore cancelled to reopen slot
                .some(b => overlaps(new Date(b.starts_at), new Date(b.ends_at), s, e));

        })();
    }, [date, chosenStaff]);

    // Staff hours for weekday (if none, no slots)
    useEffect(() => {
        (async () => {
            if (!chosenStaff) {
                setHours(null);
                return;
            }
            const weekday = new Date(date).getDay(); // 0..6
            const { data } = await supabase
                .from('staff_hours')
                .select('start_time, end_time, weekday')
                .eq('staff_id', chosenStaff)
                .eq('weekday', weekday)
                .maybeSingle();
            setHours(data || null);
        })();
    }, [date, chosenStaff]);

    // Prevent past date/time:
    // - Date input has min=today
    // - When selected date is today, lock any slot whose start < now
    const todayISO = toISODate(new Date());
    const now = new Date();

    const slots = useMemo(() => {
        if (!chosenStaff || totalDuration <= 0 || !hours) return [];

        const [sh, sm] = String(hours.start_time).split(':').map(Number);
        const [eh, em] = String(hours.end_time).split(':').map(Number);

        const dayStart = new Date(date);
        dayStart.setHours(sh || 8, sm || 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(eh || 19, em || 0, 0, 0);

        const step = 30;
        const duration = totalDuration;
        const out = [];

        for (let t = new Date(dayStart); t <= dayEnd; t = addMinutes(t, step)) {
            const s = new Date(t);
            const e = addMinutes(t, duration);

            // lock if would end after shift
            const pastEnd = e > dayEnd;

            // lock if overlapping other appointments
            const hasOverlap = busy.some((b) =>
                overlaps(new Date(b.starts_at), new Date(b.ends_at), s, e)
            );

            // lock if selecting today and start is before 'now'
            const isSameDay =
                toISODate(s) === toISODate(now); // compare YYYY-MM-DD
            const inPast = isSameDay && s < now;

            out.push({ s, e, blocked: pastEnd || hasOverlap || inPast });
            if (pastEnd) break; // later starts will also exceed end
        }

        return out;
    }, [busy, date, chosenStaff, totalDuration, hours]);

    function addItemById(id) {
        const s = allServices.find((x) => x.id === id);
        if (!s) return;
        setItems((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, s]));
    }
    function removeItem(id) {
        setItems((prev) => prev.filter((p) => p.id !== id));
    }

    async function confirm() {
        const { data: can, error: canErr } = await supabase.rpc('can_book', { p_phone: phone });
        if (canErr) return alert(canErr.message);
        if (can === false) return alert('Your phone number has been blocked from booking due to repeated no-shows. Please contact the salon.');

        if (!items.length) return alert('Add at least one service');
        if (!slot || !name || !phone) return alert('Fill all fields');

        // Runtime safety: prevent booking in the past even if UI blocked it
        if (slot.s < new Date()) {
            return alert('Please choose a time in the future.');
        }

        // Create appointment
        const { data: appt, error: e1 } = await supabase
            .from('appointments')
            .insert({
                salon_id: null,
                service_id: null,
                staff_id: chosenStaff,
                customer_name: name,
                customer_phone: phone,
                starts_at: slot.s.toISOString(),
                ends_at: slot.e.toISOString(),
                status: 'booked',
                remarks: remarks || '',
            })
            .select('id')
            .single();
        if (e1) return alert(e1.message);

        // Insert appointment items
        const payload = items.map((s) => ({
            appointment_id: appt.id,
            service_id: s.id,
            duration_min: s.duration_min,
            price_cents: s.price_cents,
        }));
        const { error: e2 } = await supabase.from('appointment_items').insert(payload);
        if (e2) return alert(e2.message);

        location.href = '/success?date=' + encodeURIComponent(toISODate(slot.s));
    }

    return (
        <main className="container-slim py-10">
            <h1 className="text-2xl font-semibold mb-6">Book an Appointment</h1>

            {/* Custom dropdown + totals */}
            <div className="card mb-6">
                <div className="grid md:grid-cols-4 gap-3 items-start">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium mb-2">Add service</label>
                        <ServiceDropdown services={allServices} onPick={(id) => addItemById(id)} />
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Total</div>
                        <div className="font-semibold">
                            {totalDuration || 0} min • ${(totalPrice / 100).toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Selected items */}
                <div className="mt-4 grid gap-2">
                    {items.map((it) => (
                        <div
                            key={it.id}
                            className="flex items-center justify-between border rounded-xl px-3 py-2"
                        >
                            <div>
                                <div className="font-medium">{it.name}</div>
                                <div className="text-xs text-gray-500">
                                    {it.duration_min} min • ${(it.price_cents / 100).toFixed(2)}
                                </div>
                            </div>
                            <button className="btn" onClick={() => removeItem(it.id)}>
                                Remove
                            </button>
                        </div>
                    ))}
                    {!items.length && (
                        <div className="text-sm text-gray-500">No services selected yet.</div>
                    )}
                </div>
            </div>

            {/* Staff select */}
            <label className="block text-sm font-medium mb-1">Choose specialist</label>
            <select
                className="w-full mb-2 border rounded-xl px-3 py-2"
                value={chosenStaff}
                onChange={(e) => {
                    setChosenStaff(e.target.value);
                    setSlot(null);
                }}
            >
                <option value="">— Select —</option>
                {staff.map((st) => (
                    <option key={st.id} value={st.id}>
                        {st.full_name}
                    </option>
                ))}
            </select>

            {/* Date (cannot be before today) */}
            <label className="block text-sm font-medium mb-1">Choose date</label>
            <input
                type="date"
                className="w-full mb-2 border rounded-xl px-3 py-2"
                value={toISODate(date)}
                min={todayISO}
                onChange={(e) => {
                    const picked = new Date(e.target.value + 'T12:00:00');
                    // If user hacks an older date, clamp to today
                    const pickedISO = toISODate(picked);
                    const safeDate = pickedISO < todayISO ? new Date() : picked;
                    setDate(safeDate);
                    setSlot(null);
                }}
                disabled={!chosenStaff}
            />

            {/* Inform if no hours */}
            {chosenStaff && !hours && (
                <div className="text-sm text-amber-700 mb-3">
                    This specialist has no working hours on the selected day.
                </div>
            )}

            {/* Time slots based on staff working hours (30-min), locked if busy or in the past */}
            <div className="mb-6">
                {totalDuration <= 0 ? (
                    <div className="text-sm text-gray-500">Add services to see available times.</div>
                ) : !hours ? (
                    <div className="text-sm text-gray-500">Pick a day with working hours.</div>
                ) : (
                    <SlotGrid slots={slots} value={slot} onChange={setSlot} />
                )}
            </div>

            {/* Customer */}
            <div className="grid md:grid-cols-2 gap-3 mb-3">
                <input
                    className="border rounded-xl px-3 py-2"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    className="border rounded-xl px-3 py-2"
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <textarea
                className="border rounded-xl px-3 py-2 w-full mb-6"
                rows={3}
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
            />

            <button
                className="btn btn-primary w-full"
                onClick={confirm}
                disabled={!items.length || !slot || !chosenStaff}
            >
                Confirm Booking
            </button>
        </main>
    );
}

/** Custom dropdown to display:
 *  - Line 1 (left): service name
 *  - Line 2 (left): price
 *  - Right end: duration (minutes)
 */
function ServiceDropdown({ services = [], onPick }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const panelRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function onDoc(e) {
            if (
                !panelRef.current ||
                panelRef.current.contains(e.target) ||
                btnRef.current.contains(e.target)
            )
                return;
            setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    return (
        <div className="relative">
            <button
                ref={btnRef}
                type="button"
                className="w-full border rounded-xl px-3 py-2 text-left flex items-center justify-between"
                onClick={() => setOpen((v) => !v)}
            >
                <span className="text-gray-600">— Select a service —</span>
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
            </button>

            {open && (
                <div
                    ref={panelRef}
                    className="absolute z-10 mt-2 w-full max-h-80 overflow-auto rounded-xl border bg-white shadow-soft"
                >
                    {services.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-50"
                            onClick={() => {
                                onPick?.(s.id);
                                setOpen(false);
                            }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-xs text-gray-500">
                                        ${(s.price_cents / 100).toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 shrink-0">{s.duration_min} min</div>
                            </div>
                        </button>
                    ))}
                    {!services.length && (
                        <div className="px-3 py-2 text-sm text-gray-500">No services</div>
                    )}
                </div>
            )}
        </div>
    );
}
