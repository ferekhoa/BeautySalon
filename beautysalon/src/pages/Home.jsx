import { Link } from 'react-router-dom';


export default function Home() {
    return (
        <main>
            <section className="container-slim py-10">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">Beauty & Wellness, expertly delivered</h1>
                        <p className="mt-3 text-gray-600">Book lashes, hair styling, and skin care with our specialists. Simple pricing, fast booking.</p>
                        <div className="mt-6 flex gap-3">
                            <Link to="/book" className="btn btn-primary">Book Now</Link>
                            <Link to="/services" className="btn">View Services</Link>
                        </div>
                        <div className="mt-6 text-sm text-gray-500">Hamra, Beirut • Mon–Sat 10:00–18:00</div>
                    </div>
                    <div className="h-64 md:h-80 rounded-2xl bg-gray-100" />
                </div>
            </section>
        </main>
    );
}