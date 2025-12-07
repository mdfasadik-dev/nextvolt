import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/lib/types/supabase";

export type PublicCategory = Tables<"categories">;

/**
 * Public (anon) read-only access for categories. Relies on RLS policies that allow
 * select for anon, or falls back to default if table is fully open. No admin key.
 */
export class CategoryPublicService {
    static async list(): Promise<PublicCategory[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
    }
}
