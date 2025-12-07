"use server";
import { AttributeService } from "@/lib/services/attributeService";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function listAttributes() { return AttributeService.list(); }
export async function createAttribute(payload: { name: string; code?: string | null; data_type: string }) {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Unauthorized");
    const rec = await AttributeService.create({ name: payload.name, code: payload.code || null, data_type: payload.data_type as any }); revalidatePath("/admin/attributes"); return rec;
}
export async function updateAttribute(payload: { id: string; name: string; code?: string | null; data_type: string }) {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Unauthorized");
    const rec = await AttributeService.update(payload.id, { name: payload.name, code: payload.code || null, data_type: payload.data_type as any }); revalidatePath("/admin/attributes"); return rec;
}
export async function deleteAttribute(payload: { id: string }) {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Unauthorized");
    const res = await AttributeService.remove(payload.id); revalidatePath("/admin/attributes"); return res;
}
