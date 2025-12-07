import Link from "next/link";
import { ProductService, Product } from "@/lib/services/productService";
import { buildPriceMap } from "@/lib/services/pricing";
import { ProductCardsGrid } from "@/components/public/product-cards-grid";

interface Props { limit?: number }

export async function FeaturedProducts({ limit = 8 }: Props) {
    const products: Product[] = await ProductService.listFeatured(limit);
    if (!products.length) return null;
    const priceMap = await buildPriceMap(products.map(p => p.id));
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    return (
        <section className="w-full flex flex-col gap-6" aria-labelledby="featured-heading">
            <div className="flex items-center justify-between">
                <h2 id="featured-heading" className="text-xl font-semibold tracking-tight">Featured Products</h2>
                {/* <Link href="/categories" className="text-xs font-medium text-primary hover:underline">Browse all →</Link> */}
            </div>
            <ProductCardsGrid products={products} priceMap={priceMap} symbol={symbol} />
        </section>
    );
}
