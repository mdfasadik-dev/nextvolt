import { CheckoutForm } from "@/components/cart/checkout-form";

export const metadata = {
    title: "Checkout",
};

export default function CheckoutPage() {
    return (
        <div className="w-full max-w-5xl px-4 py-12">
            <CheckoutForm />
        </div>
    );
}

