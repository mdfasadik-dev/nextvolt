"use server";
import { ProductService } from "@/lib/services/productService";
import { ProductAttributeValueService } from "@/lib/services/productAttributeValueService";
import { ProductImageService } from "@/lib/services/productImageService";
import { ProductBadgeService, type ProductBadgeInput } from "@/lib/services/productBadgeService";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import type { ProductUpdate } from "@/lib/services/productService";

export async function listProducts() { return ProductService.list(); }
export async function listProductsPaged(params: { page?: number; pageSize?: number; search?: string; categoryId?: string; categoryIds?: string[] }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
    const search = params.search?.trim() || undefined;
    const categoryId = params.categoryId?.trim() || undefined;
    const categoryIds = Array.from(new Set((params.categoryIds || []).map((id) => id.trim()).filter(Boolean)));
    return ProductService.listPaged({ page, pageSize, search, categoryId, categoryIds });
}
export async function searchProducts(term: string) {
    noStore();
    const response = await ProductService.listPaged({
        page: 1,
        pageSize: 10,
        search: term.trim() ? term : undefined,
    });
    return (response.rows || []).map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand ?? null,
    }));
}

type ProductPayload = {
    name: string;
    slug?: string | null;
    category_id: string;
    brand?: string | null;
    weight_grams?: number;
    sort_order?: number;
    is_active: boolean;
    is_featured?: boolean;
    description?: string | null;
    details_md?: string | null;
    main_image_url?: string | null;
    image_urls?: string[];
    badge?: ProductBadgeInput | null;
    attributeValues?: { attribute_id: string; value: string | number | boolean | null }[];
};

export async function listProductBadgeMap(productIds: string[]) {
    noStore();
    return ProductBadgeService.getAdminBadgeMap(productIds);
}

export async function createProduct(payload: ProductPayload) {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Unauthorized");
    const sortOrder = Number.isFinite(payload.sort_order)
        ? Number(payload.sort_order)
        : await ProductService.getNextSortOrderInCategory(payload.category_id);
    const rec = await ProductService.create({ name: payload.name, slug: payload.slug || null, category_id: payload.category_id, brand: payload.brand || null, weight_grams: payload.weight_grams ?? 0, sort_order: sortOrder, is_active: payload.is_active ?? true, is_featured: payload.is_featured ?? false, description: payload.description || null, details_md: payload.details_md || null, main_image_url: payload.main_image_url || null });
    if (rec) await ProductImageService.syncProductImages(rec.id, payload.image_urls || (payload.main_image_url ? [payload.main_image_url] : []));
    if (rec) await ProductBadgeService.syncProductBadge(rec.id, payload.badge || null);
    if (rec && payload.attributeValues?.length) await ProductAttributeValueService.upsertValues(rec.id, payload.attributeValues);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return rec;
}
export async function updateProduct(payload: ProductPayload & { id: string }) {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Unauthorized");
    const updatePayload: ProductUpdate = {
        name: payload.name,
        slug: payload.slug || null,
        category_id: payload.category_id,
        brand: payload.brand || null,
        weight_grams: payload.weight_grams ?? 0,
        is_active: payload.is_active,
        is_featured: payload.is_featured ?? false,
        description: payload.description || null,
        details_md: payload.details_md || null,
        main_image_url: payload.main_image_url || null,
    };
    if (Number.isFinite(payload.sort_order)) {
        updatePayload.sort_order = Number(payload.sort_order);
    }
    const rec = await ProductService.update(payload.id, updatePayload);
    if (rec) await ProductImageService.syncProductImages(rec.id, payload.image_urls || (payload.main_image_url ? [payload.main_image_url] : []));
    if (rec) await ProductBadgeService.syncProductBadge(rec.id, payload.badge || null);
    if (rec && payload.attributeValues) await ProductAttributeValueService.upsertValues(rec.id, payload.attributeValues);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return rec;
}
export async function deleteProduct(payload: { id: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const res = await ProductService.remove(payload.id);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return res;
}

export async function reorderProducts(payload: { categoryId: string; orderedIds: string[]; startOrder?: number }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await ProductService.reorderInCategory({
        categoryId: payload.categoryId,
        orderedIds: payload.orderedIds,
        startOrder: payload.startOrder,
    });

    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true };
}
