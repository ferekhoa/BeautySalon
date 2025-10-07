import ServiceCard from './ServiceCard';


export default function CategorySection({ category }) {
    return (
        <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">{category.name}</h2>
            <div className="grid gap-4 md:grid-cols-2">
                {(category.services || []).map(s => (
                    <ServiceCard key={s.id} service={s} />
                ))}
            </div>
        </section>
    );
}