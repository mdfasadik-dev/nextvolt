"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listOrders, updateOrderStatus, updateOrderNotes, deleteOrders } from "../actions";
import { ORDER_STATUS_OPTIONS } from "@/lib/constants/order-status";
import type { OrderStatus } from "@/lib/constants/order-status";
import type { OrderListResult, OrderSummary, OrderDetail } from "@/lib/services/orderService";
import { useToast } from "@/components/ui/toast-provider";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderDetailDialog } from "./order-detail-dialog";
import { Eye, Search, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { PaginationControls } from "@/app/admin/variants/_components/pagination-controls";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageLoadingOverlay } from "@/components/ui/page-loading-overlay";

type OrderTab = OrderStatus | "all";

interface OrdersClientProps {
    initial: OrderListResult;
}

const ORDER_TABS: OrderTab[] = ["all", ...ORDER_STATUS_OPTIONS];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function OrdersClient({ initial }: OrdersClientProps) {
    const toast = useToast();
    const toastRef = useRef(toast);
    const [orders, setOrders] = useState<OrderSummary[]>(initial.orders);
    const [counts, setCounts] = useState<Record<OrderTab, number>>({
        ...initial.counts,
        all: initial.counts.all ?? initial.orders.length,
    });
    const [selectedStatus, setSelectedStatus] = useState<OrderTab>("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(initial.page ?? 1);
    const [pageSize, setPageSize] = useState(initial.pageSize ?? 20);
    const [total, setTotal] = useState(initial.total ?? initial.orders.length);
    const [isFetching, startTransition] = useTransition();

    const [detailOpen, setDetailOpen] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [detail, setDetail] = useState<OrderDetail | null>(null);
    const [isDetailLoading, setDetailLoading] = useState(false);
    const [isStatusUpdating, setStatusUpdating] = useState(false);
    const [isSavingNotes, setSavingNotes] = useState(false);
    const detailCache = useRef(new Map<string, OrderDetail>());

    // Bulk selection. Kept as a Set of ids so it survives re-sorting, and is
    // cleared whenever the visible result set changes.
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isDeleting, setDeleting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const currencyFallback = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

    const visibleIds = useMemo(() => orders.map(order => order.id), [orders]);
    const selectedVisible = useMemo(
        () => visibleIds.filter(id => selectedIds.has(id)),
        [visibleIds, selectedIds],
    );
    const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
    const someVisibleSelected = selectedVisible.length > 0 && !allVisibleSelected;

    function toggleOne(id: string, checked: boolean) {
        setSelectedIds(current => {
            const next = new Set(current);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }

    function toggleAllVisible(checked: boolean) {
        setSelectedIds(current => {
            const next = new Set(current);
            for (const id of visibleIds) {
                if (checked) next.add(id);
                else next.delete(id);
            }
            return next;
        });
    }

    async function handleBulkDelete() {
        const ids = Array.from(selectedIds);
        if (!ids.length) return;
        setDeleting(true);
        try {
            const result = await deleteOrders({ ids });
            toastRef.current.push({
                variant: "success",
                title: `Deleted ${result.deleted.length} order${result.deleted.length === 1 ? "" : "s"}`,
                description: result.restocked
                    ? "Reserved stock was returned to inventory."
                    : undefined,
            });
            setSelectedIds(new Set());
            setConfirmOpen(false);
            setRefreshKey(key => key + 1);
        } catch (error) {
            toastRef.current.push({
                variant: "error",
                title: "Delete failed",
                description: error instanceof Error ? error.message : "Could not delete the selected orders.",
            });
        } finally {
            setDeleting(false);
        }
    }
    const isFirstLoad = useRef(true);
    const previousSearchRef = useRef("");

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        // refreshKey > 0 means an explicit reload (e.g. after deleting), which
        // must run even on what would otherwise be the initial render.
        if (isFirstLoad.current && refreshKey === 0) {
            isFirstLoad.current = false;
            previousSearchRef.current = debouncedSearch;
            return;
        }

        if (previousSearchRef.current !== debouncedSearch && page !== 1) {
            previousSearchRef.current = debouncedSearch;
            setPage(1);
            return;
        }
        previousSearchRef.current = debouncedSearch;

        startTransition(async () => {
            try {
                const response = await listOrders({
                    status: selectedStatus,
                    search: debouncedSearch,
                    page,
                    pageSize,
                });
                setOrders(response.orders);
                setCounts({
                    ...response.counts,
                    all: response.counts.all ?? response.orders.length,
                });
                setTotal(response.total);
            } catch (error) {
                console.error(error);
                toastRef.current.push({
                    variant: "error",
                    title: "Unable to load orders",
                    description: "Please try again in a moment.",
                });
            }
        });
    }, [selectedStatus, debouncedSearch, page, pageSize, refreshKey]);

    const formatDateTime = (iso: string) => {
        try {
            return new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(iso));
        } catch {
            return iso;
        }
    };

    const handleStatusChange = async (nextStatus: OrderStatus) => {
        if (!activeOrderId) return;
        const currentOrder = detail ?? orders.find(o => o.id === activeOrderId);
        if (!currentOrder || currentOrder.status === nextStatus) return;

        setStatusUpdating(true);
        try {
            const updated = await updateOrderStatus({ id: activeOrderId, status: nextStatus });
            if (!updated) throw new Error("Unable to update order status");

            setOrders(prev => {
                const mapped = prev.map(order =>
                    order.id === activeOrderId
                        ? { ...order, status: nextStatus }
                        : order,
                );
                if (selectedStatus !== "all") {
                    return mapped.filter(order =>
                        order.id === activeOrderId ? nextStatus === selectedStatus : true,
                    );
                }
                return mapped;
            });

            setCounts(prev => {
                const next = { ...prev };
                const previousStatus = currentOrder.status;
                if (previousStatus !== nextStatus) {
                    next[previousStatus] = Math.max(0, (next[previousStatus] ?? 0) - 1);
                    next[nextStatus] = (next[nextStatus] ?? 0) + 1;
                }
                return next;
            });

            setDetail(current =>
                current ? { ...current, status: nextStatus } : current,
            );
            const cached = detailCache.current.get(activeOrderId);
            if (cached) {
                detailCache.current.set(activeOrderId, { ...cached, status: nextStatus });
            }

            toast.push({
                variant: "success",
                title: "Status updated",
                description: `Order marked as ${nextStatus}.`,
            });
        } catch (error) {
            console.error(error);
            toast.push({
                variant: "error",
                title: "Status update failed",
                description: "Please try again.",
            });
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleSaveNotes = async (notes: string) => {
        if (!activeOrderId) return;
        setSavingNotes(true);
        try {
            const updated = await updateOrderNotes({ id: activeOrderId, notes });
            if (!updated) throw new Error("Unable to save notes");

            setOrders(prev =>
                prev.map(order =>
                    order.id === activeOrderId ? { ...order, notes: updated.notes ?? null } : order,
                ),
            );

            setDetail(current =>
                current ? { ...current, notes: updated.notes ?? null } : current,
            );

            const cached = detailCache.current.get(activeOrderId);
            if (cached) {
                detailCache.current.set(activeOrderId, {
                    ...cached,
                    notes: updated.notes ?? null,
                });
            }

            toast.push({
                variant: "success",
                title: "Notes saved",
            });
        } catch (error) {
            console.error(error);
            toast.push({
                variant: "error",
                title: "Failed to save notes",
                description: "Please try again.",
            });
        } finally {
            setSavingNotes(false);
        }
    };

    const tabs = useMemo(
        () =>
            ORDER_TABS.map(tab => ({
                value: tab,
                label: tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1),
                count: counts[tab] ?? 0,
            })),
        [counts],
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="gap-4">
                    <CardTitle className="text-lg">Orders</CardTitle>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Select
                            value={selectedStatus}
                            onValueChange={value => {
                                setSelectedStatus(value as OrderTab);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[220px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                {tabs.map(tab => (
                                    <SelectItem key={tab.value} value={tab.value}>
                                        {tab.label} ({tab.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <div className="relative w-full max-w-xs">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={event => setSearch(event.target.value)}
                                    placeholder="Search orders (id, name, email…)"
                                    className="pl-9"
                                />
                                {isFetching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <Select
                                value={String(pageSize)}
                                onValueChange={value => {
                                    setPageSize(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[132px]">
                                    <SelectValue placeholder="Per page" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map(option => (
                                        <SelectItem key={option} value={String(option)}>
                                            {option} / page
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {selectedIds.size > 0 && (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2.5">
                            <p className="text-sm font-medium">
                                {selectedIds.size} order{selectedIds.size === 1 ? "" : "s"} selected
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedIds(new Set())}
                                    disabled={isDeleting}
                                >
                                    Clear
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setConfirmOpen(true)}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                    Delete selected
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-hidden rounded-lg border">
                        <div className="max-h-[60vh] overflow-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="w-10 px-4 py-2">
                                            <Checkbox
                                                aria-label="Select all orders on this page"
                                                checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                                                onCheckedChange={checked => toggleAllVisible(checked === true)}
                                                disabled={visibleIds.length === 0}
                                            />
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold">Order</th>
                                        <th className="px-4 py-2 text-left font-semibold">Customer</th>
                                        <th className="px-4 py-2 text-left font-semibold">Placed</th>
                                        <th className="px-4 py-2 text-center font-semibold">Items</th>
                                        <th className="px-4 py-2 text-right font-semibold">Subtotal</th>
                                        <th className="px-4 py-2 text-right font-semibold">Total</th>
                                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                                        <th className="px-4 py-2 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                                No orders found for the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                    {orders.map(order => (
                                        <tr
                                            key={order.id}
                                            className={`border-t ${selectedIds.has(order.id) ? "bg-primary/5" : ""}`}
                                        >
                                            <td className="px-4 py-3">
                                                <Checkbox
                                                    aria-label={`Select order ${order.id}`}
                                                    checked={selectedIds.has(order.id)}
                                                    onCheckedChange={checked => toggleOne(order.id, checked === true)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs text-muted-foreground">#{order.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {order.customerName ?? "Guest"}
                                                    </span>
                                                    {order.customerEmail && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {order.customerEmail}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                                            <td className="px-4 py-3 text-center text-sm font-medium">{order.itemsCount}</td>
                                            <td className="px-4 py-3 text-right text-sm">{(order.currencySymbol || currencyFallback)}{order.subtotalAmount.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold">
                                                {(order.currencySymbol || currencyFallback)}{order.totalAmount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <OrderStatusBadge status={order.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="View order"
                                                >
                                                    <Link href={`/admin/orders/${order.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            Showing {orders.length === 0 ? 0 : (page - 1) * pageSize + 1}
                            {" - "}
                            {Math.min(page * pageSize, total)} of {total} orders
                        </p>
                        <PaginationControls
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            disabled={isFetching}
                            onPageChange={setPage}
                            className="mt-0"
                        />
                    </div>
                </CardContent>
            </Card>

            <OrderDetailDialog
                open={detailOpen}
                onOpenChange={open => {
                    setDetailOpen(open);
                    if (!open) {
                        setActiveOrderId(null);
                        setDetailLoading(false);
                    }
                }}
                order={detail}
                isLoading={isDetailLoading}
                onChangeStatus={handleStatusChange}
                onSaveNotes={handleSaveNotes}
                isStatusUpdating={isStatusUpdating}
                isSavingNotes={isSavingNotes}
                formatDateTime={formatDateTime}
            />

            <ConfirmDialog
                open={confirmOpen}
                title={`Delete ${selectedIds.size} order${selectedIds.size === 1 ? "" : "s"}?`}
                description="This permanently removes the orders along with their items and charges. Any stock still reserved by them is returned to inventory. This cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={handleBulkDelete}
                onCancel={() => setConfirmOpen(false)}
            />

            <PageLoadingOverlay
                open={isDeleting}
                title="Deleting orders..."
                description="Please wait while the selected orders are removed."
            />
        </div >
    );
}
