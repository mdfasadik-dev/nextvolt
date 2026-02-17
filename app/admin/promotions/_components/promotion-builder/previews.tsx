'use client';

import { Button } from '@/components/ui/button';
import { HeroSection } from '@/components/promotions/HeroSection';
import { PromoBanner } from '@/components/promotions/PromoBanner';
import { PromoCarousel } from '@/components/promotions/PromoCarousel';
import { PromoCustomSection } from '@/components/promotions/PromoCustomSection';
import { PromotionImage } from '@/components/promotions/PromotionImage';
import { PromotionWithItems } from '@/lib/data/promotions';
import { getPromotionImageRatio } from '@/lib/promotions/image-ratio';
import { cn } from '@/lib/utils';
import { PROMOTION_PLACEHOLDER_IMAGE, createDefaultItem } from './config';
import type { DraftItem, PromotionType } from './types';

const popupImageRatio = getPromotionImageRatio('popup');

export function StaticPopupPreview({ item }: { item: DraftItem }) {
    const imageSrc = item.image_url || PROMOTION_PLACEHOLDER_IMAGE;

    return (
        <section className="relative w-full min-h-[460px] bg-black/35 p-8 flex items-center justify-center">
            <div className="w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-2xl">
                <div className={cn('relative w-full bg-muted', popupImageRatio.className)}>
                    <PromotionImage
                        src={imageSrc}
                        alt={item.title || 'Popup image'}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 448px"
                    />
                </div>
                <div className="space-y-3 p-5">
                    <h3 className="text-xl font-semibold">{item.title || 'Popup title'}</h3>
                    {item.subtitle ? <p className="text-sm text-primary font-medium">{item.subtitle}</p> : null}
                    {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm">No thanks</Button>
                        <Button size="sm">{item.cta_label || 'Check it out'}</Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function PromotionLivePreview({
    type,
    previewPromotion,
    selectedItem,
}: {
    type: PromotionType;
    previewPromotion: PromotionWithItems | null;
    selectedItem: DraftItem | null;
}) {
    return (
        <>
            {type === 'hero' ? <HeroSection promotion={previewPromotion} /> : null}
            {type === 'carousel' ? <PromoCarousel promotion={previewPromotion} /> : null}
            {type === 'banner' ? <PromoBanner promotion={previewPromotion} /> : null}
            {type === 'popup' ? (
                <StaticPopupPreview item={selectedItem || createDefaultItem('popup')} />
            ) : null}
            {type === 'custom' ? (
                <PromoCustomSection promotions={previewPromotion ? [previewPromotion] : []} previewMode />
            ) : null}
        </>
    );
}
