"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LoadCalculatorService } from "@/lib/services/loadCalculatorService";
import type { TablesInsert } from "@/lib/types/supabase";

async function requireAdminUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
}

function revalidateCalculator() {
    revalidatePath("/admin/load-calculator");
    revalidatePath("/load-calculator");
}

// ---------------- Groups ----------------
export type LoadGroupInput = {
    name: string;
    slug?: string | null;
    icon?: string | null;
    description?: string | null;
    unit_name: string;
    unit_symbol: string;
    sort_order?: number;
    is_active?: boolean;
};

export async function createLoadGroup(payload: LoadGroupInput) {
    await requireAdminUser();
    const group = await LoadCalculatorService.createGroup({
        name: payload.name,
        slug: payload.slug || null,
        icon: payload.icon || null,
        description: payload.description || null,
        unit_name: payload.unit_name || "Watt",
        unit_symbol: payload.unit_symbol || "W",
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
    });
    revalidateCalculator();
    return group;
}

export async function updateLoadGroup(id: string, payload: LoadGroupInput) {
    await requireAdminUser();
    const group = await LoadCalculatorService.updateGroup(id, {
        name: payload.name,
        slug: payload.slug || undefined,
        icon: payload.icon || null,
        description: payload.description || null,
        unit_name: payload.unit_name,
        unit_symbol: payload.unit_symbol,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
    });
    revalidateCalculator();
    return group;
}

export async function deleteLoadGroup(id: string) {
    await requireAdminUser();
    await LoadCalculatorService.removeGroup(id);
    revalidateCalculator();
}

export async function reorderLoadGroups(items: Array<{ id: string; sort_order: number }>) {
    await requireAdminUser();
    await LoadCalculatorService.reorderGroups(items);
    revalidateCalculator();
}

// ---------------- Items ----------------
export type LoadItemInput = {
    load_group_id: string;
    name: string;
    icon?: string | null;
    unit_value: number;
    max_quantity?: number | null;
    sort_order?: number;
    is_active?: boolean;
};

export async function createLoadItem(payload: LoadItemInput) {
    await requireAdminUser();
    const item = await LoadCalculatorService.createItem({
        load_group_id: payload.load_group_id,
        name: payload.name,
        icon: payload.icon || null,
        unit_value: payload.unit_value ?? 0,
        max_quantity: payload.max_quantity ?? null,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
    });
    revalidateCalculator();
    return item;
}

export async function updateLoadItem(id: string, payload: Omit<LoadItemInput, "load_group_id">) {
    await requireAdminUser();
    const item = await LoadCalculatorService.updateItem(id, {
        name: payload.name,
        icon: payload.icon || null,
        unit_value: payload.unit_value ?? 0,
        max_quantity: payload.max_quantity ?? null,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
    });
    revalidateCalculator();
    return item;
}

export async function deleteLoadItem(id: string) {
    await requireAdminUser();
    await LoadCalculatorService.removeItem(id);
    revalidateCalculator();
}

export async function reorderLoadItems(items: Array<{ id: string; sort_order: number }>) {
    await requireAdminUser();
    await LoadCalculatorService.reorderItems(items);
    revalidateCalculator();
}

// ---------------- Meta fields ----------------
export type MetaFieldOptionInput = {
    label: string;
    value: string;
    number_value?: number | null;
    is_default?: boolean;
};

export type MetaFieldInput = {
    key: string;
    label: string;
    help_text?: string | null;
    field_type: "slider" | "dropdown" | "input" | "radio" | "checkbox";
    unit_name?: string | null;
    unit_symbol?: string | null;
    min_value?: number | null;
    max_value?: number | null;
    step_value?: number | null;
    default_number?: number | null;
    default_text?: string | null;
    is_numeric?: boolean;
    is_required?: boolean;
    sort_order?: number;
    is_active?: boolean;
    options?: MetaFieldOptionInput[];
};

function toOptionRows(options: MetaFieldOptionInput[] = []) {
    return options
        .filter(option => option.label.trim() && option.value.trim())
        .map<Omit<TablesInsert<"calculator_meta_field_options">, "field_id">>(option => ({
            label: option.label.trim(),
            value: option.value.trim(),
            number_value: option.number_value ?? null,
            is_default: option.is_default ?? false,
        }));
}

export async function createMetaField(payload: MetaFieldInput) {
    await requireAdminUser();
    const field = await LoadCalculatorService.createField(
        {
            key: payload.key,
            label: payload.label,
            help_text: payload.help_text || null,
            field_type: payload.field_type,
            unit_name: payload.unit_name || null,
            unit_symbol: payload.unit_symbol || null,
            min_value: payload.min_value ?? null,
            max_value: payload.max_value ?? null,
            step_value: payload.step_value ?? null,
            default_number: payload.default_number ?? null,
            default_text: payload.default_text || null,
            is_numeric: payload.is_numeric ?? true,
            is_required: payload.is_required ?? false,
            sort_order: payload.sort_order ?? 0,
            is_active: payload.is_active ?? true,
        },
        toOptionRows(payload.options),
    );
    revalidateCalculator();
    return field;
}

export async function updateMetaField(id: string, payload: MetaFieldInput) {
    await requireAdminUser();
    const field = await LoadCalculatorService.updateField(
        id,
        {
            label: payload.label,
            help_text: payload.help_text || null,
            field_type: payload.field_type,
            unit_name: payload.unit_name || null,
            unit_symbol: payload.unit_symbol || null,
            min_value: payload.min_value ?? null,
            max_value: payload.max_value ?? null,
            step_value: payload.step_value ?? null,
            default_number: payload.default_number ?? null,
            default_text: payload.default_text || null,
            is_numeric: payload.is_numeric ?? true,
            is_required: payload.is_required ?? false,
            sort_order: payload.sort_order ?? 0,
            is_active: payload.is_active ?? true,
        },
        toOptionRows(payload.options),
    );
    revalidateCalculator();
    return field;
}

export async function deleteMetaField(id: string) {
    await requireAdminUser();
    await LoadCalculatorService.removeField(id);
    revalidateCalculator();
}

// ---------------- Rules ----------------
export type RuleConditionInput = {
    field_id: string;
    operator: "between" | "eq" | "neq" | "in" | "contains";
    min_value?: number | null;
    max_value?: number | null;
    value_text?: string | null;
    value_number?: number | null;
    value_set?: string[] | null;
};

export type RuleProductInput = {
    product_id: string;
    is_primary?: boolean;
    note?: string | null;
};

export type RuleInput = {
    name: string;
    description?: string | null;
    min_load: number;
    max_load?: number | null;
    unit_name?: string;
    unit_symbol?: string;
    priority?: number;
    headline?: string | null;
    note?: string | null;
    is_active?: boolean;
    conditions?: RuleConditionInput[];
    products?: RuleProductInput[];
};

function toConditionRows(conditions: RuleConditionInput[] = []) {
    return conditions
        .filter(condition => condition.field_id)
        .map<Omit<TablesInsert<"calculator_rule_conditions">, "rule_id">>(condition => ({
            field_id: condition.field_id,
            operator: condition.operator,
            min_value: condition.operator === "between" ? condition.min_value ?? null : null,
            max_value: condition.operator === "between" ? condition.max_value ?? null : null,
            value_text:
                condition.operator === "eq" || condition.operator === "neq" ? condition.value_text || null : null,
            value_number:
                condition.operator === "eq" || condition.operator === "neq" ? condition.value_number ?? null : null,
            value_set:
                condition.operator === "in" || condition.operator === "contains"
                    ? (condition.value_set && condition.value_set.length ? condition.value_set : null)
                    : null,
        }));
}

function toProductRows(products: RuleProductInput[] = []) {
    // Guard the (rule_id, product_id, NULL) uniqueness gap: NULLs compare distinct
    // in Postgres, so dedupe product-level picks here.
    const seen = new Set<string>();
    const rows: Array<Omit<TablesInsert<"calculator_rule_products">, "rule_id">> = [];
    for (const product of products) {
        if (!product.product_id || seen.has(product.product_id)) continue;
        seen.add(product.product_id);
        rows.push({
            product_id: product.product_id,
            variant_id: null,
            is_primary: product.is_primary ?? false,
            note: product.note || null,
        });
    }
    return rows;
}

export async function createSuggestionRule(payload: RuleInput) {
    await requireAdminUser();
    const rule = await LoadCalculatorService.createRule(
        {
            name: payload.name,
            description: payload.description || null,
            min_load: payload.min_load ?? 0,
            max_load: payload.max_load ?? null,
            unit_name: payload.unit_name || "Watt",
            unit_symbol: payload.unit_symbol || "W",
            priority: payload.priority ?? 0,
            headline: payload.headline || null,
            note: payload.note || null,
            is_active: payload.is_active ?? true,
        },
        toConditionRows(payload.conditions),
        toProductRows(payload.products),
    );
    revalidateCalculator();
    return rule;
}

export async function updateSuggestionRule(id: string, payload: RuleInput) {
    await requireAdminUser();
    const rule = await LoadCalculatorService.updateRule(
        id,
        {
            name: payload.name,
            description: payload.description || null,
            min_load: payload.min_load ?? 0,
            max_load: payload.max_load ?? null,
            unit_name: payload.unit_name || "Watt",
            unit_symbol: payload.unit_symbol || "W",
            priority: payload.priority ?? 0,
            headline: payload.headline || null,
            note: payload.note || null,
            is_active: payload.is_active ?? true,
        },
        toConditionRows(payload.conditions),
        toProductRows(payload.products),
    );
    revalidateCalculator();
    return rule;
}

export async function deleteSuggestionRule(id: string) {
    await requireAdminUser();
    await LoadCalculatorService.removeRule(id);
    revalidateCalculator();
}
