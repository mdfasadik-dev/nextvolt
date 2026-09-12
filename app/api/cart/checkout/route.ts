import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import { OrderService, OrderChargeInsert } from "@/lib/services/orderService";
import { CheckoutService } from "@/lib/services/checkoutService";
import { TelegramService } from "@/lib/services/telegramService";
import { DEFAULT_CURRENCY_CODE } from "@/lib/constants/currency";
import { parseCustomFields } from "@/lib/types/payment-method";
import type { Json } from "@/lib/types/supabase";

export const runtime = "nodejs";

interface CheckoutItem {
    productId: string;
    productName?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    quantity: number;
    unitPrice?: number | null;
    metadata?: Record<string, unknown> | null;
}

interface CheckoutPayload {
    items: CheckoutItem[];
    currency?: string;
    contact?: Record<string, unknown> | null;
    notes?: string | null;
    deliveryId?: string;
    paymentMethodId?: string;
    paymentData?: Record<string, unknown> | null;
    couponCode?: string;
}

type InventoryRow = {
    product_id: string;
    variant_id: string | null;
    sale_price: number;
    discount_type: string;
    discount_value: number | null;
};

function toMoney(value: number) {
    return Math.round(value * 100) / 100;
}

function toNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function computeFinalPrice(rows: InventoryRow[]): number | null {
    if (!rows.length) return null;
    let minFinal: number | null = null;
    for (const row of rows) {
        const original = Number(row.sale_price);
        if (!Number.isFinite(original)) continue;
        let final = original;
        if (row.discount_type === "percent" && row.discount_value) {
            final = original * (1 - row.discount_value / 100);
        } else if (row.discount_type === "amount" && row.discount_value) {
            final = Math.max(0, original - row.discount_value);
        }
        minFinal = minFinal == null ? final : Math.min(minFinal, final);
    }
    return minFinal;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as CheckoutPayload;
        if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        const items = body.items
            .map((item) => {
                if (!item || typeof item !== "object") return null;
                const productId = typeof item.productId === "string" ? item.productId : null;
                const quantity = Number(item.quantity);
                const unitPrice = item.unitPrice == null ? null : Number(item.unitPrice);
                if (!productId || !Number.isFinite(quantity) || quantity <= 0) return null;
                return {
                    productId,
                    productName: typeof item.productName === "string" ? item.productName : null,
                    variantId: typeof item.variantId === "string" ? item.variantId : null,
                    variantName: typeof item.variantName === "string" ? item.variantName : null,
                    quantity,
                    unitPrice,
                    metadata: item.metadata || null,
                };
            })
            .filter((item): item is NonNullable<typeof item> => !!item);

        if (!items.length) {
            return NextResponse.json({ error: "No valid cart items" }, { status: 400 });
        }

        // Single-currency store: ignore whatever the client posts so a stale
        // cached bundle can never persist the wrong currency on an order.
        const currency = DEFAULT_CURRENCY_CODE;

        const supabase = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();

        // 1. Verify Prices against Inventory
        const productIds = Array.from(new Set(items.map((item) => item.productId)));
        const { data: inventoryRows, error: inventoryError } = await supabase
            .from("inventory")
            .select("product_id,variant_id,sale_price,discount_type,discount_value")
            .in("product_id", productIds);
        if (inventoryError) {
            return NextResponse.json({ error: inventoryError.message }, { status: 500 });
        }

        const resolvedItems = items.map((item) => {
            const rows = (inventoryRows || []).filter((row) => {
                if (item.variantId) return row.variant_id === item.variantId;
                return row.variant_id == null;
            }).filter((row) => row.product_id === item.productId);
            const computed = computeFinalPrice(rows as InventoryRow[]);
            const fallbackRows = (inventoryRows || []).filter((row) => row.product_id === item.productId);
            const finalPrice = computed ?? computeFinalPrice(fallbackRows as InventoryRow[]) ?? item.unitPrice ?? 0;
            return {
                ...item,
                unitPrice: toMoney(finalPrice),
                lineTotal: toMoney(finalPrice * item.quantity),
            };
        });

        // 2. Use CheckoutService for Totals (Delivery, Coupons, Taxes)
        const calculationInput = resolvedItems.map(i => ({
            productId: i.productId,
            variantId: i.variantId || undefined,
            quantity: i.quantity,
            price: i.unitPrice
        }));

        const totals = await CheckoutService.calculateOrderTotals(
            calculationInput,
            body.deliveryId,
            body.couponCode,
            body.paymentMethodId
        );

        const contactData = body.contact && typeof body.contact === "object" ? body.contact : null;
        const notes = typeof body.notes === "string" && body.notes.trim().length ? body.notes.trim() : null;

        // Fetch Payment Method info & Custom Data if provided
        let paymentMethodInfo: Record<string, unknown> | null = null;
        if (body.paymentMethodId) {
            const { data: pmData } = await supabase
                .from("payment_methods")
                .select("id, key, label, custom_fields")
                .eq("id", body.paymentMethodId)
                .maybeSingle();

            if (pmData) {
                const customFields = parseCustomFields(pmData.custom_fields);

                const paymentDataObj = body.paymentData && typeof body.paymentData === "object" ? body.paymentData : {};

                const customFieldsData = customFields
                    .map((f) => {
                        const rawVal = paymentDataObj[f.id];
                        const valStr = typeof rawVal === "string" ? rawVal.trim() : rawVal != null ? String(rawVal).trim() : "";
                        return valStr ? { id: f.id, label: f.label, value: valStr } : null;
                    })
                    .filter((item): item is { id: string; label: string; value: string } => !!item);

                paymentMethodInfo = {
                    id: pmData.id,
                    key: pmData.key,
                    label: pmData.label,
                    custom_fields_data: customFieldsData,
                };
            }
        }

        // Fetch Delivery Method info if provided
        let deliveryMethodInfo: Record<string, unknown> | null = null;
        if (body.deliveryId) {
            const { data: delData } = await supabase
                .from("delivery")
                .select("id, label")
                .eq("id", body.deliveryId)
                .maybeSingle();

            if (delData) {
                deliveryMethodInfo = {
                    id: delData.id,
                    label: delData.label,
                };
            }
        }

        // 3. Prepare Charges from CheckoutService Calculation
        const charges: OrderChargeInsert[] = [];

        // Delivery
        if (totals.delivery) {
            charges.push({
                type: 'charge',
                calc_type: 'amount',
                base_amount: totals.delivery.amount,
                applied_amount: totals.delivery.amount,
                order_id: '',
                delivery_id: totals.delivery.id,
                metadata: { label: totals.delivery.label }
            });
        }

        // Coupon Discount
        if (totals.discount) {
            charges.push({
                type: 'discount',
                calc_type: totals.discount.type,
                base_amount: totals.discount.amount, // This might need adjustment if type is 'percent'
                applied_amount: totals.discount.amount,
                order_id: '',
                coupon_id: totals.discount.id,
                metadata: { label: `Coupon ${totals.discount.code}` }
            });
        }

        // Other Charges (Taxes/Fees)
        totals.charges.forEach(c => {
            charges.push({
                type: c.type, // 'tax' or 'fee'
                calc_type: 'amount', // We calculated the amount already
                base_amount: c.amount,
                applied_amount: c.amount,
                order_id: '',
                charge_option_id: c.id,
                metadata: { label: c.label }
            });
        });

        // 3.5 Prepare Shipping Address JSON with Contact Info
        let shippingAddressPayload: Json | null = null;
        if (contactData) {
            const shippingAddress = contactData.shipping_address;
            const nestedAddress =
                shippingAddress && typeof shippingAddress === "object" && !Array.isArray(shippingAddress)
                    ? (shippingAddress as Record<string, unknown>).address
                    : null;

            shippingAddressPayload = {
                fullName: toNullableString(contactData.fullName),
                email: toNullableString(contactData.email),
                phone: toNullableString(contactData.phone),
                address: toNullableString(nestedAddress),
                payment_method_info: paymentMethodInfo,
                delivery_method_info: deliveryMethodInfo || (totals.delivery ? { id: totals.delivery.id, label: totals.delivery.label } : null),
            } as Json;
        }

        // 4. Create Order
        const order = await OrderService.create({
            currency,
            subtotal_amount: totals.subtotal,
            total_amount: totals.total,
            status: "pending",
            customer_id: null, // No customer linking
            shipping_address: shippingAddressPayload,
            notes,
            charges: charges
        });

        if (!order) {
            return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
        }

        const orderItemsPayload = resolvedItems.map((item) => {
            let sku: string | null = null;
            if (item.metadata && typeof item.metadata === "object") {
                const candidate = (item.metadata as Record<string, unknown>).sku;
                if (typeof candidate === "string") sku = candidate;
            }
            return {
                order_id: order.id,
                product_id: item.productId,
                product_name: item.productName,
                variant_id: item.variantId,
                variant_title: item.variantName,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                line_total: item.lineTotal,
                sku,
            };
        });

        const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
        if (itemsError) {
            await supabase.from("orders").delete().eq("id", order.id);
            return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }

        // Notify only once the order and its items are safely persisted.
        // Deliberately awaited so serverless doesn't kill the request early,
        // and it never throws, so a Telegram outage cannot fail a paid order.
        await TelegramService.notifyNewOrder({
            orderId: order.id,
            currency,
            items: orderItemsPayload.map(item => ({
                name: item.product_name,
                variant: item.variant_title,
                quantity: item.quantity,
                lineTotal: item.line_total,
            })),
            subtotal: totals.subtotal,
            total: totals.total,
            customerName: toNullableString(contactData?.fullName),
            customerPhone: toNullableString(contactData?.phone),
        });

        return NextResponse.json({ order, items: orderItemsPayload }, { status: 201 });
    } catch (error: unknown) {
        console.error("[checkout]", error);
        const message = error instanceof Error ? error.message : "Unexpected error";
        const lowered = String(message).toLowerCase();
        const isValidationError =
            lowered.includes("coupon") ||
            lowered.includes("minimum order amount") ||
            lowered.includes("unavailable") ||
            lowered.includes("out of stock") ||
            lowered.includes("inactive product") ||
            lowered.includes("inactive category");
        return NextResponse.json({ error: message }, { status: isValidationError ? 400 : 500 });
    }
}
