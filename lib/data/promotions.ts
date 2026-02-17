import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/types/supabase';

export type PromotionWithItems = Tables<'promotions'> & {
    items: Tables<'promotion_items'>[];
};

function sortPromotionItems(promotion: PromotionWithItems) {
    if (!promotion.items) return;
    promotion.items.sort(
        (a: Tables<'promotion_items'>, b: Tables<'promotion_items'>) => a.sort_order - b.sort_order
    );
}

function isPromotionActiveNow(promotion: Tables<'promotions'>, nowMs: number) {
    if (promotion.start_at && new Date(promotion.start_at).getTime() > nowMs) return false;
    if (promotion.end_at && new Date(promotion.end_at).getTime() < nowMs) return false;
    return true;
}

export async function getActivePromotion(slotKey: string): Promise<PromotionWithItems | null> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('promotions')
        .select('*, items:promotion_items(*)')
        .eq('slot_key', slotKey)
        .eq('is_active', true)
        .or(`start_at.lte.${now},start_at.is.null`)
        .or(`end_at.gte.${now},end_at.is.null`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        // console.error(`Error fetching promotion for slot ${slotKey}:`, error);
        return null;
    }

    // Sort items by sort_order
    if (data) sortPromotionItems(data as PromotionWithItems);

    return data as PromotionWithItems;
}

export async function getActivePromotionsByType(
    type: Tables<'promotions'>['type'],
    limit = 10
): Promise<PromotionWithItems[]> {
    const supabase = await createClient();
    const nowMs = Date.now();

    const { data, error } = await supabase
        .from('promotions')
        .select('*, items:promotion_items(*)')
        .eq('type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error || !data) {
        return [];
    }

    const activePromotions = data
        .filter((promotion) => isPromotionActiveNow(promotion, nowMs))
        .slice(0, limit) as PromotionWithItems[];

    activePromotions.forEach((promotion) => sortPromotionItems(promotion));

    return activePromotions;
}

export async function getAllPromotions(page = 1, limit = 20) {
    const supabase = await createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
        .from('promotions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) throw error;

    return { data, count };
}

export async function getPromotionById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('promotions')
        .select('*, items:promotion_items(*)')
        .eq('id', id)
        .single();

    if (error) throw error;

    // Sort items
    if (data) sortPromotionItems(data as PromotionWithItems);

    return data as PromotionWithItems;
}
