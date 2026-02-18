import { createClient } from "@/lib/supabase/server";

export interface PriceRange {
    minOriginal: number | null;
    maxOriginal: number | null;
    minFinal: number | null;
    maxFinal: number | null;
    maxDiscountPercent: number;
    totalQty: number | null;
}
export type PriceMap = Record<string, PriceRange>;

// Build a price map for given product ids from inventory table (sale_price + discount info)
export async function buildPriceMap(productIds: string[]): Promise<PriceMap> {
    const supabase = await createClient();
    const map: PriceMap = {};
    if (!productIds.length) return map;
    const { data: inventory, error } = await supabase
        .from("inventory")
        .select("product_id,sale_price,discount_type,discount_value,quantity")
        .in("product_id", productIds);
    if (error) throw error;
    for (const row of (inventory || [])) {
        const m: PriceRange = map[row.product_id] || { minOriginal: null, maxOriginal: null, minFinal: null, maxFinal: null, maxDiscountPercent: 0, totalQty: null };
        const original = row.sale_price;
        let final = original;
        if (row.discount_type === 'percent' && row.discount_value) final = original * (1 - (row.discount_value / 100));
        else if (row.discount_type === 'amount' && row.discount_value) final = Math.max(0, original - row.discount_value);
        m.minOriginal = m.minOriginal == null ? original : Math.min(m.minOriginal, original);
        m.maxOriginal = m.maxOriginal == null ? original : Math.max(m.maxOriginal, original);
        m.minFinal = m.minFinal == null ? final : Math.min(m.minFinal, final);
        m.maxFinal = m.maxFinal == null ? final : Math.max(m.maxFinal, final);
        m.totalQty = (m.totalQty ?? 0) + (row.quantity ?? 0);
        let pct = 0;
        if (row.discount_type === 'percent' && row.discount_value) pct = row.discount_value;
        else if (row.discount_type === 'amount' && row.discount_value) pct = original ? (row.discount_value / original) * 100 : 0;
        if (pct > m.maxDiscountPercent) m.maxDiscountPercent = pct;
        map[row.product_id] = m;
    }
    return map;
}
