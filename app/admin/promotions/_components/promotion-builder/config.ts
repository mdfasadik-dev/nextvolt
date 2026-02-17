import type { DraftItem, PromotionType, PromotionTypeOption } from './types';
import type { CustomCardStyle } from '@/lib/promotions/custom-metadata';

export const PROMOTION_PLACEHOLDER_IMAGE = '/placeholder.png';

export const TYPE_OPTIONS: PromotionTypeOption[] = [
    { value: 'hero', label: 'Hero', description: 'Large homepage hero section', maxItems: 1 },
    { value: 'carousel', label: 'Carousel', description: 'Scrollable multi-card promotions', maxItems: 10 },
    { value: 'banner', label: 'Banner', description: 'Wide horizontal banner strip', maxItems: 1 },
    { value: 'popup', label: 'Popup', description: 'Modal promotion shown to visitors', maxItems: 1 },
    { value: 'custom', label: 'Custom', description: 'Flexible section for testimonials, highlights, and announcements', maxItems: 10 },
];

export function createDefaultItem(type: PromotionType, index = 0): DraftItem {
    const seed = index + 1;

    if (type === 'hero') {
        return {
            title: 'Fresh Weekly Deals',
            subtitle: 'Limited Time',
            body: 'Save more on essentials and bestsellers this week only.',
            image_url: PROMOTION_PLACEHOLDER_IMAGE,
            mobile_image_url: '',
            cta_label: 'Shop now',
            cta_url: '/categories',
            cta_target: '_self',
            is_active: true,
            sort_order: index * 10,
            metadata: null,
        };
    }

    if (type === 'banner') {
        return {
            title: 'Weekend Flash Sale',
            subtitle: 'Up to 40% Off',
            body: 'Only for selected categories while stock lasts.',
            image_url: PROMOTION_PLACEHOLDER_IMAGE,
            mobile_image_url: '',
            cta_label: 'Explore offers',
            cta_url: '/categories',
            cta_target: '_self',
            is_active: true,
            sort_order: index * 10,
            metadata: null,
        };
    }

    if (type === 'popup') {
        return {
            title: 'First Order Offer',
            subtitle: 'Welcome Gift',
            body: 'Get an instant discount on your first checkout.',
            image_url: PROMOTION_PLACEHOLDER_IMAGE,
            mobile_image_url: '',
            cta_label: 'Claim discount',
            cta_url: '/categories',
            cta_target: '_self',
            is_active: true,
            sort_order: index * 10,
            metadata: null,
        };
    }

    if (type === 'custom') {
        const styleCycle: CustomCardStyle[] = ['standard', 'spotlight', 'quote'];
        return {
            title: `Custom Block ${seed}`,
            subtitle: 'Optional supporting text',
            body: 'Use this flexible block for testimonials, trust messages, offers, or announcements.',
            image_url: PROMOTION_PLACEHOLDER_IMAGE,
            mobile_image_url: '',
            cta_label: '',
            cta_url: '',
            cta_target: '_self',
            is_active: true,
            sort_order: index * 10,
            metadata: {
                style: styleCycle[index % styleCycle.length],
                badge: '',
            },
        };
    }

    return {
        title: `Slide ${seed}`,
        subtitle: 'Featured',
        body: 'Promote products, categories, or campaigns with clear CTAs.',
        image_url: PROMOTION_PLACEHOLDER_IMAGE,
        mobile_image_url: '',
        cta_label: 'Shop now',
        cta_url: '/categories',
        cta_target: '_self',
        is_active: true,
        sort_order: index * 10,
        metadata: null,
    };
}

export function coerceItemsByType(type: PromotionType, items: DraftItem[]): DraftItem[] {
    const option = TYPE_OPTIONS.find((entry) => entry.value === type);
    const maxItems = option?.maxItems ?? 1;

    if (maxItems === 1) {
        return items.length > 0 ? [items[0]] : [createDefaultItem(type, 0)];
    }

    return items.length > 0 ? items.slice(0, maxItems) : [createDefaultItem(type, 0), createDefaultItem(type, 1)];
}
