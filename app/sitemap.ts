import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  const [categoriesResponse, productsResponse, contentPagesResponse] = await Promise.all([
    supabase
      .from("categories")
      .select("id,slug,created_at,is_active,is_deleted")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id,slug,created_at,is_active,is_deleted,category_id")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("content_pages")
      .select("slug,created_at,is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const categories = categoriesResponse.data || [];
  const productsRaw = productsResponse.data || [];
  const contentPages = contentPagesResponse.data || [];

  const activeCategoryIdSet = new Set(categories.map((category) => category.id));
  const products = productsRaw.filter(
    (product) => !product.category_id || activeCategoryIdSet.has(product.category_id)
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/categories/${category.slug || category.id}`),
    lastModified: category.created_at ? new Date(category.created_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug || product.id}`),
    lastModified: product.created_at ? new Date(product.created_at) : new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const contentPageRoutes: MetadataRoute.Sitemap = contentPages.map((page) => ({
    url: absoluteUrl(`/${page.slug}`),
    lastModified: page.created_at ? new Date(page.created_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...contentPageRoutes];
}
