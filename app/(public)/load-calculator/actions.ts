"use server";

import { unstable_noStore as noStore } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { LoadCalculatorService } from "@/lib/services/loadCalculatorService";
import { buildPriceMap, type PriceMap } from "@/lib/services/pricing";
import { ProductBadgeService } from "@/lib/services/productBadgeService";
import type { Product } from "@/lib/services/productService";

export type SuggestionResult = {
    products: Product[];
    priceMap: PriceMap;
    badgeMap: Record<string, { label: string; color: string } | null>;
    headline: string | null;
    note: string | null;
    matched: boolean;
};

/**
 * Resolve the admin-configured rules for a given total load + meta answers,
 * then hydrate the matched products for the public grid.
 */
export async function getSuggestions(
    totalLoad: number,
    meta: Record<string, unknown>,
): Promise<SuggestionResult> {
    noStore();
    const empty: SuggestionResult = {
        products: [],
        priceMap: {},
        badgeMap: {},
        headline: null,
        note: null,
        matched: false,
    };

    if (!Number.isFinite(totalLoad) || totalLoad <= 0) return empty;

    const rows = await LoadCalculatorService.suggestProducts(totalLoad, meta);
    if (!rows.length) return empty;

    // Rows arrive ordered by priority then is_primary; keep first occurrence.
    const orderedIds: string[] = [];
    for (const row of rows) {
        if (row.product_id && !orderedIds.includes(row.product_id)) orderedIds.push(row.product_id);
    }
    if (!orderedIds.length) return empty;

    const supabase = createPublicClient();
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("id", orderedIds)
        .eq("is_active", true)
        .eq("is_deleted", false);
    if (error) return empty;

    const byId = new Map((data || []).map(product => [product.id, product as Product]));
    const products = orderedIds
        .map(id => byId.get(id))
        .filter((product): product is Product => Boolean(product));

    if (!products.length) return empty;

    const [priceMap, badgeMap] = await Promise.all([
        buildPriceMap(products.map(product => product.id)),
        ProductBadgeService.getVisibleBadgeMap(products.map(product => product.id)),
    ]);

    // `rule_headline` / `rule_note` only exist once script 005 has been run;
    // fall back to the plain result heading until then.
    const top = rows[0] as Partial<{ rule_headline: string; rule_note: string }> | undefined;
    return {
        products,
        priceMap,
        badgeMap,
        headline: top?.rule_headline ?? null,
        note: top?.rule_note ?? null,
        matched: true,
    };
}
