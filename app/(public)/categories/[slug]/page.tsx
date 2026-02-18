import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/server";
import { absoluteUrl, buildPageMetadata, SEO_CONFIG } from "@/lib/seo";
import type { Tables } from "@/lib/types/supabase";
import CategoryProductsClient from "./products-client";
import { ProductBadgeService } from "@/lib/services/productBadgeService";

export const revalidate = 900;
export const dynamicParams = true;

type RouteParams = { slug: string };
type CategoryPageProps = { params: Promise<RouteParams> };
type CategoryRow = Pick<Tables<"categories">, "id" | "name" | "slug" | "parent_id" | "image_url">;
type ProductRow = Tables<"products">;

async function fetchCategoryBySlugOrId(slugOrId: string): Promise<CategoryRow | null> {
    const supabase = createPublicClient();
    const { data: bySlug } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,image_url")
        .eq("slug", slugOrId)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .maybeSingle();

    if (bySlug) return bySlug;

    const { data: byId } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,image_url")
        .eq("id", slugOrId)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .maybeSingle();

    return byId;
}

async function fetchData(slugOrId: string) {
    const supabase = createPublicClient();
    const category = await fetchCategoryBySlugOrId(slugOrId);

    if (!category) {
        return { category: null, products: [], descendantCount: 0, ancestors: [] as CategoryRow[] };
    }

    const { data: allCats } = await supabase
        .from("categories")
        .select("id,parent_id,name,slug,image_url")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

    const map = new Map<string, CategoryRow>();
    (allCats || []).forEach((c) => map.set(c.id, c));

    const descendants: string[] = [];
    const queue = [category.id];
    while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        for (const c of map.values()) {
            if (c.parent_id === current) {
                descendants.push(c.id);
                queue.push(c.id);
            }
        }
    }

    const ancestorsRev: CategoryRow[] = [];
    let pid = category.parent_id as string | null;
    while (pid) {
        const parent = map.get(pid);
        if (!parent) break;
        ancestorsRev.push(parent);
        pid = parent.parent_id as string | null;
    }
    const ancestors = ancestorsRev.reverse();

    const ids = [category.id, ...descendants];
    const { data: products } = await supabase
        .from("products")
        .select("*")
        .in("category_id", ids)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

    const productList: ProductRow[] = products || [];
    const badgeMap = await ProductBadgeService.getVisibleBadgeMap(productList.map((product) => product.id));

    const priceMap: Record<
        string,
        {
            minOriginal: number | null;
            maxOriginal: number | null;
            minFinal: number | null;
            maxFinal: number | null;
            maxDiscountPercent: number;
            totalQty: number | null;
        }
    > = {};

    if (productList.length) {
        const { data: inventory } = await supabase
            .from("inventory")
            .select("product_id,sale_price,discount_type,discount_value,quantity")
            .in("product_id", productList.map((p) => p.id));

        if (inventory) {
            for (const row of inventory) {
                const current =
                    priceMap[row.product_id] || {
                        minOriginal: null,
                        maxOriginal: null,
                        minFinal: null,
                        maxFinal: null,
                        maxDiscountPercent: 0,
                        totalQty: null,
                    };

                const original = row.sale_price;
                let final = original;
                if (row.discount_type === "percent" && row.discount_value) {
                    final = original * (1 - row.discount_value / 100);
                } else if (row.discount_type === "amount" && row.discount_value) {
                    final = Math.max(0, original - row.discount_value);
                }

                current.minOriginal = current.minOriginal == null ? original : Math.min(current.minOriginal, original);
                current.maxOriginal = current.maxOriginal == null ? original : Math.max(current.maxOriginal, original);
                current.minFinal = current.minFinal == null ? final : Math.min(current.minFinal, final);
                current.maxFinal = current.maxFinal == null ? final : Math.max(current.maxFinal, final);
                current.totalQty = (current.totalQty ?? 0) + (row.quantity ?? 0);

                let pct = 0;
                if (row.discount_type === "percent" && row.discount_value) {
                    pct = row.discount_value;
                } else if (row.discount_type === "amount" && row.discount_value) {
                    pct = original ? (row.discount_value / original) * 100 : 0;
                }
                if (pct > current.maxDiscountPercent) {
                    current.maxDiscountPercent = pct;
                }
                priceMap[row.product_id] = current;
            }
        }
    }

    return {
        category,
        products: productList,
        badgeMap,
        priceMap,
        descendantCount: descendants.length,
        ancestors,
    };
}

export async function generateStaticParams(): Promise<RouteParams[]> {
    try {
        const supabase = createPublicClient();
        const { data } = await supabase
            .from("categories")
            .select("id,slug,is_active,is_deleted")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });

        return (data || []).map((category) => ({
            slug: category.slug || category.id,
        }));
    } catch (error) {
        console.error("[categories] generateStaticParams failed:", error);
        return [];
    }
}

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
    const params = await props.params;
    const category = await fetchCategoryBySlugOrId(params.slug);

    if (!category) {
        return buildPageMetadata({
            title: `Category Not Found | ${SEO_CONFIG.siteName}`,
            description: "The requested category could not be found.",
            pathname: `/categories/${params.slug}`,
            noIndex: true,
        });
    }

    const pathname = `/categories/${category.slug || category.id}`;
    return buildPageMetadata({
        title: `${category.name} | Categories`,
        description: `Explore ${category.name} products at ${SEO_CONFIG.siteName}.`,
        pathname,
        images: category.image_url ? [category.image_url] : [absoluteUrl("/opengraph-image.png")],
    });
}

export default async function CategoryPage(props: CategoryPageProps) {
    const params = await props.params;
    const { category, products, badgeMap, priceMap, descendantCount, ancestors } = await fetchData(params.slug);
    if (!category) notFound();
    const categoryPath = `/categories/${category.slug || category.id}`;

    const supabase = createPublicClient();
    const chain = [category, ...ancestors.slice().reverse()];
    const chainIds = chain.map((c) => c.id);

    const { data: catAttrs } = await supabase
        .from("category_attributes")
        .select("category_id,attribute_id")
        .in("category_id", chainIds);

    let applicableAttributeIds: string[] = [];
    if (catAttrs && catAttrs.length) {
        for (const c of chain) {
            const list = catAttrs.filter((x) => x.category_id === c.id).map((x) => x.attribute_id);
            if (list.length) {
                applicableAttributeIds = list;
                break;
            }
        }
    }

    const attributeFilters: {
        attribute: { id: string; name: string; data_type: string };
        values: { valueKey: string; label: string; count: number }[];
    }[] = [];
    const productAttributeMap: Record<string, Record<string, string>> = {};

    if (applicableAttributeIds.length && products.length) {
        const { data: attributes } = await supabase
            .from("attributes")
            .select("id,name,data_type")
            .in("id", applicableAttributeIds);

        const productIds = products.map((p) => p.id);
        const { data: pavs } = await supabase
            .from("product_attribute_values")
            .select("product_id,attribute_id,value_text,value_number,value_boolean")
            .in("product_id", productIds)
            .in("attribute_id", applicableAttributeIds);

        for (const pav of pavs || []) {
            const raw =
                pav.value_text ??
                (pav.value_number?.toString() ?? (pav.value_boolean === null ? null : pav.value_boolean ? "true" : "false"));
            if (!raw) continue;
            productAttributeMap[pav.product_id] ||= {};
            productAttributeMap[pav.product_id][pav.attribute_id] = raw;
        }

        for (const attr of attributes || []) {
            const counts: Record<string, number> = {};
            for (const pav of (pavs || []).filter((p) => p.attribute_id === attr.id)) {
                const key =
                    pav.value_text ??
                    (pav.value_number?.toString() ?? (pav.value_boolean === null ? null : pav.value_boolean ? "true" : "false"));
                if (!key) continue;
                counts[key] = (counts[key] || 0) + 1;
            }

            const values = Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([valueKey, count]) => ({
                    valueKey,
                    label: formatValueLabel(attr.data_type, valueKey),
                    count,
                }));

            if (values.length) {
                attributeFilters.push({
                    attribute: { id: attr.id, name: attr.name, data_type: attr.data_type },
                    values,
                });
            }
        }
    }

    const breadcrumbItems = [
        { name: "Home", item: absoluteUrl("/") },
        ...ancestors.map((ancestor) => ({
            name: ancestor.name,
            item: absoluteUrl(`/categories/${ancestor.slug || ancestor.id}`),
        })),
        { name: category.name, item: absoluteUrl(categoryPath) },
    ];

    const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${category.name} | ${SEO_CONFIG.siteName}`,
        url: absoluteUrl(categoryPath),
        description: `Explore ${category.name} products at ${SEO_CONFIG.siteName}.`,
        isPartOf: {
            "@type": "WebSite",
            name: SEO_CONFIG.siteName,
            url: absoluteUrl("/"),
        },
    };

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.name,
            item: entry.item,
        })),
    };

    return (
        <div className="w-full max-w-6xl flex-1 flex flex-col gap-6 p-5">
            <script
                type="application/ld+json"
                suppressHydrationWarning
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
            />
            <script
                type="application/ld+json"
                suppressHydrationWarning
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <nav className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
                <Link href="/" className="hover:underline">Home</Link>
                {ancestors.map((a) => (
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
                badgeMap={badgeMap}
                priceMap={priceMap}
                attributeFilters={attributeFilters}
                productAttributeMap={productAttributeMap}
            />
        </div>
    );
}

function formatValueLabel(dataType: string, raw: string): string {
    if (dataType === "boolean") return raw === "true" ? "Yes" : "No";
    return raw;
}
