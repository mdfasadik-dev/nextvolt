import { CheckoutForm } from "@/components/cart/checkout-form";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Checkout",
    description: "Complete your order securely.",
    pathname: "/checkout",
    noIndex: true,
});

export default function CheckoutPage() {
    return (
        <div className="w-full max-w-5xl px-4 py-12">
            <CheckoutForm />
        </div>
    );
}
