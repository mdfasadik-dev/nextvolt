import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/types/supabase';
import { SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';

export type Store = Tables<'stores'>;

export interface StoreUpsertInput {
    id?: string;
    name: string;
    is_active: boolean;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    website_url?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    opening_hours?: any | null; // JSON structure { mon: [...], ... }
    logo_light_mode?: string | null;
    logo_dark_mode?: string | null;
}

export class StoreService {
    private static wrap<T>(op: () => Promise<T>): Promise<T> {
        return op().catch((err: any) => {
            if (err?.code === '42501') {
                err.message = 'RLS blocked store operation. Provide SUPABASE_SERVICE_ROLE_KEY server-side or add RLS policies for authenticated admin.';
            }
            throw err;
        });
    }
    static async getFirst(): Promise<Store | null> {
        const supabase = await createClient();
        const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (error) throw error;
        return data as Store | null;
    }
    static async upsertSingleton(input: StoreUpsertInput): Promise<Store> {
        return this.wrap(async () => {
            const existing = await this.getFirst();
            if (existing) {
                return this.update(existing.id, input);
            }
            return this.create(input);
        });
    }
    static async listPaged(params: { page: number; pageSize: number; search?: string }) {
        const { page, pageSize, search } = params;
        const supabase = await createClient();
        let query = supabase.from('stores').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        const { data, error, count } = await query;
        if (error) throw error;
        return { rows: data || [], total: count || 0, page };
    }
    static async create(input: StoreUpsertInput) {
        return this.wrap(async () => {
            const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            const { data, error } = await c.from('stores').insert({ ...input }).select().single();
            if (error) throw error;
            return data as Store;
        });
    }
    static async update(id: string, input: StoreUpsertInput) {
        return this.wrap(async () => {
            const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            const { data, error } = await c.from('stores').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single();
            if (error) throw error;
            return data as Store;
        });
    }
    static async remove(id: string) {
        return this.wrap(async () => {
            const c = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();
            const { error } = await c.from('stores').delete().eq('id', id);
            if (error) throw error;
        });
    }
}
