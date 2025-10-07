export default function Footer() {
    return (
        <footer className="mt-16 border-t border-gray-200">
            <div className="container-slim py-8 text-sm text-gray-500 flex items-center justify-between">
                <div>© {new Date().getFullYear()} Beauty Salon</div>
                <a className="link" href="tel:+96170000000">Call now</a>
            </div>
        </footer>
    );
}