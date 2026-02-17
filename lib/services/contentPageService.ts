import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";

export type ContentPage = Tables<"content_pages">;
export type ContentPageCreate = TablesInsert<"content_pages">;
export type ContentPageUpdate = TablesUpdate<"content_pages">;

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export class ContentPageService {
    private static async getReadAdminClient() {
        return SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : createClient();
    }

    private static async getWriteClient() {
        return SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : createClient();
    }

    static async listAdmin(): Promise<ContentPage[]> {
        const client = await this.getReadAdminClient();
        const { data, error } = await client
            .from("content_pages")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    static async listPublicFooter(): Promise<ContentPage[]> {
        const client = createPublicClient();
        const { data, error } = await client
            .from("content_pages")
            .select("*")
            .eq("is_active", true)
            .eq("show_in_footer", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    static async listPublicActive(): Promise<ContentPage[]> {
        const client = createPublicClient();
        const { data, error } = await client
            .from("content_pages")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    static async getPublicBySlug(slug: string): Promise<ContentPage | null> {
        const client = createPublicClient();
        const { data, error } = await client
            .from("content_pages")
            .select("*")
            .eq("slug", slug)
            .eq("is_active", true)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    static async create(payload: ContentPageCreate): Promise<ContentPage> {
        const client = await this.getWriteClient();
        const title = payload.title?.trim() || "Untitled Page";
        const nextSlug = payload.slug?.trim() ? slugify(payload.slug) : slugify(title);
        const { data, error } = await client
            .from("content_pages")
            .insert({
                ...payload,
                title,
                slug: nextSlug,
                content_md: payload.content_md ?? "",
            })
            .select("*")
            .single();
        if (error) throw error;
        return data;
    }

    static async update(id: string, payload: ContentPageUpdate): Promise<ContentPage> {
        const client = await this.getWriteClient();
        const updatePayload: ContentPageUpdate = { ...payload };
        if (typeof payload.title === "string" && !payload.slug) {
            updatePayload.slug = slugify(payload.title);
        } else if (typeof payload.slug === "string") {
            updatePayload.slug = slugify(payload.slug);
        }
        const { data, error } = await client
            .from("content_pages")
            .update(updatePayload)
            .eq("id", id)
            .select("*")
            .single();
        if (error) throw error;
        return data;
    }

    static async remove(id: string) {
        const client = await this.getWriteClient();
        const { error } = await client.from("content_pages").delete().eq("id", id);
        if (error) throw error;
    }

    static async updateSortOrder(items: Array<{ id: string; sort_order: number }>) {
        if (!items.length) return;
        const client = await this.getWriteClient();
        for (const item of items) {
            const { error } = await client
                .from("content_pages")
                .update({ sort_order: item.sort_order })
                .eq("id", item.id);
            if (error) throw error;
        }
    }
}
