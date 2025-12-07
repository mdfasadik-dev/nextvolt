"use server";
import { VariantService, Variant } from "@/lib/services/variantService";
import { ProductService, Product } from "@/lib/services/productService";

export interface VariantDetail extends Variant {
    productName: string | null;
}

export async function fetchVariantDetail(id: string): Promise<VariantDetail | null> {
    const variants = await VariantService.list();
    const variant = variants.find(v => v.id === id);
    if (!variant) return null;
    const products = await ProductService.list();
    const productName = products.find(p => p.id === variant.product_id)?.name || null;
    return { ...variant, productName };
}
