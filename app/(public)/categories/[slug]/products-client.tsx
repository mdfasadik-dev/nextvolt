"use client";
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Funnel } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { ProductCardsGrid } from '@/components/public/product-cards-grid';
import type { Tables } from '@/lib/types/supabase';

type Product = Tables<'products'>;
interface AttributeFilterValue { valueKey: string; label: string; count: number }
interface AttributeFilter { attribute: { id: string; name: string; data_type: string }; values: AttributeFilterValue[] }

interface Props {
    categoryName: string;
    descendantCount: number;
    products: Product[];
    badgeMap: Record<string, { label: string; color: string } | null>;
    priceMap: Record<string, { minOriginal: number | null; maxOriginal: number | null; minFinal: number | null; maxFinal: number | null; maxDiscountPercent: number }>;
    attributeFilters: AttributeFilter[];
    productAttributeMap: Record<string, Record<string, string>>; // productId -> { attributeId: valueKey }
}

export default function CategoryProductsClient({ categoryName, descendantCount, products, badgeMap, priceMap, attributeFilters, productAttributeMap }: Props) {
    const [selected, setSelected] = useState<Record<string, Set<string>>>({});
    const [page, setPage] = useState(1);
    const pageSize = 16;

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

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

    useEffect(() => {
        setPage(1);
    }, [selected, products.length]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const startIndex = (page - 1) * pageSize;
    const pagedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);
    const windowSize = 1;
    const paginationItems: (number | "ellipsis")[] = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) {
            paginationItems.push(i);
        } else if (paginationItems[paginationItems.length - 1] !== "ellipsis") {
            paginationItems.push("ellipsis");
        }
    }

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
                <p className="text-xs text-muted-foreground mb-6">
                    {filteredProducts.length > 0
                        ? `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, filteredProducts.length)} of ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'} ${Object.keys(selected).length ? 'matching filters' : 'from this category'}.`
                        : 'Showing 0 products.'}
                </p>
                {filteredProducts.length === 0 ? (
                    <div className="text-sm text-muted-foreground border rounded-md p-6">No products match selected filters.</div>
                ) : (
                    <>
                        <ProductCardsGrid products={pagedProducts} badgeMap={badgeMap} priceMap={priceMap} symbol={process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'} />
                        {totalPages > 1 ? (
                            <div className="mt-6 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    className="h-8 rounded-md border px-2 text-xs disabled:opacity-40"
                                >
                                    Prev
                                </button>
                                <ul className="flex items-center gap-1">
                                    {paginationItems.map((item, index) => item === "ellipsis" ? (
                                        <li key={`ellipsis-${index}`} className="px-1 text-xs text-muted-foreground">...</li>
                                    ) : (
                                        <li key={item}>
                                            <button
                                                type="button"
                                                onClick={() => setPage(item)}
                                                aria-current={item === page ? "page" : undefined}
                                                className={cn(
                                                    "h-8 w-8 rounded-md border text-xs",
                                                    item === page ? "bg-primary text-white font-medium" : "hover:bg-accent/60"
                                                )}
                                            >
                                                {item}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    disabled={page === totalPages}
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    className="h-8 rounded-md border px-2 text-xs disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </main>
        </div>
    );
}
