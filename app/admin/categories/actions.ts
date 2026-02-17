"use server";
import { revalidatePath } from "next/cache";
import { CategoryService } from "@/lib/services/categoryService";
import { CategoryAttributeService } from "@/lib/services/categoryAttributeService";
import { ProductService } from "@/lib/services/productService";
import { createClient } from "@/lib/supabase/server";
import type { CategoryUpdate } from "@/lib/services/categoryService";

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

export async function createCategory(payload: { name: string; slug?: string | null; is_active: boolean; parent_id: string | null; image_url?: string | null; sort_order?: number; attributeIds?: string[] }) {
    // Auth gate for mutation
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const slug = payload.slug && payload.slug.length ? slugify(payload.slug) : slugify(payload.name);
    // Let the database generate UUID id
    const sortOrder = Number.isFinite(payload.sort_order)
        ? Number(payload.sort_order)
        : await CategoryService.getNextSortOrder();
    const data = await CategoryService.create({
        name: payload.name,
        slug,
        is_active: payload.is_active ?? true,
        parent_id: payload.parent_id,
        image_url: payload.image_url || null,
        sort_order: sortOrder,
    });
    if (data && payload.attributeIds?.length) {
        await CategoryAttributeService.replace(data.id, payload.attributeIds);
    }
    revalidatePath("/admin/categories");
    return data;
}

export async function updateCategory(payload: { id: string; name: string; slug?: string | null; is_active: boolean; parent_id: string | null; image_url?: string | null; sort_order?: number; attributeIds?: string[] }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const slug = payload.slug && payload.slug.length ? slugify(payload.slug) : slugify(payload.name);
    const updatePayload: CategoryUpdate = {
        name: payload.name,
        slug,
        is_active: payload.is_active,
        parent_id: payload.parent_id,
        image_url: payload.image_url || null,
    };
    if (Number.isFinite(payload.sort_order)) {
        updatePayload.sort_order = Number(payload.sort_order);
    }
    const data = await CategoryService.update(payload.id, updatePayload);
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
    const { data: allCategories, error: categoriesError } = await supabase
        .from("categories")
        .select("id,parent_id")
        .eq("is_deleted", false);
    if (categoriesError) throw categoriesError;

    const childrenByParent = new Map<string, string[]>();
    for (const category of allCategories || []) {
        if (!category.parent_id) continue;
        const next = childrenByParent.get(category.parent_id) || [];
        next.push(category.id);
        childrenByParent.set(category.parent_id, next);
    }

    const idsToDelete = new Set<string>([payload.id]);
    const queue = [payload.id];
    while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        const children = childrenByParent.get(current) || [];
        for (const childId of children) {
            if (idsToDelete.has(childId)) continue;
            idsToDelete.add(childId);
            queue.push(childId);
        }
    }

    const targetIds = Array.from(idsToDelete);
    await ProductService.softDeleteByCategoryIds(targetIds);
    await CategoryService.softDeleteMany(targetIds);
    const res = { id: payload.id };
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/");
    return res;
}

export async function reorderCategories(payload: { orderedIds: string[]; startOrder?: number }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await CategoryService.reorder({
        orderedIds: payload.orderedIds,
        startOrder: payload.startOrder,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/");
    return { ok: true };
}
