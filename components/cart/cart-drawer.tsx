"use client";

import { ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, useSheetContext } from "@/components/ui/sheet";
import { useCart } from "./cart-provider";
import { CartView } from "./cart-view";
import { cn } from "@/lib/utils";

function CartTriggerButton() {
    const { itemCount } = useCart();
    const countLabel = itemCount > 9 ? "9+" : itemCount.toString();
    return (
        <SheetTrigger asChild>
            <button
                type="button"
                aria-label="Open cart"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-sm hover:bg-accent"
            >
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                        {countLabel}
                    </span>
                )}
            </button>
        </SheetTrigger>
    );
}

function CartSheetContent() {
    const { setOpen } = useSheetContext();
    return (
        <SheetContent side="right" title="Your cart">
            <CartView
                className="px-3"
                onCheckoutNavigate={() => {
                    setOpen(false);
                }}
            />
        </SheetContent>
    );
}

export function CartDrawer({ className }: { className?: string }) {
    return (
        <Sheet>
            <div className={cn("flex items-center", className)}>
                <CartTriggerButton />
            </div>
            <CartSheetContent />
        </Sheet>
    );
}
