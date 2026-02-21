import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import type { OrderStatus } from "@/lib/constants/order-status";

export const runtime = "nodejs";

type OrdersPayload = {
    phone?: string;
};

type OrderRow = {
    id: string;
    created_at: string;
    status: OrderStatus;
    total_amount: number;
    currency: string;
    shipping_address: unknown;
    billing_address: unknown;
    order_items: Array<{ id: string }> | null;
};

type ContactLike = {
    phone: string;
};

function cleanPhoneInput(value: unknown) {
    if (typeof value !== "string") return "";
    return value.trim();
}

function normalizePhone(value: string) {
    return value.replace(/[^0-9]/g, "");
}

function normalizeText(value: unknown) {
    if (typeof value !== "string") return "";
    return value.trim();
}

function sanitizeFilterTerm(input: string) {
    return input.replace(/[%*,]/g, "").trim();
}

function toObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function extractContact(value: unknown): ContactLike {
    const obj = toObject(value);
    if (!obj) return { phone: "" };
    const phone = normalizeText(obj.phone) || normalizeText(obj.contact_phone);
    return { phone };
}

function resolvePhone(shipping: unknown, billing: unknown) {
    const s = extractContact(shipping);
    const b = extractContact(billing);
    return s.phone || b.phone || "";
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as OrdersPayload;
        const phone = cleanPhoneInput(body?.phone);
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone || normalizedPhone.length < 6) {
            return NextResponse.json({ error: "A valid mobile number is required." }, { status: 400 });
        }

        const supabase = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
        const normalizedTail = normalizedPhone.slice(-7);
        const termCandidates = Array.from(
            new Set([
                sanitizeFilterTerm(phone),
                normalizedPhone,
                normalizedTail,
            ].filter((value) => value && value.length >= 4)),
        );
        const filters = termCandidates.flatMap((term) => [
            `shipping_address->>phone.ilike.%${term}%`,
            `billing_address->>phone.ilike.%${term}%`,
        ]);

        const { data, error } = await supabase
            .from("orders")
            .select("id,created_at,status,total_amount,currency,shipping_address,billing_address,order_items(id)")
            .or(filters.join(","))
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) {
            const message = (error.message || "").toLowerCase();
            const permissionDenied = message.includes("permission") || message.includes("rls") || message.includes("42501");
            if (permissionDenied) {
                return NextResponse.json({ orders: [] });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rows = (data || []) as OrderRow[];
        const matched = rows.filter((row) => {
            const resolvedPhone = resolvePhone(row.shipping_address, row.billing_address);
            const normalized = normalizePhone(resolvedPhone);
            if (!normalized) return false;
            return normalized === normalizedPhone || normalized.includes(normalizedPhone) || normalizedPhone.includes(normalized);
        });

        const orders = matched.map((row) => ({
            id: row.id,
            createdAt: row.created_at,
            status: row.status,
            totalAmount: row.total_amount,
            currency: row.currency || "USD",
            itemsCount: Array.isArray(row.order_items) ? row.order_items.length : 0,
        }));

        return NextResponse.json({ orders });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
