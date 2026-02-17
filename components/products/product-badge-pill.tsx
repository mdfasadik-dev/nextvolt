"use client";

import { cn } from "@/lib/utils";
import { getProductBadgeColorClassName, isProductBadgeColor } from "@/lib/constants/product-badge";

function isHexColor(value: string) {
    return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

function getReadableTextColor(hexColor: string) {
    const hex = hexColor.replace("#", "");
    if (hex.length !== 6) return "#ffffff";
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

interface ProductBadgePillProps {
    label: string;
    color?: string | null;
    centered?: boolean;
    className?: string;
}

export function ProductBadgePill({ label, color, centered = false, className }: ProductBadgePillProps) {
    if (!label.trim()) return null;

    const resolvedColor = color?.trim();
    const isCustomColor = !!resolvedColor && !isProductBadgeColor(resolvedColor) && isHexColor(resolvedColor);
    const customTextColor = isCustomColor ? getReadableTextColor(resolvedColor) : undefined;
    const style = isCustomColor
        ? { backgroundColor: resolvedColor, color: customTextColor }
        : undefined;
    const colorClassName = isCustomColor
        ? customTextColor === "#0f172a"
            ? "ring-black/10"
            : "ring-white/20"
        : getProductBadgeColorClassName(resolvedColor);

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-md ring-1 backdrop-blur-sm",
                colorClassName,
                centered && "pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
                className
            )}
            style={style}
        >
            {label}
        </span>
    );
}
