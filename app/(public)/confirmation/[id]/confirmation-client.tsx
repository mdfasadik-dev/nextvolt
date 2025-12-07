"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { CheckCircle2, Printer, MapPin, Package, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OrderDetail } from "@/lib/services/orderService";

export function ConfirmationClient({ order }: { order: OrderDetail }) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount: number) => {
        const symbol = order.currencySymbol || "$";
        return `${symbol}${amount.toFixed(2)}`;
    };

    const deliveryCharge = order.charges.find((c) => c.type === 'charge');
    const discountCharge = order.charges.find((c) => c.type === 'discount');
    const extraCharges = order.charges.filter((c) => c.type === 'charge' && c !== deliveryCharge);

    return (
        <div className="container max-w-3xl py-12 space-y-8">
            <div className="text-center space-y-4 print:hidden">
                <div className="flex justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Order Confirmed!</h1>
                <p className="text-lg text-muted-foreground">
                    Thank you for your purchase. Your order number is <span className="font-mono font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>.
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={handlePrint} variant="outline">
                        <Printer className="mr-2 h-4 w-4" />
                        Download / Print
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
                                <p className="text-sm text-muted-foreground mt-1">
                                    Date: {format(new Date(order.createdAt), "PPP p")}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        {/* Order Items */}
                        <div>
                            <h3 className="font-semibold mb-4">Items</h3>
                            <div className="space-y-4">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{item.productName}</p>
                                            {item.variantTitle && (
                                                <p className="text-sm text-muted-foreground">{item.variantTitle}</p>
                                            )}
                                            {item.sku && (
                                                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                            )}
                                            <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="font-medium">{formatCurrency(item.lineTotal)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Customer Information */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Shipping Information
                                </h3>
                                <div className="text-sm space-y-1 text-muted-foreground">
                                    <p className="font-medium text-foreground">{order.shippingContact.name}</p>
                                    <p>{order.shippingContact.phone}</p>
                                    <p>{order.shippingContact.email}</p>
                                    {order.shippingContact.addressLines.map((line, i) => (
                                        <p key={i} className="whitespace-pre-wrap">{line}</p>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                                <h3 className="font-semibold mb-4">Summary</h3>
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(order.subtotalAmount)}</span>
                                </div>

                                {deliveryCharge && (
                                    <div className="flex justify-between text-sm">
                                        <span>Delivery ({deliveryCharge.label})</span>
                                        <span>{formatCurrency(deliveryCharge.appliedAmount)}</span>
                                    </div>
                                )}

                                {extraCharges.map((c) => (
                                    <div key={c.id} className="flex justify-between text-sm">
                                        <span>{c.label} ({c.calcType === 'percent' ? `${c.baseAmount}%` : ''})</span>
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
                    <CardFooter className="print:hidden justify-center text-sm text-muted-foreground border-t pt-6">
                        If you have any questions, please contact our support.
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
