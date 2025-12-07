import { Suspense } from "react";
import { listAttributes } from "./actions";
import { AttributesClient } from "./_components/attributes-client";
import { PageSkeleton } from "../_components/page-skeleton";

export default async function AttributesPage() {
    const initial = await listAttributes();
    return (
        <Suspense fallback={<PageSkeleton titleForm="Attributes" titleTable="Attributes" />}>
            <AttributesClient initial={initial} />
        </Suspense>
    );
}

