'use client';

import * as React from "react"
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    type CarouselApi,
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { PromotionWithItems } from "@/lib/data/promotions";
import { getPromotionImageRatio } from "@/lib/promotions/image-ratio";
import { cn } from "@/lib/utils";
import { PromotionImage } from "@/components/promotions/PromotionImage";

interface PromoCarouselProps {
    promotion: PromotionWithItems | null;
}

function getMetadataBadge(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return null;
    }
    const badge = (metadata as { badge?: unknown }).badge;
    return typeof badge === 'string' ? badge : null;
}

const carouselImageRatio = getPromotionImageRatio('carousel');

export function PromoCarousel({ promotion }: PromoCarouselProps) {
    const [api, setApi] = React.useState<CarouselApi>();
    const [isPaused, setIsPaused] = React.useState(false);

    React.useEffect(() => {
        if (!api) return;

        const pause = () => setIsPaused(true);
        const resume = () => setIsPaused(false);

        api.on("pointerDown", pause);
        api.on("pointerUp", resume);
        api.on("settle", resume);

        return () => {
            api.off("pointerDown", pause);
            api.off("pointerUp", resume);
            api.off("settle", resume);
        };
    }, [api]);

    React.useEffect(() => {
        if (!api || isPaused) return;

        const timer = window.setInterval(() => {
            if (document.hidden) return;
            api.scrollNext();
        }, 4500);

        return () => window.clearInterval(timer);
    }, [api, isPaused]);

    if (!promotion || !promotion.items || promotion.items.length === 0) return null;

    return (
        <section className="w-full py-12 bg-muted/30">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center mb-6 text-center">
                    <h2 className="text-3xl font-bold tracking-tight mb-2">{promotion.title || 'Featured Offers'}</h2>
                    {promotion.description && (
                        <p className="text-muted-foreground max-w-2xl">{promotion.description}</p>
                    )}
                </div>

                <Carousel
                    setApi={setApi}
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full max-w-6xl mx-auto"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <CarouselContent className="-ml-4">
                        {promotion.items.filter(i => i.is_active).map((item) => {
                            const badge = getMetadataBadge(item.metadata);
                            const imageSrc = item.image_url || '/placeholder.png';

                            return (
                                <CarouselItem key={item.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1 h-full">
                                        <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow duration-300 border-0 bg-card">
                                            <div className={cn('relative w-full overflow-hidden', carouselImageRatio.className)}>
                                                <PromotionImage
                                                    src={imageSrc}
                                                    alt={item.title || 'Promotion'}
                                                    className="object-cover transition-transform duration-500 hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                                {/* Badge from Metadata */}
                                                {badge && (
                                                    <Badge className="absolute top-3 right-3 z-10" variant="secondary">
                                                        {badge}
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardContent className="flex-1 p-6 flex flex-col items-start gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <h3 className="font-semibold text-xl leading-none tracking-tight">
                                                        {item.title}
                                                    </h3>
                                                    {item.subtitle && (
                                                        <p className="text-sm font-medium text-primary">
                                                            {item.subtitle}
                                                        </p>
                                                    )}
                                                    {item.body && (
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {item.body}
                                                        </p>
                                                    )}
                                                </div>
                                                {item.cta_url && (
                                                    <Button asChild variant="default" className="w-full mt-auto">
                                                        <Link href={item.cta_url} target={item.cta_target || '_self'}>
                                                            {item.cta_label || 'Learn More'}
                                                        </Link>
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            );
                        })}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex" />
                    <CarouselNext className="hidden md:flex" />
                </Carousel>
            </div>
        </section>
    );
}
