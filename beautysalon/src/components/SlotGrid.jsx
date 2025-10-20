// src/components/SlotGrid.jsx
import { fmtTime } from '../utils/datetime';

/**
 * slots: Array<{ s: Date, e: Date, blocked?: boolean }>
 * value: currently selected slot { s, e } or null
 * onChange: (slot) => void
 */
export default function SlotGrid({ slots = [], value, onChange }) {
    if (!slots.length) {
        return <div className="text-sm text-gray-500">No time slots for this day.</div>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {slots.map(({ s, e, blocked }) => {
                const active = value && +value.s === +s;
                const base = 'px-3 py-3 rounded-xl border transition text-sm text-center active:scale-[0.99]';
                const enabled = active ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50 border-gray-200';
                const dis = 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
                return (
                    <button
                        key={+s}
                        className={`${base} ${blocked ? dis : enabled}`}
                        disabled={!!blocked}
                        onClick={() => !blocked && onChange({ s, e })}
                    >
                        {fmtTime(s)}
                    </button>
                );
            })}
        </div>
    );
}