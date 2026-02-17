"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/services/categoryService';
import type { Attribute } from '@/lib/services/attributeService';
import type { ProductDetail } from '../detail-actions';
import { ProductForm } from './product-form';
import type { ProductFormValues } from './useProductFormLogic';
import { createProduct, updateProduct } from '../actions';
import { useToast } from '@/components/ui/toast-provider';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Markdown } from '@/components/markdown';

type FormLogicController = {
    setSelectedAttrIds: (value: string[] | ((prev: string[]) => string[])) => void;
    setAttributeValues: (
        value: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
    ) => void;
};

interface ProductCreationClientProps {
    categories: Category[];
    attributes: Attribute[];
    editingDetail?: ProductDetail | null;
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export function ProductCreationClient({ categories, attributes, editingDetail = null }: ProductCreationClientProps) {
    const router = useRouter();
    const toast = useToast();

    const isEditMode = !!editingDetail;
    const [isPending, setIsPending] = useState(false);
    const [markdown, setMarkdown] = useState<string>(editingDetail?.details_md || '');
    const [showMdPreview, setShowMdPreview] = useState(false);
    const formLogicRef = useRef<FormLogicController | null>(null);
    const appliedAttributesForIdRef = useRef<string | null>(null);

    function applyEditAttributes(logic: FormLogicController) {
        if (!editingDetail) return;
        if (appliedAttributesForIdRef.current === editingDetail.id) return;

        const attrIds = editingDetail.attributes.map((entry) => entry.attribute.id);
        const attrVals: Record<string, unknown> = {};
        editingDetail.attributes.forEach((entry) => {
            attrVals[entry.attribute.id] = entry.value;
        });

        // Mark first to avoid re-entry loops from successive renders.
        appliedAttributesForIdRef.current = editingDetail.id;
        logic.setSelectedAttrIds(attrIds);
        logic.setAttributeValues(attrVals);
    }

    useEffect(() => {
        setMarkdown(editingDetail?.details_md || '');
        setShowMdPreview(false);
        appliedAttributesForIdRef.current = null;

        if (formLogicRef.current) {
            applyEditAttributes(formLogicRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingDetail?.id]);

    async function handleCreate(payload: ProductFormValues) {
        setIsPending(true);
        try {
            await createProduct({ ...payload, details_md: markdown });
            toast.push({ variant: 'success', title: 'Product created' });
            router.push('/admin/products');
            router.refresh();
        } catch (e: unknown) {
            toast.push({ variant: 'error', title: 'Create failed', description: getErrorMessage(e, 'Unable to create product') });
        } finally {
            setIsPending(false);
        }
    }

    async function handleUpdate(id: string, payload: ProductFormValues) {
        setIsPending(true);
        try {
            await updateProduct({ id, ...payload, details_md: markdown });
            toast.push({ variant: 'success', title: 'Product updated' });
            router.push('/admin/products');
            router.refresh();
        } catch (e: unknown) {
            toast.push({ variant: 'error', title: 'Update failed', description: getErrorMessage(e, 'Unable to update product') });
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
                <Link href="/admin/products" className="text-sm underline">Back to list</Link>
            </div>

            <Card>
                <CardHeader><CardTitle>{isEditMode ? 'Update Product Data' : 'Product Data'}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <ProductForm
                        categories={categories}
                        attributes={attributes}
                        editing={editingDetail}
                        isPending={isPending}
                        onCreate={handleCreate}
                        onUpdate={handleUpdate}
                        onEditCancel={() => router.push('/admin/products')}
                        mode="externalDetails"
                        onLogic={(logic) => {
                            const controller = logic as unknown as FormLogicController;
                            formLogicRef.current = controller;
                            applyEditAttributes(controller);
                        }}
                        renderAfterDescription={(
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium">Details (Markdown)</label>
                                    <button type="button" onClick={() => setShowMdPreview((p) => !p)} className="text-[10px] underline">
                                        {showMdPreview ? 'Edit' : 'See Preview'}
                                    </button>
                                </div>
                                {!showMdPreview ? (
                                    <MarkdownEditor value={markdown} onChange={setMarkdown} />
                                ) : (
                                    <div className="border rounded-md p-3 bg-muted/30 max-h-[320px] overflow-auto">
                                        <Markdown content={markdown || '*No content*'} />
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
