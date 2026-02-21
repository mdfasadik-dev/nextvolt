import { notFound } from "next/navigation";
import { OrderService } from "@/lib/services/orderService";
import { StoreService } from "@/lib/services/storeService";
import { ConfirmationClient } from "./confirmation-client";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata({
    title: "Order Details",
    description: "Track your order and view full order details.",
    pathname: "/confirmation",
    noIndex: true,
});

export default async function OrderConfirmationPage(props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ mode?: string }>;
}) {
    const params = await props.params;
    const searchParams = (await props.searchParams) || {};
    const mode = searchParams.mode === "track" ? "track" : "placed";

    // Fetch order details. 
    // We use admin privileges here because standard RLS might block access if the user is a guest (no auth session).
    // In a production app, you might want to verify a session token or cookie to ensure the user actually placed this order.
    // For this requirements, relying on the UUID being known is a reasonable trade-off for guest checkout.
    const [order, store] = await Promise.all([
        OrderService.getDetail(params.id, { useAdmin: true }),
        StoreService.getFirst(),
    ]);

    if (!order) {
        notFound();
    }

    return <ConfirmationClient order={order} mode={mode} supportPhone={store?.contact_phone ?? null} />;
}
