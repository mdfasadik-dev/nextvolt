import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type ProductDatasheet = Tables<"product_datasheets">;
export type ProductDatasheetCreate = TablesInsert<"product_datasheets">;

export type ProductDatasheetInput = {
    id?: string;
    name: string;
    file_url: string;
    file_type: "pdf" | "image";
    file_size?: number | null;
    sort_order?: number;
};

export function extractStorageObjectPath(fileUrl: string): { bucket: string; path: string } | null {
    if (!fileUrl) return null;
    const defaultBucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "public";

    const marker = "/storage/v1/object/public/";
    const idx = fileUrl.indexOf(marker);
    if (idx !== -1) {
        const afterPublic = fileUrl.substring(idx + marker.length);
        const slashIdx = afterPublic.indexOf("/");
        if (slashIdx !== -1) {
            const bucketName = afterPublic.substring(0, slashIdx);
            const objectPath = afterPublic.substring(slashIdx + 1);
            return { bucket: bucketName, path: objectPath };
        }
    }

    if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
        return { bucket: defaultBucket, path: fileUrl };
    }

    return null;
}

export class ProductDatasheetService {
    static async listByProduct(productId: string): Promise<ProductDatasheet[]> {
        const client = await createClient();
        const { data, error } = await client
            .from("product_datasheets")
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

    static async syncDatasheets(productId: string, datasheets: ProductDatasheetInput[]): Promise<ProductDatasheet[]> {
        const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();

        // 1. Fetch existing datasheets stored in DB
        const existing = await this.listByProduct(productId);

        // 2. Identify missing / deleted datasheets by comparing file_urls
        const newUrls = new Set(datasheets.map((d) => d.file_url.trim()));
        const removed = existing.filter((ex) => !newUrls.has(ex.file_url.trim()));

        // 3. Remove deleted datasheet files from Supabase Storage
        if (removed.length > 0) {
            for (const item of removed) {
                const target = extractStorageObjectPath(item.file_url);
                if (target) {
                    try {
                        await client.storage.from(target.bucket).remove([target.path]);
                    } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error("[ProductDatasheetService] Storage cleanup error:", item.file_url, err);
                    }
                }
            }
        }

        // 4. Delete existing DB records for product
        const { error: delErr } = await client
            .from("product_datasheets")
            .delete()
            .eq("product_id", productId);
        if (delErr && (delErr as { code?: string }).code !== "42P01") {
            throw delErr;
        }

        if (!datasheets.length) return [];

        // 5. Insert new datasheet records
        const rows: ProductDatasheetCreate[] = datasheets.map((ds, index) => ({
            product_id: productId,
            name: ds.name.trim(),
            file_url: ds.file_url.trim(),
            file_type: ds.file_type,
            file_size: ds.file_size ?? null,
            sort_order: ds.sort_order ?? index,
        }));

        const { data, error } = await client
            .from("product_datasheets")
            .insert(rows)
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) {
            if ((error as { code?: string }).code === "42P01") return [];
            throw error;
        }
        return data || [];
    }

    static async deleteAllByProduct(productId: string): Promise<void> {
        const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
        const existing = await this.listByProduct(productId);
        for (const item of existing) {
            const target = extractStorageObjectPath(item.file_url);
            if (target) {
                try {
                    await client.storage.from(target.bucket).remove([target.path]);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error("[ProductDatasheetService] Storage cleanup error on product delete:", item.file_url, err);
                }
            }
        }
        await client.from("product_datasheets").delete().eq("product_id", productId);
    }
}

