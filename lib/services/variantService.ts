import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type Variant = Tables<"product_variants">;
export type VariantCreate = TablesInsert<"product_variants">;
export type VariantUpdate = TablesUpdate<"product_variants">;

export class VariantService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> { return op().catch((e: any) => { if (e?.code === "42501") e.message = "RLS blocked variants operation"; throw e; }); }
    static async list(): Promise<Variant[]> { return this.wrap(async () => { const c = await createClient(); const { data, error } = await c.from("product_variants").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; }); }
    static async listPaged(opts: { page: number; pageSize: number; search?: string }): Promise<{ rows: Variant[]; total: number; page: number; pageSize: number; }> {
        return this.wrap(async () => {
            const { page, pageSize, search } = opts;
            const from = (page - 1) * pageSize; const to = from + pageSize - 1;
            const c = await createClient();
            let q = c.from('product_variants').select('*', { count: 'exact' });
            if (search && search.trim().length) {
                q = q.or(`title.ilike.%${search}%,sku.ilike.%${search}%`);
            }
            q = q.order('created_at', { ascending: false }).range(from, to);
            const { data, error, count } = await q;
            if (error) throw error;
            return { rows: data || [], total: count || 0, page, pageSize };
        });
    }
    static async listByProduct(product_id: string): Promise<Variant[]> { return this.wrap(async () => { const c = await createClient(); const { data, error } = await c.from("product_variants").select("*").eq("product_id", product_id).order("created_at", { ascending: false }); if (error) throw error; return data; }); }
    static async create(input: VariantCreate): Promise<Variant | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { data, error } = await c.from("product_variants").insert(input).select().single(); if (error) throw error; return data; }); }
    static async update(id: string, patch: VariantUpdate): Promise<Variant | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { data, error } = await c.from("product_variants").update(patch).eq("id", id).select().single(); if (error) throw error; return data; }); }
    static async remove(id: string): Promise<{ id: string } | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { error } = await c.from("product_variants").delete().eq("id", id); if (error) throw error; return { id }; }); }
}
