import React from "react";

/**
 * Root-level loading UI (Next.js route segment). Displays a subtle brand spinner
 * with accessible text. Automatically used during suspense boundaries at the root.
 */
export default function RootLoading() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
            <div className="flex flex-col items-center gap-4">
                <BrandSpinner />
            </div>
        </div>
    );
}

function BrandSpinner() {
    return (
        <div className="relative h-14 w-14" role="status" aria-label="Loading">
            <div className="absolute inset-0 rounded-full border-3 border-primary/30" />
            <div className="absolute inset-0 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            {/* <div className="absolute inset-1 flex items-center justify-center rounded-full bg-background">
                <span className="text-[10px] font-semibold tracking-wider text-primary">NEXTVOLT</span>
            </div> */}
        </div>
    );
}
