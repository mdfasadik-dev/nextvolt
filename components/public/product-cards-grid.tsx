"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FileImage } from "lucide-react";
import type { Product } from "@/lib/services/productService";
import type { PriceMap } from "@/lib/services/pricing";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

interface Props {
    products: Product[];
    priceMap: PriceMap;
    symbol?: string;
    className?: string;
}

export function ProductCardsGrid({ products, priceMap, symbol = "$", className = "" }: Props) {
    if (!products.length) return null;
    return (
        <ul className={"grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 " + className}>
            {products.map((p) => {
                const pricing = priceMap[p.id];
                const effectivePrice =
                    pricing && pricing.minFinal != null
                        ? pricing.minFinal
                        : pricing && pricing.maxFinal != null
                            ? pricing.maxFinal
                            : null;
                let priceNode: React.ReactNode = "—";
                if (pricing && pricing.minFinal != null) {
                    const hasRange = pricing.minFinal != null && pricing.maxFinal != null && pricing.minFinal !== pricing.maxFinal;
                    const origRangeDiffers = pricing.minOriginal !== pricing.minFinal || pricing.maxOriginal !== pricing.maxFinal;
                    if (hasRange) {
                        priceNode = (
                            <div className="flex flex-col items-start gap-0.5 whitespace-normal break-words">
                                {origRangeDiffers && pricing.minOriginal != null && pricing.maxOriginal != null && (
                                    <div className="text-[11px] text-muted-foreground line-through">
                                        {symbol}{pricing.minOriginal.toFixed(0)} - {symbol}{pricing.maxOriginal.toFixed(0)}
                                    </div>
                                )}
                                <div className="text-sm font-semibold tracking-tight">{symbol}{pricing.minFinal.toFixed(0)} - {symbol}{pricing.maxFinal!.toFixed(0)}</div>
                            </div>
                        );
                    } else {
                        const final = pricing.minFinal!;
                        const orig = pricing.minOriginal;
                        priceNode = (
                            <div className="flex flex-col items-start gap-0.5 whitespace-normal break-words">
                                {orig != null && orig !== final && (
                                    <div className="text-[11px] text-muted-foreground line-through">{symbol}{orig.toFixed(0)}</div>
                                )}
                                <div className="text-sm font-semibold tracking-tight">{symbol}{final.toFixed(0)}</div>
                            </div>
                        );
                    }
                }
                return (
                    <li key={p.id} className="group relative">
                        <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
                            <Link
                                href={`/products/${p.slug || p.id}`}
                                className="relative block w-full aspect-square border-b overflow-hidden"
                                aria-label={`View ${p.name}`}
                            >
                                <div className="absolute inset-0">
                                    {p.main_image_url ? (
                                        <Image
                                            src={p.main_image_url}
                                            alt={p.name}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            className="absolute inset-0 object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                                            <FileImage className="h-8 w-8 text-gray-400" />
                                        </div>
                                    )}
                                    {pricing && pricing.maxDiscountPercent > 0 && (
                                        <span className="absolute top-2 right-2 z-10 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground shadow-sm">
                                            -{Math.round(pricing.maxDiscountPercent)}%
                                            <span className="sr-only"> discount</span>
                                        </span>
                                    )}
                                    {p.brand && (
                                        <span className="absolute top-2 left-2 z-10 inline-flex items-center rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur">
                                            {p.brand}
                                        </span>
                                    )}
                                </div>
                            </Link>
                            <CardContent className="flex-1 flex flex-col gap-2 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <Link
                                        href={`/products/${p.slug || p.id}`}
                                        className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors pr-1"
                                    >
                                        {p.name}
                                    </Link>
                                    {/* {p.brand && <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">{p.brand}</span>} */}
                                </div>
                                {p.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{p.description}</p>
                                )}
                                <div className="mt-auto pt-1 flex items-end gap-3">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="flex flex-col gap-1 text-sm leading-tight text-foreground">
                                            {priceNode}
                                        </div>
                                    </div>
                                    <AddToCartButton
                                        productId={p.id}
                                        productName={p.name}
                                        productSlug={p.slug}
                                        productImage={p.main_image_url}
                                        price={effectivePrice}
                                        size="icon"
                                        variant="default"
                                        className="flex-shrink-0"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </li>
                );
            })}
        </ul>
    );
}
