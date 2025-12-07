"use server";
import { revalidatePath } from "next/cache";
import { CategoryService } from "@/lib/services/categoryService";
import { CategoryAttributeService } from "@/lib/services/categoryAttributeService";
import { createClient } from "@/lib/supabase/server";

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export async function listCategories() {
    return CategoryService.list();
}

export async function listCategoriesPaged(params: { page?: number; pageSize?: number; search?: string }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
    const search = params.search?.trim() || undefined;
    return CategoryService.listPaged({ page, pageSize, search });
}

export async function createCategory(payload: { name: string; slug?: string | null; is_active: boolean; parent_id: string | null; image_url?: string | null; attributeIds?: string[] }) {
    // Auth gate for mutation
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const slug = payload.slug && payload.slug.length ? slugify(payload.slug) : slugify(payload.name);
    // Let the database generate UUID id
    const data = await CategoryService.create({
        name: payload.name,
        slug,
        is_active: payload.is_active ?? true,
        parent_id: payload.parent_id,
        image_url: payload.image_url || null,
    } as any);
    if (data && payload.attributeIds?.length) {
        await CategoryAttributeService.replace(data.id, payload.attributeIds);
    }
    revalidatePath("/admin/categories");
    return data;
}

export async function updateCategory(payload: { id: string; name: string; slug?: string | null; is_active: boolean; parent_id: string | null; image_url?: string | null; attributeIds?: string[] }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const slug = payload.slug && payload.slug.length ? slugify(payload.slug) : slugify(payload.name);
    const data = await CategoryService.update(payload.id, {
        name: payload.name,
        slug,
        is_active: payload.is_active,
        parent_id: payload.parent_id,
        image_url: payload.image_url || null,
    } as any);
    if (data && payload.attributeIds) {
        await CategoryAttributeService.replace(data.id, payload.attributeIds);
    }
    revalidatePath("/admin/categories");
    return data;
}

export async function deleteCategory(payload: { id: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    // Pre-check for referencing products to provide friendlier error than raw FK constraint
    const { count, error: prodCountError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", payload.id);
    if (prodCountError) {
        // If counting fails, proceed to attempt delete (will error if constrained)
        // eslint-disable-next-line no-console
        console.warn('[deleteCategory] product count check failed', prodCountError.message);
    } else if ((count || 0) > 0) {
        const friendly = new Error(`Cannot delete category: ${count} product(s) still reference it.`) as any;
        friendly.code = 'CATEGORY_HAS_PRODUCTS';
        friendly.productCount = count;
        throw friendly;
    }
    const res = await CategoryService.remove(payload.id);
    revalidatePath("/admin/categories");
    return res;
}