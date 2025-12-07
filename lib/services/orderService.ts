import "server-only";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import { ORDER_STATUS_OPTIONS } from "@/lib/constants/order-status";
import type { OrderStatus } from "@/lib/constants/order-status";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

export type Order = Tables<"orders">;
export type OrderCreate = TablesInsert<"orders">;
export type OrderUpdate = TablesUpdate<"orders">;
export type OrderChargeInsert = TablesInsert<"order_charges">;

const envCurrencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
const INVENTORY_STATUSES = new Set<OrderStatus>(["paid", "shipped", "completed"]);

export interface OrderSummary {
    id: string;
    createdAt: string;
    status: OrderStatus;
    subtotalAmount: number;
    discountAmount: number;
    shippingAmount: number;
    totalAmount: number;
    currency: string;
    currencySymbol: string;
    notes: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    itemsCount: number;
}

export interface OrderItemDetail {
    id: string;
    productId: string | null;
    productName: string | null;
    variantId: string | null;
    variantTitle: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface ContactDetails {
    name: string | null;
    email: string | null;
    phone: string | null;
    addressLines: string[];
}

export interface ChargeDetail {
    id: string;
    type: "charge" | "discount";
    calcType: "amount" | "percent";
    baseAmount: number;
    appliedAmount: number;
    label: string | null; // Derived from metadata or elsewhere if needed
}

export interface OrderDetail extends OrderSummary {
    shippingAddress: Record<string, unknown> | null;
    billingAddress: Record<string, unknown> | null;
    shippingContact: ContactDetails;
    billingContact: ContactDetails;
    items: OrderItemDetail[];
    charges: ChargeDetail[];
}

export interface OrderListResult {
    orders: OrderSummary[];
    counts: Record<OrderStatus | "all", number>;
}

type EnrichedOrderSummary = OrderSummary & {
    shippingContact: ContactDetails;
    billingContact: ContactDetails;
};

function extractContactDetails(data: unknown): ContactDetails {
    if (!data || typeof data !== "object") {
        return { name: null, email: null, phone: null, addressLines: [] };
    }
    const obj = data as Record<string, unknown>;
    // Prefer the new keys we are saving in checkout: fullName, email, phone
    const name = (obj.fullName || obj.full_name || obj.name || obj.contact_name) as string | null | undefined;
    const email = (obj.email || obj.contact_email) as string | null | undefined;
    const phone = (obj.phone || obj.contact_phone) as string | null | undefined;

    // Address might be in 'address' key (single string) or legacy fields
    const addressParts = [
        obj.address,
        obj.address_line1,
        obj.address_line2,
        obj.city,
        obj.state,
        obj.postal_code,
        obj.country,
    ]
        .map(part => (typeof part === "string" ? part : null))
        .filter((part): part is string => !!part);

    return {
        name: name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        addressLines: addressParts,
    };
}

export class OrderService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> {
        return op().catch((error: unknown) => {
            if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "42501") {
                (error as { message?: string }).message = "RLS blocked orders operation";
            }
            throw error;
        });
    }

    static async list(): Promise<Order[]> {
        return this.wrap(async () => {
            const client = await createClient();
            const { data, error } = await client.from("orders").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        });
    }

    static async listSummaries(filters: { status?: OrderStatus | "all"; search?: string } = {}): Promise<OrderListResult> {
        return this.wrap(async () => {
            const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            // Select order_charges to calculate shipping/discounts on the fly
            const { data, error } = await client
                .from("orders")
                .select(`
                    id, 
                    created_at, 
                    status, 
                    subtotal_amount, 
                    total_amount, 
                    currency, 
                    notes, 
                    shipping_address, 
                    billing_address, 
                    order_items (id),
                    order_charges (type, applied_amount, delivery_id)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const summaries: EnrichedOrderSummary[] = (data || []).map(row => {
                const shippingContact = extractContactDetails(row.shipping_address);
                const billingContact = extractContactDetails(row.billing_address);

                // Aggregate charges
                let discountAmount = 0;
                let shippingAmount = 0;

                if (Array.isArray(row.order_charges)) {
                    for (const charge of row.order_charges) {
                        if (charge.type === 'discount') {
                            discountAmount += charge.applied_amount;
                        } else if (charge.type === 'charge') {
                            // Assuming all charges are shipping/delivery for now or checking a flag
                            // Use delivery_id presence as heuristic for shipping OR just treat all charges as 'shipping/extra' for summary view
                            shippingAmount += charge.applied_amount;
                        }
                    }
                }

                return {
                    id: row.id,
                    createdAt: row.created_at,
                    status: row.status as OrderStatus,
                    subtotalAmount: row.subtotal_amount,
                    discountAmount,
                    shippingAmount,
                    totalAmount: row.total_amount,
                    currency: row.currency,
                    currencySymbol: envCurrencySymbol,
                    notes: row.notes ?? null,
                    customerName: shippingContact.name,
                    customerEmail: shippingContact.email,
                    customerPhone: shippingContact.phone,
                    itemsCount: Array.isArray(row.order_items) ? row.order_items.length : 0,
                    shippingContact,
                    billingContact,
                };
            });

            const counts: Record<OrderStatus | "all", number> = { all: 0, pending: 0, paid: 0, shipped: 0, completed: 0, cancelled: 0 };
            for (const summary of summaries) {
                counts[summary.status] = (counts[summary.status] ?? 0) + 1;
                counts.all += 1;
            }

            let filtered = summaries;
            if (filters.status && filters.status !== "all") {
                filtered = filtered.filter(order => order.status === filters.status);
            }

            if (filters.search) {
                const term = filters.search.trim().toLowerCase();
                if (term.length) {
                    filtered = filtered.filter(order => {
                        const haystack = [
                            order.id,
                            order.customerName ?? "",
                            order.customerEmail ?? "",
                            order.customerPhone ?? "",
                            order.notes ?? "",
                            order.shippingContact.addressLines.join(" "),
                            order.billingContact.addressLines.join(" "),
                        ]
                            .join(" ")
                            .toLowerCase();
                        return haystack.includes(term);
                    });
                }
            }

            return {
                orders: filtered.map(({ shippingContact: _s, billingContact: _b, ...rest }) => rest as OrderSummary),
                counts,
            };
        });
    }

    static async getDetail(id: string, options: { useAdmin?: boolean } = {}): Promise<OrderDetail | null> {
        return this.wrap(async () => {
            const shouldUseAdmin = options.useAdmin ?? !!SUPABASE_SERVICE_ROLE_KEY;
            const client = shouldUseAdmin && SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            const { data, error } = await client
                .from("orders")
                .select(`
                    id,
                    created_at,
                    status,
                    subtotal_amount,
                    total_amount,
                    currency,
                    notes,
                    shipping_address,
                    billing_address,
                    order_items (
                        id,
                        product_id,
                        product_name,
                        variant_id,
                        variant_title,
                        sku,
                        quantity,
                        unit_price,
                        line_total
                    ),
                    order_charges (*)
                `)
                .eq("id", id)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;

            const shippingContact = extractContactDetails(data.shipping_address);
            const billingContact = extractContactDetails(data.billing_address);

            // Aggregate charges
            let discountAmount = 0;
            let shippingAmount = 0;
            const charges: ChargeDetail[] = [];

            if (Array.isArray(data.order_charges)) {
                for (const charge of data.order_charges) {
                    if (charge.type === 'discount') {
                        discountAmount += charge.applied_amount;
                    } else if (charge.type === 'charge') {
                        shippingAmount += charge.applied_amount;
                    }
                    charges.push({
                        id: charge.id,
                        type: charge.type as "charge" | "discount",
                        calcType: charge.calc_type as "amount" | "percent",
                        baseAmount: charge.base_amount,
                        appliedAmount: charge.applied_amount,
                        label: (charge.metadata as any)?.label || (charge.type === 'charge' ? 'Delivery' : 'Discount')
                    });
                }
            }

            const items: OrderItemDetail[] = Array.isArray(data.order_items)
                ? data.order_items.map(item => ({
                    id: item.id,
                    productId: item.product_id,
                    productName: item.product_name,
                    variantId: item.variant_id,
                    variantTitle: item.variant_title,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    lineTotal: item.line_total,
                }))
                : [];

            return {
                id: data.id,
                createdAt: data.created_at,
                status: data.status as OrderStatus,
                subtotalAmount: data.subtotal_amount,
                discountAmount,
                shippingAmount,
                totalAmount: data.total_amount,
                currency: data.currency,
                currencySymbol: envCurrencySymbol,
                notes: data.notes ?? null,
                customerName: shippingContact.name,
                customerEmail: shippingContact.email,
                customerPhone: shippingContact.phone,
                itemsCount: items.length,
                shippingAddress: (data.shipping_address as Record<string, unknown> | null) ?? null,
                billingAddress: (data.billing_address as Record<string, unknown> | null) ?? null,
                shippingContact,
                billingContact,
                items,
                charges
            };
        });
    }

    static async create(input: Partial<OrderCreate> & { charges?: OrderChargeInsert[] }): Promise<Order | null> {
        return this.wrap(async () => {
            const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();

            // 1. Create Order
            const base: OrderCreate = {
                currency: input.currency || "USD",
                subtotal_amount: input.subtotal_amount ?? 0,
                total_amount: input.total_amount ?? 0, // Should be passed correctly calculated
                status: (input.status as OrderStatus) || "pending",
                id: input.id,
                billing_address: input.billing_address ?? null,
                customer_id: input.customer_id ?? null,
                notes: input.notes ?? null,
                shipping_address: input.shipping_address ?? null,
            } as OrderCreate;

            const { data: order, error } = await client.from("orders").insert(base).select().single();
            if (error) throw error;

            // 2. Create Charges (if any)
            if (input.charges && input.charges.length > 0) {
                const chargesPayload = input.charges.map(c => ({
                    ...c,
                    order_id: order.id
                }));
                const { error: chargesError } = await client.from("order_charges").insert(chargesPayload);
                if (chargesError) {
                    // Cleanup? 
                    console.error("Failed to insert charges", chargesError);
                }
            }

            return order;
        });
    }

    static async update(id: string, patch: Partial<OrderUpdate>): Promise<Order | null> {
        return this.wrap(async () => {
            const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            // Recalculation logic logic mostly moves to the caller or handled by hooks/triggers, 
            // but for simple updates we just pass through.
            // If total needs update based on charges, it's complex. 
            // For now, assume patch contains correct totals.

            const payload: Record<string, unknown> = { ...patch };
            const { data, error } = await client.from("orders").update(payload).eq("id", id).select().single();
            if (error) throw error;
            return data;
        });
    }

    static async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
        return this.wrap(async () => {
            const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();

            // First, just get the current status
            const { data: existing, error: loadError } = await client
                .from("orders")
                .select("status")
                .eq("id", id)
                .maybeSingle();
            if (loadError) throw loadError;
            if (!existing) throw new Error("Order not found");

            const previousStatus = existing.status as OrderStatus;
            if (previousStatus === status) {
                const { data } = await client.from("orders").select("*").eq("id", id).maybeSingle();
                return data as Order | null;
            }

            // Update the status
            const { data: updated, error: updateError } = await client
                .from("orders")
                .update({ status })
                .eq("id", id)
                .select()
                .maybeSingle();

            if (updateError) throw updateError;
            if (!updated) throw new Error("Order update returned no data");

            // Handle inventory adjustment if needed
            const hadInventory = INVENTORY_STATUSES.has(previousStatus);
            const willHaveInventory = INVENTORY_STATUSES.has(status);
            const direction = willHaveInventory === hadInventory ? 0 : willHaveInventory ? -1 : 1;

            if (direction !== 0) {
                try {
                    // Fetch order items separately
                    const { data: orderItems } = await client
                        .from("order_items")
                        .select("product_id, variant_id, quantity")
                        .eq("order_id", id);

                    if (orderItems && orderItems.length > 0) {
                        await OrderService.adjustInventoryForOrder(client, orderItems, direction);
                    }
                } catch (inventoryError) {
                    console.error("Inventory adjustment failed:", inventoryError);
                    // Rollback status change if inventory adjustment fails
                    await client.from("orders").update({ status: previousStatus }).eq("id", id);
                    throw inventoryError;
                }
            }

            return updated;
        });
    }

    static async updateNotes(id: string, notes: string | null): Promise<Order | null> {
        return this.update(id, { notes });
    }

    static async remove(id: string): Promise<{ id: string } | null> {
        return this.wrap(async () => {
            const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            const { error } = await client.from("orders").delete().eq("id", id);
            if (error) throw error;
            return { id };
        });
    }

    private static async adjustInventoryForOrder(
        client: SupabaseClient<Database>,
        items: Array<{ product_id: string | null; variant_id: string | null; quantity: number | null }>,
        direction: 1 | -1,
    ) {
        const aggregated = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
        for (const item of items) {
            if (!item.product_id || !item.quantity) continue;
            const key = `${item.product_id}:${item.variant_id ?? "null"}`;
            const entry = aggregated.get(key);
            if (entry) entry.quantity += item.quantity;
            else aggregated.set(key, { productId: item.product_id, variantId: item.variant_id, quantity: item.quantity });
        }
        if (!aggregated.size) return;

        const adjustments: Array<{ id: string; previous: number }> = [];
        try {
            for (const entry of aggregated.values()) {
                let query = client.from("inventory").select("id, quantity").eq("product_id", entry.productId);
                if (entry.variantId) query = query.eq("variant_id", entry.variantId);
                else query = query.is("variant_id", null);

                const { data, error } = await query.limit(1).maybeSingle();

                if (error) throw error;
                if (!data) {
                    console.warn(`Inventory record missing for product ${entry.productId} variant ${entry.variantId}`);
                    continue; // Skip if no inventory record found to avoid crash
                }

                const previous = data.quantity ?? 0;
                const next = Math.max(0, previous + direction * entry.quantity);
                const { error: updateError } = await client.from("inventory").update({ quantity: next }).eq("id", data.id);
                if (updateError) throw updateError;
                adjustments.push({ id: data.id, previous });
            }
        } catch (error) {
            for (const adjustment of adjustments) {
                await client.from("inventory").update({ quantity: adjustment.previous }).eq("id", adjustment.id);
            }
            throw error;
        }
    }
}

export type { OrderStatus } from "@/lib/constants/order-status";
