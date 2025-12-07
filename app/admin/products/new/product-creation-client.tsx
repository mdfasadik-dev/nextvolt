"use client";
import { useState, useMemo } from 'react';
import type { Category } from '@/lib/services/categoryService';
import type { Attribute } from '@/lib/services/attributeService';
import { ProductForm } from '../_components/product-form';
import type { ProductFormValues } from '../_components/useProductFormLogic';
import { createProduct } from '../actions';
import { useToast } from '@/components/ui/toast-provider';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Lazy-load any heavy editor libs later (placeholder simple editors for now)

interface ProductCreationClientProps { categories: Category[]; attributes: Attribute[]; }

export function ProductCreationClient({ categories, attributes }: ProductCreationClientProps) {
    const toast = useToast();
    const [previewData, setPreviewData] = useState<Partial<ProductFormValues>>({});
    const [isPending, setIsPending] = useState(false);

    async function handleCreate(payload: ProductFormValues) {
        setIsPending(true);
        try {
            await createProduct(payload as any);
            toast.push({ variant: 'success', title: 'Product created' });
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
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                    <CardContent>
                        <ProductForm
                            categories={categories}
                            attributes={attributes}
                            editing={null}
                            isPending={isPending}
                            onCreate={async (p) => { await handleCreate(p); setPreviewData(p); }}
                            onUpdate={() => { /* not used */ }}
                            onEditCancel={() => { /* not used */ }}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
                    <CardContent>
                        {previewData.name ? (
                            <div className="space-y-4 text-sm">
                                <div>
                                    <h2 className="text-lg font-semibold">{previewData.name}</h2>
                                    {previewData.brand && <p className="text-muted-foreground text-xs">Brand: {previewData.brand}</p>}
                                </div>
                                {previewData.description && <p>{previewData.description}</p>}
                                {previewData.details_md && (
                                    <div>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Markdown</p>
                                        <pre className="whitespace-pre-wrap text-xs bg-muted/50 p-2 rounded-md border max-h-64 overflow-auto">{previewData.details_md}</pre>
                                    </div>
                                )}
                            </div>
                        ) : <p className="text-xs text-muted-foreground">Fill out the form to see preview.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
