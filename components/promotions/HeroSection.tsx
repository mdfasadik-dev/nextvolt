'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { PromotionWithItems } from '@/lib/data/promotions';
import { getPromotionImageRatio } from '@/lib/promotions/image-ratio';
import { Tables } from '@/lib/types/supabase';
import { PromotionImage } from '@/components/promotions/PromotionImage';

type HeroItem = Tables<'promotion_items'>;

interface HeroSectionProps {
    promotion?: PromotionWithItems | null;
    promotions?: PromotionWithItems[] | null;
    autoRotateMs?: number;
}

type HeroSlide = {
    id: string;
    item: HeroItem;
};

const heroImageRatio = getPromotionImageRatio('hero');

function toSlides(sourcePromotions: PromotionWithItems[]): HeroSlide[] {
    return sourcePromotions.flatMap((promotion) => {
        const activeItems = (promotion.items || [])
            .filter((item) => item.is_active)
            .sort((a, b) => a.sort_order - b.sort_order);

        return activeItems.map((item, index) => ({
            id: `${promotion.id}-${item.id || index}`,
            item,
        }));
    });
}

function HeroSlideContent({ item, priority = false }: { item: HeroItem; priority?: boolean }) {
    const imageSrc = item.image_url || '/placeholder.png';
    const hasText = (value: string | null) => Boolean(value?.trim());
    const hasCta = hasText(item.cta_url) && hasText(item.cta_label);
    const hasContent = hasText(item.subtitle) || hasText(item.title) || hasText(item.body) || hasCta;

    return (
        <article className={cn('relative w-full overflow-hidden', heroImageRatio.className)}>
            <div className="absolute inset-0 h-full w-full">
                <PromotionImage
                    src={imageSrc}
                    alt={item.title || 'Hero Image'}
                    className="object-cover"
                    priority={priority}
                    sizes="100vw"
                />
                {hasContent ? <div className="absolute inset-0 bg-black/50" /> : null}
            </div>

            {hasContent ? (
                <div className="relative z-10 container mx-auto flex h-full flex-col items-center justify-center px-4 text-center">
                    {item.subtitle ? (
                        <span className="mb-2 inline-block rounded-full border border-primary/20 bg-primary/20 px-3 py-1 text-sm font-medium text-primary-foreground backdrop-blur-sm">
                            {item.subtitle}
                        </span>
                    ) : null}

                    {item.title ? (
                        <h1 className="mb-2 max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
                            {item.title}
                        </h1>
                    ) : null}

                    {item.body ? (
                        <p className="mb-2 max-w-2xl text-lg text-gray-200 md:text-xl">
                            {item.body}
                        </p>
                    ) : null}

                    {hasCta ? (
                        <Button asChild size="lg" className="rounded-full px-8 py-6 text-lg transition-transform hover:scale-105">
                            <Link href={item.cta_url!} target={item.cta_target || '_self'}>
                                {item.cta_label}
                            </Link>
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}

export function HeroSection({
    promotion = null,
    promotions = null,
    autoRotateMs = 4500,
}: HeroSectionProps) {
    const [api, setApi] = useState<CarouselApi>();
    const [selectedIndex, setSelectedIndex] = useState(0);

    const normalizedPromotions = useMemo(() => {
        if (promotions && promotions.length > 0) return promotions;
        if (promotion) return [promotion];
        return [];
    }, [promotion, promotions]);

    const slides = useMemo(() => toSlides(normalizedPromotions), [normalizedPromotions]);

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
        if (!api || slides.length <= 1) return;

        const timer = window.setInterval(() => {
            api.scrollNext();
        }, autoRotateMs);

        return () => window.clearInterval(timer);
    }, [api, autoRotateMs, slides.length]);

    useEffect(() => {
        if (!api) return;
        api.scrollTo(0);
        setSelectedIndex(0);
    }, [api, slides.length]);

    if (slides.length === 0) {
        return null;
    }

    return (
        <section className="relative w-full overflow-hidden md:px-6 md:mt-6">
            <div className="mx-auto w-full max-w-6xl">
                <Carousel
                    opts={{ loop: slides.length > 1, align: 'start' }}
                    setApi={setApi}
                    className="w-full"
                >
                    <CarouselContent className="ml-0">
                        {slides.map((slide, index) => (
                            <CarouselItem key={slide.id} className="pl-0">
                                <HeroSlideContent item={slide.item} priority={index === 0} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>

                {slides.length > 1 && (
                    <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
                        <div className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-2 backdrop-blur-sm">
                            {slides.map((slide, index) => (
                                <button
                                    key={slide.id}
                                    type="button"
                                    onClick={() => api?.scrollTo(index)}
                                    aria-label={`Go to hero slide ${index + 1}`}
                                    className={cn(
                                        'h-2.5 w-2.5 rounded-full transition-all',
                                        selectedIndex === index ? 'w-6 bg-white' : 'bg-white/50 hover:bg-white/80'
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
