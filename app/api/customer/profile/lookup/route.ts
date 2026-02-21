import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export const runtime = "nodejs";

type LookupPayload = {
    phone?: string;
};

type ContactLike = {
    fullName: string;
    email: string;
    phone: string;
    address: string;
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

function toObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function extractContact(value: unknown): ContactLike {
    const obj = toObject(value);
    if (!obj) return { fullName: "", email: "", phone: "", address: "" };

    const fullName = normalizeText(obj.fullName) || normalizeText(obj.full_name) || normalizeText(obj.name);
    const email = normalizeText(obj.email) || normalizeText(obj.contact_email);
    const phone = normalizeText(obj.phone) || normalizeText(obj.contact_phone);

    const addressDirect = normalizeText(obj.address);
    const addressParts = [
        normalizeText(obj.address_line1),
        normalizeText(obj.address_line2),
        normalizeText(obj.city),
        normalizeText(obj.state),
        normalizeText(obj.postal_code),
        normalizeText(obj.country),
    ].filter(Boolean);

    return {
        fullName,
        email,
        phone,
        address: addressDirect || addressParts.join(", "),
    };
}

function mergeContact(primary: ContactLike, fallback: ContactLike): ContactLike {
    return {
        fullName: primary.fullName || fallback.fullName,
        email: primary.email || fallback.email,
        phone: primary.phone || fallback.phone,
        address: primary.address || fallback.address,
    };
}

function sanitizeFilterTerm(input: string) {
    return input.replace(/[%*,]/g, "").trim();
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as LookupPayload;
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
            .select("id,created_at,shipping_address,billing_address")
            .or(filters.join(","))
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) {
            const message = (error.message || "").toLowerCase();
            const permissionDenied = message.includes("permission") || message.includes("rls") || message.includes("42501");
            if (permissionDenied) {
                return NextResponse.json({ exists: false, customer: null });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rows = data || [];
        type Candidate = { created_at: string; contact: ContactLike; normalized: string };
        const exactMatches: Candidate[] = [];
        const fallbackMatches: Candidate[] = [];

        for (const row of rows) {
            const shipping = extractContact(row.shipping_address);
            const billing = extractContact(row.billing_address);
            const merged = mergeContact(shipping, billing);
            const normalized = normalizePhone(merged.phone);
            if (!normalized) continue;

            const candidate = { created_at: row.created_at, contact: merged, normalized };
            if (normalized === normalizedPhone) {
                exactMatches.push(candidate);
            } else if (normalized.includes(normalizedPhone) || normalizedPhone.includes(normalized)) {
                fallbackMatches.push(candidate);
            }
        }

        const resolved = exactMatches[0] || fallbackMatches[0];
        if (!resolved) {
            return NextResponse.json({ exists: false, customer: null });
        }

        return NextResponse.json({
            exists: true,
            customer: {
                fullName: resolved.contact.fullName,
                email: resolved.contact.email,
                phone: resolved.contact.phone || phone,
                address: resolved.contact.address,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
