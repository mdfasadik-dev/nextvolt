import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CustomerService } from "@/lib/services/customerService";

export const runtime = "nodejs";

function escapeCsv(value: string) {
    if (!value) return "";
    const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (/[",\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, "\"\"")}"`;
    }
    return normalized;
}

function formatDateTime(value: string | null) {
    if (!value) return "";
    try {
        return new Date(value).toISOString();
    } catch {
        return value;
    }
}

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await CustomerService.listAll();

    const headers = [
        "Mobile Number",
        "Name",
        "Email",
        "Total Orders",
        "Latest Order Date",
        "Latest Order ID",
    ];

    const lines = [
        headers.join(","),
        ...customers.map(customer =>
            [
                escapeCsv(customer.phone || ""),
                escapeCsv(customer.name || ""),
                escapeCsv(customer.email || ""),
                String(customer.ordersCount),
                escapeCsv(formatDateTime(customer.latestOrderAt)),
                escapeCsv(customer.latestOrderId || ""),
            ].join(","),
        ),
    ];

    const csv = `\uFEFF${lines.join("\n")}`;

    const fileDate = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="customers-${fileDate}.csv"`,
            "Cache-Control": "no-store",
        },
    });
}
