// src/pages/Book.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import SlotGrid from '../components/SlotGrid';
import { addMinutes, overlaps, toISODate } from '../utils/datetime';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { forwardRef } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export default function Book() {
    const params = new URLSearchParams(location.search);
    const initialServiceId = params.get('service');

    const [allServices, setAllServices] = useState([]);
    const [staff, setStaff] = useState([]);

    const [date, setDate] = useState(() => new Date());
    const [chosenStaff, setChosenStaff] = useState('');
    const [busy, setBusy] = useState([]);
    const [hours, setHours] = useState(null);
    const [openWeekdays, setOpenWeekdays] = useState(new Set()); // <-- NEW
    const [slot, setSlot] = useState(null);
    const [closedNote, setClosedNote] = useState('');
    const [email, setEmail] = useState('');

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

    const [dlg, setDlg] = useState({
        open: false,
        title: '',
        body: null,
        confirmText: 'OK',
        destructive: false,
        onConfirm: null, // when null, acts like an info dialog
    });

    useEffect(() => {
        (async () => {
            setOpenWeekdays(new Set());
            setHours(null);
            setClosedNote('');
            if (!chosenStaff) return;

            const { data: all } = await supabase
                .from('staff_hours')
                .select('weekday')
                .eq('staff_id', chosenStaff);

            const set = new Set((all || []).map(r => r.weekday));
            setOpenWeekdays(set);

            // If currently selected date is closed, jump forward to next open day
            const current = new Date(date);
            if (!set.has(current.getDay())) {
                const next = findNextOpenDay(current, set);
                if (next) {
                    setDate(next);
                    setClosedNote('Closed on that day — jumped to the next open day.');
                }
            }
        })();
    }, [chosenStaff]);

    function findNextOpenDay(startDate, openSet) {
        for (let i = 0; i < 60; i++) {  // look ahead up to 60 days
            const cand = new Date(startDate);
            cand.setDate(startDate.getDate() + i);
            if (openSet.has(cand.getDay()) && toISODate(cand) >= toISODate(new Date())) {
                return cand;
            }
        }
        return null;
    }

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
            if (!chosenStaff) { setBusy([]); return; }
            const start = new Date(date); start.setHours(0, 0, 0, 0);
            const end = new Date(start); end.setDate(end.getDate() + 1);
            const { data } = await supabase
                .from('appointments')
                .select('starts_at, ends_at, status')
                .eq('staff_id', chosenStaff)
                .gte('starts_at', start.toISOString())
                .lt('starts_at', end.toISOString());
            setBusy(data || []);
        })();
    }, [date, chosenStaff]);

    // Staff hours for weekday (if none, no slots)
    useEffect(() => {
        (async () => {
            if (!chosenStaff) { setHours(null); return; }
            const weekday = new Date(date).getDay();
            const { data } = await supabase
                .from('staff_hours')
                .select('start_time, end_time, weekday')
                .eq('staff_id', chosenStaff)
                .eq('weekday', weekday)
                .maybeSingle();
            setHours(data || null);
            setSlot(null);
        })();
    }, [date, chosenStaff]);

    const todayISO = toISODate(new Date());
    const now = new Date();

    // Slots (unchanged from your latest logic)
    const slots = useMemo(() => {
        if (!chosenStaff || totalDuration <= 0 || !hours) return [];

        const [sh, sm] = String(hours.start_time).split(':').map(Number);
        const [eh, em] = String(hours.end_time).split(':').map(Number);

        const dayStart = new Date(date); dayStart.setHours(sh || 10, sm || 0, 0, 0);
        const dayEnd = new Date(date); dayEnd.setHours(eh || 18, em || 30, 0);

        const step = 30;
        const duration = totalDuration;
        const out = [];

        for (let t = new Date(dayStart); t <= dayEnd; t = addMinutes(t, step)) {
            const s = new Date(t);
            const e = addMinutes(t, duration);

            const pastEnd = e > dayEnd;
            const hasOverlap = busy
                .filter(b => b.status !== 'cancelled')
                .some(b => overlaps(new Date(b.starts_at), new Date(b.ends_at), s, e));
            const isSameDay = toISODate(s) === toISODate(now);
            const inPast = isSameDay && s < now;

            if (pastEnd) break;
            out.push({ s, e, blocked: pastEnd || hasOverlap || inPast });
        }
        return out;
    }, [busy, date, chosenStaff, totalDuration, hours]);

    async function goToNextOpenDay() {
        if (!chosenStaff) return;
        const { data: all } = await supabase
            .from('staff_hours')
            .select('weekday')
            .eq('staff_id', chosenStaff);

        const openDays = new Set((all || []).map(r => r.weekday)); // integers 0..6
        if (!openDays.size) return; // no configured hours at all

        const d = new Date(date);
        for (let i = 1; i <= 14; i++) {         // look ahead up to two weeks
            const cand = new Date(d); cand.setDate(d.getDate() + i);
            if (openDays.has(cand.getDay())) { setDate(cand); break; }
        }
    }

    function addItemById(id) {
        const s = allServices.find((x) => x.id === id);
        if (!s) return;
        setItems((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, s]));
    }
    function removeItem(id) {
        setItems((prev) => prev.filter((p) => p.id !== id));
    }

    function infoDialog(title, body) {
        setDlg({
            open: true,
            title,
            body: typeof body === 'string' ? <p>{body}</p> : body,
            confirmText: 'OK',
            destructive: false,
            onConfirm: null,
        });
    }

    function confirmDialog({ title, body, confirmText = 'Confirm', destructive = false, onConfirm }) {
        setDlg({
            open: true,
            title,
            body: typeof body === 'string' ? <p>{body}</p> : body,
            confirmText,
            destructive,
            onConfirm,
        });
    }

    function isValidGmail(v) {
        return /^[a-z0-9._%+\-]+@(gmail\.com|googlemail\.com)$/i.test(v || '');
    }
    function isLikelyLebanonPhone(v) {
        const d = String(v || '').replace(/\D/g, '');
        return /^(?:961)?(?:3\d|7\d|81)\d{6}$/.test(d) || /^0(?:3|7\d|81)\d{6}$/.test(d);
    }

    async function createAppointment() {
        // 1) Server-side check (your existing RPC)
        const { data: can, error: canErr } = await supabase.rpc('can_book', { p_phone: phone });
        if (canErr) return infoDialog('Booking Error', canErr.message);
        if (can === false) return infoDialog('Blocked', 'Your phone number is blocked due to repeated no-shows.');

        if (!slot) return infoDialog('Pick a time', 'Please choose a time slot.');
        if (slot.s < new Date()) return infoDialog('Pick a future time', 'Please choose a time in the future.');

        // 2) Compute times
        const startISO = slot.s.toISOString();
        const endISO = slot.e.toISOString();

        // 3) For backward-compatibility: store a primary service_id as the first selected service (if any)
        const primaryServiceId = items[0]?.id ?? null;

        // 4) Insert the appointment (use your existing separate states)
        const { data: appt, error: e1 } = await supabase
            .from('appointments')
            .insert({
                service_id: primaryServiceId,     // if your schema requires; otherwise keep null
                staff_id: chosenStaff,
                customer_name: name?.trim() || null,
                customer_phone: phone?.trim() || null,
                customer_email: email?.trim() || null,
                starts_at: startISO,
                ends_at: endISO,
                status: 'booked',
                remarks: remarks?.trim() || null,
            })
            .select('id')
            .single();
        if (e1) return infoDialog('Booking Error', e1.message);

        // 5) Insert all appointment items (for multi-service cart)
        if (items.length) {
            const payload = items.map(s => ({
                appointment_id: appt.id,
                service_id: s.id,
                duration_min: s.duration_min,
                price_cents: s.price_cents,
            }));
            const { error: e2 } = await supabase.from('appointment_items').insert(payload);
            if (e2) return infoDialog('Booking Error', e2.message);
        }

        // 6) (Optional) Remember user identity
        // localStorage.setItem('booking_identity', JSON.stringify({ name, phone, email }));

        // 7) Redirect to Success with enough info to compose email
        const startLabel = slot.s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endLabel = slot.e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateISO = toISODate(slot.s);

        const staffName = (staff.find(st => st.id === chosenStaff)?.full_name) || '';
        const serviceNames = items.map(i => i.name).join(', ');

        location.href =
            '/success?date=' + encodeURIComponent(dateISO) +
            '&start=' + encodeURIComponent(startLabel) +
            '&end=' + encodeURIComponent(endLabel) +
            '&email=' + encodeURIComponent(email || '') +
            '&service=' + encodeURIComponent(serviceNames) +
            '&staff=' + encodeURIComponent(staffName) +
            '&id=' + encodeURIComponent(appt.id); // optional
    }


    async function confirm() {
        if (!items.length) return infoDialog('Add a service', 'Please add at least one service to continue.');
        if (!slot || !name || !phone || !email) return infoDialog('Missing info', 'Please fill your name, phone, email and choose a time.');
        if (!isLikelyLebanonPhone(phone)) return infoDialog('Invalid phone', 'Please enter a valid Lebanese mobile number.');
        if (!isValidGmail(email)) return infoDialog('Invalid email', 'Please enter a valid Gmail address (gmail.com).');

        const summary = (
            <div className="text-sm">
                <div className="mb-2"><span className="font-medium">Name:</span> {name}</div>
                <div className="mb-2"><span className="font-medium">Phone:</span> {phone}</div>
                <div className="mb-2"><span className="font-medium">Email:</span> {email}</div>
                <div className="mb-2">
                    <span className="font-medium">When:</span>{' '}
                    {slot.s.toLocaleDateString()} • {slot.s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {slot.e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mb-2"><span className="font-medium">Services:</span></div>
                <ul className="list-disc pl-5 mb-2">
                    {items.map(it => (
                        <li key={it.id}>{it.name} — {it.duration_min} min • ${(it.price_cents / 100).toFixed(2)}</li>
                    ))}
                </ul>
                <div className="font-semibold">Total: {totalDuration} min • ${(totalPrice / 100).toFixed(2)}</div>
            </div>
        );

        confirmDialog({
            title: 'Confirm booking?',
            body: summary,
            confirmText: 'Confirm Booking',
            onConfirm: async () => {
                setDlg(d => ({ ...d, open: false }));
                await createAppointment();
            },
        });
    }


    const InputLike = forwardRef(({ value, onClick, placeholder }, ref) => (
        <button
            type="button"
            onClick={onClick}
            ref={ref}
            className="w-full mb-2 border rounded-xl px-3 py-2 text-left bg-white hover:bg-gray-50"
        >
            {value || placeholder || 'Select date'}
        </button>
    ));

    InputLike.displayName = 'InputLike';

    // function isValidGmail(v) {
    //     return /^[a-z0-9._%+\-]+@(gmail\.com|googlemail\.com)$/i.test(v || '');
    // }
    // function isLikelyLebanonPhone(v) {
    //     // quick client check; server does the final say
    //     const d = String(v || '').replace(/\D/g, '');
    //     return /^(?:961)?(?:3\d|7\d|81)\d{6}$/.test(d) || /^0(?:3|7\d|81)\d{6}$/.test(d);
    // }

    useEffect(() => {
        const saved = localStorage.getItem('booking_identity');
        if (saved) {
            try {
                const { name: n, phone: p, email: e } = JSON.parse(saved);
                if (n) setName(n);
                if (p) setPhone(p);
                if (e) setEmail(e);
            } catch { }
        }
    }, []);
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
            <DatePicker
                selected={date}
                onChange={(d) => { setDate(d); setSlot(null); }}
                minDate={new Date()}
                filterDate={(d) => {
                    if (!chosenStaff) return false;
                    const day = new Date(d); day.setHours(0, 0, 0, 0);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    if (day < today) return false;
                    return openWeekdays.size ? openWeekdays.has(day.getDay()) : true;
                }}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"

                /* keep styling */
                className="w-full mb-2 border rounded-xl px-3 py-2 text-left bg-white hover:bg-gray-50"
                calendarClassName="dp-panel"
                dayClassName={() => "dp-day"}
                popperClassName="dp-popper"
                popperPlacement="bottom-start"
                showPopperArrow={false}

                /* portal only on small screens */
                withPortal={window.matchMedia('(max-width: 640px)').matches}
            />
            {closedNote && <div className="text-xs text-amber-700 mb-2">{closedNote}</div>}

            {/* Time slots section as before */}
            <div className="mb-6">
                {totalDuration <= 0 ? (
                    <div className="text-sm text-gray-500">Add services to see available times.</div>
                ) : !hours ? (
                    <div className="text-sm text-gray-500">Closed on this day for the selected specialist.</div>
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
                    placeholder="Phone (e.g. 03xxxxxx)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
                <input
                    type="email"
                    required
                    className="border rounded-xl px-3 py-2 w-full"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
            <ConfirmModal
                open={dlg.open}
                onClose={() => setDlg(d => ({ ...d, open: false }))}
                onConfirm={dlg.onConfirm ? dlg.onConfirm : () => setDlg(d => ({ ...d, open: false }))}
                title={dlg.title}
                confirmText={dlg.confirmText}
                destructive={dlg.destructive}
            >
                {dlg.body}
            </ConfirmModal>
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
