"use client";
import { InventoryJoined } from "@/lib/services/inventoryService";
import { listInventoryPaged, createInventory, updateInventory, deleteInventory } from "../actions";
import { listProducts } from "@/app/admin/products/actions";
import { listVariantsByProduct } from "@/app/admin/variants/actions";
import { listCategoriesPaged } from "@/app/admin/categories/actions";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2, Eye, Search, ChevronsUpDown, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Product } from "@/lib/services/productService";
import { ProductCombobox, type ProductOption } from "@/components/ui/product-combobox";

const LOW_STOCK_THRESHOLD = 5;

function getStockStatus(quantity: number) {
    if (quantity <= 0) {
        return { label: "Out of Stock", className: "bg-red-100 text-red-700 border-red-200" };
    }
    if (quantity <= LOW_STOCK_THRESHOLD) {
        return { label: "Low Stock", className: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    return { label: "In Stock", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

function formatMoney(value: number | null | undefined) {
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
    return `${symbol}${Number(value ?? 0).toFixed(2)}`;
}

function getInventoryType(variantId: string | null | undefined) {
    if (variantId) {
        return { label: "Variant", className: "bg-sky-100 text-sky-700 border-sky-200" };
    }
    return { label: "Base", className: "bg-slate-100 text-slate-700 border-slate-200" };
}

function getDiscountDisplay(discountType: string | null | undefined, discountValue: number | null | undefined) {
    const type = (discountType || "none").toLowerCase();
    const value = Number(discountValue ?? 0);

    if (type === "none" || value <= 0) {
        return { label: "No Discount", className: "bg-muted text-muted-foreground border-border" };
    }
    if (type === "percent") {
        return { label: `${value}% Off`, className: "bg-blue-100 text-blue-700 border-blue-200" };
    }
    if (type === "amount") {
        return { label: `${formatMoney(value)} Off`, className: "bg-violet-100 text-violet-700 border-violet-200" };
    }
    return { label: `${type} (${value})`, className: "bg-muted text-muted-foreground border-border" };
}

type CategoryFilterOption = { id: string; name: string };

interface CategoryFilterSelectProps {
    valueId: string;
    valueLabel: string;
    onChange: (option: CategoryFilterOption | null) => void;
    disabled?: boolean;
}

function CategoryFilterSelect({ valueId, valueLabel, onChange, disabled = false }: CategoryFilterSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState<CategoryFilterOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            setLoading(true);
            listCategoriesPaged({ page: 1, pageSize: 12, search: query.trim() || undefined })
                .then((res) => {
                    if (cancelled) return;
                    setOptions((res.rows || []).map((row) => ({ id: row.id, name: row.name })));
                })
                .catch(() => {
                    if (cancelled) return;
                    setOptions([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [open, query]);

    useEffect(() => {
        if (!open) setQuery("");
    }, [open]);

    return (
        <div className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                className={`flex h-8 min-w-52 items-center justify-between rounded-md border bg-background px-2 text-left text-xs ${disabled ? "opacity-60" : "hover:bg-accent/50"}`}
            >
                <span className="truncate">{valueId ? valueLabel : "All categories"}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {open ? (
                <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover shadow-lg">
                    <div className="flex items-center gap-2 border-b px-2 py-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search categories..."
                            className="h-7 w-full border-none bg-transparent text-xs outline-none"
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                onChange(null);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent ${!valueId ? "bg-accent/80" : ""}`}
                        >
                            <span>All</span>
                            {!valueId ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                        {loading ? (
                            <div className="px-3 py-2 text-muted-foreground">Loading...</div>
                        ) : options.length === 0 ? (
                            <div className="px-3 py-2 text-muted-foreground">No categories found.</div>
                        ) : (
                            options.map((option) => {
                                const active = valueId === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(option);
                                            setOpen(false);
                                        }}
                                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent ${active ? "bg-accent/80" : ""}`}
                                    >
                                        <span className="truncate">{option.name}</span>
                                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function InventoryClient({ initial }: { initial: InventoryJoined[] }) {
    const toast = useToast();
    const [records, setRecords] = useState<InventoryJoined[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initial.length);
    const [search, setSearch] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedCategoryName, setSelectedCategoryName] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formPending, setFormPending] = useState(false);
    async function load(p = page, s = search, categoryId = selectedCategoryId) {
        setLoadingList(true); setError(null);
        try { const res = await listInventoryPaged({ page: p, pageSize, search: s, categoryId: categoryId || undefined }); setRecords(res.rows); setTotal(res.total); setPage(res.page); }
        catch (e: any) { setError(e?.message || 'Failed to load inventory'); }
        finally { setLoadingList(false); }
    }
    useEffect(() => { load(1, search, selectedCategoryId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSize]);
    useEffect(() => { const t = setTimeout(() => { load(1, search, selectedCategoryId); }, 350); return () => clearTimeout(t); }, [search, selectedCategoryId]);
    async function create(payload: any) { setFormPending(true); try { await createInventory(payload); toast.push({ variant: 'success', title: 'Inventory added' }); await load(1, search, selectedCategoryId); } catch (e: any) { toast.push({ variant: 'error', title: 'Create failed', description: e?.message }); } finally { setFormPending(false); } }
    async function update(payload: any) { setFormPending(true); try { await updateInventory(payload); toast.push({ variant: 'success', title: 'Inventory updated' }); await load(page, search, selectedCategoryId); } catch (e: any) { toast.push({ variant: 'error', title: 'Update failed', description: e?.message }); } finally { setFormPending(false); } }
    async function remove(id: string) { try { await deleteInventory({ id }); toast.push({ variant: 'success', title: 'Inventory deleted' }); await load(page, search, selectedCategoryId); } catch (e: any) { toast.push({ variant: 'error', title: 'Delete failed', description: e?.message }); } }
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
    const viewingStatus = viewing ? getStockStatus(viewing.quantity ?? 0) : null;

    function handleCategoryFilterChange(option: CategoryFilterOption | null) {
        setSelectedCategoryId(option?.id || "");
        setSelectedCategoryName(option?.name || "");
        setPage(1);
    }

    return <div className="space-y-6">
        <Card><CardHeader><CardTitle>{editing ? "Edit Inventory" : "Add Inventory"}</CardTitle></CardHeader><CardContent>{error && <div className="mb-4 text-xs text-red-500">{error}</div>}<form onSubmit={handleSubmit} className="space-y-3">
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
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <CardTitle>Inventory</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product / variant / unit" className="h-8 rounded-md border bg-background px-2 text-sm w-60" />
                            {search && <button onClick={() => setSearch("")} className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground" type="button">×</button>}
                        </div>
                        <CategoryFilterSelect
                            valueId={selectedCategoryId}
                            valueLabel={selectedCategoryName}
                            onChange={handleCategoryFilterChange}
                            disabled={loadingList}
                        />
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
                        {/* <th className="py-2">Type</th> */}
                        <th className="py-2">Qty</th>
                        <th className="py-2">Status</th>
                        {/* <th className="py-2">Purchase</th> */}
                        <th className="py-2">Sale</th>
                        <th className="py-2">Discount</th>
                        {/* <th className="py-2">Updated</th> */}
                        <th className="py-2 w-px" /></tr>
                </thead>
                <tbody>{records.map(r => {
                    const inventoryType = getInventoryType(r.variant_id);
                    const discountDisplay = getDiscountDisplay(r.discount_type, r.discount_value);
                    const stockStatus = getStockStatus(r.quantity ?? 0);
                    return <tr key={r.id} className="border-t">
                        <td className="py-2 text-xs">{r.product?.name || products.find(p => p.id === r.product_id)?.name || '-'}</td>
                        <td className="py-2 text-xs">{r.variant?.title || r.variant?.sku || '-'}</td>
                        {/* <td className="py-2 text-xs">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${inventoryType.className}`}>
                                {inventoryType.label}
                            </span>
                        </td> */}
                        <td className="py-2 text-xs">{r.quantity} {r.unit || "pcs"}</td>
                        <td className="py-2 text-xs">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${stockStatus.className}`}>
                                {stockStatus.label}
                            </span>
                        </td>
                        {/* <td className="py-2 text-xs font-medium">{formatMoney(r.purchase_price)}</td> */}
                        <td className="py-2 text-xs font-medium">{formatMoney(r.sale_price)}</td>
                        <td className="py-2 text-xs">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${discountDisplay.className}`}>
                                {discountDisplay.label}
                            </span>
                        </td>
                        {/* <td className="py-2 text-xs">{new Date(r.updated_at).toLocaleDateString()}</td> */}
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
                <PaginationControls page={page} pageSize={pageSize} total={total} disabled={loadingList} onPageChange={(p) => { setPage(p); load(p, search, selectedCategoryId); }} />
                <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) closeView(); }}>
                    <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-2xl flex-col overflow-hidden">
                        <DialogHeader className="border-b pb-3">
                            <DialogTitle className="text-base">Inventory Detail</DialogTitle>
                        </DialogHeader>
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1 text-sm">
                            {viewing && (
                                <>
                                    <div className="rounded-lg border bg-muted/20 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">Product</p>
                                                <p className="text-sm font-semibold">{viewing.product?.name || '-'}</p>
                                                <p className="text-xs text-muted-foreground">Variant: {viewing.variant?.title || viewing.variant?.sku || '—'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {viewingStatus ? (
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${viewingStatus.className}`}>
                                                        {viewingStatus.label}
                                                    </span>
                                                ) : null}
                                                <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">
                                                    Qty: {viewing.quantity ?? 0} {viewing.unit || "pcs"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-lg border p-4">
                                            <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">STOCK</h3>
                                            <dl className="grid grid-cols-2 gap-y-2 text-xs">
                                                <dt className="font-medium text-muted-foreground">Quantity</dt>
                                                <dd className="text-right font-medium">{viewing.quantity ?? 0}</dd>
                                                <dt className="font-medium text-muted-foreground">Unit</dt>
                                                <dd className="text-right">{viewing.unit || "pcs"}</dd>
                                                <dt className="font-medium text-muted-foreground">Updated</dt>
                                                <dd className="text-right">{new Date(viewing.updated_at).toLocaleString()}</dd>
                                            </dl>
                                        </div>

                                        <div className="rounded-lg border p-4">
                                            <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">PRICING</h3>
                                            <dl className="grid grid-cols-2 gap-y-2 text-xs">
                                                <dt className="font-medium text-muted-foreground">Purchase</dt>
                                                <dd className="text-right font-medium">{formatMoney(viewing.purchase_price)}</dd>
                                                <dt className="font-medium text-muted-foreground">Sale</dt>
                                                <dd className="text-right font-medium">{formatMoney(viewing.sale_price)}</dd>
                                                <dt className="font-medium text-muted-foreground">Discount</dt>
                                                <dd className="text-right">
                                                    {viewing.discount_type === 'none'
                                                        ? '—'
                                                        : `${viewing.discount_type}${viewing.discount_value != null ? ` (${viewing.discount_value})` : ''}`}
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <DialogFooter className="border-t pt-3">
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
