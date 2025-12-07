"use client";
import { Variant } from "@/lib/services/variantService";
import { listVariantsPaged, createVariant, updateVariant, deleteVariant } from "../actions";
import { listProducts } from "@/app/admin/products/actions";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2, Eye } from "lucide-react";
import type { Product } from "@/lib/services/productService";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WarningDialog } from "@/components/ui/warning-dialog";
import { PaginationControls } from "./pagination-controls";
import { VariantDetailDialog } from "./variant-detail-dialog";
import { VariantFormDialog } from "./variant-form-dialog";

export function VariantsClient({ initial }: { initial: Variant[] }) {
    const toast = useToast();
    const [records, setRecords] = useState<Variant[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initial.length);
    const [search, setSearch] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Variant | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [viewId, setViewId] = useState<string | null>(null);
    const [warningMsg, setWarningMsg] = useState<string | null>(null);

    async function load(p = page, s = search) {
        setLoadingList(true);
        setError(null);
        try {
            const res = await listVariantsPaged({ page: p, pageSize, search: s });
            setRecords(res.rows);
            setTotal(res.total);
            setPage(res.page);
        } catch (e: any) {
            setError(e?.message || 'Failed to load variants');
        } finally {
            setLoadingList(false);
        }
    }

    // Effects
    useEffect(() => { load(1, search); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSize]);
    useEffect(() => { const t = setTimeout(() => { load(1, search); }, 350); return () => clearTimeout(t); }, [search]);
    useEffect(() => { (async () => { try { const p = await listProducts(); setProducts(p); } catch { } })(); }, []);

    // CRUD helpers passed to form dialog
    async function handleCreate(payload: any) {
        await createVariant(payload);
        await load(1, search);
    }
    async function handleUpdate(id: string, payload: any) {
        await updateVariant({ id, ...payload });
        await load(page, search);
        setEditing(null);
    }
    async function handleDelete(id: string) {
        const target = records.find(r => r.id === id);
        const imageUrl = (target as any)?.image_url as string | undefined;
        try {
            await deleteVariant({ id });
            toast.push({ variant: 'success', title: 'Variant deleted' });
            if (imageUrl) {
                fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: imageUrl }) }).catch(() => { });
            }
            await load(page, search);
        } catch (e: any) {
            toast.push({ variant: 'error', title: 'Delete failed', description: e?.message });
        } finally { setConfirmId(null); }
    }

    const isPending = loadingList;

    return (
        <div className="space-y-6">
            {/* Header / Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Variants</h2>
                    <div className="relative">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search title or SKU..."
                            className="h-8 rounded-md border bg-background px-2 text-sm w-56"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground"
                                type="button"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <select
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                        {[10, 20, 30, 50].map(sz => (
                            <option key={sz} value={sz}>{sz}/page</option>
                        ))}
                    </select>
                    <div className="text-xs text-muted-foreground">
                        {isPending
                            ? 'Loading…'
                            : total === 0
                                ? 'No results'
                                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
                    </div>
                </div>
                <Button
                    onClick={() => { setEditing(null); setFormOpen(true); }}
                >
                    Add Variant
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Variants</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted-foreground">
                                <th className="py-2">Image</th>
                                <th className="py-2">Title</th>
                                <th className="py-2">Product</th>
                                <th className="py-2">SKU</th>
                                <th className="py-2">Active</th>
                                <th className="py-2 w-px" />
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => {
                                const img = (r as any).image_url as string | null;
                                return (
                                    <tr key={r.id} className="border-t align-middle">
                                        <td className="py-2 pr-2">
                                            {img ? (
                                                <div className="w-10 h-10 rounded border overflow-hidden bg-muted">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={img} alt={r.title || r.sku || 'variant'} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded border flex items-center justify-center text-[10px] text-muted-foreground bg-muted">—</div>
                                            )}
                                        </td>
                                        <td className="py-2">{r.title || '-'}</td>
                                        <td className="py-2 text-xs">{products.find(p => p.id === r.product_id)?.name || '-'}</td>
                                        <td className="py-2 text-xs">{r.sku || '-'}</td>
                                        <td className="py-2 text-xs">{r.is_active ? 'Yes' : 'No'}</td>
                                        <td className="py-2 flex gap-1 justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label="View"
                                                onClick={() => setViewId(r.id)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Edit"
                                                onClick={() => { setEditing(r); setFormOpen(true); }}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Delete"
                                                onClick={() => setConfirmId(r.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    <PaginationControls
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        disabled={isPending}
                        onPageChange={(p) => { setPage(p); load(p, search); }}
                    />
                </CardContent>
            </Card>

            {/* Detail dialog */}
            <VariantDetailDialog id={viewId} onClose={() => setViewId(null)} />

            {/* Form dialog */}
            <VariantFormDialog
                open={formOpen}
                onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditing(null); } else setFormOpen(true); }}
                editing={editing}
                products={products}
                onSave={handleCreate}
                onUpdate={handleUpdate}
                isPending={isPending}
            />

            <ConfirmDialog
                open={!!confirmId}
                title="Delete Variant"
                description="This will remove the variant."
                confirmLabel="Delete"
                variant="danger"
                onCancel={() => setConfirmId(null)}
                onConfirm={() => confirmId && handleDelete(confirmId)}
            />
            <WarningDialog
                open={!!warningMsg}
                title="Image warning"
                description={warningMsg || undefined}
                onClose={() => setWarningMsg(null)}
            />
        </div>
    );
}

