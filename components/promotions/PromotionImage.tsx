'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const FALLBACK_SRC = '/placeholder.png';

function isBlobOrDataUrl(src: string) {
    return src.startsWith('blob:') || src.startsWith('data:');
}

function isExternalUrl(src: string) {
    return src.startsWith('http://') || src.startsWith('https://');
}

function normalizeSrc(src: string | null | undefined) {
    const value = src?.trim();
    return value ? value : FALLBACK_SRC;
}

type PromotionImageProps = {
    src: string | null | undefined;
    alt: string;
    className?: string;
    priority?: boolean;
    sizes?: string;
};

export function PromotionImage({
    src,
    alt,
    className,
    priority = false,
    sizes = '100vw',
}: PromotionImageProps) {
    const normalizedSrc = normalizeSrc(src);
    const [currentSrc, setCurrentSrc] = useState(normalizedSrc);

    useEffect(() => {
        setCurrentSrc(normalizedSrc);
    }, [normalizedSrc]);

    const useUnoptimized = isBlobOrDataUrl(currentSrc) || isExternalUrl(currentSrc);

    return (
        <Image
            src={currentSrc}
            alt={alt}
            fill
            className={className}
            priority={priority}
            // sizes={sizes}
            // unoptimized={useUnoptimized}
            onError={() => {
                setCurrentSrc((prev) => (prev === FALLBACK_SRC ? prev : FALLBACK_SRC));
            }}
        />
    );
}

