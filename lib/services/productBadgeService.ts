import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import type { Tables } from "@/lib/types/supabase";
import {
    DEFAULT_PRODUCT_BADGE_COLOR,
    isProductBadgeColor,
    isProductBadgeVisibleAt,
    type ProductBadgeColor,
} from "@/lib/constants/product-badge";

export type ProductBadgeRow = Tables<"product_badges">;

export interface ProductBadgeInput {
    label: string;
    color: string;
    starts_at?: string | null;
    ends_at?: string | null;
    is_active?: boolean;
}

export type ProductBadgeSummary = Pick<
    ProductBadgeRow,
    "id" | "product_id" | "label" | "color" | "starts_at" | "ends_at" | "is_active"
>;

function isMissingTableError(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "42P01";
}

function normalizeColor(color: string): ProductBadgeColor {
    return isProductBadgeColor(color) ? color : DEFAULT_PRODUCT_BADGE_COLOR;
}

function parseIso(value: string | null | undefined): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function reduceToMap(rows: ProductBadgeRow[]) {
    const map: Record<string, ProductBadgeSummary> = {};
    for (const row of rows) {
        map[row.product_id] = {
            id: row.id,
            product_id: row.product_id,
            label: row.label,
            color: row.color,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            is_active: row.is_active,
        };
    }
    return map;
}

export class ProductBadgeService {
    static async listByProductIds(productIds: string[]): Promise<ProductBadgeRow[]> {
        const ids = Array.from(new Set(productIds.filter(Boolean)));
        if (!ids.length) return [];

        const client = await createClient();
        const { data, error } = await client
            .from("product_badges")
            .select("*")
            .in("product_id", ids);

        if (error) {
            if (isMissingTableError(error)) return [];
            throw error;
        }
        return data || [];
    }

    static async listVisibleByProductIds(productIds: string[], at = new Date()): Promise<ProductBadgeRow[]> {
        const ids = Array.from(new Set(productIds.filter(Boolean)));
        if (!ids.length) return [];

        const client = createPublicClient();
        const { data, error } = await client
            .from("product_badges")
            .select("*")
            .in("product_id", ids)
            .eq("is_active", true);

        if (error) {
            if (isMissingTableError(error)) return [];
            throw error;
        }

        return (data || []).filter((row) => isProductBadgeVisibleAt(row, at));
    }

    static async getAdminBadgeMap(productIds: string[]) {
        const rows = await this.listByProductIds(productIds);
        return reduceToMap(rows);
    }

    static async getVisibleBadgeMap(productIds: string[], at = new Date()) {
        const rows = await this.listVisibleByProductIds(productIds, at);
        return reduceToMap(rows);
    }

    static async getByProductId(productId: string): Promise<ProductBadgeSummary | null> {
        const rows = await this.listByProductIds([productId]);
        const row = rows[0];
        if (!row) return null;
        return {
            id: row.id,
            product_id: row.product_id,
            label: row.label,
            color: row.color,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            is_active: row.is_active,
        };
    }

    static async syncProductBadge(productId: string, badge: ProductBadgeInput | null) {
        const client = SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : await createClient();

        const label = badge?.label?.trim() || "";
        if (!label) {
            const { error } = await client.from("product_badges").delete().eq("product_id", productId);
            if (error && !isMissingTableError(error)) throw error;
            return null;
        }

        const startsAt = parseIso(badge?.starts_at);
        const endsAt = parseIso(badge?.ends_at);
        if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
            throw new Error("Badge end date must be later than start date.");
        }

        const payload = {
            product_id: productId,
            label,
            color: normalizeColor(badge?.color || DEFAULT_PRODUCT_BADGE_COLOR),
            starts_at: startsAt,
            ends_at: endsAt,
            is_active: badge?.is_active ?? true,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await client
            .from("product_badges")
            .upsert(payload, { onConflict: "product_id" })
            .select("*")
            .maybeSingle();

        if (error) {
            if (isMissingTableError(error)) return null;
            throw error;
        }
        return data;
    }
}

