import { Suspense } from "react";
import { listProductsPaged } from "./actions";
import { ProductsClient } from "./_components/products-client";
import { PageSkeleton } from "../_components/page-skeleton";

export default async function ProductsPage() {
    const initial = await listProductsPaged({ page: 1, pageSize: 20 });
    return (
        <Suspense fallback={<PageSkeleton titleForm="Products" titleTable="Products" />}>
            <ProductsClient initialRows={initial.rows} initialTotal={initial.total} />
        </Suspense>
    );
}
