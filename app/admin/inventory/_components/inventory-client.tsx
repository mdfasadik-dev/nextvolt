"use client";
import { InventoryJoined } from "@/lib/services/inventoryService";
import { listInventoryPaged, createInventory, updateInventory, deleteInventory } from "../actions";
import { listProducts } from "@/app/admin/products/actions";
import { listVariantsByProduct } from "@/app/admin/variants/actions";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2, Eye } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Product } from "@/lib/services/productService";
import { ProductCombobox, type ProductOption } from "@/components/ui/product-combobox";

export function InventoryClient({ initial }: { initial: InventoryJoined[] }) {
    const toast = useToast();
    const [records, setRecords] = useState<InventoryJoined[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initial.length);
    const [search, setSearch] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formPending, setFormPending] = useState(false);
    async function load(p = page, s = search) {
        setLoadingList(true); setError(null);
        try { const res = await listInventoryPaged({ page: p, pageSize, search: s }); setRecords(res.rows); setTotal(res.total); setPage(res.page); }
        catch (e: any) { setError(e?.message || 'Failed to load inventory'); }
        finally { setLoadingList(false); }
    }
    useEffect(() => { load(1, search); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSize]);
    useEffect(() => { const t = setTimeout(() => { load(1, search); }, 350); return () => clearTimeout(t); }, [search]);
    async function create(payload: any) { setFormPending(true); try { await createInventory(payload); toast.push({ variant: 'success', title: 'Inventory added' }); await load(1, search); } catch (e: any) { toast.push({ variant: 'error', title: 'Create failed', description: e?.message }); } finally { setFormPending(false); } }
    async function update(payload: any) { setFormPending(true); try { await updateInventory(payload); toast.push({ variant: 'success', title: 'Inventory updated' }); await load(page, search); } catch (e: any) { toast.push({ variant: 'error', title: 'Update failed', description: e?.message }); } finally { setFormPending(false); } }
    async function remove(id: string) { try { await deleteInventory({ id }); toast.push({ variant: 'success', title: 'Inventory deleted' }); await load(page, search); } catch (e: any) { toast.push({ variant: 'error', title: 'Delete failed', description: e?.message }); } }
    const isPending = loadingList || formPending;
    const [editing, setEditing] = useState<InventoryJoined | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [variants, setVariants] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
    // Controlled form state (ensures fields populate when editing)
    const [variantId, setVariantId] = useState<string>("");
    const [quantity, setQuantity] = useState<number>(0);
    const [unit, setUnit] = useState<string>('pcs');
    const [purchasePrice, setPurchasePrice] = useState<number>(0);
    const [salePrice, setSalePrice] = useState<number>(0);
    const [discountType, setDiscountType] = useState<string>('none');
    const [discountValue, setDiscountValue] = useState<string>(''); // keep as string to allow empty input
    useEffect(() => {
        (async () => {
            try {
                const p = await listProducts();
                setProducts(p);
            } catch { }
        })(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When switching into edit mode, ensure we load variants for the correct product (including variant-derived products)
    useEffect(() => {
        (async () => {
            if (!editing) {
                setSelectedProduct(null);
                setVariants([]);
                setVariantId("");
                setQuantity(0);
                setUnit('pcs');
                setPurchasePrice(0);
                setSalePrice(0);
                setDiscountType('none');
                setDiscountValue('');
                return;
            }
            const inferredProductId = editing.product_id || (editing as any).product?.id || (editing as any).variant?.product_id || null;
            if (inferredProductId) {
                const inferredName =
                    editing.product?.name ||
                    products.find(p => p.id === inferredProductId)?.name ||
                    editing.variant?.title ||
                    "Selected product";
                setSelectedProduct({ id: inferredProductId, name: inferredName });
                try {
                    const v = await listVariantsByProduct(inferredProductId);
                    setVariants(v);
                } catch {
                    setVariants([]);
                }
            } else {
                setSelectedProduct(null);
                setVariants([]);
            }
            setVariantId(editing.variant_id || "");
            setQuantity(editing.quantity ?? 0);
            setUnit(editing.unit || 'pcs');
            setPurchasePrice(editing.purchase_price ?? 0);
            setSalePrice(editing.sale_price ?? 0);
            setDiscountType(editing.discount_type || 'none');
            setDiscountValue(editing.discount_type === 'none' ? '' : (editing.discount_value != null ? String(editing.discount_value) : ''));
        })();
    }, [editing, products]);

    async function handleProductSelect(option: ProductOption | null) {
        setSelectedProduct(option);
        setVariantId("");
        if (!option) {
            setVariants([]);
            return;
        }
        try {
            const v = await listVariantsByProduct(option.id);
            setVariants(v);
        } catch {
            setVariants([]);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const discount_type = discountType || 'none';
        const rawDiscountValue = discountValue;
        // Always send product_id even if a variant is chosen so inventory row ties to both.
        if (!selectedProduct) {
            toast.push({ variant: 'error', title: 'Product required', description: 'Select a product before saving inventory.' });
            return;
        }
        const product_id = selectedProduct.id;
        const variant_id = variantId ? variantId : null;
        // Compute discount value respecting NOT NULL constraint (schema uses NOT NULL DEFAULT 0)
        let discount_value: number | null;
        if (discount_type === 'none') {
            discount_value = 0; // must not be null for NOT NULL column
        } else {
            discount_value = rawDiscountValue ? Number(rawDiscountValue) : 0;
            if (discount_type === 'percent' && (discount_value < 0 || discount_value > 100)) {
                toast.push({ variant: 'error', title: 'Invalid discount percent', description: 'Percent must be between 0 and 100.' });
                return;
            }
            if (discount_value < 0) {
                toast.push({ variant: 'error', title: 'Invalid discount value', description: 'Discount cannot be negative.' });
                return;
            }
        }
        const payload = { product_id, variant_id, quantity, purchase_price: purchasePrice, sale_price: salePrice, unit, discount_type, discount_value };
        try {
            if (editing) {
                await update({ id: editing.id, ...payload });
                setEditing(null);
            } else {
                await create(payload as any);
                setSelectedProduct(null);
                setVariantId("");
                setVariants([]);
                setQuantity(0);
                setUnit('pcs');
                setPurchasePrice(0);
                setSalePrice(0);
                setDiscountType('none');
                setDiscountValue('');
            }
            form.reset();
        } catch (e: any) {
            toast.push({ variant: "error", title: "Save failed", description: e?.message });
        }
    }
    async function executeDelete(id: string) { try { await remove(id); } finally { setConfirmId(null); } }

    const [viewing, setViewing] = useState<InventoryJoined | null>(null);
    function openView(r: InventoryJoined) { setViewing(r); }
    function closeView() { setViewing(null); }

    return <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 self-start"><CardHeader><CardTitle>{editing ? "Edit Inventory" : "Add Inventory"}</CardTitle></CardHeader><CardContent>{error && <div className="mb-4 text-xs text-red-500">{error}</div>}<form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
                <label className="text-xs">Product</label>
                <ProductCombobox
                    value={selectedProduct}
                    onChange={handleProductSelect}
                    disabled={isPending}
                />
                <input type="hidden" name="product_id" value={selectedProduct?.id ?? ""} />
            </div>
            {variants.length > 0 && <div className="space-y-1"><label className="text-xs">Variant</label><select name="variant_id" value={variantId} onChange={e => setVariantId(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm"><option value="">(none)</option>{variants.map(v => <option key={v.id} value={v.id}>{v.title || v.sku || 'Variant'}</option>)}</select></div>}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs">Quantity</label><Input name="quantity" type="number" min={0} value={quantity} onChange={e => setQuantity(Number(e.target.value))} required /></div>
                <div className="space-y-1"><label className="text-xs">Unit</label><Input name="unit" value={unit} onChange={e => setUnit(e.target.value)} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs">Purchase</label><Input name="purchase_price" type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(Number(e.target.value))} required /></div>
                <div className="space-y-1"><label className="text-xs">Sale</label><Input name="sale_price" type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs">Discount Type</label><select name="discount_type" value={discountType} onChange={e => { setDiscountType(e.target.value); if (e.target.value === 'none') setDiscountValue(''); }} className="w-full h-9 rounded-md border bg-background px-2 text-sm"><option value="none">None</option><option value="percent">Percent</option><option value="amount">Amount</option></select></div>
                <div className="space-y-1"><label className="text-xs">Discount Value</label><Input name="discount_value" type="number" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} disabled={discountType === 'none'} /></div>
            </div>
            <Button type="submit" disabled={isPending} className="w-full">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? (isPending ? "Updating" : "Update") : (isPending ? "Creating" : "Add")}</Button>
            {editing && <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setEditing(null)}>Cancel edit</button>}
        </form></CardContent></Card>
        <Card className="md:col-span-2">
            <CardHeader>
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <CardTitle>Inventory</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product / variant / unit" className="h-8 rounded-md border bg-background px-2 text-sm w-60" />
                            {search && <button onClick={() => setSearch("")} className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground" type="button">×</button>}
                        </div>
                        <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-xs">
                            {[10, 20, 30, 50].map(sz => <option key={sz} value={sz}>{sz}/page</option>)}
                        </select>
                        <div className="text-xs text-muted-foreground">{loadingList ? 'Loading…' : total === 0 ? 'No results' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent><table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-2">Product</th>
                        <th className="py-2">Variant</th>
                        <th className="py-2">Qty</th>
                        <th className="py-2">Purchase</th>
                        <th className="py-2">Sale</th>
                        <th className="py-2">Discount</th>
                        <th className="py-2">Updated</th>
                        <th className="py-2 w-px" /></tr>
                </thead>
                <tbody>{records.map(r => {
                    const discountSuffix = r.discount_type !== 'none' && r.discount_value ? `(${r.discount_value})` : '';
                    return <tr key={r.id} className="border-t">
                        <td className="py-2 text-xs">{r.product?.name || products.find(p => p.id === r.product_id)?.name || '-'}</td>
                        <td className="py-2 text-xs">{r.variant?.title || r.variant?.sku || '-'}</td>
                        <td className="py-2 text-xs">{r.quantity}</td>
                        <td className="py-2 text-xs">{r.purchase_price}</td>
                        <td className="py-2 text-xs">{r.sale_price}</td>
                        <td className="py-2 text-xs">{r.discount_type}{discountSuffix}</td>
                        <td className="py-2 text-xs">{new Date(r.updated_at).toLocaleDateString()}</td>
                        <td className="py-2 flex gap-1 justify-end">
                            <Button type="button" variant="ghost" size="icon" aria-label="View" onClick={() => openView(r)}><Eye className="w-4 h-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(r)}>
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Delete" onClick={() => setConfirmId(r.id)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </td>
                    </tr>
                })}
                </tbody>
            </table>
                <PaginationControls page={page} pageSize={pageSize} total={total} disabled={loadingList} onPageChange={(p) => { setPage(p); load(p, search); }} />
                <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) closeView(); }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Inventory Detail</DialogTitle>
                            <button onClick={closeView} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                        </DialogHeader>
                        <div className="py-4 space-y-4 text-sm">
                            {viewing && (
                                <>
                                    <div>
                                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">REFERENCE</h3>
                                        <dl className="grid grid-cols-3 gap-y-1 text-xs">
                                            <dt className="font-medium">Product</dt><dd className="col-span-2 break-words">{viewing.product?.name || '-'}</dd>
                                            <dt className="font-medium">Variant</dt><dd className="col-span-2 break-words">{viewing.variant?.title || viewing.variant?.sku || '—'}</dd>
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">STOCK & PRICING</h3>
                                        <dl className="grid grid-cols-3 gap-y-1 text-xs">
                                            <dt className="font-medium">Quantity</dt><dd className="col-span-2">{viewing.quantity} {viewing.unit}</dd>
                                            <dt className="font-medium">Purchase</dt><dd className="col-span-2">{viewing.purchase_price}</dd>
                                            <dt className="font-medium">Sale</dt><dd className="col-span-2">{viewing.sale_price}</dd>
                                            <dt className="font-medium">Discount</dt><dd className="col-span-2">{viewing.discount_type === 'none' ? '—' : `${viewing.discount_type} ${viewing.discount_value ?? ''}`}</dd>
                                            <dt className="font-medium">Updated</dt><dd className="col-span-2">{new Date(viewing.updated_at).toLocaleString()}</dd>
                                        </dl>
                                    </div>
                                </>
                            )}
                        </div>
                        <DialogFooter>
                            <button onClick={closeView} className="text-xs rounded-md border px-3 py-1">Close</button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
        <ConfirmDialog open={!!confirmId} title="Delete Inventory" description="This will remove the inventory record." confirmLabel="Delete" variant="danger" onCancel={() => setConfirmId(null)} onConfirm={() => confirmId && executeDelete(confirmId)} />
    </div>;
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
