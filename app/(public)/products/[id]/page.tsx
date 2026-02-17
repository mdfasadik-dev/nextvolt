import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDetailClient from "./product-detail-client";
import { createPublicClient } from "@/lib/supabase/server";
import { absoluteUrl, buildPageMetadata, SEO_CONFIG } from "@/lib/seo";
import type { Tables } from "@/lib/types/supabase";
import { ProductBadgeService } from "@/lib/services/productBadgeService";

export const revalidate = 900;
export const dynamicParams = true;

type RouteParams = { id: string };
type ProductPageProps = { params: Promise<RouteParams> };
type CategoryBrief = Pick<Tables<"categories">, "id" | "name" | "slug" | "parent_id">;

async function fetchProduct(idOrSlug: string) {
    const supabase = createPublicClient();

    const { data: bySlug } = await supabase
        .from("products")
        .select("*")
        .eq("slug", idOrSlug)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .maybeSingle();

    let product: Tables<"products"> | null = bySlug;
    if (!product) {
        const { data: byId } = await supabase
            .from("products")
            .select("*")
            .eq("id", idOrSlug)
            .eq("is_active", true)
            .eq("is_deleted", false)
            .maybeSingle();
        product = byId;
    }
    if (!product) return null;

    if (product.category_id) {
        const { data: categoryState } = await supabase
            .from("categories")
            .select("id,is_active,is_deleted")
            .eq("id", product.category_id)
            .maybeSingle();
        if (!categoryState || !categoryState.is_active || categoryState.is_deleted) {
            return null;
        }
    }

    const { data: productImagesRaw } = await supabase
        .from("product_images")
        .select("image_url,sort_order")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
    const productImages = (productImagesRaw || [])
        .map((row) => row.image_url)
        .filter((url): url is string => !!url);
    const badgeMap = await ProductBadgeService.getVisibleBadgeMap([product.id]);
    const badge = badgeMap[product.id] || null;

    const { data: inventory } = await supabase
        .from("inventory")
        .select("id,variant_id,sale_price,discount_type,discount_value,quantity,unit")
        .eq("product_id", product.id);

    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    let minOriginal: number | null = null;
    let maxOriginal: number | null = null;
    let baseQty: number | null = null;
    let baseUnit: string | null = null;

    if (inventory) {
        for (const row of inventory) {
            const original = row.sale_price;
            let final = original;
            if (row.discount_type === "percent" && row.discount_value) {
                final = row.sale_price * (1 - row.discount_value / 100);
            } else if (row.discount_type === "amount" && row.discount_value) {
                final = Math.max(0, row.sale_price - row.discount_value);
            }
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

    const { data: pavs } = await supabase
        .from("product_attribute_values")
        .select("attribute_id,value_text,value_number,value_boolean,attributes(id,name,data_type)")
        .eq("product_id", product.id);

    const attributes: { id: string; name: string; data_type: string; value: string }[] = [];
    if (pavs) {
        for (const pav of pavs) {
            const attrSource = pav.attributes;
            const attrCandidate = Array.isArray(attrSource) ? attrSource[0] : attrSource;
            const attr =
                attrCandidate &&
                    typeof attrCandidate === "object" &&
                    "id" in attrCandidate &&
                    "name" in attrCandidate &&
                    "data_type" in attrCandidate
                    ? (attrCandidate as { id: string; name: string; data_type: string })
                    : null;
            if (!attr) continue;
            const raw =
                pav.value_text ??
                (pav.value_number?.toString() ?? (pav.value_boolean === null ? null : pav.value_boolean ? "Yes" : "No"));
            if (raw) {
                attributes.push({ id: attr.id, name: attr.name, data_type: attr.data_type, value: raw });
            }
        }
    }

    const { data: variantsRaw } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

    const variants = (variantsRaw || []).map((variant) => {
        const rows = (inventory || []).filter((inv) => inv.variant_id === variant.id);
        let vMinFinal: number | null = null;
        let vMaxFinal: number | null = null;
        let vMinOriginal: number | null = null;
        let vMaxOriginal: number | null = null;
        let totalQty: number | null = null;
        let vUnit: string | null = null;

        for (const row of rows) {
            const original = row.sale_price;
            let final = original;
            if (row.discount_type === "percent" && row.discount_value) {
                final = original * (1 - row.discount_value / 100);
            } else if (row.discount_type === "amount" && row.discount_value) {
                final = Math.max(0, original - row.discount_value);
            }

            vMinOriginal = vMinOriginal == null ? original : Math.min(vMinOriginal, original);
            vMaxOriginal = vMaxOriginal == null ? original : Math.max(vMaxOriginal, original);
            vMinFinal = vMinFinal == null ? final : Math.min(vMinFinal, final);
            vMaxFinal = vMaxFinal == null ? final : Math.max(vMaxFinal, final);
            totalQty = (totalQty ?? 0) + (row.quantity ?? 0);
            if (!vUnit) vUnit = row.unit || null;
        }

        return {
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            image_url: variant.image_url,
            minPrice: vMinFinal,
            maxPrice: vMaxFinal,
            minOriginalPrice: vMinOriginal,
            maxOriginalPrice: vMaxOriginal,
            totalQty,
            unit: vUnit,
            details_md: variant.details_md,
        };
    });

    let category: CategoryBrief | null = null;
    let ancestors: CategoryBrief[] = [];
    if (product.category_id) {
        const { data: allCats } = await supabase
            .from("categories")
            .select("id,parent_id,name,slug")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (allCats && allCats.length) {
            const map = new Map<string, CategoryBrief>();
            allCats.forEach((c) => map.set(c.id, c));
            category = map.get(product.category_id) || null;

            const chain: CategoryBrief[] = [];
            let pid = category?.parent_id as string | null;
            while (pid) {
                const parent = map.get(pid);
                if (!parent) break;
                chain.push(parent);
                pid = parent.parent_id as string | null;
            }
            ancestors = chain.reverse();
        }
    }

    const { data: store } = await supabase
        .from("stores")
        .select("contact_phone")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    return {
        product,
        category,
        ancestors,
        inventory: inventory || [],
        price: { minPrice, maxPrice, minOriginal, maxOriginal },
        attributes,
        variants,
        productImages,
        badge,
        baseQty,
        baseUnit,
        storePhone: store?.contact_phone || null,
    };
}

export async function generateStaticParams(): Promise<RouteParams[]> {
    try {
        const supabase = createPublicClient();
        const { data } = await supabase
            .from("products")
            .select("id,slug,is_active,is_deleted,category_id")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });

        const rows = data || [];
        const categoryIds = Array.from(
            new Set(rows.map((row) => row.category_id).filter((id): id is string => Boolean(id)))
        );

        let activeCategorySet = new Set<string>();
        if (categoryIds.length > 0) {
            const { data: activeCategories } = await supabase
                .from("categories")
                .select("id")
                .eq("is_active", true)
                .eq("is_deleted", false)
                .in("id", categoryIds);
            activeCategorySet = new Set((activeCategories || []).map((category) => category.id));
        }

        return rows
            .filter((product) => !product.category_id || activeCategorySet.has(product.category_id))
            .map((product) => ({
                id: product.slug || product.id,
            }));
    } catch (error) {
        console.error("[products] generateStaticParams failed:", error);
        return [];
    }
}

export async function generateMetadata(props: ProductPageProps): Promise<Metadata> {
    const params = await props.params;
    const data = await fetchProduct(params.id);

    if (!data) {
        return buildPageMetadata({
            title: `Product Not Found | ${SEO_CONFIG.siteName}`,
            description: "The requested product could not be found.",
            pathname: `/products/${params.id}`,
            noIndex: true,
        });
    }

    const pathname = `/products/${data.product.slug || data.product.id}`;
    const description =
        data.product.description ||
        `Buy ${data.product.name} at ${SEO_CONFIG.siteName}.`;

    return buildPageMetadata({
        title: `${data.product.name} | ${data.product.brand || "Product"}`,
        description,
        pathname,
        images: data.productImages.length
            ? data.productImages
            : data.product.main_image_url
                ? [data.product.main_image_url]
                : [absoluteUrl("/opengraph-image.png")],
    });
}

export default async function ProductDetailPage(props: ProductPageProps) {
    const params = await props.params;
    const data = await fetchProduct(params.id);
    if (!data) notFound();

    const { product, category, ancestors, price, attributes, variants, productImages, badge, baseQty, baseUnit, storePhone } = data;
    const productPath = `/products/${product.slug || product.id}`;

    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
    const hasDiscount = price.minOriginal != null && price.minPrice != null && price.minOriginal !== price.minPrice;
    const priceRangeDiscount = price.minPrice != null && price.maxPrice != null && price.minPrice !== price.maxPrice;
    const originalRangeDiffers =
        price.minOriginal != null &&
        price.maxOriginal != null &&
        (price.minOriginal !== price.minPrice || price.maxOriginal !== price.maxPrice);

    let basePriceBlock = "—";
    if (price.minPrice != null) {
        if (priceRangeDiscount) {
            basePriceBlock = `${symbol}${price.minPrice.toFixed(0)} - ${symbol}${price.maxPrice?.toFixed(0)}`;
        } else {
            basePriceBlock = `${symbol}${price.minPrice.toFixed(0)}`;
        }
    }

    const breadcrumbItems = [
        { name: "Home", item: absoluteUrl("/") },
        ...ancestors.map((ancestor) => ({
            name: ancestor.name,
            item: absoluteUrl(`/categories/${ancestor.slug || ancestor.id}`),
        })),
        ...(category
            ? [{ name: category.name, item: absoluteUrl(`/categories/${category.slug || category.id}`) }]
            : []),
        { name: product.name, item: absoluteUrl(productPath) },
    ];

    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || `${product.name} at ${SEO_CONFIG.siteName}`,
        image: productImages.length
            ? productImages
            : product.main_image_url
                ? [product.main_image_url]
                : [absoluteUrl("/opengraph-image.png")],
        sku: variants[0]?.sku || undefined,
        brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
        url: absoluteUrl(productPath),
        offers:
            price.minPrice != null
                ? {
                    "@type": "Offer",
                    priceCurrency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "USD",
                    price: Number(price.minPrice.toFixed(2)),
                    availability:
                        (baseQty ?? 0) > 0
                            ? "https://schema.org/InStock"
                            : "https://schema.org/OutOfStock",
                    url: absoluteUrl(productPath),
                }
                : undefined,
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
        <>
            <div className="w-full max-w-5xl mx-auto p-6 flex flex-col gap-8">
                <script
                    type="application/ld+json"
                    suppressHydrationWarning
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
                />
                <script
                    type="application/ld+json"
                    suppressHydrationWarning
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
                />
                <nav className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
                    <Link href="/" className="hover:underline">Home</Link>
                    {ancestors.map((a) => (
                        <span key={a.id} className="flex items-center gap-2">
                            <span>/</span>
                            <Link href={`/categories/${a.slug || a.id}`} className="hover:underline">{a.name}</Link>
                        </span>
                    ))}
                    {category ? (
                        <span className="flex items-center gap-2">
                            <span>/</span>
                            <Link href={`/categories/${category.slug || category.id}`} className="hover:underline">{category.name}</Link>
                        </span>
                    ) : null}
                    <span>/</span>
                    <span className="text-foreground" aria-current="page">{product.name}</span>
                </nav>
                <ProductDetailClient
                    productId={product.id}
                    productSlug={product.slug}
                    basePrice={basePriceBlock}
                    basePriceValue={price.minPrice}
                    basePriceOriginal={
                        hasDiscount
                            ? originalRangeDiffers
                                ? `${symbol}${price.minOriginal?.toFixed(0)}${price.maxOriginal && price.maxOriginal !== price.minOriginal
                                    ? ` - ${symbol}${price.maxOriginal.toFixed(0)}`
                                    : ""
                                }`
                                : `${symbol}${price.minOriginal?.toFixed(0)}`
                            : null
                    }
                    variants={variants}
                    productName={product.name}
                    brand={product.brand}
                    mainImageUrl={product.main_image_url}
                    imageUrls={productImages}
                    badge={badge}
                    description={product.description}
                    attributes={attributes}
                    baseQty={baseQty}
                    baseUnit={baseUnit}
                    productDetailsMd={product.details_md}
                    storePhone={storePhone}
                />
            </div>
        </>
    );
}
