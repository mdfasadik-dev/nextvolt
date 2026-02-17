export type PromotionRatioType = 'hero' | 'carousel' | 'banner' | 'popup' | 'custom';

export type PromotionImageRatio = {
    label: string;
    className: string;
};

const HERO_IMAGE_RATIO: PromotionImageRatio = {
    label: '16:9',
    className: 'aspect-[16/9]',
};

const STANDARD_IMAGE_RATIO: PromotionImageRatio = {
    label: '4:3',
    className: 'aspect-[4/3]',
};

const PROMOTION_IMAGE_RATIO_BY_TYPE: Record<PromotionRatioType, PromotionImageRatio> = {
    hero: HERO_IMAGE_RATIO,
    carousel: STANDARD_IMAGE_RATIO,
    banner: HERO_IMAGE_RATIO,
    popup: STANDARD_IMAGE_RATIO,
    custom: STANDARD_IMAGE_RATIO,
};

export function getPromotionImageRatio(type: string | null | undefined): PromotionImageRatio {
    if (!type) {
        return STANDARD_IMAGE_RATIO;
    }

    if (type in PROMOTION_IMAGE_RATIO_BY_TYPE) {
        return PROMOTION_IMAGE_RATIO_BY_TYPE[type as PromotionRatioType];
    }

    return STANDARD_IMAGE_RATIO;
}
