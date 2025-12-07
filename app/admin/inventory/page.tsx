import { Suspense } from "react";
import { listInventory } from "./actions";
import { InventoryClient } from "./_components/inventory-client";
import { PageSkeleton } from "../_components/page-skeleton";

export default async function InventoryPage() {
    const initial = await listInventory();
    return (
        <Suspense fallback={<PageSkeleton titleForm="Inventory" titleTable="Inventory" />}>
            <InventoryClient initial={initial} />
        </Suspense>
    );
}

