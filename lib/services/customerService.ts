import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { CustomerListResult, CustomerSummary } from "@/lib/services/customerTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

type PagedCustomerRow = {
    phone: string | null;
    name: string | null;
    email: string | null;
    latest_order_id: string | null;
    latest_order_at: string | null;
    orders_count: number | string | null;
    total_count: number | string | null;
};

type ExportCustomerRow = Omit<PagedCustomerRow, "total_count">;
type RpcErrorLike = { code?: string; message?: string } | null;
type OrderContactRow = {
    id: string;
    created_at: string;
    shipping_address: unknown;
    billing_address: unknown;
};
type CustomerAggregate = CustomerSummary & { latestEpoch: number };

function parseNumber(value: number | string | null | undefined): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function mapRow(row: ExportCustomerRow): CustomerSummary {
    return {
        phone: row.phone || "",
        name: row.name ?? null,
        email: row.email ?? null,
        ordersCount: parseNumber(row.orders_count),
        latestOrderId: row.latest_order_id ?? null,
        latestOrderAt: row.latest_order_at ?? null,
    };
}

function sanitizeSearch(search: string) {
    return search.replace(/[%*,]/g, " ").trim();
}

function isRpcMissing(error: RpcErrorLike) {
    if (!error) return false;
    const message = (error.message || "").toLowerCase();
    return error.code === "PGRST202" || message.includes("admin_customers_page") || message.includes("admin_customers_all");
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown> | null, keys: string[]): string | null {
    if (!record) return null;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        }
    }
    return null;
}

function normalizePhone(phone: string | null): string | null {
    if (!phone) return null;
    const normalized = phone.replace(/[^0-9]/g, "");
    return normalized || null;
}

function toEpoch(value: string | null) {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function extractOrderContact(row: OrderContactRow) {
    const shipping = asRecord(row.shipping_address);
    const billing = asRecord(row.billing_address);
    const phone = readString(shipping, ["phone", "contact_phone"]) || readString(billing, ["phone", "contact_phone"]);
    const name =
        readString(shipping, ["fullName", "full_name", "name", "contact_name"]) ||
        readString(billing, ["fullName", "full_name", "name", "contact_name"]);
    const email = readString(shipping, ["email", "contact_email"]) || readString(billing, ["email", "contact_email"]);
    return { phone, name, email };
}

function groupUniqueCustomers(rows: OrderContactRow[], rawSearch?: string): CustomerSummary[] {
    const grouped = new Map<string, CustomerAggregate>();
    for (const row of rows) {
        const contact = extractOrderContact(row);
        const phoneKey = normalizePhone(contact.phone);
        if (!phoneKey || !contact.phone) continue;

        const epoch = toEpoch(row.created_at);
        const existing = grouped.get(phoneKey);
        if (!existing) {
            grouped.set(phoneKey, {
                phone: contact.phone,
                name: contact.name,
                email: contact.email,
                ordersCount: 1,
                latestOrderId: row.id,
                latestOrderAt: row.created_at,
                latestEpoch: epoch,
            });
            continue;
        }

        existing.ordersCount += 1;
        if (epoch >= existing.latestEpoch) {
            existing.latestEpoch = epoch;
            existing.latestOrderAt = row.created_at;
            existing.latestOrderId = row.id;
            existing.phone = contact.phone;
            existing.name = contact.name;
            existing.email = contact.email;
        }
    }

    let customers = Array.from(grouped.values());
    const search = rawSearch?.trim().toLowerCase();
    if (search) {
        customers = customers.filter(customer => {
            const haystack = `${customer.phone} ${customer.name || ""} ${customer.email || ""}`.toLowerCase();
            return haystack.includes(search);
        });
    }

    customers.sort((a, b) => b.latestEpoch - a.latestEpoch);
    return customers.map(customer => ({
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        ordersCount: customer.ordersCount,
        latestOrderId: customer.latestOrderId,
        latestOrderAt: customer.latestOrderAt,
    }));
}

export class CustomerService {
    private static async fetchOrderContacts(
        supabase: SupabaseClient<Database>,
        search?: string,
    ): Promise<OrderContactRow[]> {
        let query = supabase
            .from("orders")
            .select("id,created_at,shipping_address,billing_address")
            .order("created_at", { ascending: false });

        const term = search ? sanitizeSearch(search) : "";
        if (term) {
            query = query.or(
                [
                    `shipping_address->>phone.ilike.%${term}%`,
                    `shipping_address->>email.ilike.%${term}%`,
                    `shipping_address->>fullName.ilike.%${term}%`,
                    `shipping_address->>full_name.ilike.%${term}%`,
                    `shipping_address->>name.ilike.%${term}%`,
                    `billing_address->>phone.ilike.%${term}%`,
                    `billing_address->>email.ilike.%${term}%`,
                    `billing_address->>fullName.ilike.%${term}%`,
                    `billing_address->>full_name.ilike.%${term}%`,
                    `billing_address->>name.ilike.%${term}%`,
                ].join(","),
            );
        }

        const { data, error } = await query;
        if (error) {
            throw new Error(error.message);
        }

        return (data || []) as OrderContactRow[];
    }

    private static async listPagedFallback(params: {
        page: number;
        pageSize: number;
        search?: string | null;
    }): Promise<CustomerListResult> {
        const supabase = await createAdminClient();
        const rows = await this.fetchOrderContacts(supabase, params.search || undefined);
        const customers = groupUniqueCustomers(rows, params.search || undefined);
        const total = customers.length;
        const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
        const from = (params.page - 1) * params.pageSize;
        const to = from + params.pageSize;
        return {
            rows: customers.slice(from, to),
            page: params.page,
            pageSize: params.pageSize,
            total,
            totalPages,
        };
    }

    private static async listAllFallback(search?: string): Promise<CustomerSummary[]> {
        const supabase = await createAdminClient();
        const rows = await this.fetchOrderContacts(supabase, search);
        return groupUniqueCustomers(rows, search);
    }

    static async listPaged(params: {
        page?: number;
        pageSize?: number;
        search?: string;
    }): Promise<CustomerListResult> {
        const page = Math.max(params.page ?? 1, 1);
        const pageSize = Math.min(Math.max(params.pageSize ?? 20, 5), 100);
        const search = params.search?.trim() || null;

        const supabase = await createAdminClient();
        const { data, error } = await supabase.rpc("admin_customers_page", {
            p_page: page,
            p_page_size: pageSize,
            p_search: search,
        });

        if (error) {
            if (isRpcMissing(error)) {
                return this.listPagedFallback({ page, pageSize, search });
            }
            throw new Error(error.message);
        }

        const rowsData = (data || []) as PagedCustomerRow[];
        const rows = rowsData.map(mapRow);
        const total = rowsData.length > 0 ? parseNumber(rowsData[0].total_count) : 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        return {
            rows,
            page,
            pageSize,
            total,
            totalPages,
        };
    }

    static async listAll(search?: string): Promise<CustomerSummary[]> {
        const supabase = await createAdminClient();
        const term = search?.trim() || null;

        const { data, error } = await supabase.rpc("admin_customers_all", {
            p_search: term,
        });

        if (error) {
            if (isRpcMissing(error)) {
                return this.listAllFallback(term || undefined);
            }
            throw new Error(error.message);
        }

        const rows = (data || []) as ExportCustomerRow[];
        return rows.map(mapRow);
    }

    static async countUnique(search?: string): Promise<number> {
        const result = await this.listPaged({
            page: 1,
            pageSize: 1,
            search,
        });
        return result.total;
    }
}
