import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function GenericFormSkeleton({ lines = 5 }: { lines?: number }) {
    return <div className="animate-pulse space-y-3">{Array.from({ length: lines }).map((_, i) => <div key={i} className="h-9 bg-muted rounded" />)}</div>;
}

export function GenericTableSkeleton({ rows = 6 }: { rows?: number }) {
    return <div className="animate-pulse space-y-2"><div className="h-9 bg-muted rounded" />{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-7 bg-muted/70 rounded" />)}</div>;
}

export function PageSkeleton({ titleForm, titleTable }: { titleForm: string; titleTable: string }) {
    return (
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
                <CardHeader><CardTitle>{titleForm}</CardTitle></CardHeader>
                <CardContent><GenericFormSkeleton /></CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader><CardTitle>{titleTable}</CardTitle></CardHeader>
                <CardContent><GenericTableSkeleton /></CardContent>
            </Card>
        </div>
    );
}
