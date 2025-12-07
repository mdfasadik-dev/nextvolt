import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Markdown } from '@/components/markdown';
import React from 'react';
import ProductDetailClient from './product-detail-client';
import { StoreService } from '@/lib/services/storeService';

async function fetchProduct(idOrSlug: string) {
    const supabase = await createClient();
    // Try by slug first then id
    const { data: bySlug } = await supabase.from('products').select('*').eq('slug', idOrSlug).maybeSingle();
    let product: any = bySlug;
    if (!product) {
        const { data: byId } = await supabase.from('products').select('*').eq('id', idOrSlug).maybeSingle();
        product = byId;
    }
    if (!product) return null;
    // Gather inventory rows (product level + variant level)
    const { data: inventory } = await supabase.from('inventory').select('id,variant_id,sale_price,discount_type,discount_value,quantity,unit').eq('product_id', product.id);
    let minPrice: number | null = null; // discounted
    let maxPrice: number | null = null; // discounted
    let minOriginal: number | null = null;
    let maxOriginal: number | null = null;
    let baseQty: number | null = null; let baseUnit: string | null = null;
    if (inventory) {
        for (const row of inventory) {
            const original = row.sale_price;
            let final = original;
            if (row.discount_type === 'percent' && row.discount_value) final = row.sale_price * (1 - row.discount_value / 100);
            else if (row.discount_type === 'amount' && row.discount_value) final = Math.max(0, row.sale_price - row.discount_value);
            minOriginal = minOriginal == null ? original : Math.min(minOriginal, original);
            maxOriginal = maxOriginal == null ? original : Math.max(maxOriginal, original);
            minPrice = minPrice == null ? final : Math.min(minPrice, final);
            maxPrice = maxPrice == null ? final : Math.max(maxPrice, final);
            if (!row.variant_id) {
                baseQty = (baseQty ?? 0) + (row.quantity ?? 0);
                if (!baseUnit) baseUnit = row.unit || null;
            }
        }
    }
    // Product attributes (joined values)
    const { data: pavs } = await supabase
        .from('product_attribute_values')
        .select('attribute_id,value_text,value_number,value_boolean,attributes(id,name,data_type)')
        .eq('product_id', product.id);
    const attributes: { id: string; name: string; data_type: string; value: string }[] = [];
    if (pavs) {
        for (const pav of pavs as any[]) {
            const attr = (pav as any).attributes;
            if (!attr) continue;
            const raw = pav.value_text ?? (pav.value_number?.toString() ?? (pav.value_boolean === null ? null : pav.value_boolean ? 'Yes' : 'No'));
            if (raw) attributes.push({ id: attr.id, name: attr.name, data_type: attr.data_type, value: raw });
        }
    }
    // Variants with pricing
    const { data: variantsRaw } = await supabase.from('product_variants').select('*').eq('product_id', product.id).eq('is_active', true).order('created_at', { ascending: true });
    const variants = (variantsRaw || []).map(v => {
        const rows = (inventory || []).filter(inv => inv.variant_id === v.id);
        let vMinFinal: number | null = null; let vMaxFinal: number | null = null; let vMinOriginal: number | null = null; let vMaxOriginal: number | null = null; let totalQty: number | null = null; let vUnit: string | null = null;
        for (const r of rows) {
            const original = r.sale_price;
            let final = original;
            if (r.discount_type === 'percent' && r.discount_value) final = original * (1 - r.discount_value / 100);
            else if (r.discount_type === 'amount' && r.discount_value) final = Math.max(0, original - r.discount_value);
            vMinOriginal = vMinOriginal == null ? original : Math.min(vMinOriginal, original);
            vMaxOriginal = vMaxOriginal == null ? original : Math.max(vMaxOriginal, original);
            vMinFinal = vMinFinal == null ? final : Math.min(vMinFinal, final);
            vMaxFinal = vMaxFinal == null ? final : Math.max(vMaxFinal, final);
            totalQty = (totalQty ?? 0) + (r.quantity ?? 0);
            if (!vUnit) vUnit = r.unit || null;
        }
        return {
            id: v.id,
            title: v.title,
            sku: v.sku,
            image_url: v.image_url,
            minPrice: vMinFinal,
            maxPrice: vMaxFinal,
            minOriginalPrice: vMinOriginal,
            maxOriginalPrice: vMaxOriginal,
            totalQty,
            unit: vUnit,
            details_md: v.details_md
        };
    });
    // Build category breadcrumb (ancestors)
    let category: any = null; let ancestors: any[] = [];
    if (product.category_id) {
        const { data: allCats } = await supabase.from('categories').select('id,parent_id,name,slug');
        if (allCats && allCats.length) {
            const map = new Map<string, any>();
            allCats.forEach(c => map.set(c.id, c));
            category = map.get(product.category_id);
            // ascend parents
            const chain: any[] = [];
            let pid = category?.parent_id as string | null;
            while (pid) {
                const p = map.get(pid);
                if (!p) break;
                chain.push(p);
                pid = p.parent_id;
            }
            ancestors = chain.reverse();
        }
    }
    return { product, category, ancestors, inventory: inventory || [], price: { minPrice, maxPrice, minOriginal, maxOriginal }, attributes, variants, baseQty, baseUnit };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function ProductDetailPage({ params }: any) {
    const data = await fetchProduct(params.id);
    if (!data) notFound();
    const { product, category, ancestors, price, attributes, variants, baseQty, baseUnit } = data as any;
    const store = await StoreService.getFirst();

    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    const hasDiscount = price.minOriginal != null && price.minPrice != null && price.minOriginal !== price.minPrice;
    const priceRangeDiscount = price.minPrice != null && price.maxPrice != null && price.minPrice !== price.maxPrice;
    const originalRangeDiffers = price.minOriginal != null && price.maxOriginal != null && (price.minOriginal !== price.minPrice || price.maxOriginal !== price.maxPrice);
    let basePriceBlock: string = '—';
    if (price.minPrice != null) {
        if (priceRangeDiscount) basePriceBlock = `${symbol}${price.minPrice.toFixed(0)} - ${symbol}${price.maxPrice.toFixed(0)}`;
        else basePriceBlock = `${symbol}${price.minPrice.toFixed(0)}`;
    }

    return (
        <>
            <div className="w-full max-w-5xl mx-auto p-6 flex flex-col gap-8">
                <nav className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
                    <Link href="/" className="hover:underline">Home</Link>
                    {ancestors && ancestors.map((a: any) => (
                        <span key={a.id} className="flex items-center gap-2">
                            <span>/</span>
                            <Link href={`/categories/${a.slug || a.id}`} className="hover:underline">{a.name}</Link>
                        </span>
                    ))}
                    {category && (
                        <span className="flex items-center gap-2">
                            <span>/</span>
                            <Link href={`/categories/${category.slug || category.id}`} className="hover:underline">{category.name}</Link>
                        </span>
                    )}
                    <span>/</span>
                    <span className="text-foreground" aria-current="page">{product.name}</span>
                </nav>
                <ProductDetailClient
                    productId={product.id}
                    productSlug={product.slug}
                    basePrice={basePriceBlock}
                    basePriceValue={price.minPrice}
                    basePriceOriginal={hasDiscount ? (originalRangeDiffers ? `${symbol}${price.minOriginal!.toFixed(0)}${price.maxOriginal && price.maxOriginal !== price.minOriginal ? ` - ${symbol}${price.maxOriginal.toFixed(0)}` : ''}` : `${symbol}${price.minOriginal!.toFixed(0)}`) : null}
                    variants={variants}
                    productName={product.name}
                    brand={product.brand}
                    mainImageUrl={product.main_image_url}
                    description={product.description}
                    attributes={attributes}
                    baseQty={baseQty}
                    baseUnit={baseUnit}
                    productDetailsMd={product.details_md}
                    storePhone={store?.contact_phone || null}
                />
            </div>
            {/* Variant / product markdown now handled client-side for dynamic switching */}
        </>
    );
}
