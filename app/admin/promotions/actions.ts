'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { TablesInsert, TablesUpdate } from '@/lib/types/supabase';

// --- Promotions ---

export async function createPromotion(data: TablesInsert<'promotions'>) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('promotions').insert(data);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/admin/promotions');
    revalidatePath('/'); // Update home page cache
}

type PromotionBuilderPromotionInput = Pick<
    TablesInsert<'promotions'>,
    'slot_key' | 'type' | 'title' | 'description' | 'is_active' | 'start_at' | 'end_at' | 'metadata'
>;

type PromotionBuilderItemInput = Pick<
    TablesInsert<'promotion_items'>,
    'title' | 'subtitle' | 'body' | 'image_url' | 'mobile_image_url' | 'cta_label' | 'cta_url' | 'cta_target' | 'is_active' | 'sort_order' | 'metadata'
>;

export async function savePromotionFromBuilder(payload: {
    id?: string;
    promotion: PromotionBuilderPromotionInput;
    items: PromotionBuilderItemInput[];
}) {
    const supabase = await createAdminClient();

    let promotionId = payload.id;

    if (promotionId) {
        const { error: updateError } = await supabase
            .from('promotions')
            .update(payload.promotion)
            .eq('id', promotionId);

        if (updateError) {
            throw new Error(updateError.message);
        }

        const { error: cleanupError } = await supabase
            .from('promotion_items')
            .delete()
            .eq('promotion_id', promotionId);

        if (cleanupError) {
            throw new Error(cleanupError.message);
        }
    } else {
        const { data: created, error: createError } = await supabase
            .from('promotions')
            .insert(payload.promotion)
            .select('id')
            .single();

        if (createError || !created) {
            throw new Error(createError?.message || 'Failed to create promotion');
        }

        promotionId = created.id;
    }

    if (!promotionId) {
        throw new Error('Unable to resolve promotion id');
    }

    if (payload.items.length > 0) {
        const rows: TablesInsert<'promotion_items'>[] = payload.items.map((item, index) => ({
            promotion_id: promotionId!,
            title: item.title,
            subtitle: item.subtitle,
            body: item.body,
            image_url: item.image_url,
            mobile_image_url: item.mobile_image_url,
            cta_label: item.cta_label,
            cta_url: item.cta_url,
            cta_target: item.cta_target,
            is_active: item.is_active ?? true,
            sort_order: item.sort_order ?? index * 10,
            metadata: item.metadata ?? null,
        }));

        const { error: itemsError } = await supabase
            .from('promotion_items')
            .insert(rows);

        if (itemsError) {
            throw new Error(itemsError.message);
        }
    }

    revalidatePath('/admin/promotions');
    revalidatePath(`/admin/promotions/${promotionId}`);
    revalidatePath('/');

    return { id: promotionId };
}

export async function updatePromotion(id: string, data: TablesUpdate<'promotions'>) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('promotions').update(data).eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/admin/promotions');
    revalidatePath(`/admin/promotions/${id}`);
    revalidatePath('/');
}

export async function deletePromotion(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('promotions').delete().eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/admin/promotions');
    revalidatePath('/');
}

// --- Promotion Items ---

export async function createPromotionItem(data: TablesInsert<'promotion_items'>) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('promotion_items').insert(data);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath(`/admin/promotions/${data.promotion_id}`);
    revalidatePath('/');
}

export async function updatePromotionItem(id: string, promotionId: string, data: TablesUpdate<'promotion_items'>) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('promotion_items').update(data).eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath(`/admin/promotions/${promotionId}`);
    revalidatePath('/');
}

export async function deletePromotionItem(id: string, promotionId: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('promotion_items').delete().eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath(`/admin/promotions/${promotionId}`);
    revalidatePath('/');
}
// --- Storage ---

export async function uploadPromotionImage(formData: FormData) {
    const supabase = await createAdminClient();
    const file = formData.get('file') as File;

    if (!file) {
        throw new Error('No file provided');
    }

    const filename = `promo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    const { data, error } = await supabase.storage
        .from('products') // Using 'products' bucket as fallback/shared
        .upload(filename, file, {
            upsert: false,
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(data.path);

    return publicUrl;
}

export type PromotionLinkTargetScope = 'all' | 'categories' | 'products';

export type PromotionLinkTarget = {
    id: string;
    type: 'category' | 'product';
    title: string;
    subtitle: string | null;
    url: string;
};

export async function searchPromotionLinkTargets(params?: {
    query?: string;
    scope?: PromotionLinkTargetScope;
    limitPerType?: number;
}) {
    noStore();

    const supabase = await createAdminClient();
    const query = params?.query?.trim() || '';
    const scope = params?.scope || 'all';
    const limitPerType = Math.min(Math.max(params?.limitPerType || 6, 1), 20);

    const targets: PromotionLinkTarget[] = [];

    if (scope === 'all' || scope === 'categories') {
        let categoryQuery = supabase
            .from('categories')
            .select('id,name,slug,parent_id')
            .eq('is_active', true)
            .eq('is_deleted', false)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(limitPerType);

        if (query) {
            categoryQuery = categoryQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%`);
        }

        const { data: categories, error: categoryError } = await categoryQuery;
        if (categoryError) {
            throw new Error(categoryError.message);
        }

        for (const category of categories || []) {
            targets.push({
                id: category.id,
                type: 'category',
                title: category.name,
                subtitle: category.slug ? `/${category.slug}` : null,
                url: `/categories/${category.slug || category.id}`,
            });
        }
    }

    if (scope === 'all' || scope === 'products') {
        const productFetchLimit = Math.max(limitPerType * 3, limitPerType);
        let productQuery = supabase
            .from('products')
            .select('id,name,slug,brand,category_id')
            .eq('is_active', true)
            .eq('is_deleted', false)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(productFetchLimit);

        if (query) {
            productQuery = productQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%,brand.ilike.%${query}%`);
        }

        const { data: products, error: productError } = await productQuery;
        if (productError) {
            throw new Error(productError.message);
        }

        const productRows = products || [];
        const categoryIds = Array.from(
            new Set(
                productRows
                    .map((product) => product.category_id)
                    .filter((categoryId): categoryId is string => Boolean(categoryId))
            )
        );

        let activeCategorySet = new Set<string>();
        if (categoryIds.length > 0) {
            const { data: activeCategories, error: categoryStateError } = await supabase
                .from('categories')
                .select('id')
                .eq('is_active', true)
                .eq('is_deleted', false)
                .in('id', categoryIds);
            if (categoryStateError) {
                throw new Error(categoryStateError.message);
            }
            activeCategorySet = new Set((activeCategories || []).map((category) => category.id));
        }

        const visibleProducts = productRows
            .filter((product) => !product.category_id || activeCategorySet.has(product.category_id))
            .slice(0, limitPerType);

        for (const product of visibleProducts) {
            targets.push({
                id: product.id,
                type: 'product',
                title: product.name,
                subtitle: product.brand || (product.slug ? `/${product.slug}` : null),
                url: `/products/${product.slug || product.id}`,
            });
        }
    }

    return targets;
}
