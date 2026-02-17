import type { Metadata } from "next";

const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const siteUrl = rawSiteUrl.endsWith("/") ? rawSiteUrl.slice(0, -1) : rawSiteUrl;

export const SEO_CONFIG = {
  siteUrl,
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "",
  defaultTitle: process.env.NEXT_PUBLIC_SITE_NAME || "",
  defaultDescription:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "",
  locale: "en_US",
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || undefined,
};

export function absoluteUrl(pathname = "/") {
  if (!pathname || pathname === "/") return SEO_CONFIG.siteUrl;
  return `${SEO_CONFIG.siteUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function buildPageMetadata(input: {
  title?: string;
  description?: string;
  pathname?: string;
  images?: string[];
  noIndex?: boolean;
}): Metadata {
  const title = input.title || SEO_CONFIG.defaultTitle;
  const description = input.description || SEO_CONFIG.defaultDescription;
  const canonical = absoluteUrl(input.pathname || "/");
  const images = (input.images && input.images.length > 0
    ? input.images
    : [absoluteUrl("/opengraph-image.png")]).map((img) =>
      img.startsWith("http") ? img : absoluteUrl(img)
    );

  const robots = input.noIndex
    ? {
      index: false,
      follow: false,
      nocache: true,
    }
    : {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large" as const,
        "max-snippet": -1,
      },
    };

  return {
    title,
    description,
    alternates: { canonical },
    robots,
    openGraph: {
      type: "website",
      siteName: SEO_CONFIG.siteName,
      locale: SEO_CONFIG.locale,
      title,
      description,
      url: canonical,
      images: images.map((url) => ({ url })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
      creator: SEO_CONFIG.twitterHandle,
    },
  };
}
