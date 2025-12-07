"use client";
import { useState } from 'react';
import type { Category } from '@/lib/services/categoryService';
import type { Attribute } from '@/lib/services/attributeService';
import { ProductForm } from './product-form';
import type { ProductFormValues } from './useProductFormLogic';
import { createProduct } from '../actions';
import { useToast } from '@/components/ui/toast-provider';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Markdown } from '@/components/markdown';

interface ProductCreationClientProps { categories: Category[]; attributes: Attribute[]; }

export function ProductCreationClient({ categories, attributes }: ProductCreationClientProps) {
    const toast = useToast();
    const [previewData, setPreviewData] = useState<Partial<ProductFormValues>>({});
    const [isPending, setIsPending] = useState(false);
    const [markdown, setMarkdown] = useState<string>('');
    const [showMdPreview, setShowMdPreview] = useState(false);

    async function handleCreate(payload: ProductFormValues) {
        setIsPending(true);
        try {
            await createProduct({ ...payload, details_md: markdown } as any);
            toast.push({ variant: 'success', title: 'Product created' });
            setPreviewData({ ...payload, details_md: markdown });
        } catch (e: any) {
            toast.push({ variant: 'error', title: 'Create failed', description: e?.message });
        } finally { setIsPending(false); }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Add Product</h1>
                <Link href="/admin/products" className="text-sm underline">Back to list</Link>
            </div>
            <Card>
                <CardHeader><CardTitle>Product Data</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <ProductForm
                        categories={categories}
                        attributes={attributes}
                        editing={null}
                        isPending={isPending}
                        onCreate={handleCreate}
                        onUpdate={() => { /* not used */ }}
                        onEditCancel={() => { /* not used */ }}
                        mode="externalDetails"
                        onValuesChange={(partial) => setPreviewData(prev => ({ ...prev, ...partial }))}
                        renderAfterDescription={(
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium">Details (Markdown)</label>
                                    <button type="button" onClick={() => setShowMdPreview(p => !p)} className="text-[10px] underline">
                                        {showMdPreview ? 'Edit' : 'See Preview'}
                                    </button>
                                </div>
                                {!showMdPreview ? (
                                    <MarkdownEditor value={markdown} onChange={(val) => { setMarkdown(val); setPreviewData(prev => ({ ...prev, details_md: val })); }} />
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
