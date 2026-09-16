"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, CreditCard, MapPin, Package, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { trackPurchase } from "@/lib/analytics/meta-pixel";
import type { OrderDetail } from "@/lib/services/orderService";
import type { OrderStatus } from "@/lib/constants/order-status";

const STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "Pending",
    accepted: "Accepted",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
};

function getStatusClass(status: OrderStatus) {
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "accepted") return "bg-blue-100 text-blue-700";
    if (status === "shipped") return "bg-indigo-100 text-indigo-700";
    if (status === "cancelled") return "bg-red-100 text-red-700";
    return "bg-muted text-muted-foreground";
}

export function ConfirmationClient({
    order,
    mode,
    supportPhone,
}: {
    order: OrderDetail;
    mode: "placed" | "track";
    supportPhone?: string | null;
}) {
    const printRef = useRef<HTMLDivElement>(null);
    const isTrackMode = mode === "track";

    useEffect(() => {
        if (mode !== "placed") return;
        const storageKey = `meta_pixel_purchase_${order.id}`;
        try {
            const alreadyTracked =
                window.sessionStorage.getItem(storageKey) ||
                window.localStorage.getItem(storageKey);
            if (alreadyTracked) return;

            window.sessionStorage.setItem(storageKey, "1");
            window.localStorage.setItem(storageKey, "1");
        } catch {
            // ignore storage access issues
        }

        const productIds = order.items
            .map((item) => item.productId)
            .filter((id): id is string => Boolean(id));

        const totalItemsCount = order.items.reduce(
            (sum, item) => sum + (item.quantity || 1),
            0
        );

        trackPurchase({
            content_ids: productIds,
            content_type: "product",
            value: Number(order.totalAmount.toFixed(2)),
            currency: "BDT",
            num_items: totalItemsCount,
        });
    }, [order.id, order.totalAmount, order.items, mode]);
    const statusLabel = STATUS_LABELS[order.status] || order.status;
    const whatsappDigits = (supportPhone || "").replace(/[^0-9]/g, "");
    const hasWhatsappSupport = whatsappDigits.length >= 8;
    const whatsappText = encodeURIComponent(
        `Hello, I need support with my order ID: ${order.id}`
    );
    const whatsappHref = hasWhatsappSupport ? `https://wa.me/${whatsappDigits}?text=${whatsappText}` : null;

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount: number) => {
        const symbol = order.currencySymbol || "$";
        return `${symbol}${amount.toFixed(2)}`;
    };

    const deliveryCharge = order.charges.find((c) => c.type === "charge");
    const discountCharge = order.charges.find((c) => c.type === "discount");
    const extraCharges = order.charges.filter((c) => c.type === "charge" && c !== deliveryCharge);

    const handleDownloadPdf = async () => {
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
        const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "NextVolt";

        const deliveryRow = deliveryCharge
            ? `
                <tr>
                    <td>Delivery ${order.deliveryMethodInfo?.label || deliveryCharge.label ? `(${escapeHtml(order.deliveryMethodInfo?.label || deliveryCharge.label || "")})` : ""}</td>
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

        const paymentMethodLabel = order.paymentMethodInfo?.label || "Cash on delivery";
        const deliveryMethodLabel = order.deliveryMethodInfo?.label || deliveryCharge?.label || null;

        const customFieldsHtml = order.paymentMethodInfo?.customFieldsData && order.paymentMethodInfo.customFieldsData.length > 0
            ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Submitted Payment Information:</div>
                    ${order.paymentMethodInfo.customFieldsData.map(f => `
                        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px;">
                            <span style="color: #64748b;">${escapeHtml(f.label)}:</span>
                            <span style="font-weight: 600; font-family: monospace;">${escapeHtml(f.value)}</span>
                        </div>
                    `).join("")}
                </div>
              `
            : "";

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
                    </div>
                    <div class="invoice-meta">
                        <h1 class="invoice-title">Invoice</h1>
                        <div><strong>${escapeHtml(invoiceNumber)}</strong></div>
                        <div class="muted small">Order ID: ${escapeHtml(order.id)}</div>
                        <div class="muted small">Date: ${escapeHtml(createdAt)}</div>
                        <div class="muted small">Status: ${escapeHtml(STATUS_LABELS[order.status] || order.status)}</div>
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
                            <h3>Shipping & Delivery</h3>
                            ${deliveryMethodLabel ? `<div style="margin-bottom: 4px;"><strong>Delivery Method:</strong> ${escapeHtml(deliveryMethodLabel)}</div>` : ""}
                            <div class="muted">${formatAddressHtml(order.shippingContact.addressLines)}</div>
                        </div>
                    </section>

                    <section class="panel" style="margin-bottom: 22px;">
                        <h3>Payment Information</h3>
                        <div><strong>Payment Method:</strong> ${escapeHtml(paymentMethodLabel)}</div>
                        ${customFieldsHtml}
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
            window.print();
        }
    };

    return (
        <div className="container max-w-3xl py-12 space-y-8">
            <div className="text-center space-y-4 print:hidden">
                <div className="flex justify-center">
                    {isTrackMode ? (
                        <Package className="h-16 w-16 text-primary" />
                    ) : (
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    )}
                </div>
                <h1 className="text-4xl font-bold tracking-tight">
                    {isTrackMode ? "Order Status" : "Your Order Is Placed"}
                </h1>
                <p className="text-lg text-muted-foreground">
                    {isTrackMode
                        ? `Track updates for order #${order.id.slice(0, 8).toUpperCase()}.`
                        : `Your order #${order.id.slice(0, 8).toUpperCase()} has been placed successfully.`}
                </p>
                <div className="flex justify-center">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(order.status)}`}>
                        {statusLabel}
                    </span>
                </div>
                <div className="flex justify-center gap-3 flex-wrap">
                    <Button onClick={handleDownloadPdf} variant="outline">
                        <Printer className="mr-2 h-4 w-4" />
                        Download Invoice PDF
                    </Button>
                    <Button onClick={handlePrint} variant="ghost">
                        Print
                    </Button>
                    <Button asChild>
                        <Link href="/">
                            Continue Shopping <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            <div ref={printRef} className="print:block">
                <Card className="print:border-none print:shadow-none">
                    <CardHeader className="border-b print:border-b-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Order Details</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">Date: {format(new Date(order.createdAt), "PPP p")}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="font-mono font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(order.status)}`}>
                                    {statusLabel}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        <div>
                            <h3 className="font-semibold mb-4">Items</h3>
                            <div className="space-y-4">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{item.productName}</p>
                                            {item.variantTitle && <p className="text-sm text-muted-foreground">{item.variantTitle}</p>}
                                            {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                                            <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="font-medium">{formatCurrency(item.lineTotal)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2 text-foreground">
                                        <MapPin className="h-4 w-4 text-primary" /> Shipping Information
                                    </h3>
                                    <div className="text-sm space-y-1 text-muted-foreground bg-muted/30 p-4 rounded-lg border">
                                        <p className="font-medium text-foreground">{order.shippingContact.name || "Guest Customer"}</p>
                                        {order.shippingContact.phone && <p>{order.shippingContact.phone}</p>}
                                        {order.shippingContact.email && <p>{order.shippingContact.email}</p>}
                                        {order.shippingContact.addressLines.map((line, i) => (
                                            <p key={i} className="whitespace-pre-wrap">
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2 text-foreground">
                                        <CreditCard className="h-4 w-4 text-primary" /> Payment & Method Details
                                    </h3>
                                    <div className="text-sm space-y-3 bg-muted/30 p-4 rounded-lg border">
                                        <div className="flex justify-between items-center pb-2 border-b">
                                            <span className="text-muted-foreground font-medium">Payment Method:</span>
                                            <span className="font-semibold text-foreground">{order.paymentMethodInfo?.label || "Cash on delivery"}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b">
                                            <span className="text-muted-foreground font-medium">Delivery Method:</span>
                                            <span className="font-semibold text-foreground">{order.deliveryMethodInfo?.label || deliveryCharge?.label || "Standard Delivery"}</span>
                                        </div>

                                        {order.paymentMethodInfo?.customFieldsData && order.paymentMethodInfo.customFieldsData.length > 0 && (
                                            <div className="space-y-2 pt-1">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                                    Submitted Payment Information
                                                </span>
                                                <div className="grid gap-2">
                                                    {order.paymentMethodInfo.customFieldsData.map((field) => (
                                                        <div key={field.id} className="flex justify-between items-center text-xs border-b border-muted/50 pb-1.5 last:border-0 last:pb-0">
                                                            <span className="text-muted-foreground font-medium">{field.label}:</span>
                                                            <span className="font-mono font-semibold text-foreground bg-background px-2 py-0.5 rounded border">{field.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/50 p-6 rounded-lg space-y-3 h-fit border">
                                <h3 className="font-semibold mb-4 text-foreground">Summary</h3>
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(order.subtotalAmount)}</span>
                                </div>

                                {deliveryCharge && (
                                    <div className="flex justify-between text-sm">
                                        <span>Delivery ({order.deliveryMethodInfo?.label || deliveryCharge.label})</span>
                                        <span>{formatCurrency(deliveryCharge.appliedAmount)}</span>
                                    </div>
                                )}

                                {extraCharges.map((c) => (
                                    <div key={c.id} className="flex justify-between text-sm">
                                        <span>{c.label} ({c.calcType === "percent" ? `${c.baseAmount}%` : ""})</span>
                                        <span>{formatCurrency(c.appliedAmount)}</span>
                                    </div>
                                ))}

                                {discountCharge && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount ({discountCharge.label})</span>
                                        <span>-{formatCurrency(discountCharge.appliedAmount)}</span>
                                    </div>
                                )}

                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{formatCurrency(order.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="print:hidden flex flex-col items-center gap-3 text-sm text-muted-foreground border-t pt-6">
                        <p>If you have any questions, please contact our support.</p>
                        {whatsappHref ? (
                            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <a
                                    href={whatsappHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Message support on WhatsApp"
                                >
                                    <WhatsAppIcon className="mr-2 h-4 w-4 shrink-0" />
                                    WhatsApp Us
                                </a>
                            </Button>
                        ) : null}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
