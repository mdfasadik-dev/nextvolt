import { listCategories } from "@/app/admin/categories/actions";
import { listAttributes } from "@/app/admin/attributes/actions";
import { fetchProductDetail } from "../detail-actions";
import { ProductCreationClient } from '../_components/product-creation-client';

export const revalidate = 0;

interface NewProductPageProps {
    searchParams?: Promise<{ edit?: string | string[] }>;
}

export default async function NewProductPage({ searchParams }: NewProductPageProps) {
    const resolvedSearchParams = (await searchParams) ?? {};
    const editParam = resolvedSearchParams.edit;
    const editId = typeof editParam === 'string' ? editParam : undefined;

    const [categories, attributes] = await Promise.all([
        listCategories(),
        listAttributes(),
    ]);

    const editingDetail = editId ? await fetchProductDetail(editId).catch(() => null) : null;

    return (
        <ProductCreationClient
            categories={categories}
            attributes={attributes}
            editingDetail={editingDetail}
        />
    );
}
