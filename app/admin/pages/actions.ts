"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ContentPageService } from "@/lib/services/contentPageService";

type ContentPageInput = {
    title: string;
    slug?: string | null;
    summary?: string | null;
    content_md?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    show_in_footer?: boolean;
    is_active?: boolean;
    sort_order?: number;
};

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

async function requireAdminUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
}

function revalidateContentPaths(slug?: string | null) {
    revalidatePath("/admin/pages");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    if (slug) revalidatePath(`/${slug}`);
}

export async function listContentPages() {
    await requireAdminUser();
    return ContentPageService.listAdmin();
}

export async function createContentPage(payload: ContentPageInput) {
    await requireAdminUser();
    const page = await ContentPageService.create({
        title: payload.title,
        slug: payload.slug?.trim() ? slugify(payload.slug) : slugify(payload.title),
        summary: payload.summary || null,
        content_md: payload.content_md || "",
        seo_title: payload.seo_title || null,
        seo_description: payload.seo_description || null,
        show_in_footer: payload.show_in_footer ?? true,
        is_active: payload.is_active ?? true,
        sort_order: payload.sort_order ?? 0,
        metadata: null,
    });
    revalidateContentPaths(page.slug);
    return page;
}

export async function updateContentPage(id: string, payload: ContentPageInput) {
    await requireAdminUser();
    const page = await ContentPageService.update(id, {
        title: payload.title,
        slug: payload.slug || undefined,
        summary: payload.summary || null,
        content_md: payload.content_md || "",
        seo_title: payload.seo_title || null,
        seo_description: payload.seo_description || null,
        show_in_footer: payload.show_in_footer ?? true,
        is_active: payload.is_active ?? true,
        sort_order: payload.sort_order ?? 0,
    });
    revalidateContentPaths(page.slug);
    return page;
}

export async function deleteContentPage(id: string, slug?: string | null) {
    await requireAdminUser();
    await ContentPageService.remove(id);
    revalidateContentPaths(slug || null);
}

export async function updateContentPageOrder(items: Array<{ id: string; sort_order: number }>) {
    await requireAdminUser();
    await ContentPageService.updateSortOrder(items);
    revalidatePath("/admin/pages");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
}
