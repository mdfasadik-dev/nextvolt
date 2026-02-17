import { listCustomersPaged } from "./actions";
import { CustomersClient } from "./_components/customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
    const initial = await listCustomersPaged({ page: 1, pageSize: 20 });
    return <CustomersClient initial={initial} />;
}
