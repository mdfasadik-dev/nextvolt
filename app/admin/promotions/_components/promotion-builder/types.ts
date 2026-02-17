import type { Database, Json } from '@/lib/types/supabase';

export type PromotionType = Database['public']['Enums']['promotion_type'];

export type DraftItem = {
    id?: string;
    title: string;
    subtitle: string;
    body: string;
    image_url: string;
    mobile_image_url: string;
    cta_label: string;
    cta_url: string;
    cta_target: string;
    is_active: boolean;
    sort_order: number;
    metadata: Json | null;
};

export type PromotionTypeOption = {
    value: PromotionType;
    label: string;
    description: string;
    maxItems: number;
};

export type PendingUpload = {
    file: File;
    previewUrl: string;
};
