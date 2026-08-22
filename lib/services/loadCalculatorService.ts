import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";

export type LoadGroup = Tables<"load_groups">;
export type LoadItem = Tables<"load_items">;
export type CalculatorMetaField = Tables<"calculator_meta_fields">;
export type CalculatorMetaFieldOption = Tables<"calculator_meta_field_options">;
export type CalculatorRule = Tables<"calculator_suggestion_rules">;
export type CalculatorRuleCondition = Tables<"calculator_rule_conditions">;
export type CalculatorRuleProduct = Tables<"calculator_rule_products">;

export type LoadGroupWithItems = LoadGroup & { load_items: LoadItem[] };
export type MetaFieldWithOptions = CalculatorMetaField & {
    calculator_meta_field_options: CalculatorMetaFieldOption[];
};
export type RuleWithRelations = CalculatorRule & {
    calculator_rule_conditions: CalculatorRuleCondition[];
    calculator_rule_products: (CalculatorRuleProduct & {
        products?: { id: string; name: string; brand: string | null } | null;
    })[];
};

export function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

async function writeClient() {
    return SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : createClient();
}

export class LoadCalculatorService {
    // ---------------- Load groups ----------------
    static async listGroupsAdmin(): Promise<LoadGroupWithItems[]> {
        const client = await writeClient();
        const { data, error } = await client
            .from("load_groups")
            .select("*, load_items(*)")
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });
        if (error) throw error;
        return (data || []).map(group => ({
            ...group,
            load_items: (group.load_items || [])
                .filter((item: LoadItem) => !item.is_deleted)
                .sort((a: LoadItem, b: LoadItem) => a.sort_order - b.sort_order),
        })) as LoadGroupWithItems[];
    }

    static async listGroupsPublic(): Promise<LoadGroupWithItems[]> {
        const client = createPublicClient();
        const { data, error } = await client
            .from("load_groups")
            .select("*, load_items(*)")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data || []).map(group => ({
            ...group,
            load_items: (group.load_items || [])
                .filter((item: LoadItem) => item.is_active && !item.is_deleted)
                .sort((a: LoadItem, b: LoadItem) => a.sort_order - b.sort_order),
        })) as LoadGroupWithItems[];
    }

    static async createGroup(payload: TablesInsert<"load_groups">): Promise<LoadGroup> {
        const client = await writeClient();
        const name = payload.name?.trim() || "Untitled Group";
        const { data, error } = await client
            .from("load_groups")
            .insert({ ...payload, name, slug: payload.slug?.trim() ? slugify(payload.slug) : slugify(name) })
            .select("*")
            .single();
        if (error) throw error;
        return data;
    }

    static async updateGroup(id: string, payload: TablesUpdate<"load_groups">): Promise<LoadGroup> {
        const client = await writeClient();
        const next: TablesUpdate<"load_groups"> = { ...payload };
        if (typeof payload.slug === "string" && payload.slug.trim()) next.slug = slugify(payload.slug);
        const { data, error } = await client.from("load_groups").update(next).eq("id", id).select("*").single();
        if (error) throw error;
        return data;
    }

    /** Soft delete so historical rules keep resolving. */
    static async removeGroup(id: string) {
        const client = await writeClient();
        const { error } = await client.from("load_groups").update({ is_deleted: true }).eq("id", id);
        if (error) throw error;
    }

    static async reorderGroups(items: Array<{ id: string; sort_order: number }>) {
        if (!items.length) return;
        const client = await writeClient();
        for (const item of items) {
            const { error } = await client.from("load_groups").update({ sort_order: item.sort_order }).eq("id", item.id);
            if (error) throw error;
        }
    }

    // ---------------- Load items ----------------
    static async createItem(payload: TablesInsert<"load_items">): Promise<LoadItem> {
        const client = await writeClient();
        const { data, error } = await client
            .from("load_items")
            .insert({ ...payload, name: payload.name?.trim() || "Untitled Load" })
            .select("*")
            .single();
        if (error) throw error;
        return data;
    }

    static async updateItem(id: string, payload: TablesUpdate<"load_items">): Promise<LoadItem> {
        const client = await writeClient();
        const { data, error } = await client.from("load_items").update(payload).eq("id", id).select("*").single();
        if (error) throw error;
        return data;
    }

    static async removeItem(id: string) {
        const client = await writeClient();
        const { error } = await client.from("load_items").update({ is_deleted: true }).eq("id", id);
        if (error) throw error;
    }

    static async reorderItems(items: Array<{ id: string; sort_order: number }>) {
        if (!items.length) return;
        const client = await writeClient();
        for (const item of items) {
            const { error } = await client.from("load_items").update({ sort_order: item.sort_order }).eq("id", item.id);
            if (error) throw error;
        }
    }

    // ---------------- Meta fields ----------------
    static async listFieldsAdmin(): Promise<MetaFieldWithOptions[]> {
        const client = await writeClient();
        const { data, error } = await client
            .from("calculator_meta_fields")
            .select("*, calculator_meta_field_options(*)")
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data || []).map(field => ({
            ...field,
            calculator_meta_field_options: (field.calculator_meta_field_options || []).sort(
                (a: CalculatorMetaFieldOption, b: CalculatorMetaFieldOption) => a.sort_order - b.sort_order,
            ),
        })) as MetaFieldWithOptions[];
    }

    static async listFieldsPublic(): Promise<MetaFieldWithOptions[]> {
        const client = createPublicClient();
        const { data, error } = await client
            .from("calculator_meta_fields")
            .select("*, calculator_meta_field_options(*)")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data || []).map(field => ({
            ...field,
            calculator_meta_field_options: (field.calculator_meta_field_options || [])
                .filter((option: CalculatorMetaFieldOption) => option.is_active)
                .sort((a: CalculatorMetaFieldOption, b: CalculatorMetaFieldOption) => a.sort_order - b.sort_order),
        })) as MetaFieldWithOptions[];
    }

    static async createField(
        payload: TablesInsert<"calculator_meta_fields">,
        options: Array<Omit<TablesInsert<"calculator_meta_field_options">, "field_id">> = [],
    ): Promise<CalculatorMetaField> {
        const client = await writeClient();
        const { data, error } = await client
            .from("calculator_meta_fields")
            .insert({ ...payload, key: slugify(payload.key || payload.label).replace(/-/g, "_") })
            .select("*")
            .single();
        if (error) throw error;
        if (options.length) {
            const { error: optionError } = await client
                .from("calculator_meta_field_options")
                .insert(options.map((option, index) => ({ ...option, field_id: data.id, sort_order: index })));
            if (optionError) throw optionError;
        }
        return data;
    }

    static async updateField(
        id: string,
        payload: TablesUpdate<"calculator_meta_fields">,
        options?: Array<Omit<TablesInsert<"calculator_meta_field_options">, "field_id">>,
    ): Promise<CalculatorMetaField> {
        const client = await writeClient();
        const { data, error } = await client
            .from("calculator_meta_fields")
            .update(payload)
            .eq("id", id)
            .select("*")
            .single();
        if (error) throw error;
        if (options) {
            // Replace the option set wholesale — simplest correct sync for a small list.
            const { error: deleteError } = await client
                .from("calculator_meta_field_options")
                .delete()
                .eq("field_id", id);
            if (deleteError) throw deleteError;
            if (options.length) {
                const { error: insertError } = await client
                    .from("calculator_meta_field_options")
                    .insert(options.map((option, index) => ({ ...option, field_id: id, sort_order: index })));
                if (insertError) throw insertError;
            }
        }
        return data;
    }

    static async removeField(id: string) {
        const client = await writeClient();
        const { error } = await client.from("calculator_meta_fields").update({ is_deleted: true }).eq("id", id);
        if (error) throw error;
    }

    // ---------------- Suggestion rules ----------------
    static async listRulesAdmin(): Promise<RuleWithRelations[]> {
        const client = await writeClient();
        const { data, error } = await client
            .from("calculator_suggestion_rules")
            .select("*, calculator_rule_conditions(*), calculator_rule_products(*, products(id, name, brand))")
            .eq("is_deleted", false)
            .order("priority", { ascending: false })
            .order("min_load", { ascending: true });
        if (error) throw error;
        return (data || []) as RuleWithRelations[];
    }

    static async createRule(
        payload: TablesInsert<"calculator_suggestion_rules">,
        conditions: Array<Omit<TablesInsert<"calculator_rule_conditions">, "rule_id">> = [],
        products: Array<Omit<TablesInsert<"calculator_rule_products">, "rule_id">> = [],
    ): Promise<CalculatorRule> {
        const client = await writeClient();
        const { data, error } = await client
            .from("calculator_suggestion_rules")
            .insert(payload)
            .select("*")
            .single();
        if (error) throw error;
        await this.replaceRuleChildren(data.id, conditions, products);
        return data;
    }

    static async updateRule(
        id: string,
        payload: TablesUpdate<"calculator_suggestion_rules">,
        conditions?: Array<Omit<TablesInsert<"calculator_rule_conditions">, "rule_id">>,
        products?: Array<Omit<TablesInsert<"calculator_rule_products">, "rule_id">>,
    ): Promise<CalculatorRule> {
        const client = await writeClient();
        const { data, error } = await client
            .from("calculator_suggestion_rules")
            .update(payload)
            .eq("id", id)
            .select("*")
            .single();
        if (error) throw error;
        if (conditions || products) {
            await this.replaceRuleChildren(id, conditions, products);
        }
        return data;
    }

    private static async replaceRuleChildren(
        ruleId: string,
        conditions?: Array<Omit<TablesInsert<"calculator_rule_conditions">, "rule_id">>,
        products?: Array<Omit<TablesInsert<"calculator_rule_products">, "rule_id">>,
    ) {
        const client = await writeClient();
        if (conditions) {
            const { error } = await client.from("calculator_rule_conditions").delete().eq("rule_id", ruleId);
            if (error) throw error;
            if (conditions.length) {
                const { error: insertError } = await client
                    .from("calculator_rule_conditions")
                    .insert(conditions.map(condition => ({ ...condition, rule_id: ruleId })));
                if (insertError) throw insertError;
            }
        }
        if (products) {
            const { error } = await client.from("calculator_rule_products").delete().eq("rule_id", ruleId);
            if (error) throw error;
            if (products.length) {
                const { error: insertError } = await client
                    .from("calculator_rule_products")
                    .insert(products.map((product, index) => ({ ...product, rule_id: ruleId, sort_order: index })));
                if (insertError) throw insertError;
            }
        }
    }

    static async removeRule(id: string) {
        const client = await writeClient();
        const { error } = await client.from("calculator_suggestion_rules").update({ is_deleted: true }).eq("id", id);
        if (error) throw error;
    }

    // ---------------- Public matching ----------------
    static async suggestProducts(totalLoad: number, meta: Record<string, unknown>) {
        const client = createPublicClient();
        const { data, error } = await client.rpc("calculator_suggested_products", {
            p_total_load: totalLoad,
            p_meta: meta as never,
        });
        if (error) throw error;
        return data || [];
    }
}
