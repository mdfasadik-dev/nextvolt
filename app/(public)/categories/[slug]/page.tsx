import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
// @ts-ignore - local client component path; Next.js will resolve at runtime
import CategoryProductsClient from "./products-client";

async function fetchData(slugOrId: string) {
    const supabase = await createClient();
    const { data: catBySlug } = await supabase.from("categories").select("*").eq("slug", slugOrId).maybeSingle();
    let category = catBySlug;
    if (!category) {
        const { data: catById } = await supabase.from("categories").select("*").eq("id", slugOrId).maybeSingle();
        category = catById;
    }
    if (!category) return { category: null, products: [], descendantCount: 0, ancestors: [] };
    const { data: allCats } = await supabase.from("categories").select("id,parent_id,name,slug");
    const map = new Map<string, any>();
    (allCats || []).forEach(c => map.set(c.id, c));
    // descendants
    const descendants: string[] = [];
    const queue = [category.id];
    while (queue.length) {
        const current = queue.shift()!;
        for (const c of map.values()) if (c.parent_id === current) { descendants.push(c.id); queue.push(c.id); }
    }
    // ancestors
    const ancestorsRev: any[] = [];
    let pid = category.parent_id as string | null;
    while (pid) { const p = map.get(pid); if (!p) break; ancestorsRev.push(p); pid = p.parent_id; }
    const ancestors = ancestorsRev.reverse();
    const ids = [category.id, ...descendants];
    const { data: products } = await supabase.from("products").select("*").eq('is_active', true).in("category_id", ids).order("created_at", { ascending: false });
    const productList: any[] = products || [];
    // Fetch inventory to derive price ranges (original vs discounted)
    let priceMap: Record<string, { minOriginal: number | null; maxOriginal: number | null; minFinal: number | null; maxFinal: number | null; maxDiscountPercent: number }> = {};
    if (productList.length) {
        const { data: inventory } = await supabase
            .from("inventory")
            .select("product_id,sale_price,discount_type,discount_value")
            .in("product_id", productList.map((p: any) => p.id));
        if (inventory) {
            for (const row of inventory) {
                const m = priceMap[row.product_id] || { minOriginal: null, maxOriginal: null, minFinal: null, maxFinal: null, maxDiscountPercent: 0 };
                const original = row.sale_price;
                let final = original;
                if (row.discount_type === 'percent' && row.discount_value) {
                    final = original * (1 - (row.discount_value / 100));
                } else if (row.discount_type === 'amount' && row.discount_value) {
                    final = Math.max(0, original - row.discount_value);
                }
                m.minOriginal = m.minOriginal == null ? original : Math.min(m.minOriginal, original);
                m.maxOriginal = m.maxOriginal == null ? original : Math.max(m.maxOriginal, original);
                m.minFinal = m.minFinal == null ? final : Math.min(m.minFinal, final);
                m.maxFinal = m.maxFinal == null ? final : Math.max(m.maxFinal, final);
                // track best discount percent equivalent
                let pct = 0;
                if (row.discount_type === 'percent' && row.discount_value) pct = row.discount_value;
                else if (row.discount_type === 'amount' && row.discount_value) pct = original ? (row.discount_value / original) * 100 : 0;
                if (pct > m.maxDiscountPercent) m.maxDiscountPercent = pct;
                priceMap[row.product_id] = m;
            }
        }
    }
    return { category, products: productList, priceMap, descendantCount: descendants.length, ancestors };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function CategoryPage(props: any) {
    const params = await props.params;
    const { category, products, priceMap, descendantCount, ancestors } = await fetchData(params.slug) as any;
    if (!category) notFound();

    // Build attribute filter data
    const supabase = await createClient();
    // Upward chain: category then its parents (closest parent first)
    const chain = [category, ...ancestors.slice().reverse()];
    const chainIds = chain.map(c => c.id);
    const { data: catAttrs } = await supabase.from("category_attributes").select("category_id,attribute_id").in("category_id", chainIds);
    let applicableAttributeIds: string[] = [];
    if (catAttrs && catAttrs.length) {
        for (const c of chain) {
            const list = catAttrs.filter(x => x.category_id === c.id).map(x => x.attribute_id);
            if (list.length) { applicableAttributeIds = list; break; }
        }
    }
    let attributeFilters: any[] = [];
    let productAttributeMap: Record<string, Record<string, string>> = {};
    if (applicableAttributeIds.length && products.length) {
        const { data: attributes } = await supabase.from("attributes").select("id,name,data_type").in("id", applicableAttributeIds);
        const productIds = products.map((p: any) => p.id);
        const { data: pavs } = await supabase.from("product_attribute_values").select("product_id,attribute_id,value_text,value_number,value_boolean").in("product_id", productIds).in("attribute_id", applicableAttributeIds);
        // Build product -> attribute -> valueKey
        for (const pav of (pavs || [])) {
            const raw = pav.value_text ?? (pav.value_number?.toString() ?? (pav.value_boolean === null ? null : pav.value_boolean ? 'true' : 'false'));
            if (!raw) continue;
            productAttributeMap[pav.product_id] ||= {};
            productAttributeMap[pav.product_id][pav.attribute_id] = raw;
        }
        // Aggregate counts per attribute/value
        for (const attr of (attributes || [])) {
            const counts: Record<string, number> = {};
            for (const pav of (pavs || []).filter(p => p.attribute_id === attr.id)) {
                const key = pav.value_text ?? (pav.value_number?.toString() ?? (pav.value_boolean === null ? null : pav.value_boolean ? 'true' : 'false'));
                if (!key) continue;
                counts[key] = (counts[key] || 0) + 1;
            }
            const values = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([valueKey, count]) => ({ valueKey, label: formatValueLabel(attr.data_type as any, valueKey), count }));
            if (values.length) {
                attributeFilters.push({ attribute: attr, values });
            }
        }
    }

    return (
        <div className="w-full max-w-6xl flex-1 flex flex-col gap-6 p-5">
            <nav className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
                <Link href="/" className="hover:underline">Home</Link>
                {ancestors.map((a: any) => (
                    <span key={a.id} className="flex items-center gap-2">
                        <span>/</span>
                        <Link href={`/categories/${a.slug || a.id}`} className="hover:underline">{a.name}</Link>
                    </span>
                ))}
                <span>/</span>
                <span className="text-foreground" aria-current="page">{category.name}</span>
            </nav>
            <CategoryProductsClient
                categoryName={category.name}
                descendantCount={descendantCount}
                products={products}
                priceMap={priceMap}
                attributeFilters={attributeFilters}
                productAttributeMap={productAttributeMap}
            />
        </div>
    );
}

function formatValueLabel(dataType: string, raw: string): string {
    if (dataType === 'boolean') return raw === 'true' ? 'Yes' : 'No';
    return raw;
}
