"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import type { Product } from "@/lib/services/productService";
import { listProductsPaged, deleteProduct, listProductBadgeMap, reorderProducts } from "../actions";
import { listCategories } from "@/app/admin/categories/actions";
import type { Category } from "@/lib/services/categoryService";
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

function collectDescendantCategoryIds(categories: Category[], rootId: string): string[] {
    if (!rootId) return [];
    const childrenByParent = new Map<string, string[]>();
    for (const category of categories) {
        if (!category.parent_id) continue;
        const next = childrenByParent.get(category.parent_id) || [];
        next.push(category.id);
        childrenByParent.set(category.parent_id, next);
    }

    const collected: string[] = [];
    const queue = [rootId];
    const seen = new Set<string>();

    while (queue.length) {
        const current = queue.shift();
        if (!current || seen.has(current)) continue;
        seen.add(current);
        collected.push(current);
        const children = childrenByParent.get(current) || [];
        for (const childId of children) queue.push(childId);
    }

    return collected;
}

interface CategorySelectProps {
    categories: Category[];
    value: string;
    onChange: (id: string) => void;
    disabled?: boolean;
    loading?: boolean;
}

function CategorySelect({ categories, value, onChange, disabled = false, loading = false }: CategorySelectProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const selected = categories.find((category) => category.id === value) || null;

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return categories;
        return categories.filter((category) => {
            const name = category.name.toLowerCase();
            const slug = (category.slug || "").toLowerCase();
            return name.includes(keyword) || slug.includes(keyword);
        });
    }, [categories, query]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery("");
        }
    }, [open]);

    return (
        <div ref={containerRef} className="relative w-64">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                className={`flex h-8 w-full items-center justify-between rounded-md border bg-background px-2 text-left text-xs ${disabled ? "opacity-60" : "hover:bg-accent/50"}`}
            >
                <span className="truncate">{selected?.name || "Select category"}</span>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
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
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-muted-foreground">No categories found.</div>
                        ) : (
                            filtered.map((category) => {
                                const active = category.id === value;
                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(category.id);
                                            setOpen(false);
                                        }}
                                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent ${active ? "bg-accent/80" : ""}`}
                                    >
                                        <span className="truncate">{category.name}</span>
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

export function ProductsClient({ initial }: { initial: Product[] }) {
    const router = useRouter();
    const toast = useToast();

    const [records, setRecords] = useState<Product[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initial.length);
    const [search, setSearch] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [badgeMap, setBadgeMap] = useState<Record<string, BadgeSummary>>({});

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const [viewing, setViewing] = useState<ProductDetail | null>(null);
    const [loadingViewId, setLoadingViewId] = useState<string | null>(null);

    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === selectedCategoryId) || null,
        [categories, selectedCategoryId]
    );

    const categoryScopeIds = useMemo(
        () => collectDescendantCategoryIds(categories, selectedCategoryId),
        [categories, selectedCategoryId]
    );

    async function load(p = page, s = search, scopedCategoryIds = categoryScopeIds) {
        if (!scopedCategoryIds.length) {
            setRecords([]);
            setTotal(0);
            setPage(1);
            setBadgeMap({});
            setCategoryLoading(false);
            return;
        }

        setLoadingList(true);
        setError(null);
        try {
            const res = await listProductsPaged({ page: p, pageSize, search: s, categoryIds: scopedCategoryIds });
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
            setCategoryLoading(false);
        }
    }

    useEffect(() => {
        void (async () => {
            try {
                const list = await listCategories();
                setCategories(list);
                if (list.length) {
                    setCategoryLoading(true);
                    setSelectedCategoryId((prev) => prev || list[0].id);
                } else {
                    setRecords([]);
                    setTotal(0);
                }
            } catch {
                setError("Failed to load categories");
            }
        })();
    }, []);

    useEffect(() => {
        if (!selectedCategoryId) return;
        void load(1, search, categoryScopeIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategoryId, pageSize, categoryScopeIds]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!selectedCategoryId) return;
            void load(1, search, categoryScopeIds);
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, categoryScopeIds, selectedCategoryId]);

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
            await load(page, search, categoryScopeIds);
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

    function handleCategoryChange(nextCategoryId: string) {
        if (nextCategoryId === selectedCategoryId) return;
        setCategoryLoading(true);
        setSelectedCategoryId(nextCategoryId);
        setPage(1);
    }

    async function handleReorder(dragId: string, targetId: string, placement: "before" | "after") {
        if (!selectedCategoryId || reordering) return;

        let previous: Product[] = [];
        let next: Product[] = [];
        const dragged = records.find((item) => item.id === dragId);
        const target = records.find((item) => item.id === targetId);
        if (!dragged || !target) return;
        if (dragged.category_id !== target.category_id) {
            toast.push({
                variant: "error",
                title: "Invalid reorder",
                description: "When viewing a parent category, drag products within the same child category only.",
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

    const isPending = loadingList || reordering;
    const reorderDisabled = isPending || !!search.trim();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold">Products</h2>
                    <CategorySelect
                        categories={categories}
                        value={selectedCategoryId}
                        onChange={handleCategoryChange}
                        disabled={loadingList}
                        loading={categoryLoading}
                    />
                    <div className="relative">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, slug, brand..."
                            className="h-8 w-64 rounded-md border bg-background px-2 text-sm"
                            disabled={!selectedCategoryId}
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
                        disabled={!selectedCategoryId}
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
                    {search.trim() ? (
                        <div className="text-xs text-muted-foreground">Clear search to drag and reorder.</div>
                    ) : null}
                    {categoryScopeIds.length > 1 ? (
                        <div className="text-xs text-muted-foreground">Parent view: drag and drop works within the same child category.</div>
                    ) : null}
                </div>

                <Button asChild>
                    <Link href="/admin/products/new">Add Product</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{selectedCategory ? `Products: ${selectedCategory.name}` : "Products"}</CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? <div className="mb-3 text-xs text-red-500">{error}</div> : null}
                    {!selectedCategoryId ? (
                        <div className="rounded-md border p-6 text-sm text-muted-foreground">Create a category first to manage products.</div>
                    ) : (
                        <>
                            <ProductTable
                                records={records}
                                categories={categories}
                                badgeMap={badgeMap}
                                loadingViewId={loadingViewId}
                                onEdit={(p) => router.push(`/admin/products/new?edit=${encodeURIComponent(p.id)}`)}
                                onDeleteRequest={(id) => setConfirmId(id)}
                                onView={openView}
                                onReorder={handleReorder}
                                reorderDisabled={reorderDisabled}
                            />
                            <PaginationControls
                                page={page}
                                pageSize={pageSize}
                                total={total}
                                disabled={isPending}
                                onPageChange={(p) => {
                                    setPage(p);
                                    void load(p, search, categoryScopeIds);
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
