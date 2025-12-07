import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type ProductAttributeValue = Tables<"product_attribute_values">;
export type ProductAttributeValueCreate = TablesInsert<"product_attribute_values">;
export type ProductAttributeValueUpdate = TablesUpdate<"product_attribute_values">;

export class ProductAttributeValueService {
    private static async client() { return SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); }
    private static wrap<T>(op: () => Promise<T>): Promise<T> { return op().catch((err: any) => { if (err?.code === "42501") err.message = "RLS blocked product attribute values operation"; throw err; }); }

    static async listByProduct(productId: string): Promise<ProductAttributeValue[]> {
        return this.wrap(async () => {
            const c = await this.client();
            const { data, error } = await c.from("product_attribute_values").select("*").eq("product_id", productId).order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        });
    }

    static async upsertValues(productId: string, values: { attribute_id: string; value: string | number | boolean | null }[]): Promise<void> {
        return this.wrap(async () => {
            const c = await this.client();
            // Fetch existing
            const { data: existing, error: exErr } = await c.from("product_attribute_values").select("id, attribute_id").eq("product_id", productId);
            if (exErr) throw exErr;
            const toInsert: ProductAttributeValueCreate[] = [];
            const toUpdate: { id: string; patch: ProductAttributeValueUpdate }[] = [];
            for (const v of values) {
                const match = existing?.find(e => e.attribute_id === v.attribute_id);
                const base = { product_id: productId, attribute_id: v.attribute_id, value_text: null as string | null, value_number: null as number | null, value_boolean: null as boolean | null };
                if (typeof v.value === 'string') base.value_text = v.value;
                else if (typeof v.value === 'number') base.value_number = v.value;
                else if (typeof v.value === 'boolean') base.value_boolean = v.value;
                if (match) {
                    toUpdate.push({ id: match.id, patch: base });
                } else {
                    toInsert.push(base);
                }
            }
            if (toInsert.length) { const { error } = await c.from("product_attribute_values").insert(toInsert); if (error) throw error; }
            for (const u of toUpdate) { const { error } = await c.from("product_attribute_values").update(u.patch).eq("id", u.id); if (error) throw error; }
        });
    }
}
