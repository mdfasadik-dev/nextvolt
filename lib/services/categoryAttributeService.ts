import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type CategoryAttribute = Tables<"category_attributes">;
export type CategoryAttributeCreate = TablesInsert<"category_attributes">;

export class CategoryAttributeService {
    private static async client() { return SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); }
    private static wrap<T>(op: () => Promise<T>): Promise<T> { return op().catch((err: any) => { if (err?.code === "42501") err.message = "RLS blocked category attributes operation"; throw err; }); }
    static async listByCategory(categoryId: string): Promise<CategoryAttribute[]> { return this.wrap(async () => { if (typeof window !== 'undefined') { throw new Error('listByCategory must be called on the server'); } const c = await this.client(); const { data, error } = await c.from("category_attributes").select("*").eq("category_id", categoryId); if (error) throw error; return data; }); }
    static async replace(categoryId: string, attributeIds: string[]): Promise<void> {
        return this.wrap(async () => {
            const c = await this.client();
            // Delete existing
            const { error: delErr } = await c.from("category_attributes").delete().eq("category_id", categoryId);
            if (delErr) throw delErr;
            if (!attributeIds.length) return;
            const rows: CategoryAttributeCreate[] = attributeIds.map(aid => ({ category_id: categoryId, attribute_id: aid }));
            const { error: insErr } = await c.from("category_attributes").insert(rows);
            if (insErr) throw insErr;
        });
    }
}
