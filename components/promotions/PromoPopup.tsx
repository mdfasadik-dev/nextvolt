'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { PromotionWithItems } from '@/lib/data/promotions';
import { getPromotionImageRatio } from '@/lib/promotions/image-ratio';
import { Tables } from '@/lib/types/supabase';
import { cn } from '@/lib/utils';
import { PromotionImage } from '@/components/promotions/PromotionImage';

// Helper to check if we should show based on metadata "once_per_session" etc.
// For now, simpler implementation: just use the session storage key.

interface PromoPopupProps {
    promotion: PromotionWithItems | null;
}

const popupImageRatio = getPromotionImageRatio('popup');

export function PromoPopup({ promotion }: PromoPopupProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [item, setItem] = useState<Tables<'promotion_items'> | null>(null);
    const [mounted, setMounted] = useState(false);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open && item) {
            // When closing, mark as dismissed in session (per session)
            sessionStorage.setItem(`promo-popup-${promotion?.id}-${item.id}`, 'true');
        }
        setIsOpen(open);
    }, [item, promotion?.id]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!promotion || !promotion.items || promotion.items.length === 0) return;

        // Get first active item
        const activeItem = promotion.items.find(i => i.is_active);
        if (!activeItem) return;

        setItem(activeItem);

        // Check storage for dismissal
        const dismissedKey = `promo-popup-${promotion.id}-${activeItem.id}`;
        const isDismissed = sessionStorage.getItem(dismissedKey);

        if (!isDismissed) {
            // Delay opening slightly for effect
            const timer = setTimeout(() => setIsOpen(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [promotion]);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleOpenChange(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [handleOpenChange, isOpen]);

    if (!item || !isOpen || !mounted) return null;

    const node = (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-md"
                onClick={() => handleOpenChange(false)}
                aria-hidden="true"
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-label={item.title || 'Promotion'}
                className="relative z-[81] w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-2xl"
            >
                <div className={cn('relative w-full', popupImageRatio.className)}>
                    <PromotionImage
                        src={item.image_url || '/placeholder.png'}
                        alt={item.title || 'Offer'}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 448px"
                    />
                    <button
                        type="button"
                        aria-label="Close promotion popup"
                        onClick={() => handleOpenChange(false)}
                        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                    >
                        ×
                    </button>
                </div>
                <div className="p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">{item.title}</h2>
                        {item.subtitle && (
                            <p className="mt-1 text-sm font-medium text-primary">{item.subtitle}</p>
                        )}
                        {item.body && (
                            <p className="mt-2 text-base text-muted-foreground">
                                {item.body}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                            No thanks
                        </Button>
                        {item.cta_url && (
                            <Button asChild className="w-full sm:w-auto">
                                <Link href={item.cta_url} onClick={() => handleOpenChange(false)}>
                                    {item.cta_label || 'Check it out'}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );

    return createPortal(node, document.body);
}
