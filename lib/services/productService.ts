import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type Product = Tables<"products">;
export type ProductListItem = Product & { category?: { id: string; name: string } | null };
export type ProductCreate = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;
type ProductRowWithCategory = Product & { categories?: { id: string; name: string } | null };

function normalizeProductRows(rows: ProductRowWithCategory[]): ProductListItem[] {
    return rows.map((row) => ({
        ...(row as Product),
        category: row.categories ? { id: row.categories.id, name: row.categories.name } : null,
    }));
}

function slugify(input: string) {
    return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export class ProductService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> {
        return op().catch((err: unknown) => {
            if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "42501") {
                (err as { message?: string }).message = "RLS blocked products operation";
            }
            throw err;
        });
    }
    static async list(): Promise<ProductListItem[]> {
        return this.wrap(async () => {
            const c = await createClient();
            const { data, error } = await c
                .from("products")
                .select("*, categories:category_id ( id, name )")
                .eq("is_deleted", false)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false });
            if (error) throw error;
            const rows = (data || []) as ProductRowWithCategory[];
            return normalizeProductRows(rows);
        });
    }
    static async listFeatured(limit = 8): Promise<ProductListItem[]> {
        return this.wrap(async () => {
            const c = await createClient();
            const { data, error } = await c
                .from("products")
                .select("*, categories:category_id ( id, name )")
                .eq("is_featured", true)
                .eq("is_active", true)
                .eq("is_deleted", false)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false })
                .limit(limit);
            if (error) throw error;
            const rows = (data || []) as ProductRowWithCategory[];
            return normalizeProductRows(rows);
        });
    }
    static async listPaged(opts: { page: number; pageSize: number; search?: string; categoryId?: string; categoryIds?: string[] }): Promise<{ rows: ProductListItem[]; total: number; page: number; pageSize: number; }> {
        return this.wrap(async () => {
            const { page, pageSize, search, categoryId, categoryIds } = opts;
            const from = (page - 1) * pageSize; const to = from + pageSize - 1;
            const c = await createClient();
            let q = c.from('products').select('*, categories:category_id ( id, name )', { count: 'exact' }).eq("is_deleted", false);
            const scopedCategoryIds = Array.from(new Set((categoryIds || []).filter(Boolean)));
            if (scopedCategoryIds.length) {
                q = q.in("category_id", scopedCategoryIds);
            } else if (categoryId) {
                q = q.eq("category_id", categoryId);
            }
            if (search && search.trim().length) {
                q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%,brand.ilike.%${search}%`);
            }
            q = q.order("sort_order", { ascending: true }).order('created_at', { ascending: false }).range(from, to);
            const { data, error, count } = await q;
            if (error) throw error;
            const rows = (data || []) as ProductRowWithCategory[];
            const normalized = normalizeProductRows(rows);
            return { rows: normalized, total: count || 0, page, pageSize };
        });
    }
    static async listFeaturedAdmin(opts: { search?: string; categoryId?: string; categoryIds?: string[] } = {}): Promise<ProductListItem[]> {
        return this.wrap(async () => {
            const c = await createClient();
            let q = c
                .from("products")
                .select("*, categories:category_id ( id, name )")
                .eq("is_deleted", false)
                .eq("is_featured", true);
            const scopedCategoryIds = Array.from(new Set((opts.categoryIds || []).filter(Boolean)));
            if (scopedCategoryIds.length) {
                q = q.in("category_id", scopedCategoryIds);
            } else {
                const categoryId = opts.categoryId?.trim();
                if (categoryId) {
                    q = q.eq("category_id", categoryId);
                }
            }
            const search = opts.search?.trim();
            if (search) {
                q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%,brand.ilike.%${search}%`);
            }
            const { data, error } = await q.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
            if (error) throw error;
            const rows = (data || []) as ProductRowWithCategory[];
            return normalizeProductRows(rows);
        });
    }
    static async listFeaturedAdminPaged(opts: { page: number; pageSize: number; search?: string; categoryId?: string; categoryIds?: string[] }): Promise<{ rows: ProductListItem[]; total: number; page: number; pageSize: number; }> {
        return this.wrap(async () => {
            const { page, pageSize, search, categoryId } = opts;
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            const c = await createClient();
            let q = c
                .from("products")
                .select("*, categories:category_id ( id, name )", { count: "exact" })
                .eq("is_deleted", false)
                .eq("is_featured", true);
            const scopedCategoryIds = Array.from(new Set((opts.categoryIds || []).filter(Boolean)));
            if (scopedCategoryIds.length) {
                q = q.in("category_id", scopedCategoryIds);
            } else {
                const scopedCategoryId = categoryId?.trim();
                if (scopedCategoryId) {
                    q = q.eq("category_id", scopedCategoryId);
                }
            }
            const scopedSearch = search?.trim();
            if (scopedSearch) {
                q = q.or(`name.ilike.%${scopedSearch}%,slug.ilike.%${scopedSearch}%,brand.ilike.%${scopedSearch}%`);
            }
            q = q.order("sort_order", { ascending: true }).order("created_at", { ascending: false }).range(from, to);
            const { data, error, count } = await q;
            if (error) throw error;
            const rows = (data || []) as ProductRowWithCategory[];
            const normalized = normalizeProductRows(rows);
            return { rows: normalized, total: count || 0, page, pageSize };
        });
    }
    static async create(input: ProductCreate): Promise<Product | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const payload = { ...input, slug: input.slug ? slugify(input.slug) : slugify(input.name) }; const { data, error } = await c.from("products").insert(payload).select().single(); if (error) throw error; return data; }); }
    static async update(id: string, patch: ProductUpdate): Promise<Product | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const payload = { ...patch, slug: patch.slug ? slugify(patch.slug) : patch.name ? slugify(patch.name) : patch.slug }; const { data, error } = await c.from("products").update(payload).eq("id", id).select().single(); if (error) throw error; return data; }); }
    static async remove(id: string): Promise<{ id: string } | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { error } = await c.from("products").update({ is_deleted: true, is_active: false }).eq("id", id); if (error) throw error; return { id }; }); }
    static async softDeleteByCategory(categoryId: string): Promise<number> {
        return this.softDeleteByCategoryIds([categoryId]);
    }
    static async softDeleteByCategoryIds(categoryIds: string[]): Promise<number> {
        return this.wrap(async () => {
            const uniqueIds = Array.from(new Set(categoryIds.filter(Boolean)));
            if (!uniqueIds.length) return 0;
            const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            const { data, error } = await c
                .from("products")
                .update({ is_deleted: true, is_active: false })
                .in("category_id", uniqueIds)
                .eq("is_deleted", false)
                .select("id");
            if (error) throw error;
            return (data || []).length;
        });
    }

    static async getNextSortOrderInCategory(categoryId: string): Promise<number> {
        return this.wrap(async () => {
            if (!categoryId) return 0;
            const c = await createClient();
            const { data, error } = await c
                .from("products")
                .select("sort_order")
                .eq("category_id", categoryId)
                .eq("is_deleted", false)
                .order("sort_order", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            const maxOrder = data?.sort_order ?? -1;
            return maxOrder + 1;
        });
    }

    static async reorderByIds(params: { orderedIds: string[]; startOrder?: number }): Promise<void> {
        return this.wrap(async () => {
            const uniqueIds = Array.from(new Set((params.orderedIds || []).filter(Boolean)));
            if (!uniqueIds.length) return;
            const startOrder = Number.isFinite(params.startOrder) ? Number(params.startOrder) : 0;
            const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            for (let i = 0; i < uniqueIds.length; i++) {
                const sort_order = startOrder + i;
                const { error } = await c
                    .from("products")
                    .update({ sort_order })
                    .eq("id", uniqueIds[i])
                    .eq("is_deleted", false);
                if (error) throw error;
            }
        });
    }

    static async reorderInCategory(params: { categoryId: string; orderedIds: string[]; startOrder?: number }): Promise<void> {
        return this.wrap(async () => {
            const categoryId = params.categoryId;
            const uniqueIds = Array.from(new Set((params.orderedIds || []).filter(Boolean)));
            if (!categoryId || !uniqueIds.length) return;
            const startOrder = Number.isFinite(params.startOrder) ? Number(params.startOrder) : 0;
            const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            for (let i = 0; i < uniqueIds.length; i++) {
                const sort_order = startOrder + i;
                const { error } = await c
                    .from("products")
                    .update({ sort_order })
                    .eq("id", uniqueIds[i])
                    .eq("category_id", categoryId)
                    .eq("is_deleted", false);
                if (error) throw error;
            }
        });
    }

    static async reorderFeatured(params: { orderedIds: string[]; startOrder?: number }): Promise<void> {
        return this.wrap(async () => {
            const uniqueIds = Array.from(new Set((params.orderedIds || []).filter(Boolean)));
            if (!uniqueIds.length) return;
            const startOrder = Number.isFinite(params.startOrder) ? Number(params.startOrder) : 0;
            const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            for (let i = 0; i < uniqueIds.length; i++) {
                const sort_order = startOrder + i;
                const { error } = await c
                    .from("products")
                    .update({ sort_order })
                    .eq("id", uniqueIds[i])
                    .eq("is_featured", true)
                    .eq("is_deleted", false);
                if (error) throw error;
            }
        });
    }
}
