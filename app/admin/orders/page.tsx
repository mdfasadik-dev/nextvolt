import { listOrders } from "./actions";
import { OrdersClient } from "./_components/orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
    const initial = await listOrders();
    return <OrdersClient initial={initial} />;
}
