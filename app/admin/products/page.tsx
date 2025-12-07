import { Suspense } from "react";
import { listProducts } from "./actions";
import { ProductsClient } from "./_components/products-client";
import { PageSkeleton } from "../_components/page-skeleton";

export default async function ProductsPage() {
    const initial = await listProducts();
    return (
        <Suspense fallback={<PageSkeleton titleForm="Products" titleTable="Products" />}>
            <ProductsClient initial={initial} />
        </Suspense>
    );
}

