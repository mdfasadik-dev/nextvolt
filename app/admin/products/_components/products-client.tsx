"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Search, Star } from "lucide-react";
import type { ProductListItem } from "@/lib/services/productService";
import { listProductsPaged, deleteProduct, listProductBadgeMap, reorderProducts, listFeaturedProducts, reorderFeaturedProducts } from "../actions";
import { listCategoriesPaged } from "@/app/admin/categories/actions";
import { fetchProductDetail, ProductDetail } from "../detail-actions";
import { useToast } from "@/components/ui/toast-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductDetailModal } from "./product-detail-modal";
import { ProductTable } from "./product-table";
import { Button } from "@/components/ui/button";

type BadgeSummary = {
    id: string;
    product_id: string;
    label: string;
    color: string;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
};

type ViewMode = "category" | "featured";

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function moveItemWithPlacement<T>(items: T[], fromIndex: number, toIndex: number, placement: "before" | "after"): T[] {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex) {
        return items;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
        insertIndex = placement === "before" ? toIndex - 1 : toIndex;
    } else {
        insertIndex = placement === "before" ? toIndex : toIndex + 1;
    }
    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > next.length) insertIndex = next.length;
    next.splice(insertIndex, 0, moved);
    return next;
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
        <div className="relative w-64">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                className={`flex h-8 w-full items-center justify-between rounded-md border bg-background px-2 text-left text-xs ${disabled ? "opacity-60" : "hover:bg-accent/50"}`}
            >
                <span className="truncate">{valueId ? valueLabel : "All categories"}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {open ? (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
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
                            <div className="px-3 py-4 text-muted-foreground">No categories found.</div>
                        ) : (
                            options.map((option) => {
                                const active = option.id === valueId;
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

export function ProductsClient({ initialRows, initialTotal }: { initialRows: ProductListItem[]; initialTotal: number }) {
    const router = useRouter();
    const toast = useToast();

    const [records, setRecords] = useState<ProductListItem[]>(initialRows);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initialTotal);
    const [search, setSearch] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [badgeMap, setBadgeMap] = useState<Record<string, BadgeSummary>>({});

    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedCategoryName, setSelectedCategoryName] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("category");
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const [viewing, setViewing] = useState<ProductDetail | null>(null);
    const [loadingViewId, setLoadingViewId] = useState<string | null>(null);

    async function loadCategoryProducts(p = page, s = search, categoryId = selectedCategoryId) {
        setLoadingList(true);
        setError(null);
        try {
            const res = await listProductsPaged({ page: p, pageSize, search: s, categoryId: categoryId || undefined });
            setRecords(res.rows);
            setTotal(res.total);
            setPage(res.page);
            const ids = res.rows.map((row) => row.id);
            const nextBadgeMap = ids.length ? await listProductBadgeMap(ids) : {};
            setBadgeMap(nextBadgeMap as Record<string, BadgeSummary>);
        } catch (e: unknown) {
            setError(getErrorMessage(e, "Failed to load products"));
        } finally {
            setLoadingList(false);
        }
    }

    async function loadFeatured(p = page, s = search, categoryId = selectedCategoryId) {
        setLoadingList(true);
        setError(null);
        try {
            const res = await listFeaturedProducts({ page: p, pageSize, search: s, categoryId: categoryId || undefined });
            setRecords(res.rows);
            setTotal(res.total);
            setPage(res.page);
            const ids = res.rows.map((row) => row.id);
            const nextBadgeMap = ids.length ? await listProductBadgeMap(ids) : {};
            setBadgeMap(nextBadgeMap as Record<string, BadgeSummary>);
        } catch (e: unknown) {
            setError(getErrorMessage(e, "Failed to load featured products"));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        const ids = initialRows.map((item) => item.id);
        if (!ids.length) return;
        void listProductBadgeMap(ids).then((map) => setBadgeMap(map as Record<string, BadgeSummary>)).catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (viewMode === "featured") {
                void loadFeatured(1, search, selectedCategoryId);
                return;
            }
            void loadCategoryProducts(1, search, selectedCategoryId);
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, selectedCategoryId, viewMode, pageSize]);

    async function openView(id: string) {
        setLoadingViewId(id);
        try {
            const detail = await fetchProductDetail(id);
            if (detail) setViewing(detail);
        } finally {
            setLoadingViewId(null);
        }
    }

    function closeView() {
        setViewing(null);
    }

    async function executeDelete(id: string) {
        try {
            await deleteProduct({ id });
            toast.push({ variant: "success", title: "Product deleted" });
            if (viewMode === "featured") {
                await loadFeatured(page, search, selectedCategoryId);
            } else {
                await loadCategoryProducts(page, search, selectedCategoryId);
            }
        } catch (e: unknown) {
            toast.push({
                variant: "error",
                title: "Delete failed",
                description: getErrorMessage(e, "Unable to delete product"),
            });
        } finally {
            setConfirmId(null);
        }
    }

    function handleCategoryChange(option: CategoryFilterOption | null) {
        setSelectedCategoryId(option?.id || "");
        setSelectedCategoryName(option?.name || "");
        setPage(1);
    }

    function handleViewModeChange(nextMode: ViewMode) {
        if (nextMode === viewMode) return;
        setViewMode(nextMode);
        setPage(1);
        setError(null);
        if (nextMode === "featured") void loadFeatured(1, search, selectedCategoryId);
        else void loadCategoryProducts(1, search, selectedCategoryId);
    }

    async function handleCategoryReorder(dragId: string, targetId: string, placement: "before" | "after") {
        if (!selectedCategoryId || reordering) return;

        let previous: ProductListItem[] = [];
        let next: ProductListItem[] = [];
        const dragged = records.find((item) => item.id === dragId);
        const target = records.find((item) => item.id === targetId);
        if (!dragged || !target) return;
        if (dragged.category_id !== target.category_id) {
            toast.push({
                variant: "error",
                title: "Invalid reorder",
                description: "Drag and drop is only allowed within the same category.",
            });
            return;
        }
        const reorderCategoryId = dragged.category_id;
        setRecords((current) => {
            previous = current;
            const fromIndex = current.findIndex((item) => item.id === dragId);
            const toIndex = current.findIndex((item) => item.id === targetId);
            next = moveItemWithPlacement(current, fromIndex, toIndex, placement);
            return next;
        });

        if (next.length === 0 || next === previous) return;

        const previousSameCategory = previous.filter((item) => item.category_id === reorderCategoryId);
        const nextSameCategory = next.filter((item) => item.category_id === reorderCategoryId);
        const prevIds = previousSameCategory.map((item) => item.id).join("|");
        const nextIds = nextSameCategory.map((item) => item.id).join("|");
        if (!nextSameCategory.length || prevIds === nextIds) return;
        const startOrder = previousSameCategory.length
            ? Math.min(...previousSameCategory.map((item) => item.sort_order ?? 0))
            : 0;

        setReordering(true);
        try {
            await reorderProducts({
                categoryId: reorderCategoryId,
                orderedIds: nextSameCategory.map((item) => item.id),
                startOrder,
            });
        } catch (e: unknown) {
            setRecords(previous);
            toast.push({
                variant: "error",
                title: "Reorder failed",
                description: getErrorMessage(e, "Unable to update sort order"),
            });
        } finally {
            setReordering(false);
        }
    }

    async function handleFeaturedReorder(dragId: string, targetId: string, placement: "before" | "after") {
        if (reordering) return;

        let previous: ProductListItem[] = [];
        let next: ProductListItem[] = [];
        setRecords((current) => {
            previous = current;
            const fromIndex = current.findIndex((item) => item.id === dragId);
            const toIndex = current.findIndex((item) => item.id === targetId);
            next = moveItemWithPlacement(current, fromIndex, toIndex, placement);
            return next;
        });

        if (next.length === 0 || next === previous) return;
        const prevIds = previous.map((item) => item.id).join("|");
        const nextIds = next.map((item) => item.id).join("|");
        if (prevIds === nextIds) return;
        const startOrder = previous.length ? Math.min(...previous.map((item) => item.sort_order ?? 0)) : 0;

        setReordering(true);
        try {
            await reorderFeaturedProducts({
                orderedIds: next.map((item) => item.id),
                startOrder,
            });
        } catch (e: unknown) {
            setRecords(previous);
            toast.push({
                variant: "error",
                title: "Reorder failed",
                description: getErrorMessage(e, "Unable to update featured order"),
            });
        } finally {
            setReordering(false);
        }
    }

    const isFeaturedMode = viewMode === "featured";
    const isPending = loadingList || reordering;
    const reorderDisabled = isPending || !!search.trim() || (!isFeaturedMode && !selectedCategoryId);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                    <div className="inline-flex rounded-lg border bg-muted/30 p-1">
                        <button
                            type="button"
                            onClick={() => handleViewModeChange("category")}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${!isFeaturedMode ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Category Products
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewModeChange("featured")}
                            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${isFeaturedMode ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <Star className="h-3.5 w-3.5" />
                            Featured Products
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <CategoryFilterSelect
                            valueId={selectedCategoryId}
                            valueLabel={selectedCategoryName}
                            onChange={handleCategoryChange}
                            disabled={loadingList}
                        />
                        <div className="relative">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isFeaturedMode ? "Search featured products..." : "Search name, slug, brand..."}
                                className="h-8 w-64 rounded-md border bg-background px-2 text-sm"
                            />
                            {search ? (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    ×
                                </button>
                            ) : null}
                        </div>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="h-8 rounded-md border bg-background px-2 text-xs"
                        >
                            {[10, 20, 30, 50].map((sz) => (
                                <option key={sz} value={sz}>{sz}/page</option>
                            ))}
                        </select>
                        <div className="text-xs text-muted-foreground">
                            {isPending
                                ? "Loading..."
                                : total === 0
                                    ? "No results"
                                    : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
                        </div>
                    </div>

                    {search.trim() ? (
                        <div className="text-xs text-muted-foreground">Clear search to drag and reorder.</div>
                    ) : null}
                    {!isFeaturedMode && !selectedCategoryId ? (
                        <div className="text-xs text-muted-foreground">Select a category to enable drag and reorder.</div>
                    ) : null}
                    {isFeaturedMode ? (
                        <div className="text-xs text-muted-foreground">Drag and drop to control the Featured Products order shown on the public homepage. Use category filter to narrow results.</div>
                    ) : null}
                </div>

                <Button asChild>
                    <Link href="/admin/products/new">Add Product</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {isFeaturedMode
                            ? (selectedCategoryName ? `Featured Products: ${selectedCategoryName}` : "Featured Products")
                            : selectedCategoryName
                                ? `Products: ${selectedCategoryName}`
                                : "Products"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? <div className="mb-3 text-xs text-red-500">{error}</div> : null}
                    {records.length === 0 ? (
                        <div className="rounded-md border p-6 text-sm text-muted-foreground">
                            {isFeaturedMode
                                ? "No featured products found. Mark products as featured to manage their homepage order."
                                : "No products found for the selected filters."}
                        </div>
                    ) : (
                        <>
                            <ProductTable
                                records={records}
                                badgeMap={badgeMap}
                                loadingViewId={loadingViewId}
                                onEdit={(p) => router.push(`/admin/products/new?edit=${encodeURIComponent(p.id)}`)}
                                onDeleteRequest={(id) => setConfirmId(id)}
                                onView={openView}
                                onReorder={isFeaturedMode ? handleFeaturedReorder : handleCategoryReorder}
                                reorderDisabled={reorderDisabled}
                            />
                            <PaginationControls
                                page={page}
                                pageSize={pageSize}
                                total={total}
                                disabled={isPending}
                                onPageChange={(p) => {
                                    setPage(p);
                                    if (isFeaturedMode) {
                                        void loadFeatured(p, search, selectedCategoryId);
                                        return;
                                    }
                                    void loadCategoryProducts(p, search, selectedCategoryId);
                                }}
                            />
                        </>
                    )}
                    {viewing ? <ProductDetailModal detail={viewing} onClose={closeView} /> : null}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!confirmId}
                title="Delete Product"
                description="This will soft delete the product. It will no longer appear on the site."
                confirmLabel="Delete"
                variant="danger"
                onCancel={() => setConfirmId(null)}
                onConfirm={() => confirmId && executeDelete(confirmId)}
            />
        </div>
    );
}

function PaginationControls({ page, pageSize, total, disabled, onPageChange }: { page: number; pageSize: number; total: number; disabled?: boolean; onPageChange: (p: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;
    const canPrev = page > 1;
    const canNext = page < totalPages;
    const windowSize = 1;
    const pages: (number | "...")[] = [];

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== "...") {
            pages.push("...");
        }
    }

    const go = (p: number) => {
        if (!disabled && p >= 1 && p <= totalPages && p !== page) onPageChange(p);
    };

    return (
        <div className="mt-4 flex items-center justify-end gap-2">
            <button disabled={!canPrev || disabled} onClick={() => go(page - 1)} className="h-8 rounded-md border px-2 text-xs disabled:opacity-40">Prev</button>
            <ul className="flex items-center gap-1">
                {pages.map((p, i) => p === "..."
                    ? <li key={i} className="px-1 text-xs text-muted-foreground">...</li>
                    : <li key={p}><button disabled={disabled || p === page} onClick={() => go(p)} aria-current={p === page ? "page" : undefined} className={`h-8 w-8 rounded-md border text-xs ${p === page ? "bg-accent font-medium" : "hover:bg-accent/60"}`}>{p}</button></li>)
                }
            </ul>
            <button disabled={!canNext || disabled} onClick={() => go(page + 1)} className="h-8 rounded-md border px-2 text-xs disabled:opacity-40">Next</button>
        </div>
    );
}
