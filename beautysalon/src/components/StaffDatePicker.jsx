// src/components/StaffDatePicker.jsx
import { useMemo } from "react";
import { toISODate } from "../utils/datetime";

/**
 * Props:
 * - value: Date
 * - onChange: (Date) => void
 * - openWeekdays: Set<number> of allowed weekdays (0=Sun..6=Sat)
 */
export default function StaffDatePicker({ value, onChange, openWeekdays = new Set() }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const weekday = d.getDay();
            const isPast = d < today;
            const isOpen = openWeekdays.has(weekday);
            arr.push({ d, isPast, isOpen });
        }
        return arr;
    }, [openWeekdays]);

    const selectedISO = toISODate(value);

    return (
        <div className="card">
            <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                    <div key={w} className="text-center">{w}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {days.map(({ d, isPast, isOpen }) => {
                    const iso = toISODate(d);
                    const selected = iso === selectedISO;
                    const disabled = isPast || !isOpen;

                    const base = "px-2 py-2 rounded-xl border text-sm text-center";
                    const enabled = selected
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50 border-gray-200";
                    const dis = "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";

                    return (
                        <button
                            key={iso}
                            type="button"
                            className={`${base} ${disabled ? dis : enabled}`}
                            onClick={() => !disabled && onChange(d)}
                            disabled={disabled}
                            title={disabled ? "Closed" : "Open"}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
