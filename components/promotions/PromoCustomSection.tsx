'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { PromotionImage } from '@/components/promotions/PromotionImage';
import type { PromotionWithItems } from '@/lib/data/promotions';
import {
    parseCustomPromotionItemMetadata,
    type CustomCardStyle,
} from '@/lib/promotions/custom-metadata';
import { cn } from '@/lib/utils';
import type { Tables } from '@/lib/types/supabase';

interface PromoCustomSectionProps {
    promotions: PromotionWithItems[] | null;
    previewMode?: boolean;
}

interface CustomSectionCarouselProps {
    promotionId: string;
    items: Tables<'promotion_items'>[];
    previewMode: boolean;
}

function hasValue(value: string | null | undefined) {
    return Boolean(value?.trim());
}

function getActiveItems(promotion: PromotionWithItems): Tables<'promotion_items'>[] {
    return (promotion.items || [])
        .filter((item) => item.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
}

function shouldShowCta(item: Tables<'promotion_items'>) {
    return Boolean(item.cta_label && item.cta_url);
}

function renderCta(item: Tables<'promotion_items'>, previewMode: boolean) {
    if (!item.cta_label) return null;

    if (previewMode) {
        return (
            <Button type="button" size="sm" disabled>
                {item.cta_label}
            </Button>
        );
    }

    if (!item.cta_url) return null;

    return (
        <Button asChild size="sm" className="group/cta">
            <Link href={item.cta_url} target={item.cta_target || '_self'}>
                {item.cta_label}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </Link>
        </Button>
    );
}

function ImageOnlyCard({ item }: { item: Tables<'promotion_items'> }) {
    return (
        <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <PromotionImage
                    src={item.image_url || '/placeholder.png'}
                    alt={item.title || 'Custom promotion image'}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
            </div>
        </article>
    );
}

function StandardCard({
    item,
    badge,
    previewMode,
}: {
    item: Tables<'promotion_items'>;
    badge: string;
    previewMode: boolean;
}) {
    const hasTitle = hasValue(item.title);
    const hasSubtitle = hasValue(item.subtitle);
    const hasBody = hasValue(item.body);
    const hasCta = shouldShowCta(item);
    const hasContent = hasTitle || hasSubtitle || hasBody || hasCta;

    return (
        <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <PromotionImage
                    src={item.image_url || '/placeholder.png'}
                    alt={item.title || 'Custom promotion image'}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                {badge ? (
                    <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                        {badge}
                    </span>
                ) : null}
            </div>
            {hasContent ? (
                <div className="space-y-2 p-5">
                    {hasTitle ? <h3 className="text-lg font-semibold">{item.title}</h3> : null}
                    {hasSubtitle ? <p className="text-sm text-primary">{item.subtitle}</p> : null}
                    {hasBody ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
                    {hasCta ? <div className="pt-2">{renderCta(item, previewMode)}</div> : null}
                </div>
            ) : null}
        </article>
    );
}

function QuoteCard({
    item,
    badge,
    previewMode,
}: {
    item: Tables<'promotion_items'>;
    badge: string;
    previewMode: boolean;
}) {
    const hasTitle = hasValue(item.title);
    const hasSubtitle = hasValue(item.subtitle);
    const hasBody = hasValue(item.body);
    const hasCta = shouldShowCta(item);

    return (
        <article className="rounded-2xl border bg-card px-5 py-6 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <Quote className="h-6 w-6 text-primary/45" />
                {badge ? (
                    <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {badge}
                    </span>
                ) : null}
            </div>

            {hasBody ? <p className="text-sm leading-6 text-foreground/90 md:text-base">{item.body}</p> : null}

            <div className="mt-5 flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border bg-muted">
                    <PromotionImage
                        src={item.image_url || '/placeholder.png'}
                        alt={item.title || 'Custom promotion image'}
                        className="object-cover"
                        sizes="48px"
                    />
                </div>
                <div className="min-w-0">
                    {hasTitle ? <p className="truncate text-sm font-semibold">{item.title}</p> : null}
                    {hasSubtitle ? <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p> : null}
                </div>
            </div>

            {hasCta ? <div className="mt-4">{renderCta(item, previewMode)}</div> : null}
        </article>
    );
}

function SpotlightCard({
    item,
    badge,
    previewMode,
}: {
    item: Tables<'promotion_items'>;
    badge: string;
    previewMode: boolean;
}) {
    const hasTitle = hasValue(item.title);
    const hasSubtitle = hasValue(item.subtitle);
    const hasBody = hasValue(item.body);
    const hasCta = shouldShowCta(item);
    const hasOverlayContent = hasTitle || hasSubtitle || hasBody || hasCta || hasValue(badge);

    return (
        <article className="relative min-h-80 overflow-hidden rounded-2xl border shadow-sm">
            <div className="absolute inset-0">
                <PromotionImage
                    src={item.image_url || '/placeholder.png'}
                    alt={item.title || 'Custom promotion image'}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                {hasOverlayContent ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
                ) : null}
            </div>
            {hasOverlayContent ? (
                <div className="relative z-10 flex h-full flex-col justify-end gap-2 p-5 text-white">
                    {badge ? (
                        <span className="mb-1 inline-flex w-fit rounded-full border border-white/40 bg-black/30 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
                            {badge}
                        </span>
                    ) : null}
                    {hasTitle ? <h3 className="text-xl font-semibold">{item.title}</h3> : null}
                    {hasSubtitle ? <p className="text-sm text-white/90">{item.subtitle}</p> : null}
                    {hasBody ? <p className="text-sm text-white/80">{item.body}</p> : null}
                    {hasCta ? <div className="pt-2">{renderCta(item, previewMode)}</div> : null}
                </div>
            ) : null}
        </article>
    );
}

function renderByStyle(
    style: CustomCardStyle,
    props: {
        item: Tables<'promotion_items'>;
        badge: string;
        previewMode: boolean;
        imageOnly: boolean;
    }
) {
    const { imageOnly, ...cardProps } = props;

    if (imageOnly) {
        return <ImageOnlyCard item={props.item} />;
    }

    if (style === 'quote') {
        return <QuoteCard {...cardProps} />;
    }
    if (style === 'spotlight') {
        return <SpotlightCard {...cardProps} />;
    }
    return <StandardCard {...cardProps} />;
}

function CustomSectionCarousel({ promotionId, items, previewMode }: CustomSectionCarouselProps) {
    const [api, setApi] = useState<CarouselApi>();
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (!api) return;

        const onSelect = () => {
            setSelectedIndex(api.selectedScrollSnap());
        };

        onSelect();
        api.on('select', onSelect);
        api.on('reInit', onSelect);

        return () => {
            api.off('select', onSelect);
            api.off('reInit', onSelect);
        };
    }, [api]);

    useEffect(() => {
        if (!api || items.length <= 1) return;

        const timer = window.setInterval(() => {
            api.scrollNext();
        }, 4500);

        return () => window.clearInterval(timer);
    }, [api, items.length]);

    useEffect(() => {
        if (!api) return;
        api.scrollTo(0);
        setSelectedIndex(0);
    }, [api, items.length]);

    return (
        <div className="relative">
            <Carousel opts={{ loop: items.length > 1, align: 'start' }} setApi={setApi} className="w-full">
                <CarouselContent className="-ml-4">
                    {items.map((item, index) => {
                        const meta = parseCustomPromotionItemMetadata(item.metadata);
                        const imageOnly = !hasValue(item.title)
                            && !hasValue(item.subtitle)
                            && !hasValue(item.body)
                            && !shouldShowCta(item);

                        return (
                            <CarouselItem
                                key={item.id || `${promotionId}-${index}`}
                                className="pl-4 basis-full md:basis-1/2 lg:basis-1/3"
                            >
                                {renderByStyle(meta.style, {
                                    item,
                                    badge: meta.badge,
                                    previewMode,
                                    imageOnly,
                                })}
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
                {items.length > 1 ? (
                    <>
                        <CarouselPrevious className="left-3 top-1/2 z-20 -translate-y-1/2 bg-background/90" />
                        <CarouselNext className="right-3 top-1/2 z-20 -translate-y-1/2 bg-background/90" />
                    </>
                ) : null}
            </Carousel>

            {items.length > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-2">
                    {items.map((item, index) => (
                        <button
                            key={`${item.id || `${promotionId}-${index}`}-dot`}
                            type="button"
                            onClick={() => api?.scrollTo(index)}
                            aria-label={`Go to custom slide ${index + 1}`}
                            className={cn(
                                'h-2.5 w-2.5 rounded-full transition-all',
                                selectedIndex === index ? 'w-6 bg-primary' : 'bg-muted-foreground/35 hover:bg-muted-foreground/60'
                            )}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function PromoCustomSection({ promotions, previewMode = false }: PromoCustomSectionProps) {
    if (!promotions || promotions.length === 0) {
        return null;
    }

    const sections = promotions
        .map((promotion) => ({ promotion, items: getActiveItems(promotion) }))
        .filter((entry) => entry.items.length > 0);

    if (sections.length === 0) {
        return null;
    }

    return (
        <section className="w-full bg-muted/20 py-14">
            <div className="container mx-auto space-y-12 px-4">
                {sections.map(({ promotion, items }) => (
                    <div key={promotion.id} className="space-y-7">
                        <header className="mx-auto max-w-3xl text-center">
                            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {promotion.title || 'Featured Section'}
                            </h2>
                            {promotion.description ? (
                                <p className="mt-2 text-sm text-muted-foreground md:text-base">{promotion.description}</p>
                            ) : null}
                        </header>

                        <CustomSectionCarousel
                            promotionId={promotion.id}
                            items={items}
                            previewMode={previewMode}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
