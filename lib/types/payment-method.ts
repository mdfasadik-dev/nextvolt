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

export type PaymentInstructionImage = {
    id: string;
    label: string;
    url: string;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
};

export type PayableAmountMode =
    | "none"
    | "subtotal"
    | "delivery_charge"
    | "extra_charges"
    | "all_charges"
    | "total_payable";

export type PaymentMethodWithCharges = PaymentMethod & {
    charges: ChargeOption[];
    instruction_images?: PaymentInstructionImage[];
    payable_amount_mode?: PayableAmountMode | string | null;
};

export function parseCustomFields(raw: unknown): PaymentMethodCustomField[] {
    if (!raw) return [];
    let parsed = raw;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter((item): item is PaymentMethodCustomField => 
            typeof item === "object" && 
            item !== null && 
            typeof (item as any).label === "string" && 
            (item as any).label.trim().length > 0
        )
        .map((item: any, idx: number) => ({
            id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `field_${idx}_${Date.now()}`,
            label: String(item.label).trim(),
            placeholder: item.placeholder && typeof item.placeholder === "string" ? item.placeholder.trim() : "",
            required: Boolean(item.required),
        }));
}
