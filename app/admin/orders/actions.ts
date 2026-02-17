"use server";

import {
    OrderService,
    OrderListResult,
    OrderDetail,
    OrderChargeInsert
} from "@/lib/services/orderService";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/constants/order-status";

async function assertAuthenticated() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user;
}

export async function listOrders(
    input: { status?: OrderStatus | "all"; search?: string; page?: number; pageSize?: number } = {},
): Promise<OrderListResult> {
    noStore();
    await assertAuthenticated();
    return OrderService.listSummaries(input);
}

export async function getOrderDetail(payload: { id: string }): Promise<OrderDetail | null> {
    noStore();
    await assertAuthenticated();
    return OrderService.getDetail(payload.id, { useAdmin: true });
}

export async function createOrder(payload: {
    currency?: string;
    subtotal_amount?: number;
    discount_amount?: number;
    shipping_amount?: number;
    status?: OrderStatus;
    notes?: string | null;
}) {
    await assertAuthenticated();

    const charges: OrderChargeInsert[] = [];

    if (payload.shipping_amount && payload.shipping_amount > 0) {
        charges.push({
            type: 'charge',
            calc_type: 'amount',
            base_amount: payload.shipping_amount,
            applied_amount: payload.shipping_amount,
            order_id: '', // Will be set by service
            metadata: { label: 'Shipping' }
        });
    }

    if (payload.discount_amount && payload.discount_amount > 0) {
        charges.push({
            type: 'discount',
            calc_type: 'amount',
            base_amount: payload.discount_amount,
            applied_amount: payload.discount_amount,
            order_id: '', // Will be set by service
            metadata: { label: 'Discount' }
        });
    }

    // Calculate total if not provided or just rely on inputs
    const subtotal = payload.subtotal_amount ?? 0;
    const shipping = payload.shipping_amount ?? 0;
    const discount = payload.discount_amount ?? 0;
    const total = subtotal - discount + shipping;

    const record = await OrderService.create({
        ...payload,
        total_amount: total,
        charges
    });
    revalidatePath("/admin/orders");
    return record;
}

export async function updateOrder(payload: {
    id: string;
    currency?: string;
    subtotal_amount?: number;
    discount_amount?: number;
    shipping_amount?: number;
    status?: OrderStatus;
    notes?: string | null;
}) {
    await assertAuthenticated();
    // Note: This update will NOT update charges/discounts in the new table.
    // It only updates fields that still exist on the orders table.
    // Full support for editing orders with charges would require a more complex UI/Service update.

    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        discount_amount,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shipping_amount,
        ...rest
    } = payload;

    const record = await OrderService.update(payload.id, rest);
    revalidatePath("/admin/orders");
    return record;
}

export async function updateOrderStatus(payload: { id: string; status: OrderStatus }) {
    await assertAuthenticated();
    const record = await OrderService.updateStatus(payload.id, payload.status);
    revalidatePath("/admin/orders");
    return record;
}

export async function updateOrderNotes(payload: { id: string; notes: string | null }) {
    await assertAuthenticated();
    const record = await OrderService.updateNotes(payload.id, payload.notes);
    revalidatePath("/admin/orders");
    return record;
}

export async function deleteOrder(payload: { id: string }) {
    await assertAuthenticated();
    const res = await OrderService.remove(payload.id);
    revalidatePath("/admin/orders");
    return res;
}
