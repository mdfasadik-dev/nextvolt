"use client";
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/markdown';
import { FileImage } from 'lucide-react';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

interface VariantItem { id: string; title: string | null; sku: string | null; image_url: string | null; minPrice: number | null; maxPrice: number | null; minOriginalPrice?: number | null; maxOriginalPrice?: number | null; totalQty?: number | null; unit?: string | null; details_md?: string | null }

interface AttributeItem { id: string; name: string; data_type: string; value: string }

interface Props {
    productId: string;
    productSlug?: string | null;
    basePrice: string;
    basePriceValue?: number | null;
    basePriceOriginal?: string | null;
    variants: VariantItem[];
    productName: string;
    brand?: string | null;
    mainImageUrl?: string | null;
    description?: string | null;
    attributes: AttributeItem[];
    baseQty: number | null;
    baseUnit: string | null;
    productDetailsMd?: string | null;
    storePhone?: string | null;
}

export default function ProductDetailClient({ productId, productSlug, basePrice, basePriceValue, basePriceOriginal, variants, productName, brand, mainImageUrl, description, attributes, baseQty, baseUnit, productDetailsMd, storePhone }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [selected, setSelected] = useState<string | null>(null);

    // Initialize / sync selection from URL (supports back/forward navigation)
    useEffect(() => {
        const fromUrl = searchParams.get('variant');
        const firstVariant = variants[0];
        if (fromUrl) {
            const exists = variants.some(v => v.id === fromUrl);
            if (exists) {
                if (fromUrl !== selected) setSelected(fromUrl);
            } else {
                // URL has invalid variant -> fall back: first variant if any else default
                if (firstVariant) {
                    setSelected(firstVariant.id);
                    updateUrl(firstVariant.id);
                } else if (selected !== null) {
                    setSelected(null);
                    updateUrl(null);
                }
            }
        } else { // no variant param in URL
            if (firstVariant) {
                // auto-select first variant if none selected or selected is invalid
                if (!selected || !variants.some(v => v.id === selected)) {
                    setSelected(firstVariant.id);
                    updateUrl(firstVariant.id);
                }
            } else {
                // no variants: ensure default (null)
                if (selected !== null) {
                    setSelected(null);
                    updateUrl(null);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, variants]);

    function updateUrl(next: string | null) {
        const params = new URLSearchParams(searchParams.toString());
        if (next) params.set('variant', next); else params.delete('variant');
        const qs = params.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;
        router.replace(url, { scroll: false });
    }

    function handleSelect(next: string | null) {
        setSelected(next);
        updateUrl(next);
    }

    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    const { priceLabel, showOriginal, originalLabel } = useMemo(() => {
        if (!selected) return { priceLabel: basePrice, showOriginal: false, originalLabel: null as string | null };
        const v = variants.find(x => x.id === selected);
        if (!v || v.minPrice == null) return { priceLabel: basePrice, showOriginal: false, originalLabel: null };
        const hasRange = v.maxPrice != null && v.maxPrice !== v.minPrice;
        const priceLabel = hasRange ? `${symbol}${v.minPrice!.toFixed(0)} - ${symbol}${v.maxPrice!.toFixed(0)}` : `${symbol}${v.minPrice!.toFixed(0)}`;
        const originalDiffers = (v.minOriginalPrice != null && v.minOriginalPrice !== v.minPrice) || (v.maxOriginalPrice != null && v.maxOriginalPrice !== v.maxPrice);
        let originalLabel: string | null = null;
        if (originalDiffers && v.minOriginalPrice != null) {
            const origRange = v.maxOriginalPrice != null && v.maxOriginalPrice !== v.minOriginalPrice;
            originalLabel = origRange
                ? `${symbol}${v.minOriginalPrice.toFixed(0)}${v.maxOriginalPrice && v.maxOriginalPrice !== v.minOriginalPrice ? ` - ${symbol}${v.maxOriginalPrice.toFixed(0)}` : ''}`
                : `${symbol}${v.minOriginalPrice.toFixed(0)}`;
        }
        return { priceLabel, showOriginal: !!originalLabel, originalLabel };
    }, [selected, variants, basePrice, symbol]);

    const activeVariant = selected ? variants.find(v => v.id === selected) : null;
    const displayImage = activeVariant?.image_url || mainImageUrl;
    const hasVariants = variants.length > 0;
    const cartVariant = hasVariants ? activeVariant : null;
    const cartPrice = cartVariant
        ? cartVariant.minPrice ?? cartVariant.maxPrice ?? null
        : basePriceValue ?? null;
    const cartVariantName = cartVariant ? (cartVariant.title || cartVariant.sku || cartVariant.id) : null;
    const canAddToCart = cartPrice != null && (!hasVariants || cartVariant != null);

    const activeMarkdown = activeVariant?.details_md || productDetailsMd || null;

    // Build WhatsApp link with prefilled message
    const waDigits = (storePhone || '').replace(/[^0-9]/g, '');
    function buildWaLink(variant?: VariantItem | null) {
        if (!waDigits || waDigits.length < 8) return null;
        const vLabel = variant ? (variant.title || variant.sku || variant.id) : null;
        const priceText = variant && variant.minPrice != null ? (variant.maxPrice && variant.maxPrice !== variant.minPrice ? `${symbol}${variant.minPrice.toFixed(2)} - ${symbol}${variant.maxPrice.toFixed(2)}` : `${symbol}${variant.minPrice.toFixed(2)}`) : basePrice;
        const msg = encodeURIComponent(`Hello, I'm interested in ${productName} ${vLabel ? `(${vLabel})` : ''} priced at ${priceText}.`);
        return `https://wa.me/${waDigits}?text=${msg}`;
    }

    return (
        <>
            <div className="grid gap-10 md:grid-cols-2">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                    {displayImage ? (
                        <Image
                            src={displayImage}
                            alt={productName}
                            fill
                            priority={false}
                            sizes="(max-width:768px) 100vw, 50vw"
                            className="absolute inset-0 object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
                            <FileImage className='h-8 w-8 text-gray-400' />
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-semibold leading-tight mb-2">{productName}</h1>
                        {brand && <Badge variant="secondary" className="text-xs uppercase tracking-wide font-medium">{brand}</Badge>}
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            {(!selected && basePriceOriginal && basePriceOriginal !== priceLabel) && (
                                <div className="text-sm text-muted-foreground line-through">{basePriceOriginal}</div>
                            )}
                            {(selected && showOriginal && originalLabel) && (
                                <div className="text-sm text-muted-foreground line-through">{originalLabel}</div>
                            )}
                            <div className="text-xl font-semibold">{priceLabel}</div>
                            {!variants.length && baseQty != null && (
                                <div className="text-xs text-muted-foreground">In stock: {baseQty}{baseUnit ? ` ${baseUnit}` : ''}</div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <AddToCartButton
                                    productId={productId}
                                    productName={productName}
                                    productSlug={productSlug || undefined}
                                    productImage={displayImage || undefined}
                                    variantId={cartVariant?.id}
                                    variantName={cartVariantName || undefined}
                                    price={cartPrice}
                                    size={'lg'}
                                    disabled={!canAddToCart}
                                    variant="default"
                                >
                                    Add to Cart
                                </AddToCartButton>
                                {buildWaLink(activeVariant) && (
                                    <a
                                        href={buildWaLink(activeVariant) as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-2 transition-colors"
                                    >
                                        <span>WhatsApp Inquiry</span>
                                    </a>
                                )}
                            </div>
                        </div>
                        {variants.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                                {/* Default selector */}
                                {/* <button
                                    type="button"
                                    onClick={() => handleSelect(null)}
                                    className={cn(
                                        'text-xs rounded-md border px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-primary/50',
                                        selected === null ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                                    )}
                                    aria-pressed={selected === null}
                                >
                                    <span className="block font-medium leading-none mb-1">Default</span>
                                    <span className="block text-[10px]">{baseQty != null ? `In Stock: ${baseQty}${baseUnit ? ` ${baseUnit}` : ''}` : '—'}</span>
                                </button> */}
                                {variants.map(v => {
                                    const active = selected === v.id;
                                    const label = v.title || v.sku || 'Variant';
                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => handleSelect(active ? null : v.id)}
                                            className={cn(
                                                'text-xs rounded-md border px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-primary/50',
                                                active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                                            )}
                                            aria-pressed={active}
                                        >
                                            <span className="block font-medium leading-none mb-1">{label}</span>
                                            {v.totalQty != null && (
                                                <span className="block text-[10px] mt-0.5">In Stock: {v.totalQty}{v.unit ? ` ${v.unit}` : ''}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {description && (
                        <div>
                            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground mb-2">DESCRIPTION</h2>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{description}</p>
                        </div>
                    )}
                    {attributes.length > 0 && (
                        <div>
                            <ul className="flex flex-wrap gap-2">
                                {attributes.map(a => (
                                    <li key={a.id} className="text-[11px] rounded bg-muted px-2 py-1">{a.name}: <span className="font-medium">{a.value}</span></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            {
                activeMarkdown && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown content={activeMarkdown} />
                    </div>
                )
            }
        </>
    );
}
