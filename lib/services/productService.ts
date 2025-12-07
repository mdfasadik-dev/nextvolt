import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type Product = Tables<"products">;
export type ProductCreate = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

function slugify(input: string) {
    return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export class ProductService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> { return op().catch((err: any) => { if (err?.code === "42501") err.message = "RLS blocked products operation"; throw err; }); }
    static async list(): Promise<Product[]> { return this.wrap(async () => { const c = await createClient(); const { data, error } = await c.from("products").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; }); }
    static async listFeatured(limit = 8): Promise<Product[]> { return this.wrap(async () => { const c = await createClient(); const { data, error } = await c.from("products").select("*").eq("is_featured", true).eq("is_active", true).order("created_at", { ascending: false }).limit(limit); if (error) throw error; return data || []; }); }
    static async listPaged(opts: { page: number; pageSize: number; search?: string }): Promise<{ rows: Product[]; total: number; page: number; pageSize: number; }> {
        return this.wrap(async () => {
            const { page, pageSize, search } = opts;
            const from = (page - 1) * pageSize; const to = from + pageSize - 1;
            const c = await createClient();
            let q = c.from('products').select('*', { count: 'exact' });
            if (search && search.trim().length) {
                q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%,brand.ilike.%${search}%`);
            }
            q = q.order('created_at', { ascending: false }).range(from, to);
            const { data, error, count } = await q;
            if (error) throw error;
            return { rows: data || [], total: count || 0, page, pageSize };
        });
    }
    static async create(input: ProductCreate): Promise<Product | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const payload = { ...input, slug: input.slug ? slugify(input.slug) : slugify(input.name) }; const { data, error } = await c.from("products").insert(payload).select().single(); if (error) throw error; return data; }); }
    static async update(id: string, patch: ProductUpdate): Promise<Product | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const payload = { ...patch, slug: patch.slug ? slugify(patch.slug) : patch.name ? slugify(patch.name) : patch.slug }; const { data, error } = await c.from("products").update(payload).eq("id", id).select().single(); if (error) throw error; return data; }); }
    static async remove(id: string): Promise<{ id: string } | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { error } = await c.from("products").delete().eq("id", id); if (error) throw error; return { id }; }); }
}
