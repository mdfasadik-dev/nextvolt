import { Suspense } from "react";
import { listCategories } from "./actions";
import { TableSkeleton, FormSkeleton } from "./_components/skeletons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CategoriesClient } from "./_components/categories-client";

export default async function CategoriesPage() {
    const initial = await listCategories();
    return (
        <Suspense fallback={<PageSkeleton />}>
            <CategoriesClient initial={initial} />
        </Suspense>
    );
}

function PageSkeleton() {
    return (
        <div className="space-y-6">
            <Card><CardHeader><CardTitle>Categories</CardTitle></CardHeader><CardContent><FormSkeleton /></CardContent></Card>
            <Card><CardHeader /><CardContent><TableSkeleton /></CardContent></Card>
        </div>
    );
}

// Client component moved to _components/categories-client.tsx
