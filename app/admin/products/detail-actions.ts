"use server";
import { ProductService, Product } from "@/lib/services/productService";
import { ProductAttributeValueService } from "@/lib/services/productAttributeValueService";
import { AttributeService, Attribute } from "@/lib/services/attributeService";

export interface ProductDetail extends Product {
    attributes: { attribute: Attribute; value: string | number | boolean | null }[];
}

export async function fetchProductDetail(id: string): Promise<ProductDetail | null> {
    const list = await ProductService.list();
    const product = list.find(p => p.id === id);
    if (!product) return null;
    const attrValues = await ProductAttributeValueService.listByProduct(id).catch(() => []);
    const attrs = await AttributeService.list().catch(() => []);
    const attrMap = new Map(attrs.map(a => [a.id, a] as const));
    const attributes = attrValues.map(v => {
        const attr = attrMap.get(v.attribute_id);
        if (!attr) return null;
        let value: string | number | boolean | null = null;
        if (v.value_text !== null) value = v.value_text;
        else if (v.value_number !== null) value = v.value_number;
        else if (v.value_boolean !== null) value = v.value_boolean;
        return attr ? { attribute: attr, value } : null;
    }).filter(Boolean) as { attribute: Attribute; value: any }[];
    return { ...product, attributes };
}
