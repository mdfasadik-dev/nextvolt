"use client";

import { CartDrawer } from "@/components/cart/cart-drawer";

export function FloatingCartButton() {
    return (
        <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
            <CartDrawer className="!h-12 !w-12 border-border/60 bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80" />
        </div>
    );
}
