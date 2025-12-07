import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import { TablesInsert, TablesUpdate, Tables } from "@/lib/types/supabase";

export type Category = Tables<"categories">;
export type CategoryCreate = TablesInsert<"categories">;
export type CategoryUpdate = TablesUpdate<"categories">;

export class CategoryService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> {
        return op().catch((err: any) => {
            if (err && typeof err === "object" && err.code === "42501") {
                err.message = "Permission denied by Row Level Security for categories. Create appropriate RLS policies or configure SUPABASE_SERVICE_ROLE_KEY (server-side only).";
            }
            throw err;
        });
    }
    static async list(): Promise<Category[]> {
        const supabase = await createClient();
        const { data, error } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
    }

    static async listPaged(opts: { page: number; pageSize: number; search?: string }): Promise<{ rows: Category[]; total: number; page: number; pageSize: number; }> {
        const { page, pageSize, search } = opts;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const supabase = await createClient();
        let query = supabase.from('categories').select('*', { count: 'exact' });
        if (search && search.trim().length) {
            // Simple ILIKE on name or slug
            query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
        }
        query = query.order('created_at', { ascending: false }).range(from, to);
        const { data, error, count } = await query;
        if (error) throw error;
        return { rows: data || [], total: count || 0, page, pageSize };
    }

    static async create(input: CategoryCreate): Promise<Category | null> {
        return this.wrap(async () => {
            const supabase = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[CategoryService] create using admin client:", Boolean(SUPABASE_SERVICE_ROLE_KEY));
            }
            const { data, error } = await supabase.from("categories").insert(input).select().single();
            if (error) throw error;
            return data;
        });
    }

    static async update(id: string, patch: CategoryUpdate): Promise<Category | null> {
        return this.wrap(async () => {
            const supabase = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[CategoryService] update using admin client:", Boolean(SUPABASE_SERVICE_ROLE_KEY));
            }
            const { data, error } = await supabase.from("categories").update(patch).eq("id", id).select().single();
            if (error) throw error;
            return data;
        });
    }

    static async remove(id: string): Promise<{ id: string } | null> {
        return this.wrap(async () => {
            const supabase = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[CategoryService] remove using admin client:", Boolean(SUPABASE_SERVICE_ROLE_KEY));
            }
            const { error } = await supabase.from("categories").delete().eq("id", id);
            if (error) throw error;
            return { id };
        });
    }
}
