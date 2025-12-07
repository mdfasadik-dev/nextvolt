"use server";
import { InventoryService } from "@/lib/services/inventoryService";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function listInventory() { return InventoryService.list(); }
export async function listInventoryPaged(params: { page?: number; pageSize?: number; search?: string }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
    const search = params.search?.trim() || undefined;
    return InventoryService.listPaged({ page, pageSize, search });
}
export async function createInventory(payload: { product_id?: string | null; variant_id?: string | null; quantity: number; purchase_price: number; sale_price: number; unit: string; discount_type?: string; discount_value?: number | null; }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    // Now we always persist product_id even when variant_id is present so variant rows remain directly associated to product.
    let { product_id = null, variant_id = null } = payload;
    if (!product_id) throw new Error("Select a product");
    // variant_id optional; if provided we keep both.
    const discount_type = payload.discount_type || 'none';
    let discount_value: number | null = payload.discount_value ?? null;
    if (discount_type === 'none') {
        discount_value = 0; // NOT NULL constraint expects a number
    } else {
        discount_value = (discount_value == null) ? 0 : discount_value;
        if (discount_type === 'percent' && (discount_value < 0 || discount_value > 100)) throw new Error('Percent discount must be between 0 and 100');
        if (discount_value < 0) throw new Error('Discount cannot be negative');
    }
    const rec = await InventoryService.create({
        product_id,
        variant_id,
        quantity: payload.quantity,
        purchase_price: payload.purchase_price,
        sale_price: payload.sale_price,
        unit: payload.unit || 'pcs',
        discount_type,
        discount_value
    });
    revalidatePath("/admin/inventory");
    return rec;
}
export async function updateInventory(payload: { id: string; product_id?: string | null; variant_id?: string | null; quantity: number; purchase_price: number; sale_price: number; unit: string; discount_type?: string; discount_value?: number | null; }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    let { product_id = null, variant_id = null } = payload;
    if (!product_id) throw new Error("Select a product");
    const discount_type = payload.discount_type || 'none';
    let discount_value: number | null = payload.discount_value ?? null;
    if (discount_type === 'none') {
        discount_value = 0;
    } else {
        discount_value = (discount_value == null) ? 0 : discount_value;
        if (discount_type === 'percent' && (discount_value < 0 || discount_value > 100)) throw new Error('Percent discount must be between 0 and 100');
        if (discount_value < 0) throw new Error('Discount cannot be negative');
    }
    const rec = await InventoryService.update(payload.id, {
        product_id,
        variant_id,
        quantity: payload.quantity,
        purchase_price: payload.purchase_price,
        sale_price: payload.sale_price,
        unit: payload.unit || 'pcs',
        discount_type,
        discount_value
    });
    revalidatePath("/admin/inventory");
    return rec;
}
export async function deleteInventory(payload: { id: string }) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Unauthorized"); const res = await InventoryService.remove(payload.id); revalidatePath("/admin/inventory"); return res; }
