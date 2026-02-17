import { createClient } from '@/lib/supabase/server';
import { CategoriesGrid } from './categories-grid';

async function fetchParentCategories() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('categories')
        .select('id,name,slug,image_url')
        .is('parent_id', null)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
    return data || [];
}

export async function CategoriesSection() {
    const categories = await fetchParentCategories();
    if (!categories.length) {
        return <p className="text-sm text-muted-foreground">No categories available.</p>;
    }
    return (
        <div className="w-full text-center">
            <header className="mb-6 flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Browse Categories</h2>
            </header>
            <CategoriesGrid categories={categories} />
        </div>
    );
}
