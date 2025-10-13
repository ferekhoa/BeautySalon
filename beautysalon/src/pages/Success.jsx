import { useMemo } from 'react';
import { buildConfirmationEmail } from '../utils/email';

export default function Success() {
    const params = new URLSearchParams(location.search);
    const date = params.get('date');
    const start = params.get('start');
    const end = params.get('end');
    const email = params.get('email');
    const service = params.get('service');
    const staff = params.get('staff');

    const whenLabel = useMemo(() => {
        if (!date) return '';
        if (!start || !end) return date;
        return `${date} at ${start}–${end}`;
    }, [date, start, end]);

    const mailtoHref = buildConfirmationEmail({
        to: email || "",
        salonName: "Beauty Salon",
        salonPhone: "+961 70 000 000",
        salonAddress: "Hamra, Beirut",
        whenLabel,
        serviceName: service || "",
        staffName: staff || "",
    });

    return (
        <main className="container-slim py-16">
            <div className="card text-center">
                <div className="text-2xl font-semibold">Your appointment is booked 🎉</div>
                <div className="text-gray-600 mt-2">{whenLabel ? `For ${whenLabel}` : ''}</div>

                {service && <div className="mt-2 text-sm text-gray-700">Service: {service}</div>}
                {staff && <div className="text-sm text-gray-700">Staff: {staff}</div>}

                {email ? (
                    <a href={mailtoHref} className="btn btn-primary mt-6">Send confirmation email</a>
                ) : (
                    <div className="text-sm text-gray-500 mt-6">No email captured for this booking.</div>
                )}

                <a href="/" className="btn mt-3">Back to Home</a>
            </div>
        </main>
    );
}
