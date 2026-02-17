import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/lib/types/supabase";

export type PublicProduct = Tables<"products">;

/**
 * Public (anon) read-only product access. Only returns active/visible products.
 * Adjust filter conditions per your schema (e.g., is_active, is_public flags).
 */
export class ProductPublicService {
    static async list(): Promise<PublicProduct[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
    }
}
