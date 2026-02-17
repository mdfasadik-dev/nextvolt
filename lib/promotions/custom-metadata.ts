import type { Json } from '@/lib/types/supabase';

export type CustomCardStyle = 'standard' | 'quote' | 'spotlight';

export type CustomPromotionItemMetadata = {
    style: CustomCardStyle;
    badge: string;
};

const DEFAULT_CUSTOM_PROMOTION_ITEM_METADATA: CustomPromotionItemMetadata = {
    style: 'standard',
    badge: '',
};

const STYLE_SET = new Set<CustomCardStyle>(['standard', 'quote', 'spotlight']);

export function getDefaultCustomPromotionItemMetadata(): CustomPromotionItemMetadata {
    return { ...DEFAULT_CUSTOM_PROMOTION_ITEM_METADATA };
}

export function parseCustomPromotionItemMetadata(metadata: Json | null): CustomPromotionItemMetadata {
    const parsed = getDefaultCustomPromotionItemMetadata();

    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return parsed;
    }

    const record = metadata as Record<string, unknown>;

    if (typeof record.style === 'string' && STYLE_SET.has(record.style as CustomCardStyle)) {
        parsed.style = record.style as CustomCardStyle;
    } else if (
        typeof record.rating === 'number' ||
        typeof record.verified === 'boolean' ||
        typeof record.location === 'string'
    ) {
        // Backward compatibility with previous testimonial-focused metadata.
        parsed.style = 'quote';
    }

    if (typeof record.badge === 'string') {
        parsed.badge = record.badge;
    }

    return parsed;
}
