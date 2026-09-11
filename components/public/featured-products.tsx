import { createPublicClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/services/productService";
import { buildPriceMap, sortProductsByStockAndOrder } from "@/lib/services/pricing";
import { ProductCardsGrid } from "@/components/public/product-cards-grid";
import { ProductBadgeService } from "@/lib/services/productBadgeService";

interface Props { limit?: number }

export async function FeaturedProducts({ limit = 8 }: Props) {
    const supabase = createPublicClient();

    const { data: rawProducts, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
    if (error) {
        return null;
    }

    const productsWithCategory = (rawProducts || []) as Product[];
    const categoryIds = Array.from(
        new Set(
            productsWithCategory
                .map((product) => product.category_id)
                .filter((id): id is string => Boolean(id))
        )
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

    const candidateProducts: Product[] = productsWithCategory
        .filter((product) => !product.category_id || activeCategorySet.has(product.category_id));

    if (!candidateProducts.length) return null;
    const candidateProductIds = candidateProducts.map((p) => p.id);
    const [priceMap, badgeMap] = await Promise.all([
        buildPriceMap(candidateProductIds),
        ProductBadgeService.getVisibleBadgeMap(candidateProductIds),
    ]);

    const sortedProducts = sortProductsByStockAndOrder(candidateProducts, priceMap);
    const products = sortedProducts.slice(0, limit);
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    return (
        <section className="w-full flex flex-col gap-6" aria-labelledby="featured-heading">
            <div className="flex items-center justify-center">
                <h2 id="featured-heading" className="text-3xl text-center font-bold tracking-tight mb-2">Featured Products</h2>
            </div>
            <ProductCardsGrid products={products} priceMap={priceMap} badgeMap={badgeMap} symbol={symbol} />
        </section>
    );
}
