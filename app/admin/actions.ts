"use server";

import { DashboardService } from "@/lib/services/dashboardService";

export async function getDashboardChartData(startStr: string, endStr: string) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return DashboardService.getSalesChartData(start, end);
}

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDeliveryOptions() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('delivery').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createDeliveryOption(payload: any) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("delivery").insert([payload]);
    if (error) throw error;
    revalidatePath("/admin/settings/delivery");
}

export async function updateDeliveryOption(id: string, payload: any) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("delivery").update(payload).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/settings/delivery");
}

export async function deleteDeliveryOption(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("delivery").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/settings/delivery");
}

export async function getChargeOptions() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('charge_options').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createChargeOption(payload: any) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("charge_options").insert([payload]);
    if (error) throw error;
    revalidatePath("/admin/settings/charges");
}

export async function updateChargeOption(id: string, payload: any) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("charge_options").update(payload).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/settings/charges");
}

export async function deleteChargeOption(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("charge_options").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/settings/charges");
}

export async function updateChargeOptionOrder(items: { id: string; sort_order: number }[]) {
    const supabase = await createAdminClient();
    for (const item of items) {
        await supabase.from("charge_options").update({ sort_order: item.sort_order }).eq("id", item.id);
    }
    revalidatePath("/admin/settings/charges");
}

export async function updateDeliveryOrder(items: { id: string; sort_order: number }[]) {
    const supabase = await createAdminClient();
    for (const item of items) {
        await supabase.from("delivery").update({ sort_order: item.sort_order }).eq("id", item.id);
    }
    revalidatePath("/admin/settings/delivery");
}

export async function getCoupons() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function createCoupon(payload: any) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("coupons").insert([payload]);
    if (error) throw error;
    revalidatePath("/admin/coupons");
}

export async function updateCoupon(id: string, payload: any) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("coupons").update(payload).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/coupons");
}


