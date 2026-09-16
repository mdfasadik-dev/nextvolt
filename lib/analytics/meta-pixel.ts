export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1818236446283906";

export const isMetaPixelEnabled = Boolean(META_PIXEL_ID);

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

export const pageview = () => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "PageView");
  }
};

export const event = (name: string, options: Record<string, unknown> = {}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", name, options);
  }
};

export const customEvent = (name: string, options: Record<string, unknown> = {}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("trackCustom", name, options);
  }
};

export interface MetaViewContentParams {
  content_ids: string[];
  content_name?: string;
  content_type?: string;
  value: number;
  currency?: string;
}

export const trackViewContent = ({
  content_ids,
  content_name,
  content_type = "product",
  value,
  currency = "BDT",
}: MetaViewContentParams) => {
  event("ViewContent", {
    content_ids,
    ...(content_name ? { content_name } : {}),
    content_type,
    value,
    currency,
  });
};

export interface MetaAddToCartParams {
  content_ids: string[];
  content_name?: string;
  content_type?: string;
  value: number;
  currency?: string;
}

export const trackAddToCart = ({
  content_ids,
  content_name,
  content_type = "product",
  value,
  currency = "BDT",
}: MetaAddToCartParams) => {
  event("AddToCart", {
    content_ids,
    ...(content_name ? { content_name } : {}),
    content_type,
    value,
    currency,
  });
};

export interface MetaInitiateCheckoutParams {
  content_ids: string[];
  content_type?: string;
  value: number;
  currency?: string;
  num_items?: number;
}

export const trackInitiateCheckout = ({
  content_ids,
  content_type = "product",
  value,
  currency = "BDT",
  num_items,
}: MetaInitiateCheckoutParams) => {
  event("InitiateCheckout", {
    content_ids,
    content_type,
    value,
    currency,
    ...(typeof num_items === "number" ? { num_items } : {}),
  });
};

export interface MetaPurchaseParams {
  content_ids: string[];
  content_type?: string;
  value: number;
  currency?: string;
  num_items?: number;
}

export const trackPurchase = ({
  content_ids,
  content_type = "product",
  value,
  currency = "BDT",
  num_items,
}: MetaPurchaseParams) => {
  event("Purchase", {
    content_ids,
    content_type,
    value,
    currency,
    ...(typeof num_items === "number" ? { num_items } : {}),
  });
};
