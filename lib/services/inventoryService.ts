import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type InventoryItem = Tables<"inventory">;
export interface InventoryJoined extends InventoryItem {
    product?: { id: string; name: string; category_id: string | null } | null;
    variant?: { id: string; title: string | null; sku: string | null } | null;
}
export type InventoryCreate = TablesInsert<"inventory">;
export type InventoryUpdate = TablesUpdate<"inventory">;

export class InventoryService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> { return op().catch((e: any) => { if (e?.code === "42501") e.message = "RLS blocked inventory operation"; throw e; }); }
    static async list(): Promise<InventoryJoined[]> {
        return this.wrap(async () => {
            const c = await createClient();
            const { data, error } = await c.from("inventory").select("*, products:product_id ( id, name, category_id, is_deleted ), product_variants:variant_id ( id, title, sku, product_id )").order("updated_at", { ascending: false });
            if (error) throw error;
            const rows = data as any[];
            // Collect product ids from variants where direct product is null
            const variantProductIds = Array.from(new Set(rows.filter(r => !r.products && r.product_variants?.product_id).map(r => r.product_variants.product_id)));
            let productMap: Record<string, { id: string; name: string; category_id: string | null }> = {};
            if (variantProductIds.length) {
                const { data: prodRows, error: prodErr } = await c.from("products").select("id,name,category_id").eq("is_deleted", false).in("id", variantProductIds);
                if (!prodErr && prodRows) {
                    productMap = Object.fromEntries(prodRows.map(p => [p.id, p]));
                }
            }
            const normalized = rows.map(row => ({
                ...(row as InventoryItem),
                product: row.products && !row.products.is_deleted ? { id: row.products.id, name: row.products.name, category_id: row.products.category_id ?? null } : productMap[row.product_variants?.product_id] ?? null,
                variant: row.product_variants ? { id: row.product_variants.id, title: row.product_variants.title, sku: row.product_variants.sku } : null,
            }));
            return normalized.filter(item => !!item.product);
        });
    }
    static async listPaged(opts: { page: number; pageSize: number; search?: string; categoryId?: string }): Promise<{ rows: InventoryJoined[]; total: number; page: number; pageSize: number; }> {
        return this.wrap(async () => {
        const { page, pageSize, search, categoryId } = opts;
        const c = await createClient();
        const { data, error } = await c
            .from('inventory')
            .select('*, products:product_id ( id, name, category_id, is_deleted ), product_variants:variant_id ( id, title, sku, product_id )')
            .order('updated_at', { ascending: false });
        if (error) throw error;
        const rows = (data ?? []) as any[];
        const variantProductIds = Array.from(new Set(rows.filter(r => !r.products && r.product_variants?.product_id).map(r => r.product_variants.product_id)));
        let productMap: Record<string, { id: string; name: string; category_id: string | null }> = {};
        if (variantProductIds.length) {
            const { data: prodRows, error: prodErr } = await c.from('products').select('id,name,category_id').eq("is_deleted", false).in('id', variantProductIds);
            if (!prodErr && prodRows) productMap = Object.fromEntries(prodRows.map(p => [p.id, p]));
        }
        const normalized = rows.map(row => ({
            ...(row as InventoryItem),
            product: row.products && !row.products.is_deleted ? { id: row.products.id, name: row.products.name, category_id: row.products.category_id ?? null } : productMap[row.product_variants?.product_id] ?? null,
            variant: row.product_variants ? { id: row.product_variants.id, title: row.product_variants.title, sku: row.product_variants.sku } : null,
        })).filter(item => !!item.product);
        const term = search ? search.trim().toLowerCase() : '';
        let filtered = term.length
            ? normalized.filter(item => {
                const haystack = [
                    item.product?.name ?? '',
                    item.variant?.title ?? '',
                    item.variant?.sku ?? '',
                    item.unit ?? '',
                ]
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(term);
            })
            : normalized;
        if (categoryId) {
            filtered = filtered.filter((item) => item.product?.category_id === categoryId);
        }
        const total = filtered.length;
        const from = Math.max(0, (page - 1) * pageSize);
        const to = from + pageSize;
        const paged = filtered.slice(from, to);
        return { rows: paged, total, page, pageSize };
        });
    }
    static async create(input: InventoryCreate): Promise<InventoryItem | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { data, error } = await c.from("inventory").insert(input).select().single(); if (error) throw error; return data; }); }
    static async update(id: string, patch: InventoryUpdate): Promise<InventoryItem | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { data, error } = await c.from("inventory").update(patch).eq("id", id).select().single(); if (error) throw error; return data; }); }
    static async remove(id: string): Promise<{ id: string } | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { error } = await c.from("inventory").delete().eq("id", id); if (error) throw error; return { id }; }); }
}
