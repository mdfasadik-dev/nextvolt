"use server";
import { CategoryAttributeService } from "@/lib/services/categoryAttributeService";
import { AttributeService } from "@/lib/services/attributeService";

export async function fetchCategoryAttributes(categoryId: string) {
    const links = await CategoryAttributeService.listByCategory(categoryId);
    if (!links.length) return [] as { id: string; name: string; data_type: string }[];
    const attrs = await AttributeService.list();
    const map = new Map(attrs.map(a => [a.id, a] as const));
    return links.map(l => map.get(l.attribute_id)).filter(Boolean) as any[];
}
