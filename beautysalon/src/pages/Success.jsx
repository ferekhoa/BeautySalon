import { toISODate } from '../utils/datetime';


export default function Success() {
    const params = new URLSearchParams(location.search);
    const d = params.get('date');
    return (
        <main className="container-slim py-16">
            <div className="card text-center">
                <div className="text-2xl font-semibold">Your appointment is booked 🎉</div>
                <div className="text-gray-600 mt-2">{d ? `For ${d}` : ''}</div>
                <a href="/" className="btn btn-primary mt-6">Back to Home</a>
            </div>
        </main>
    );
}