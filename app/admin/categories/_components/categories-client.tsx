"use client";
import { useCrud } from "@/lib/hooks/useCrud";
import type { Category } from "@/lib/services/categoryService";
import { CategoryForm } from "./category-form";
import { CategoryTable } from "./category-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { listCategories, createCategory, updateCategory, deleteCategory, listCategoriesPaged } from "../actions";
import { listAttributes } from "@/app/admin/attributes/actions";
import type { Attribute } from "@/lib/services/attributeService";
import { useState, useEffect } from "react";
import { fetchCategoryAttributes } from "../detail-actions";
import { useToast } from "@/components/ui/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';

interface Props { initial: Category[] }

export function CategoriesClient({ initial }: Props) {
    const toast = useToast();
    // Replace generic list with paged list management
    const [records, setRecords] = useState<Category[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState<number>(initial.length); // will be updated on first paged fetch
    const [search, setSearch] = useState("");
    const [loadingPage, setLoadingPage] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load(p = page, s = search) {
        setLoadingPage(true); setError(null);
        try {
            const res = await listCategoriesPaged({ page: p, pageSize, search: s });
            setRecords(res.rows); setTotal(res.total); setPage(res.page);
        } catch (e: any) { setError(e?.message || 'Failed to load categories'); }
        finally { setLoadingPage(false); }
    }

    useEffect(() => { load(1, search); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSize]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => { load(1, search); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    async function create(values: any) {
        try {
            await createCategory(values);
            await load(1, search);
        } catch (e: any) { throw e; }
    }
    async function update(values: any) {
        try { await updateCategory(values); await load(page, search); } catch (e: any) { throw e; }
    }
    async function remove(id: string) { try { await deleteCategory({ id }); await load(page, search); } catch (e: any) { throw e; } }
    const isPending = loadingPage; // reuse naming
    const [editing, setEditing] = useState<Category | null>(null);
    const [deleting, setDeleting] = useState<Set<string>>(new Set());
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [fkBlocked, setFkBlocked] = useState<{ categoryId: string; categoryName: string; productCount?: number } | null>(null);
    const [allAttributes, setAllAttributes] = useState<Attribute[]>([]);
    const [selectedAttrIds, setSelectedAttrIds] = useState<string[]>([]);
    const [attrToAdd, setAttrToAdd] = useState<string>("");

    // Load attributes once
    useEffect(() => { (async () => { try { const attrs = await listAttributes(); setAllAttributes(attrs); } catch { } })(); }, []);

    // When editing a category, fetch and set its attributes
    useEffect(() => {
        if (!editing) {
            setSelectedAttrIds([]);
        } else {
            fetchCategoryAttributes(editing.id).then(attrs => {
                setSelectedAttrIds(attrs.map((a: any) => a.id));
            });
        }
    }, [editing]);

    async function handleCreate(values: any) {
        try {
            const payload = { ...values, attributeIds: selectedAttrIds };
            if (editing) {
                await update({ ...payload, id: editing.id });
                toast.push({ variant: "success", title: "Category updated" });
                setEditing(null);
            } else {
                await create(payload as any);
                toast.push({ variant: "success", title: "Category created" });
            }
            setSelectedAttrIds([]);
        } catch (e: any) {
            toast.push({ variant: "error", title: "Save failed", description: e?.message });
        }
    }

    async function confirmDelete(id: string) {
        setConfirmId(id);
    }

    async function executeDelete(id: string) {
        setDeleting(prev => new Set(prev).add(id));
        const target = records.find(r => r.id === id);
        const imageUrl = (target as any)?.image_url as string | undefined;
        try {
            await remove(id);
            toast.push({ variant: "success", title: "Category deleted" });
            if (imageUrl) {
                fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: imageUrl }) }).catch(() => { });
            }
        } catch (e: any) {
            const code = e?.code;
            const message: string = e?.message || "Delete failed";
            const isFkProducts = code === "23503" && /products.*violates foreign key constraint|products_category_id_fkey/i.test(message);
            const isCustom = code === 'CATEGORY_HAS_PRODUCTS';
            if (isCustom || isFkProducts) {
                const category = records.find(r => r.id === id);
                setFkBlocked({ categoryId: id, categoryName: category?.name || "(unknown)", productCount: e?.productCount });
            } else {
                toast.push({ variant: "error", title: "Delete failed", description: message });
            }
        } finally {
            setDeleting(prev => { const n = new Set(prev); n.delete(id); return n; });
            setConfirmId(null);
        }
    }

    function FkBlockedModal() {
        return (
            <Dialog open={!!fkBlocked} onOpenChange={(o) => { if (!o) setFkBlocked(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cannot Delete Category</DialogTitle>
                        <button onClick={() => setFkBlocked(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                    </DialogHeader>
                    <DialogBody className="space-y-4 text-sm">
                        {fkBlocked && (
                            <>
                                <p><span className="font-medium">{fkBlocked.categoryName}</span> still has {fkBlocked.productCount != null ? <span className="font-semibold">{fkBlocked.productCount}</span> : 'one or more'} product(s) assigned. You must remove or reassign those products before deleting this category.</p>
                                <ol className="list-decimal ml-4 space-y-1 text-xs text-muted-foreground">
                                    <li>Go to Products.</li>
                                    <li>Filter / locate products using this category.</li>
                                    <li>Delete or edit each product to use a different category.</li>
                                    <li>Return here and delete the category again.</li>
                                </ol>
                                <div className="text-xs bg-muted/50 rounded-md p-2">Database error code 23503 (foreign key violation) prevented the delete to protect related products.</div>
                            </>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <a href="/admin/products" className="text-xs rounded-md border px-3 py-1 hover:bg-accent">View Products</a>
                        <button onClick={() => setFkBlocked(null)} className="text-xs rounded-md border px-3 py-1">Dismiss</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 self-start">
                <CardHeader>
                    <CardTitle>{editing ? "Edit Category" : "New Category"}</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm px-3 py-2">
                            {error}
                        </div>
                    )}
                    <CategoryForm
                        initial={editing || undefined}
                        parents={records}
                        onSubmit={handleCreate}
                        submitting={isPending}
                    />
                    {allAttributes.length > 0 && (
                        <div className="mt-6 space-y-2">
                            <div className="text-xs font-semibold">Attributes</div>
                            <div className="flex items-center gap-2">
                                <select className="h-8 rounded-md border bg-background px-2 text-xs" value={attrToAdd} onChange={e => setAttrToAdd(e.target.value)}>
                                    <option value="">Select attribute</option>
                                    {allAttributes.filter(a => !selectedAttrIds.includes(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <button type="button" disabled={!attrToAdd} className="text-xs rounded-md border px-2 py-1 disabled:opacity-50" onClick={() => { if (attrToAdd && !selectedAttrIds.includes(attrToAdd)) { setSelectedAttrIds(prev => [...prev, attrToAdd]); setAttrToAdd(""); } }}>Add</button>
                            </div>
                            {selectedAttrIds.length > 0 && (
                                <ul className="flex flex-wrap gap-2 text-[10px]">
                                    {selectedAttrIds.map(id => {
                                        const a = allAttributes.find(x => x.id === id)!;
                                        return <li key={id} className="flex items-center gap-1 rounded bg-muted px-2 py-1">{a.name}<button type="button" className="text-[9px]" onClick={() => setSelectedAttrIds(prev => prev.filter(x => x !== id))}>✕</button></li>;
                                    })}
                                </ul>
                            )}
                            <p className="text-[10px] text-muted-foreground">Selected attributes will be linked to this category.</p>
                        </div>
                    )}
                    {editing && (
                        <button
                            className="mt-3 text-xs underline text-muted-foreground"
                            onClick={() => setEditing(null)}
                        >Cancel edit</button>
                    )}
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>All Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search name or slug..."
                                    className="h-8 rounded-md border bg-background px-2 text-sm w-56"
                                />
                                {search && (
                                    <button onClick={() => setSearch("")} className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground">×</button>
                                )}
                            </div>
                            <select
                                value={pageSize}
                                onChange={e => setPageSize(Number(e.target.value))}
                                className="h-8 rounded-md border bg-background px-2 text-xs"
                            >
                                {[10, 20, 30, 50].map(sz => <option key={sz} value={sz}>{sz} / page</option>)}
                            </select>
                            <div className="text-xs text-muted-foreground">
                                {isPending ? 'Loading…' : total === 0 ? 'No results' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
                            </div>
                        </div>
                        <CategoryTable
                            data={records}
                            onEdit={setEditing}
                            onDelete={confirmDelete}
                            deletingIds={deleting}
                        />
                        <PaginationControls
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            disabled={isPending}
                            onPageChange={(p) => { setPage(p); load(p, search); }}
                        />
                    </div>
                </CardContent>
            </Card>
            <ConfirmDialog
                open={!!confirmId}
                title="Delete Category"
                description="This action cannot be undone. The category will be permanently removed."
                confirmLabel="Delete"
                variant="danger"
                onCancel={() => setConfirmId(null)}
                onConfirm={() => confirmId && executeDelete(confirmId)}
            />
            <FkBlockedModal />
        </div>
    );
}

// Simple pagination control component
function PaginationControls({ page, pageSize, total, disabled, onPageChange }: { page: number; pageSize: number; total: number; disabled?: boolean; onPageChange: (page: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;
    const canPrev = page > 1;
    const canNext = page < totalPages;
    const go = (p: number) => { if (!disabled && p >= 1 && p <= totalPages && p !== page) onPageChange(p); };
    // Generate a compact range (1, ..., surrounding pages, ..., last)
    const windowSize = 1; // pages adjacent to current
    const pages: (number | 'ellipsis')[] = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== 'ellipsis') {
            pages.push('ellipsis');
        }
    }
    return (
        <div className="flex items-center gap-2 justify-end flex-wrap">
            <button type="button" disabled={!canPrev || disabled} onClick={() => go(page - 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Prev</button>
            <ul className="flex items-center gap-1">
                {pages.map((p, idx) => p === 'ellipsis' ? (
                    <li key={idx} className="text-xs text-muted-foreground px-1">…</li>
                ) : (
                    <li key={p}>
                        <button
                            type="button"
                            onClick={() => go(p)}
                            aria-current={p === page ? 'page' : undefined}
                            className={`h-8 w-8 rounded-md text-xs border ${p === page ? 'bg-accent font-medium' : 'hover:bg-accent/60'}`}
                            disabled={disabled || p === page}
                        >{p}</button>
                    </li>
                ))}
            </ul>
            <button type="button" disabled={!canNext || disabled} onClick={() => go(page + 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Next</button>
        </div>
    );
}
