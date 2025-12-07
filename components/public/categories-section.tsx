import { createClient } from '@/lib/supabase/server';
import { CategoriesGrid } from './categories-grid';

async function fetchParentCategories() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('categories')
        .select('id,name,slug,image_url')
        .is('parent_id', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    return data || [];
}

export async function CategoriesSection() {
    const categories = await fetchParentCategories();
    if (!categories.length) {
        return <p className="text-sm text-muted-foreground">No categories available.</p>;
    }
    return (
        <div className="w-full">
            <header className="mb-6 flex flex-col gap-1">
                <h2 className="text-xl font-semibold tracking-tight">Browse Categories</h2>
            </header>
            <CategoriesGrid categories={categories} />
        </div>
    );
}
