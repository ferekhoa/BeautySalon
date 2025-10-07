import { Link, NavLink } from 'react-router-dom';


export default function Header() {
    return (
        <header className="border-b border-gray-200">
            <div className="container-slim py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-black" />
                    <div>
                        <div className="text-lg font-semibold">Beauty Salon</div>
                        <div className="text-xs text-gray-500">Hamra, Beirut • +961 70 000 000</div>
                    </div>
                </Link>
                <nav className="flex items-center gap-3 text-sm">
                    <NavLink to="/" className={({ isActive }) => `px-2 py-1 rounded ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Home</NavLink>
                    <NavLink to="/services" className={({ isActive }) => `px-2 py-1 rounded ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Services</NavLink>
                    <NavLink to="/book" className={({ isActive }) => `px-2 py-1 rounded ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Book</NavLink>
                </nav>
            </div>
        </header>
    );
}