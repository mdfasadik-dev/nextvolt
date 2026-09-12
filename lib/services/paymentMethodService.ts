import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
    parseCustomFields,
    type PaymentMethod,
    type PaymentMethodInsert,
    type PaymentMethodUpdate,
    type ChargeOption,
    type PaymentMethodCustomField,
    type PaymentMethodWithCharges,
    type PaymentInstructionImage,
} from "@/lib/types/payment-method";

export {
    parseCustomFields,
    type PaymentMethod,
    type PaymentMethodInsert,
    type PaymentMethodUpdate,
    type ChargeOption,
    type PaymentMethodCustomField,
    type PaymentMethodWithCharges,
    type PaymentInstructionImage,
};

export class PaymentMethodService {
    static async listInstructionImages(): Promise<PaymentInstructionImage[]> {
        const client = await createAdminClient();
        const { data, error } = await client
            .from("payment_instruction_images")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) {
            if ((error as { code?: string }).code === "42P01") return [];
            throw error;
        }
        return data || [];
    }

    static async createInstructionImage(label: string, url: string): Promise<PaymentInstructionImage> {
        const client = await createAdminClient();
        const { data, error } = await client
            .from("payment_instruction_images")
            .insert([{ label: label.trim(), url }])
            .select("*")
            .single();

        if (error) throw error;
        return data;
    }

    static async deleteInstructionImage(id: string): Promise<void> {
        const client = await createAdminClient();
        const { error } = await client
            .from("payment_instruction_images")
            .delete()
            .eq("id", id);

        if (error) throw error;
    }

    static async listPublic(): Promise<PaymentMethodWithCharges[]> {
        const client = await createClient();
        const { data, error } = await client
            .from("payment_methods")
            .select("*, payment_method_charges(charge_options(*)), payment_method_instruction_images(payment_instruction_images(*))")
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

            const rawImages = row.payment_method_instruction_images || [];
            const instruction_images: PaymentInstructionImage[] = rawImages
                .map((pmii: any) => pmii.payment_instruction_images)
                .filter(Boolean)
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

            return {
                ...row,
                custom_fields: parseCustomFields(row.custom_fields),
                charges,
                instruction_images,
            };
        });
    }

    static async listAdmin(): Promise<PaymentMethodWithCharges[]> {
        const client = await createAdminClient();
        const { data, error } = await client
            .from("payment_methods")
            .select("*, payment_method_charges(charge_options(*)), payment_method_instruction_images(payment_instruction_images(*))")
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

            const rawImages = row.payment_method_instruction_images || [];
            const instruction_images: PaymentInstructionImage[] = rawImages
                .map((pmii: any) => pmii.payment_instruction_images)
                .filter(Boolean)
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

            return {
                ...row,
                custom_fields: parseCustomFields(row.custom_fields),
                charges,
                instruction_images,
            };
        });
    }

    static async create(
        payload: PaymentMethodInsert,
        chargeOptionIds: string[] = [],
        instructionImageIds: string[] = []
    ): Promise<PaymentMethod> {
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

        if (instructionImageIds.length > 0) {
            await this.syncInstructionImages(data.id, instructionImageIds);
        }

        return data;
    }

    static async update(
        id: string,
        payload: PaymentMethodUpdate,
        chargeOptionIds?: string[],
        instructionImageIds?: string[]
    ): Promise<PaymentMethod> {
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

        if (instructionImageIds !== undefined) {
            await this.syncInstructionImages(id, instructionImageIds);
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

    static async syncInstructionImages(paymentMethodId: string, imageIds: string[]): Promise<void> {
        const client = await createAdminClient();
        await client.from("payment_method_instruction_images").delete().eq("payment_method_id", paymentMethodId);

        if (!imageIds.length) return;

        const rows = imageIds.map((image_id, index) => ({
            payment_method_id: paymentMethodId,
            image_id,
            sort_order: index,
        }));

        const { error } = await client.from("payment_method_instruction_images").insert(rows);
        if (error) throw error;
    }
}

