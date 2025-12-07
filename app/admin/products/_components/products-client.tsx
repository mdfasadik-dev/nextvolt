"use client";
import type { Product } from "@/lib/services/productService";
import { listProductsPaged, createProduct, updateProduct, deleteProduct } from "../actions";
import { listCategories } from "@/app/admin/categories/actions";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Category } from "@/lib/services/categoryService";
import { listAttributes } from "@/app/admin/attributes/actions";
import type { Attribute } from "@/lib/services/attributeService";
import { fetchProductDetail, ProductDetail } from "../detail-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductForm } from "./product-form";
import type { ProductFormValues } from "./useProductFormLogic";
import { Markdown } from '@/components/markdown';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { ProductDetailModal } from "./product-detail-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { ProductTable } from "./product-table";
import { Button } from "@/components/ui/button";

export function ProductsClient({ initial }: { initial: Product[] }) {
    const toast = useToast();
    const [records, setRecords] = useState<Product[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initial.length);
    const [search, setSearch] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load(p = page, s = search) {
        setLoadingList(true); setError(null);
        try { const res = await listProductsPaged({ page: p, pageSize, search: s }); setRecords(res.rows); setTotal(res.total); setPage(res.page); }
        catch (e: any) { setError(e?.message || 'Failed to load products'); }
        finally { setLoadingList(false); }
    }
    useEffect(() => { load(1, search); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSize]);
    useEffect(() => { const t = setTimeout(() => { load(1, search); }, 350); return () => clearTimeout(t); }, [search]);

    async function create(values: any) { await createProduct(values); await load(1, search); }
    async function update(values: any) { await updateProduct(values); await load(page, search); }
    async function remove(id: string) { await deleteProduct({ id }); await load(page, search); }
    const isPending = loadingList;
    const [editing, setEditing] = useState<Product | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [allAttributes, setAllAttributes] = useState<Attribute[]>([]);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    useEffect(() => { (async () => { try { const list = await listCategories(); setCategories(list); } catch { } })(); }, []);
    useEffect(() => { (async () => { try { const attrs = await listAttributes(); setAllAttributes(attrs); } catch { } })(); }, []);


    // Ref to access form logic methods
    const formLogicRef = useRef<any>(null);

    // State and handlers for product detail modal and markdown preview
    const [viewing, setViewing] = useState<ProductDetail | null>(null);
    const [loadingViewId, setLoadingViewId] = useState<string | null>(null);
    const [markdown, setMarkdown] = useState("");
    const [showMdPreview, setShowMdPreview] = useState(false);

    async function openView(id: string) { setLoadingViewId(id); try { const detail = await fetchProductDetail(id); if (detail) setViewing(detail); } finally { setLoadingViewId(null); } }
    function closeView() { setViewing(null); }
    async function executeDelete(id: string) {
        const target = records.find(r => r.id === id);
        const imageUrl = (target as any)?.main_image_url as string | undefined;
        try {
            await remove(id);
            toast.push({ variant: "success", title: "Product deleted" });
            if (imageUrl) {
                fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: imageUrl }) }).catch(() => { });
            }
        } catch (e: any) {
            toast.push({ variant: "error", title: "Delete failed", description: e?.message });
        } finally { setConfirmId(null); }
    }

    // When editing changes, fetch and set attribute values
    useEffect(() => {
        if (editing) {
            fetchProductDetail(editing.id).then(detail => {
                if (detail && formLogicRef.current) {
                    const attrIds = detail.attributes.map(a => a.attribute.id);
                    const attrVals: Record<string, any> = {};
                    detail.attributes.forEach(a => { attrVals[a.attribute.id] = a.value; });
                    formLogicRef.current.setSelectedAttrIds(attrIds);
                    formLogicRef.current.setAttributeValues(attrVals);
                }
            });
        }
    }, [editing]);

    // keep markdown in sync when editing changes
    useEffect(() => { if (editing) setMarkdown((editing as any).details_md || ""); else setMarkdown(""); }, [editing]);

    async function handleCreate(payload: ProductFormValues) {
        try {
            await create({ ...payload, details_md: markdown } as any);
            toast.push({ variant: "success", title: "Product created" });
            setFormOpen(false);
            setMarkdown("");
            setShowMdPreview(false);
        } catch (err: any) {
            toast.push({ variant: "error", title: "Save failed", description: err?.message });
        }
    }
    async function handleUpdateWithMarkdown(id: string, payload: ProductFormValues) {
        try {
            await update({ id, ...payload, details_md: markdown } as any);
            toast.push({ variant: "success", title: "Product updated" });
            setEditing(null);
            setFormOpen(false);
            setMarkdown("");
            setShowMdPreview(false);
        } catch (err: any) {
            toast.push({ variant: "error", title: "Save failed", description: err?.message });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Products</h2>
                    <div className="relative">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, slug, brand..." className="h-8 rounded-md border bg-background px-2 text-sm w-64" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground">×</button>}
                    </div>
                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-xs">
                        {[10, 20, 30, 50].map(sz => <option key={sz} value={sz}>{sz}/page</option>)}
                    </select>
                    <div className="text-xs text-muted-foreground">{isPending ? 'Loading…' : total === 0 ? 'No results' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</div>
                </div>
                <Button onClick={() => { setEditing(null); setMarkdown(""); setFormOpen(true); }}>Add Product</Button>
            </div>
            {/* Inline edit form removed; unified modal used */}
            <Card>
                <CardHeader><CardTitle>All Products</CardTitle></CardHeader>
                <CardContent>
                    <ProductTable
                        records={records}
                        categories={categories}
                        loadingViewId={loadingViewId}
                        onEdit={p => { setEditing(p); setFormOpen(true); }}
                        onDeleteRequest={id => setConfirmId(id)}
                        onView={openView}
                    />
                    <PaginationControls page={page} pageSize={pageSize} total={total} disabled={isPending} onPageChange={(p) => { setPage(p); load(p, search); }} />
                    {viewing ? <ProductDetailModal detail={viewing!} onClose={closeView} /> : null}
                </CardContent>
            </Card>
            <ConfirmDialog open={!!confirmId} title="Delete Product" description="This will remove the product." confirmLabel="Delete" variant="danger" onCancel={() => setConfirmId(null)} onConfirm={() => confirmId && executeDelete(confirmId)} />
            <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditing(null); setMarkdown(""); setShowMdPreview(false); } }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
                        <button onClick={() => { setFormOpen(false); setEditing(null); }} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                    </DialogHeader>
                    <DialogBody className="max-h-[80vh] overflow-auto space-y-4">
                        {error && <div className="mb-2 text-xs text-red-500">{error}</div>}
                        <ProductForm
                            categories={categories}
                            attributes={allAttributes}
                            editing={editing}
                            isPending={isPending}
                            onCreate={handleCreate}
                            onUpdate={handleUpdateWithMarkdown}
                            onEditCancel={() => { setEditing(null); setFormOpen(false); }}
                            mode="externalDetails"
                            onLogic={logic => { formLogicRef.current = logic; }}
                            renderAfterDescription={(<div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium">Details (Markdown)</label>
                                    <button type="button" onClick={() => setShowMdPreview(p => !p)} className="text-[10px] underline">{showMdPreview ? 'Edit' : 'See Preview'}</button>
                                </div>
                                {!showMdPreview ? (
                                    <MarkdownEditor value={markdown} onChange={(v) => setMarkdown(v)} />
                                ) : (
                                    <div className="border rounded-md p-3 bg-muted/30 max-h-[320px] overflow-auto">
                                        <Markdown content={markdown || '*No content*'} />
                                    </div>
                                )}
                            </div>)}
                        />
                    </DialogBody>
                    <DialogFooter>
                        <button onClick={() => { setFormOpen(false); setEditing(null); }} className="text-xs rounded-md border px-3 py-1">Cancel</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PaginationControls({ page, pageSize, total, disabled, onPageChange }: { page: number; pageSize: number; total: number; disabled?: boolean; onPageChange: (p: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;
    const canPrev = page > 1; const canNext = page < totalPages;
    const windowSize = 1; const pages: (number | '…')[] = [];
    for (let i = 1; i <= totalPages; i++) { if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) pages.push(i); else if (pages[pages.length - 1] !== '…') pages.push('…'); }
    const go = (p: number) => { if (!disabled && p >= 1 && p <= totalPages && p !== page) onPageChange(p); };
    return <div className="flex items-center gap-2 justify-end mt-4">
        <button disabled={!canPrev || disabled} onClick={() => go(page - 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Prev</button>
        <ul className="flex items-center gap-1">{pages.map((p, i) => p === '…' ? <li key={i} className="px-1 text-xs text-muted-foreground">…</li> : <li key={p}><button disabled={disabled || p === page} onClick={() => go(p)} aria-current={p === page ? 'page' : undefined} className={`h-8 w-8 rounded-md text-xs border ${p === page ? 'bg-accent font-medium' : 'hover:bg-accent/60'}`}>{p}</button></li>)}</ul>
        <button disabled={!canNext || disabled} onClick={() => go(page + 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Next</button>
    </div>;
}
