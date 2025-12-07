import { Suspense } from "react";
import { listVariants } from "./actions";
import { VariantsClient } from "./_components/variants-client";
import { PageSkeleton } from "../_components/page-skeleton";

export default async function VariantsPage() {
    const initial = await listVariants();
    return (
        <Suspense fallback={<PageSkeleton titleForm="Variants" titleTable="Variants" />}>
            <VariantsClient initial={initial} />
        </Suspense>
    );
}

