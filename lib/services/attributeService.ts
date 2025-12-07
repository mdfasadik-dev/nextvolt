import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

export type Attribute = Tables<"attributes">;
export type AttributeCreate = TablesInsert<"attributes">;
export type AttributeUpdate = TablesUpdate<"attributes">;

export class AttributeService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> {
        return op().catch((err: any) => { if (err?.code === "42501") err.message = "RLS blocked attributes operation"; throw err; });
    }
    static async list(): Promise<Attribute[]> { return this.wrap(async () => { const c = await createClient(); const { data, error } = await c.from("attributes").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; }); }
    static async create(input: AttributeCreate): Promise<Attribute | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { data, error } = await c.from("attributes").insert(input).select().single(); if (error) throw error; return data; }); }
    static async update(id: string, patch: AttributeUpdate): Promise<Attribute | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { data, error } = await c.from("attributes").update(patch).eq("id", id).select().single(); if (error) throw error; return data; }); }
    static async remove(id: string): Promise<{ id: string } | null> { return this.wrap(async () => { const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient(); const { error } = await c.from("attributes").delete().eq("id", id); if (error) throw error; return { id }; }); }
}
