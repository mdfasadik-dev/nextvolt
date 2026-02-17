import { CartView } from "@/components/cart/cart-view";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Your Cart",
    description: "Review products in your cart before checkout.",
    pathname: "/cart",
    noIndex: true,
});

export default function CartPage() {
    return (
        <div className="w-full max-w-5xl px-4 py-12">
            <header className="mb-8">
                <h1 className="text-3xl font-semibold leading-tight">Shopping Cart</h1>
                <p className="text-sm text-muted-foreground">Review your selections before moving to checkout.</p>
            </header>
            <CartView className="rounded-2xl border bg-card p-6 shadow-sm" />
        </div>
    );
}
