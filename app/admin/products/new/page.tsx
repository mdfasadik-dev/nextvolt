import { listCategories } from "@/app/admin/categories/actions";
import { listAttributes } from "@/app/admin/attributes/actions";
import { createProduct } from "../actions";
import { ProductCreationClient } from '../_components/product-creation-client';

export const revalidate = 0;

export default async function NewProductPage() {
    const [categories, attributes] = await Promise.all([
        listCategories(),
        listAttributes(),
    ]);
    return <ProductCreationClient categories={categories} attributes={attributes} />;
}
