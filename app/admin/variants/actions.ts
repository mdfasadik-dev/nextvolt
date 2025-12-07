"use server";
import { VariantService } from "@/lib/services/variantService";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function listVariants() { return VariantService.list(); }
export async function listVariantsPaged(params: { page?: number; pageSize?: number; search?: string }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
    const search = params.search?.trim() || undefined;
    return VariantService.listPaged({ page, pageSize, search });
}
export async function listVariantsByProduct(product_id: string) { return VariantService.listByProduct(product_id); }
export async function createVariant(payload: { product_id: string; title?: string | null; sku?: string | null; is_active: boolean; image_url?: string | null; details_md?: string | null; }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const rec = await VariantService.create({
        product_id: payload.product_id,
        title: payload.title || null,
        sku: payload.sku || null,
        is_active: payload.is_active,
        image_url: payload.image_url || null,
        details_md: payload.details_md || null,
    });
    revalidatePath("/admin/variants");
    return rec;
}
export async function updateVariant(payload: { id: string; product_id: string; title?: string | null; sku?: string | null; is_active: boolean; image_url?: string | null; details_md?: string | null; }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const rec = await VariantService.update(payload.id, {
        product_id: payload.product_id,
        title: payload.title || null,
        sku: payload.sku || null,
        is_active: payload.is_active,
        image_url: payload.image_url || null,
        details_md: payload.details_md || null,
    });
    revalidatePath("/admin/variants");
    return rec;
}
export async function deleteVariant(payload: { id: string }) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Unauthorized"); const res = await VariantService.remove(payload.id); revalidatePath("/admin/variants"); return res; }
