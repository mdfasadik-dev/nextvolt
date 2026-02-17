import { notFound } from "next/navigation";
import { OrderService } from "@/lib/services/orderService";
import { ConfirmationClient } from "./confirmation-client";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata({
    title: "Order Confirmation",
    description: "Order confirmation details.",
    pathname: "/confirmation",
    noIndex: true,
});

export default async function OrderConfirmationPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    // Fetch order details. 
    // We use admin privileges here because standard RLS might block access if the user is a guest (no auth session).
    // In a production app, you might want to verify a session token or cookie to ensure the user actually placed this order.
    // For this requirements, relying on the UUID being known is a reasonable trade-off for guest checkout.
    const order = await OrderService.getDetail(params.id, { useAdmin: true });

    if (!order) {
        notFound();
    }

    return <ConfirmationClient order={order} />;
}
