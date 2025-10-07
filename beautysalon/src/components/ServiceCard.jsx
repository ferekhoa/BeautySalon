import { Link } from 'react-router-dom';


export default function ServiceCard({ service }) {
    const price = (service.price_cents ?? 0) / 100;
    return (
        <div className="card">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-500">{service.duration_min} min</div>
                </div>
                <div className="text-right">
                    <div className="font-semibold">${price.toFixed(2)}</div>
                </div>
            </div>
            <div className="mt-3 flex gap-2">
                <Link to={`/book?service=${service.id}`} className="btn btn-primary">Book</Link>
            </div>
        </div>
    );
}