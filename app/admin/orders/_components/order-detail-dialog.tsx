"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ORDER_STATUS_OPTIONS } from "@/lib/constants/order-status";
import type { OrderStatus } from "@/lib/constants/order-status";
import type { OrderDetail, ContactDetails } from "@/lib/services/orderService";
import { OrderStatusBadge } from "./order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: OrderDetail | null;
    isLoading: boolean;
    onChangeStatus: (next: OrderStatus) => Promise<void>;
    onSaveNotes: (notes: string) => Promise<void>;
    isStatusUpdating: boolean;
    isSavingNotes: boolean;
    formatDateTime: (iso: string) => string;
}

export function OrderDetailDialog({
    open,
    onOpenChange,
    order,
    isLoading,
    onChangeStatus,
    onSaveNotes,
    isStatusUpdating,
    isSavingNotes,
    formatDateTime,
}: OrderDetailDialogProps) {
    const [notes, setNotes] = useState("");
    const hasChanges = order ? (notes.trim() || "") !== (order.notes ?? "") : false;

    const fallbackSymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
    const orderSymbol = order?.currencySymbol || fallbackSymbol;

    useEffect(() => {
        if (order) {
            setNotes(order.notes ?? "");
        }
    }, [order]);

    const totals = useMemo(() => {
        if (!order) return null;
        const symbol = order.currencySymbol || fallbackSymbol;
        return [
            { label: "Subtotal", value: `${symbol}${order.subtotalAmount.toFixed(2)}` },
            { label: "Discount", value: `${symbol}${order.discountAmount.toFixed(2)}` },
            { label: "Shipping", value: `${symbol}${order.shippingAmount.toFixed(2)}` },
            { label: "Total", value: `${symbol}${order.totalAmount.toFixed(2)}`, accent: true },
        ];
    }, [order, fallbackSymbol]);

    const handleStatusSelect = async (next: OrderStatus) => {
        if (!order || next === order.status) return;
        await onChangeStatus(next);
    };

    const handleSaveNotes = async () => {
        if (!order) return;
        await onSaveNotes(notes.trim());
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader className="gap-3">
                    <div className="flex flex-col">
                        <DialogTitle className="text-base">
                            Order <span className="font-mono text-xs text-muted-foreground">{order?.id ?? "…"}</span>
                        </DialogTitle>
                        {order && (
                            <span className="text-xs text-muted-foreground">
                                Placed {formatDateTime(order.createdAt)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {order ? <OrderStatusBadge status={order.status} /> : <Badge variant="outline">Status</Badge>}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isStatusUpdating || !order}
                                >
                                    <span className="mr-1 text-xs">Change</span>
                                    {isStatusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {ORDER_STATUS_OPTIONS.map(status => (
                                    <DropdownMenuItem
                                        key={status}
                                        disabled={!order || status === order.status || isStatusUpdating}
                                        onClick={() => handleStatusSelect(status)}
                                    >
                                        <span className="flex items-center gap-2">
                                            <OrderStatusBadge status={status} />
                                            <span className="capitalize">{status}</span>
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Close"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    {isLoading && (
                        <div className="space-y-4">
                            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                            <div className="h-32 animate-pulse rounded bg-muted" />
                            <div className="h-32 animate-pulse rounded bg-muted" />
                        </div>
                    )}
                    {!isLoading && !order && (
                        <p className="text-sm text-muted-foreground">This order could not be found.</p>
                    )}
                    {!isLoading && order && (
                        <>
                            <section className="grid gap-4 md:grid-cols-2">
                                <DetailCard title="Customer">
                                    <DetailLine label="Name" value={order.customerName} />
                                    <DetailLine label="Email" value={order.customerEmail} />
                                    <DetailLine label="Phone" value={order.customerPhone} />
                                </DetailCard>
                                <DetailCard title="Shipping">
                                    <AddressBlock contact={order.shippingContact} />
                                </DetailCard>
                                <DetailCard title="Billing">
                                    <AddressBlock contact={order.billingContact} emptyFallback="No billing details provided." />
                                </DetailCard>
                                <DetailCard title="Summary">
                                    <div className="space-y-2">
                                        {totals?.map(item => (
                                            <div
                                                key={item.label}
                                                className={cn(
                                                    "flex items-center justify-between text-sm",
                                                    item.accent ? "font-semibold text-foreground" : "text-muted-foreground",
                                                )}
                                            >
                                                <span>{item.label}</span>
                                                <span>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </DetailCard>
                            </section>

                            <section>
                                <h3 className="text-sm font-semibold">Items ({order.itemsCount})</h3>
                                <div className="mt-2 overflow-hidden rounded border">
                                    <table className="w-full min-w-[600px] text-sm">
                                        <thead>
                                            <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                                                <th className="px-3 py-2 text-left font-semibold">Product</th>
                                                <th className="px-3 py-2 text-left font-semibold">Variant</th>
                                                <th className="px-3 py-2 text-left font-semibold">SKU</th>
                                                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                                                <th className="px-3 py-2 text-right font-semibold">Price</th>
                                                <th className="px-3 py-2 text-right font-semibold">Line total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                        No items recorded for this order.
                                                    </td>
                                                </tr>
                                            )}
                                            {order.items.map(item => (
                                                <tr key={item.id} className="border-t">
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-foreground">{item.productName ?? "—"}</span>
                                                            {item.productId && (
                                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                                    #{item.productId}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-muted-foreground">{item.variantTitle ?? "—"}</td>
                                                    <td className="px-3 py-2 text-sm text-muted-foreground">{item.sku ?? "—"}</td>
                                                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-right">{orderSymbol}{item.unitPrice.toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-right font-medium">{orderSymbol}{item.lineTotal.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">Internal notes</h3>
                                    {isSavingNotes && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={event => setNotes(event.target.value)}
                                    placeholder="Add internal notes for this order"
                                    className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSaveNotes}
                                        disabled={!hasChanges || isSavingNotes}
                                    >
                                        {isSavingNotes ? "Saving…" : "Save notes"}
                                    </Button>
                                </div>
                            </section>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border bg-muted/20 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <div className="mt-2 space-y-1 text-sm">{children}</div>
        </div>
    );
}

function DetailLine({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{label}</span>
            <span className="font-medium text-foreground">{value || "—"}</span>
        </div>
    );
}

function AddressBlock({ contact, emptyFallback }: { contact: ContactDetails; emptyFallback?: string }) {
    const { name, email, phone, addressLines } = contact;
    const hasContent = name || email || phone || addressLines.length;
    if (!hasContent) {
        return <p className="text-xs text-muted-foreground">{emptyFallback ?? "No shipping details provided."}</p>;
    }
    return (
        <div className="space-y-1 text-sm">
            {name && <div className="font-medium text-foreground">{name}</div>}
            {email && <div className="text-xs text-muted-foreground">{email}</div>}
            {phone && <div className="text-xs text-muted-foreground">{phone}</div>}
            {addressLines.length > 0 && (
                <div className="text-xs text-muted-foreground">
                    {addressLines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
