import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";

export type PaymentMethod = Tables<"payment_methods">;
export type PaymentMethodInsert = TablesInsert<"payment_methods">;
export type PaymentMethodUpdate = TablesUpdate<"payment_methods">;
export type ChargeOption = Tables<"charge_options">;

export type PaymentMethodCustomField = {
    id: string;
    label: string;
    placeholder?: string;
    required: boolean;
};

export type PaymentMethodWithCharges = PaymentMethod & {
    charges: ChargeOption[];
};

export class PaymentMethodService {
    static async listPublic(): Promise<PaymentMethodWithCharges[]> {
        const client = await createClient();
        const { data, error } = await client
            .from("payment_methods")
            .select("*, payment_method_charges(charge_options(*))")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            if ((error as { code?: string }).code === "42P01") return [];
            throw error;
        }

        return (data || []).map((row: any) => {
            const rawCharges = row.payment_method_charges || [];
            const charges: ChargeOption[] = rawCharges
                .map((pmc: any) => pmc.charge_options)
                .filter((co: any) => co && co.is_active)
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

            return {
                ...row,
                charges,
            };
        });
    }

    static async listAdmin(): Promise<PaymentMethodWithCharges[]> {
        const client = await createAdminClient();
        const { data, error } = await client
            .from("payment_methods")
            .select("*, payment_method_charges(charge_options(*))")
            .order("sort_order", { ascending: true });

        if (error) {
            if ((error as { code?: string }).code === "42P01") return [];
            throw error;
        }

        return (data || []).map((row: any) => {
            const rawCharges = row.payment_method_charges || [];
            const charges: ChargeOption[] = rawCharges
                .map((pmc: any) => pmc.charge_options)
                .filter(Boolean)
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

            return {
                ...row,
                charges,
            };
        });
    }

    static async create(payload: PaymentMethodInsert, chargeOptionIds: string[] = []): Promise<PaymentMethod> {
        const client = await createAdminClient();
        const { data, error } = await client
            .from("payment_methods")
            .insert([payload])
            .select("*")
            .single();

        if (error) throw error;

        if (chargeOptionIds.length > 0) {
            await this.syncCharges(data.id, chargeOptionIds);
        }

        return data;
    }

    static async update(id: string, payload: PaymentMethodUpdate, chargeOptionIds?: string[]): Promise<PaymentMethod> {
        const client = await createAdminClient();
        const { data, error } = await client
            .from("payment_methods")
            .update(payload)
            .eq("id", id)
            .select("*")
            .single();

        if (error) throw error;

        if (chargeOptionIds) {
            await this.syncCharges(id, chargeOptionIds);
        }

        return data;
    }

    static async delete(id: string): Promise<void> {
        const client = await createAdminClient();
        const { error } = await client.from("payment_methods").delete().eq("id", id);
        if (error) throw error;
    }

    static async updateOrder(items: { id: string; sort_order: number }[]): Promise<void> {
        const client = await createAdminClient();
        for (const item of items) {
            await client.from("payment_methods").update({ sort_order: item.sort_order }).eq("id", item.id);
        }
    }

    static async syncCharges(paymentMethodId: string, chargeOptionIds: string[]): Promise<void> {
        const client = await createAdminClient();
        await client.from("payment_method_charges").delete().eq("payment_method_id", paymentMethodId);

        if (!chargeOptionIds.length) return;

        const rows = chargeOptionIds.map((charge_option_id, index) => ({
            payment_method_id: paymentMethodId,
            charge_option_id,
            sort_order: index,
        }));

        const { error } = await client.from("payment_method_charges").insert(rows);
        if (error) throw error;
    }
}
