export function TableSkeleton() {
    return (
        <div className="animate-pulse space-y-2">
            <div className="h-9 bg-muted rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 bg-muted/70 rounded" />
            ))}
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted rounded" />
            ))}
        </div>
    );
}
