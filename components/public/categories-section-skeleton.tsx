export function CategoriesSectionSkeleton() {
    return (
        <div className="w-full animate-pulse">
            <div className="mb-6 h-6 w-52 rounded bg-muted" />
            <ul className="grid gap-8 grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 justify-center">
                {Array.from({ length: 10 }).map((_, i) => (
                    <li key={i} className="flex flex-col items-center text-center">
                        <div className="h-20 w-20 rounded-md bg-muted" />
                        <div className="mt-3 h-3 w-16 rounded bg-muted" />
                    </li>
                ))}
            </ul>
        </div>
    );
}
