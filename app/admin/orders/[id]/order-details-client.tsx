"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Package, User, MapPin, Tag, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { updateOrderNotes, updateOrderStatus } from "../actions";
import { ORDER_STATUS_OPTIONS, OrderStatus } from "@/lib/constants/order-status";
import type { OrderDetail } from "@/lib/services/orderService";

export function OrderDetailsClient({ order }: { order: OrderDetail }) {
    const toast = useToast();
    const [status, setStatus] = useState<OrderStatus>(order.status);
    const [notes, setNotes] = useState(order.notes || "");
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const formatCurrency = (amount: number) => {
        const symbol = order.currencySymbol || "$";
        return `${symbol}${amount.toFixed(2)}`;
    };

    const deliveryCharge = order.charges.find((c) => c.type === 'charge'); // Simplified assumption as per Service logic
    const discountCharge = order.charges.find((c) => c.type === 'discount');
    const extraCharges = order.charges.filter((c) => c.type === 'charge' && c !== deliveryCharge);

    const handleStatusChange = async (newStatus: OrderStatus) => {
        if (newStatus === status) return;
        setIsUpdating(true);
        try {
            await updateOrderStatus({ id: order.id, status: newStatus });
            setStatus(newStatus);
            toast.push({
                title: "Status Updated",
                description: `Order status changed to ${newStatus}`,
                variant: "success",
            });
        } catch (error) {
            console.error("Status update error:", error);
            toast.push({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update status",
                variant: "error",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await updateOrderNotes({ id: order.id, notes });
            toast.push({
                title: "Notes Saved",
                description: "Order notes have been updated",
                variant: "success",
            });
        } catch (error) {
            toast.push({
                title: "Error",
                description: "Failed to save notes",
                variant: "error",
            });
        } finally {
            setIsSavingNotes(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/orders">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
                    <p className="text-muted-foreground">Placed on {format(new Date(order.createdAt), "PPP p")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={status} onValueChange={(val) => handleStatusChange(val as OrderStatus)} disabled={isUpdating}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {ORDER_STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.productName}</div>
                                                {item.variantTitle && (
                                                    <div className="text-sm text-muted-foreground">{item.variantTitle}</div>
                                                )}
                                                {item.sku && (
                                                    <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Financial Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="text-foreground font-medium">{formatCurrency(order.subtotalAmount)}</span>
                            </div>

                            {deliveryCharge && (
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        <span>Delivery {deliveryCharge.label ? `(${deliveryCharge.label})` : ''}</span>
                                    </div>
                                    <span className="text-foreground font-medium">{formatCurrency(deliveryCharge.appliedAmount)}</span>
                                </div>
                            )}

                            {extraCharges.map((c) => (
                                <div key={c.id} className="flex justify-between items-center text-muted-foreground">
                                    <span>{c.label || "Extra Charge"}
                                        {c.calcType === 'percent' ? ` (${c.baseAmount}%)` : ''}
                                    </span>
                                    <span className="text-foreground font-medium">{formatCurrency(c.appliedAmount)}</span>
                                </div>
                            ))}

                            {discountCharge && (
                                <div className="flex justify-between items-center text-green-600">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4" />
                                        <span>Discount {discountCharge.label ? `(${discountCharge.label})` : ''}</span>
                                    </div>
                                    <span className="font-medium">-{formatCurrency(discountCharge.appliedAmount)}</span>
                                </div>
                            )}

                            <Separator />
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-bold text-lg">Total</span>
                                <span className="font-bold text-2xl">{formatCurrency(order.totalAmount)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" /> Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.shippingContact.name || order.shippingContact.email || order.shippingContact.phone ? (
                                <>
                                    <div className="grid gap-1">
                                        <span className="text-sm font-medium">Name</span>
                                        <span className="text-sm text-muted-foreground">{order.shippingContact.name || "N/A"}</span>
                                    </div>
                                    <div className="grid gap-1">
                                        <span className="text-sm font-medium">Email</span>
                                        <span className="text-sm text-muted-foreground">{order.shippingContact.email || "N/A"}</span>
                                    </div>
                                    <div className="grid gap-1">
                                        <span className="text-sm font-medium">Phone</span>
                                        <span className="text-sm text-muted-foreground">{order.shippingContact.phone || "N/A"}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground">Guest Checkout (No Customer Profile linked)</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shipping Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" /> Shipping
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.shippingContact.addressLines.length > 0 ? (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {order.shippingContact.addressLines.map((line, i) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">No shipping address provided</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <textarea
                                placeholder="Add notes here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <Button onClick={handleSaveNotes} disabled={isSavingNotes || notes === (order.notes || "")} size="sm">
                                {isSavingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Notes
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
