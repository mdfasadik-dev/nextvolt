"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CartViewProps {
    className?: string;
    onCheckoutNavigate?: () => void;
}

function formatMoney(value: number, symbol: string) {
    return `${symbol}${value.toFixed(2)}`;
}

export function CartView({ className, onCheckoutNavigate }: CartViewProps) {
    const cart = useCart();
    const router = useRouter();
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

    const totals = useMemo(() => {
        const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return {
            subtotal,
            subtotalLabel: formatMoney(subtotal, symbol),
        };
    }, [cart.items, symbol]);

    const handleQuantityChange = (id: string, next: number) => {
        if (next <= 0) {
            cart.removeItem(id);
        } else {
            cart.updateQuantity(id, next);
        }
    };

    const goToCheckout = () => {
        if (!cart.items.length) return;
        onCheckoutNavigate?.();
        router.push("/checkout");
    };

    return (
        <div className={cn("flex h-full flex-col gap-4 py-4", className)}>
            <div className="flex items-center justify-between pt-4">
                <h2 className="text-lg font-semibold">Cart Overview</h2>
                {cart.items.length > 0 && (
                    <span className="text-sm text-muted-foreground">{cart.itemCount} item{cart.itemCount > 1 ? "s" : ""}</span>
                )}
            </div>
            {cart.items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <p>Your cart is empty. Browse products to add items to your order.</p>
                </div>
            ) : (
                <>
                    <ul className="flex-1 space-y-4 overflow-y-auto pr-1">
                        {cart.items.map((item) => {
                            const lineTotal = formatMoney(item.price * item.quantity, symbol);
                            const targetSlug = item.slug || item.productId;
                            return (
                                <li key={item.id} className=" rounded-xl border bg-card p-4 shadow-sm">
                                    <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                                        {item.imageUrl ? (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.name}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div>
                                            <a href={`/products/${targetSlug}`} className="text-sm font-medium hover:text-primary">
                                                {item.name}
                                            </a>
                                            {item.variantName && (
                                                <div className="text-xs text-muted-foreground">{item.variantName}</div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                                                <button
                                                    type="button"
                                                    className="p-1 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <span className="min-w-[2ch] text-center text-sm font-semibold">{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    className="p-1 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="text-destructive"
                                                size="icon"
                                                onClick={() => cart.removeItem(item.id)}
                                                aria-label="Remove from cart"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-right self-start min-w-[96px] space-y-1">
                                        <div className="whitespace-nowrap text-sm font-semibold">{lineTotal}</div>
                                        <div className="whitespace-nowrap text-xs text-muted-foreground">Unit: {formatMoney(item.price, symbol)}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm">
                            <span>Subtotal</span>
                            <span className="text-base font-semibold">{totals.subtotalLabel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Shipping and taxes are calculated during checkout.
                        </p>
                        <Button type="button" className="w-full" onClick={goToCheckout}>
                            Proceed to Checkout
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
