"use client";

import { Loader2 } from "lucide-react";

interface PageLoadingOverlayProps {
    open: boolean;
    title?: string;
    description?: string;
}

export function PageLoadingOverlay({
    open,
    title = "Updating order...",
    description = "Please wait while changes are saved.",
}: PageLoadingOverlayProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
