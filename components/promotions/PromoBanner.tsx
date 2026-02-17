'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PromotionWithItems } from '@/lib/data/promotions';
import { getPromotionImageRatio } from '@/lib/promotions/image-ratio';
import { cn } from '@/lib/utils';
import { PromotionImage } from '@/components/promotions/PromotionImage';

interface PromoBannerProps {
    promotion: PromotionWithItems | null;
}

const bannerImageRatio = getPromotionImageRatio('banner');

export function PromoBanner({ promotion }: PromoBannerProps) {
    if (!promotion || !promotion.items || promotion.items.length === 0) return null;

    const item = promotion.items.find((i) => i.is_active);
    if (!item) return null;
    const imageSrc = item.image_url || '/placeholder.png';

    return (
        <section className="w-full bg-primary/5 border-y border-primary/10 overflow-hidden my-8">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8 py-8 md:py-12">
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-2xl md:text-3xl font-bold">{item.title}</h3>
                        {item.subtitle && <p className="text-lg font-medium text-primary">{item.subtitle}</p>}
                    </div>
                    {item.body && <p className="text-muted-foreground max-w-lg">{item.body}</p>}

                    {item.cta_label && item.cta_url && (
                        <Button asChild size="lg" className="mt-4">
                            <Link href={item.cta_url} target={item.cta_target || '_self'}>
                                {item.cta_label || 'Explore'}
                            </Link>
                        </Button>
                    )}
                </div>

                <div className={cn('relative w-full md:w-1/2 rounded-xl overflow-hidden shadow-lg', bannerImageRatio.className)}>
                    <PromotionImage
                        src={imageSrc}
                        alt={item.title || 'Banner'}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />
                </div>
            </div>
        </section>
    );
}
