"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Package, User, MapPin, Tag, ChevronLeft, Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        } catch {
            toast.push({
                title: "Error",
                description: "Failed to save notes",
                variant: "error",
            });
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handlePrintInvoice = async () => {
        const escapeHtml = (value: string) =>
            value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

        const formatAddressHtml = (lines: string[]) =>
            lines.length > 0 ? lines.map((line) => escapeHtml(line)).join("<br/>") : "N/A";

        const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
        const createdAt = format(new Date(order.createdAt), "PPP p");
        const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "";
        const storeEmail = process.env.NEXT_PUBLIC_STORE_EMAIL || "";
        const storePhone = process.env.NEXT_PUBLIC_STORE_PHONE || "";

        const deliveryRow = deliveryCharge
            ? `
                <tr>
                    <td>Delivery ${deliveryCharge.label ? `(${escapeHtml(deliveryCharge.label)})` : ""}</td>
                    <td class="right">${escapeHtml(formatCurrency(deliveryCharge.appliedAmount))}</td>
                </tr>
              `
            : "";

        const extraChargeRows = extraCharges
            .map((charge) => {
                const label = charge.label || "Extra Charge";
                const suffix = charge.calcType === "percent" ? ` (${charge.baseAmount}%)` : "";
                return `
                    <tr>
                        <td>${escapeHtml(`${label}${suffix}`)}</td>
                        <td class="right">${escapeHtml(formatCurrency(charge.appliedAmount))}</td>
                    </tr>
                `;
            })
            .join("");

        const discountRow = discountCharge
            ? `
                <tr class="discount">
                    <td>Discount ${discountCharge.label ? `(${escapeHtml(discountCharge.label)})` : ""}</td>
                    <td class="right">-${escapeHtml(formatCurrency(discountCharge.appliedAmount))}</td>
                </tr>
              `
            : "";

        const itemRows = order.items
            .map((item, index) => {
                const variant = item.variantTitle ? `<div class="muted">${escapeHtml(item.variantTitle)}</div>` : "";
                const sku = item.sku ? `<div class="muted small">SKU: ${escapeHtml(item.sku)}</div>` : "";
                return `
                    <tr>
                        <td class="center">${index + 1}</td>
                        <td>
                            <div>${escapeHtml(item.productName || "Unknown Product")}</div>
                            ${variant}
                            ${sku}
                        </td>
                        <td class="center">${item.quantity}</td>
                        <td class="right">${escapeHtml(formatCurrency(item.unitPrice))}</td>
                        <td class="right">${escapeHtml(formatCurrency(item.lineTotal))}</td>
                    </tr>
                `;
            })
            .join("");

        const styles = `
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            body {
                margin: 0;
                padding: 24px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                color: #0f172a;
                background: #f8fafc;
            }
            .sheet {
                max-width: 960px;
                margin: 0 auto;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                overflow: hidden;
            }
            .header {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 16px;
                padding: 28px;
                border-bottom: 1px solid #e2e8f0;
                background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
            }
            .brand {
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 0.2px;
            }
            .muted { color: #64748b; }
            .small { font-size: 12px; }
            .right { text-align: right; }
            .center { text-align: center; }
            .invoice-meta {
                text-align: right;
                min-width: 240px;
            }
            .invoice-title {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }
            .body { padding: 24px 28px 28px; }
            .grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
                margin-bottom: 22px;
            }
            .panel {
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 14px;
                background: #ffffff;
            }
            .panel h3 {
                margin: 0 0 8px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: #334155;
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                padding: 12px 10px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: top;
                font-size: 14px;
            }
            th {
                background: #f8fafc;
                font-weight: 600;
                color: #334155;
            }
            .summary {
                margin-top: 16px;
                width: 100%;
            }
            .summary td {
                border-bottom: none;
                padding: 8px 0;
                font-size: 14px;
            }
            .summary .total td {
                border-top: 1px solid #cbd5e1;
                padding-top: 12px;
                font-size: 17px;
                font-weight: 700;
            }
            .discount td { color: #15803d; }
            .notes {
                margin-top: 18px;
                border: 1px dashed #cbd5e1;
                border-radius: 10px;
                padding: 12px 14px;
                background: #f8fafc;
            }
            .footer {
                margin-top: 20px;
                font-size: 12px;
                color: #64748b;
                text-align: center;
            }
        `;

        const html = `
            <div class="sheet">
                <header class="header">
                    <div>
                        <div class="brand">${escapeHtml(storeName)}</div>
                        <div class="muted small">Email: ${escapeHtml(storeEmail)}</div>
                        ${storePhone ? `<div class="muted small">Phone: ${escapeHtml(storePhone)}</div>` : ""}
                    </div>
                    <div class="invoice-meta">
                        <h1 class="invoice-title">Invoice</h1>
                        <div><strong>${escapeHtml(invoiceNumber)}</strong></div>
                        <div class="muted small">Order ID: ${escapeHtml(order.id)}</div>
                        <div class="muted small">Date: ${escapeHtml(createdAt)}</div>
                        <div class="muted small">Status: ${escapeHtml(status.toUpperCase())}</div>
                    </div>
                </header>

                <main class="body">
                    <section class="grid">
                        <div class="panel">
                            <h3>Bill To</h3>
                            <div>${escapeHtml(order.shippingContact.name || "Guest Customer")}</div>
                            <div class="muted">${escapeHtml(order.shippingContact.email || "N/A")}</div>
                            <div class="muted">${escapeHtml(order.shippingContact.phone || "N/A")}</div>
                        </div>
                        <div class="panel">
                            <h3>Shipping Address</h3>
                            <div class="muted">${formatAddressHtml(order.shippingContact.addressLines)}</div>
                        </div>
                    </section>

                    <section>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:52px">#</th>
                                    <th>Item</th>
                                    <th style="width:72px" class="center">Qty</th>
                                    <th style="width:140px" class="right">Unit Price</th>
                                    <th style="width:140px" class="right">Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemRows}
                            </tbody>
                        </table>
                    </section>

                    <section>
                        <table class="summary">
                            <tbody>
                                <tr>
                                    <td>Subtotal</td>
                                    <td class="right">${escapeHtml(formatCurrency(order.subtotalAmount))}</td>
                                </tr>
                                ${deliveryRow}
                                ${extraChargeRows}
                                ${discountRow}
                                <tr class="total">
                                    <td>Total</td>
                                    <td class="right">${escapeHtml(formatCurrency(order.totalAmount))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    ${notes.trim()
                ? `
                            <section class="notes">
                                <strong>Notes</strong>
                                <div class="muted">${escapeHtml(notes.trim())}</div>
                            </section>
                          `
                : ""}

                    <div class="footer">
                        Generated on ${escapeHtml(format(new Date(), "PPP p"))}
                    </div>
                </main>
            </div>
        `;

        try {
            const { default: html2pdf } = await import("html2pdf.js");
            const container = document.createElement("div");
            container.innerHTML = `<style>${styles}</style>${html}`;
            await html2pdf()
                .set({
                    margin: 10,
                    filename: `${invoiceNumber}.pdf`,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(container)
                .save();
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.push({
                title: "Download failed",
                description: error instanceof Error ? error.message : "Unable to generate invoice PDF.",
                variant: "error",
            });
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
                    <Button variant="outline" onClick={handlePrintInvoice}>
                        <Printer className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
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
