export const PRODUCT_BADGE_COLOR_OPTIONS = [
    { value: "slate", label: "Slate", className: "bg-slate-700 text-white ring-slate-500/40" },
    { value: "gray", label: "Gray", className: "bg-gray-700 text-white ring-gray-500/40" },
    { value: "red", label: "Red", className: "bg-red-600 text-white ring-red-500/40" },
    { value: "orange", label: "Orange", className: "bg-orange-600 text-white ring-orange-500/40" },
    { value: "amber", label: "Amber", className: "bg-amber-500 text-black ring-amber-400/40" },
    { value: "yellow", label: "Yellow", className: "bg-yellow-400 text-black ring-yellow-300/40" },
    { value: "green", label: "Green", className: "bg-green-600 text-white ring-green-500/40" },
    { value: "emerald", label: "Emerald", className: "bg-emerald-600 text-white ring-emerald-500/40" },
    { value: "teal", label: "Teal", className: "bg-teal-600 text-white ring-teal-500/40" },
    { value: "cyan", label: "Cyan", className: "bg-cyan-600 text-white ring-cyan-500/40" },
    { value: "blue", label: "Blue", className: "bg-blue-600 text-white ring-blue-500/40" },
    { value: "indigo", label: "Indigo", className: "bg-indigo-600 text-white ring-indigo-500/40" },
    { value: "pink", label: "Pink", className: "bg-pink-600 text-white ring-pink-500/40" },
    { value: "rose", label: "Rose", className: "bg-rose-600 text-white ring-rose-500/40" },
] as const;

export type ProductBadgeColor = (typeof PRODUCT_BADGE_COLOR_OPTIONS)[number]["value"] | (string & {});

export const DEFAULT_PRODUCT_BADGE_COLOR: ProductBadgeColor = "red";

const PRODUCT_BADGE_COLOR_SET = new Set<string>(
    PRODUCT_BADGE_COLOR_OPTIONS.map((option) => option.value)
);

export function isProductBadgeColor(value: string): value is ProductBadgeColor {
    return PRODUCT_BADGE_COLOR_SET.has(value);
}

export function getProductBadgeColorClassName(color: string | null | undefined): string {
    const resolved = PRODUCT_BADGE_COLOR_OPTIONS.find((option) => option.value === color);
    return (resolved || PRODUCT_BADGE_COLOR_OPTIONS.find((option) => option.value === DEFAULT_PRODUCT_BADGE_COLOR))!.className;
}

export type ProductBadgeLike = {
    is_active?: boolean | null;
    starts_at?: string | null;
    ends_at?: string | null;
};

export function isProductBadgeVisibleAt(
    badge: ProductBadgeLike | null | undefined,
    at = new Date()
): boolean {
    if (!badge) return false;
    if (badge.is_active === false) return false;

    const atTs = at.getTime();
    const startTs = badge.starts_at ? new Date(badge.starts_at).getTime() : null;
    const endTs = badge.ends_at ? new Date(badge.ends_at).getTime() : null;

    if (startTs != null && Number.isFinite(startTs) && startTs > atTs) return false;
    if (endTs != null && Number.isFinite(endTs) && endTs < atTs) return false;
    return true;
}

