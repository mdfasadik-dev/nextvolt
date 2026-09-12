import type { AspectRatio, ImageProcessOptions } from "@/lib/utils/imageProcessing";
import { getPromotionImageRatio } from "@/lib/promotions/image-ratio";

export type ImagePreset = {
    aspectRatio: AspectRatio;
    processOptions?: ImageProcessOptions;
    title?: string;
    description?: string;
};

/**
 * Per-context crop presets.
 *
 * Each ratio is fixed to match how that image is rendered on the public site,
 * so the admin cannot pick a shape the storefront will letterbox or crop
 * again. Reposition and zoom are the only adjustments offered.
 */
export const IMAGE_PRESETS = {
    /** Product cards and galleries render square. */
    product: {
        aspectRatio: 1,
        processOptions: { maxDimension: 1400, mimeType: "image/webp" as const },
        title: "Crop product image",
        description: "Product images display as squares. Drag to reposition, zoom to fit.",
    },
    /** Category tiles are square. */
    category: {
        aspectRatio: 1,
        processOptions: { maxDimension: 1000, mimeType: "image/webp" as const },
        title: "Crop category image",
        description: "Category images display as squares.",
    },
    /** Variant thumbnails are square. */
    variant: {
        aspectRatio: 1,
        processOptions: { maxDimension: 1000, mimeType: "image/webp" as const },
        title: "Crop variant image",
        description: "Variant images display as squares.",
    },
    /** Project covers render 16:9. */
    projectCover: {
        aspectRatio: 16 / 9,
        processOptions: { maxDimension: 1920, mimeType: "image/webp" as const },
        title: "Crop cover image",
        description: "Cover images display in 16:9 on project pages.",
    },
    /** Payment instruction images render square (1:1). */
    paymentInstruction: {
        aspectRatio: 1,
        processOptions: { maxDimension: 1000, mimeType: "image/webp" as const },
        title: "Crop payment instruction image",
        description: "Payment instruction QR/images display as square. Drag to reposition, zoom to fit.",
    },
    /** In-page project images render 16:10. */
    projectSection: {
        aspectRatio: 16 / 10,
        processOptions: { maxDimension: 1600, mimeType: "image/webp" as const },
        title: "Crop section image",
        description: "Choose how this image should be framed.",
    },
    /**
     * Promotion slides. The real ratio depends on the promotion type, so use
     * `promotionPreset(type)` below rather than this generic fallback.
     */
    promotion: {
        aspectRatio: 4 / 3,
        processOptions: { maxDimension: 2000, mimeType: "image/webp" as const },
        title: "Crop promotion image",
        description: "Framed to match how this promotion appears on the site.",
    },
    /**
     * Logos render height-constrained (`h-8 w-auto`), so their width really is
     * free — this is the one context without a fixed frame.
     */
    logo: {
        aspectRatio: null,
        processOptions: { maxDimension: 600, mimeType: "image/png" as const },
        title: "Crop logo",
        description: "Transparency is preserved. Trim any surrounding whitespace.",
    },
} satisfies Record<string, ImagePreset>;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;

/** Parse the registry's Tailwind class (e.g. "aspect-[16/9]") into a number. */
function ratioFromClassName(className: string): AspectRatio {
    const match = className.match(/aspect-\[(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\]/);
    if (!match) return null;
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return null;
    return w / h;
}

/**
 * Crop preset for a promotion slide, derived from the same ratio registry the
 * public promotion components render with — so hero/banner crop at 16:9 while
 * carousel/popup/custom crop at 4:3, instead of one hardcoded guess.
 */
export function promotionPreset(type: string | null | undefined): ImagePreset {
    const ratio = getPromotionImageRatio(type);
    return {
        ...IMAGE_PRESETS.promotion,
        aspectRatio: ratioFromClassName(ratio.className) ?? IMAGE_PRESETS.promotion.aspectRatio,
        description: `Promotion images display in ${ratio.label} for this promotion type.`,
    };
}
