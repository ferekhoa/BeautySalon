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
        <div className="grid grid-cols-3 gap-2">
            {slots.map(({ s, e, blocked }) => {
                const active = value && +value.s === +s;
                const base =
                    'px-3 py-2 rounded-xl border transition text-sm';
                const enabledClass = active
                    ? 'bg-black text-white border-black'
                    : 'bg-white hover:bg-gray-50 border-gray-200';
                const disabledClass =
                    'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';

                return (
                    <button
                        key={+s}
                        className={`${base} ${blocked ? disabledClass : enabledClass}`}
                        disabled={!!blocked}
                        onClick={() => !blocked && onChange({ s, e })}
                        aria-disabled={!!blocked}
                        title={blocked ? 'Unavailable' : 'Available'}
                    >
                        {fmtTime(s)}
                    </button>
                );
            })}
        </div>
    );
}
