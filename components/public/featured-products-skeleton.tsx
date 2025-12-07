export function FeaturedProductsSkeleton() {
    return (
        <div className="w-full animate-pulse flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="h-6 w-48 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <ul className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <li key={i} className="group relative">
                        <div className="overflow-hidden h-full flex flex-col border rounded-md">
                            <div className="relative w-full aspect-square bg-muted" />
                            <div className="flex-1 flex flex-col gap-3 p-4">
                                <div className="h-4 w-3/4 bg-muted rounded" />
                                <div className="h-3 w-1/2 bg-muted rounded" />
                                <div className="mt-auto h-4 w-16 bg-muted rounded" />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
