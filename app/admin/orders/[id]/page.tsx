import { notFound } from "next/navigation";
import { getOrderDetail } from "../actions";
import { OrderDetailsClient } from "./order-details-client";

export const dynamic = "force-dynamic";

export default async function OrderDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    // Use shared service logic to fetch order
    const order = await getOrderDetail({ id: params.id });

    if (!order) {
        notFound();
    }

    return <OrderDetailsClient order={order} />;
}
