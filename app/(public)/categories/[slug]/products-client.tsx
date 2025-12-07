"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Funnel } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { ProductCardsGrid } from '@/components/public/product-cards-grid';

type Product = { id: string; name: string; slug: string | null; description?: string | null; main_image_url?: string | null; brand?: string | null };
interface AttributeFilterValue { valueKey: string; label: string; count: number }
interface AttributeFilter { attribute: { id: string; name: string; data_type: string }; values: AttributeFilterValue[] }

interface Props {
    categoryName: string;
    descendantCount: number;
    products: Product[];
    priceMap: Record<string, { minOriginal: number | null; maxOriginal: number | null; minFinal: number | null; maxFinal: number | null; maxDiscountPercent: number }>;
    attributeFilters: AttributeFilter[];
    productAttributeMap: Record<string, Record<string, string>>; // productId -> { attributeId: valueKey }
}

export default function CategoryProductsClient({ categoryName, descendantCount, products, priceMap, attributeFilters, productAttributeMap }: Props) {
    const [selected, setSelected] = useState<Record<string, Set<string>>>({});

    function toggle(attrId: string, valueKey: string) {
        setSelected(prev => {
            const next = { ...prev };
            const set = new Set(next[attrId] || []);
            if (set.has(valueKey)) set.delete(valueKey); else set.add(valueKey);
            if (set.size) next[attrId] = set; else delete next[attrId];
            return next;
        });
    }
    function clearAll() { setSelected({}); }

    const filteredProducts = useMemo(() => {
        const attrIds = Object.keys(selected);
        if (!attrIds.length) return products;
        return products.filter(p => {
            for (const attrId of attrIds) {
                const allowed = selected[attrId];
                const val = productAttributeMap[p.id]?.[attrId];
                if (!val || !allowed.has(val)) return false;
            }
            return true;
        });
    }, [products, selected, productAttributeMap]);

    const filterSidebar = attributeFilters.length > 0 ? (
        <div>
            <h2 className="font-semibold text-sm mb-3">Filters</h2>
            <div className="space-y-6">
                {attributeFilters.map(f => (
                    <div key={f.attribute.id}>
                        <div className="font-medium text-xs uppercase tracking-wide mb-2">{f.attribute.name}</div>
                        <ul className="space-y-1">
                            {f.values.map(v => {
                                const active = selected[f.attribute.id]?.has(v.valueKey);
                                return (
                                    <li key={v.valueKey}>
                                        <button
                                            type="button"
                                            onClick={() => toggle(f.attribute.id, v.valueKey)}
                                            className={cn("w-full flex items-center justify-between text-left text-xs px-2 py-1 rounded border transition", active ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted")}
                                        >
                                            <span className="truncate">{v.label}</span>
                                            <span className="text-muted-foreground">{v.count}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>
            {Object.keys(selected).length > 0 && (
                <button onClick={clearAll} className="mt-4 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground">Clear all</button>
            )}
        </div>
    ) : null;

    return (
        <div className="flex gap-8">
            {filterSidebar && (
                <aside className="w-64 shrink-0 hidden md:block">
                    <div className="space-y-6 sticky top-20">{filterSidebar}</div>
                </aside>
            )}
            <main className="flex-1">
                {filterSidebar && (
                    <div className="flex items-center justify-between md:hidden mb-4">
                        <Sheet>
                            <SheetTrigger>
                                <span className="inline-flex items-center gap-2 text-xs"><Funnel className="w-4 h-4" /> Filters</span>
                            </SheetTrigger>
                            <SheetContent side="right" title="Filters">
                                {filterSidebar}
                            </SheetContent>
                        </Sheet>
                        {Object.keys(selected).length > 0 && (
                            <button onClick={clearAll} className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground">Clear</button>
                        )}
                    </div>
                )}
                <h1 className="text-2xl font-semibold mb-2">{categoryName}</h1>
                <p className="text-xs text-muted-foreground mb-6">Showing {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} {Object.keys(selected).length ? 'matching filters' : descendantCount ? 'from this category and its subcategories' : 'from this category'}.</p>
                {filteredProducts.length === 0 ? (
                    <div className="text-sm text-muted-foreground border rounded-md p-6">No products match selected filters.</div>
                ) : (
                    <ProductCardsGrid products={filteredProducts as any} priceMap={priceMap as any} symbol={process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'} />
                )}
            </main>
        </div>
    );
}
