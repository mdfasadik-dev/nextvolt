"use server";
import { ProductService, Product } from "@/lib/services/productService";
import { ProductAttributeValueService } from "@/lib/services/productAttributeValueService";
import { AttributeService, Attribute } from "@/lib/services/attributeService";
import { ProductImageService } from "@/lib/services/productImageService";
import { ProductBadgeService, type ProductBadgeSummary } from "@/lib/services/productBadgeService";
import { createClient } from "@/lib/supabase/server";

const LOW_STOCK_THRESHOLD = 5;

export interface ProductDetail extends Product {
    attributes: { attribute: Attribute; value: string | number | boolean | null }[];
    image_urls: string[];
    badge: ProductBadgeSummary | null;
    stock_total_qty: number;
    stock_status: "in" | "low" | "out";
    stock_unit_label: string;
}

export async function fetchProductDetail(id: string): Promise<ProductDetail | null> {
    const list = await ProductService.list();
    const product = list.find(p => p.id === id);
    if (!product) return null;
    const attrValues = await ProductAttributeValueService.listByProduct(id).catch(() => []);
    const attrs = await AttributeService.list().catch(() => []);
    const imageRows = await ProductImageService.listByProduct(id).catch(() => []);
    const badge = await ProductBadgeService.getByProductId(id).catch(() => null);
    const supabase = await createClient();
    const { data: inventoryRows } = await supabase
        .from("inventory")
        .select("quantity, unit")
        .eq("product_id", id);
    const attrMap = new Map(attrs.map(a => [a.id, a] as const));
    const attributes = attrValues.map((v) => {
        const attr = attrMap.get(v.attribute_id);
        if (!attr) return null;
        let value: string | number | boolean | null = null;
        if (v.value_text !== null) value = v.value_text;
        else if (v.value_number !== null) value = v.value_number;
        else if (v.value_boolean !== null) value = v.value_boolean;
        return { attribute: attr, value };
    }).filter((entry): entry is { attribute: Attribute; value: string | number | boolean | null } => entry !== null);
    const image_urls = imageRows.length
        ? imageRows.map((row) => row.image_url).filter((url): url is string => !!url)
        : (product.main_image_url ? [product.main_image_url] : []);
    const stockTotalQty = (inventoryRows || []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
    const stockStatus: ProductDetail["stock_status"] = stockTotalQty <= 0
        ? "out"
        : stockTotalQty <= LOW_STOCK_THRESHOLD
            ? "low"
            : "in";
    const stockUnits = Array.from(
        new Set(
            (inventoryRows || [])
                .map((row) => (row.unit || "").trim())
                .filter((unit): unit is string => unit.length > 0)
        )
    );
    const stockUnitLabel = stockUnits.length === 0
        ? "pcs"
        : stockUnits.length === 1
            ? stockUnits[0]
            : "mixed units";
    return {
        ...product,
        attributes,
        image_urls,
        badge,
        stock_total_qty: stockTotalQty,
        stock_status: stockStatus,
        stock_unit_label: stockUnitLabel,
    };
}
