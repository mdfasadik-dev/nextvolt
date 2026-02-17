import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type ProductImage = Tables<"product_images">;
export type ProductImageCreate = TablesInsert<"product_images">;

export class ProductImageService {
    static async listByProduct(productId: string): Promise<ProductImage[]> {
        const client = await createClient();
        const { data, error } = await client
            .from("product_images")
            .select("*")
            .eq("product_id", productId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });
        if (error) {
            if ((error as { code?: string }).code === "42P01") return [];
            throw error;
        }
        return data || [];
    }

    static async syncProductImages(productId: string, imageUrls: string[]) {
        const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();

        const normalized = imageUrls
            .map((url) => url.trim())
            .filter((url): url is string => url.length > 0);

        const { error: delErr } = await client
            .from("product_images")
            .delete()
            .eq("product_id", productId);
        if (delErr) {
            if ((delErr as { code?: string }).code === "42P01") return [];
            throw delErr;
        }

        if (!normalized.length) return [];

        const rows: ProductImageCreate[] = normalized.map((imageUrl, index) => ({
            product_id: productId,
            image_url: imageUrl,
            sort_order: index,
            is_primary: index === 0,
            alt_text: null,
        }));

        const { data, error } = await client
            .from("product_images")
            .insert(rows)
            .select("*")
            .order("sort_order", { ascending: true });
        if (error) {
            if ((error as { code?: string }).code === "42P01") return [];
            throw error;
        }
        return data || [];
    }
}
