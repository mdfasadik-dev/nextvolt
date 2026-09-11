"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Info, Loader2, Tag } from "lucide-react";
import { useCart } from "./cart-provider";
import { useCustomerStorage } from "./use-customer-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { calculateCheckout, getCheckoutDeliveryOptionsForItems, getCheckoutPaymentMethods } from "@/app/(public)/checkout/actions";
import { CalculatedTotals } from "@/lib/services/checkoutService";
import { PaymentMethodWithCharges, PaymentMethodCustomField } from "@/lib/services/paymentMethodService";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_CURRENCY_CODE } from "@/lib/constants/currency";
import { Markdown } from "@/components/markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function formatMoney(value: number, symbol: string) {
    return `${symbol}${value.toFixed(2)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

type DeliveryOption = {
    id: string;
    label: string;
    amount: number;
    base_amount: number;
    is_default: boolean;
    note?: string | null;
    total_weight_grams: number;
    has_weight_rules: boolean;
};

export function CheckoutForm() {
    const cart = useCart();
    const router = useRouter();
    const { customer, updateCustomer, ready } = useCustomerStorage();
    const [status, setStatus] = useState<{ state: "idle" | "submitting" | "success" | "error"; message?: string }>({
        state: "idle",
    });

    const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
    const [selectedDelivery, setSelectedDelivery] = useState<string>("");
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodWithCharges[]>([]);
    const [selectedPayment, setSelectedPayment] = useState<string>("");
    const [isLoadingPayments, setIsLoadingPayments] = useState(true);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [couponState, setCouponState] = useState<{
        state: "idle" | "success" | "error";
        message?: string;
    }>({ state: "idle" });
    const [pricingError, setPricingError] = useState<string | null>(null);
    const [totals, setTotals] = useState<CalculatedTotals | null>(null);
    const [isCalculating, startProcesing] = useTransition();

    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
    const currencyCode = DEFAULT_CURRENCY_CODE;

    const selectedPm = paymentMethods.find((pm) => pm.id === selectedPayment);
    const customFieldsList = (selectedPm?.custom_fields as PaymentMethodCustomField[]) || [];
    const hasInstructionsOrFields = Boolean(
        selectedPm && (
            (selectedPm.instructions && selectedPm.instructions.trim().length > 0) ||
            customFieldsList.length > 0 ||
            (selectedPm.button_label && selectedPm.button_label.trim() !== "Place Order")
        )
    );
    const checkoutButtonLabel = selectedPm?.button_label?.trim() || "Place Order";

    const isInstructionFormValid = customFieldsList.every((f) => {
        if (!f.required) return true;
        const val = customFieldValues[f.id];
        return Boolean(val && val.trim().length > 0);
    });

    useEffect(() => {
        if (!cart.items.length) {
            setDeliveryOptions([]);
            setSelectedDelivery("");
            return;
        }

        let cancelled = false;
        const inputItems = cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
        }));

        getCheckoutDeliveryOptionsForItems(inputItems).then((opts) => {
            if (cancelled) return;
            setDeliveryOptions(opts as DeliveryOption[]);
            setSelectedDelivery((previous) => {
                if (previous && opts.some((opt) => opt.id === previous)) return previous;
                const def = opts.find((opt) => opt.is_default);
                if (def) return def.id;
                return opts.length > 0 ? opts[0].id : "";
            });
        }).catch(() => {
            if (cancelled) return;
            setDeliveryOptions([]);
        });

        return () => {
            cancelled = true;
        };
    }, [cart.items]);

    useEffect(() => {
        let cancelled = false;
        setIsLoadingPayments(true);
        getCheckoutPaymentMethods().then((pms) => {
            if (cancelled) return;
            setPaymentMethods(pms);
            setSelectedPayment((previous) => {
                if (previous && pms.some((pm) => pm.id === previous)) return previous;
                const def = pms.find((pm) => pm.is_default);
                if (def) return def.id;
                return pms.length > 0 ? pms[0].id : "";
            });
        }).catch(() => {
            if (cancelled) return;
            setPaymentMethods([]);
        }).finally(() => {
            if (cancelled) return;
            setIsLoadingPayments(false);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    // Recalculate whenever dependencies change
    useEffect(() => {
        if (cart.items.length === 0) return;

        const timer = setTimeout(() => {
            startProcesing(async () => {
                const res = await calculateCheckout(
                    cart.items.map(i => ({ productId: i.productId, variantId: i.variantId ?? undefined, price: i.price, quantity: i.quantity })),
                    selectedDelivery,
                    appliedCoupon || undefined,
                    selectedPayment || undefined
                );
                if (res.success && res.data) {
                    setTotals(res.data as CalculatedTotals);
                    setPricingError(null);
                } else {
                    if (appliedCoupon) {
                        setCouponState({
                            state: "error",
                            message: res.error || "Coupon could not be applied.",
                        });
                        setAppliedCoupon(null);

                        const fallback = await calculateCheckout(
                            cart.items.map(i => ({ productId: i.productId, variantId: i.variantId ?? undefined, price: i.price, quantity: i.quantity })),
                            selectedDelivery,
                            undefined,
                            selectedPayment || undefined
                        );
                        if (fallback.success && fallback.data) {
                            setTotals(fallback.data as CalculatedTotals);
                            setPricingError(null);
                        } else if (fallback.error) {
                            setPricingError(fallback.error);
                        }
                    } else if (res.error) {
                        setPricingError(res.error);
                    }
                }
            });
        }, 500); // Debounce

        return () => clearTimeout(timer);
    }, [cart.items, selectedDelivery, appliedCoupon, selectedPayment]);


    const handleApplyCoupon = () => {
        const normalizedCode = couponCode.trim().toUpperCase();
        if (!normalizedCode) {
            setCouponState({ state: "error", message: "Please enter a coupon code." });
            return;
        }

        startProcesing(async () => {
            const res = await calculateCheckout(
                cart.items.map(i => ({ productId: i.productId, variantId: i.variantId ?? undefined, price: i.price, quantity: i.quantity })),
                selectedDelivery,
                normalizedCode,
                selectedPayment || undefined
            );

            if (res.success && res.data) {
                setTotals(res.data as CalculatedTotals);
                setAppliedCoupon(normalizedCode);
                setCouponCode(normalizedCode);
                setPricingError(null);
                setCouponState({
                    state: "success",
                    message: `Coupon ${normalizedCode} applied successfully.`,
                });
                return;
            }

            setAppliedCoupon(null);
            if (res.error && (res.error.toLowerCase().includes("unavailable") || res.error.toLowerCase().includes("out of stock"))) {
                setPricingError(res.error);
            }
            setCouponState({
                state: "error",
                message: res.error || "Coupon could not be applied.",
            });
        });
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponState({ state: "idle" });
    };

    const executeOrderSubmit = async (extraNotes?: string) => {
        if (status.state === "submitting") return;
        if (pricingError) {
            setStatus({ state: "error", message: pricingError });
            return;
        }
        if (!customer.fullName.trim() || !customer.phone.trim() || !customer.address.trim()) {
            setStatus({ state: "error", message: "Please provide name, phone, and address." });
            return;
        }

        setStatus({ state: "submitting" });
        try {
            const combinedNotes = [
                customer.notes?.trim() || null,
                extraNotes?.trim() || null,
            ].filter(Boolean).join("\n\n");

            const payload = {
                items: cart.items.map((item) => ({
                    productId: item.productId,
                    productName: item.name,
                    variantId: item.variantId,
                    variantName: item.variantName,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    metadata: item.metadata ?? null,
                })),
                currency: currencyCode,
                notes: combinedNotes || undefined,
                contact: {
                    fullName: customer.fullName,
                    email: customer.email,
                    phone: customer.phone,
                    shipping_address: {
                        address: customer.address
                    },
                },
                deliveryId: selectedDelivery,
                paymentMethodId: selectedPayment,
                paymentData: customFieldValues,
                couponCode: appliedCoupon
            };

            const response = await fetch("/api/cart/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => null);
                throw new Error(err?.error || "Unable to place your order. Please try again.");
            }

            const data = await response.json();
            cart.clear();
            setIsInstructionModalOpen(false);
            setStatus({
                state: "success",
                message: `Order placed successfully. Reference: ${data.order.id.slice(0, 8).toUpperCase()}`,
            });
            router.push(`/confirmation/${data.order.id}?mode=placed`);
        } catch (error: unknown) {
            setStatus({
                state: "error",
                message: getErrorMessage(error, "Something went wrong while placing your order."),
            });
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pricingError) {
            setStatus({ state: "error", message: pricingError });
            return;
        }
        if (!customer.fullName.trim() || !customer.phone.trim() || !customer.address.trim()) {
            setStatus({ state: "error", message: "Please provide name, phone, and address." });
            return;
        }

        if (hasInstructionsOrFields) {
            setIsInstructionModalOpen(true);
            return;
        }

        await executeOrderSubmit();
    };

    const handleModalFinalSubmit = async () => {
        const fieldNotesArr = customFieldsList
            .map((f) => {
                const val = customFieldValues[f.id]?.trim();
                return val ? `${f.label}: ${val}` : null;
            })
            .filter(Boolean);

        const extraPaymentNote = fieldNotesArr.length > 0
            ? `[${selectedPm?.label || "Payment Info"}]\n` + fieldNotesArr.map((n) => `• ${n}`).join("\n")
            : null;

        await executeOrderSubmit(extraPaymentNote || undefined);
    };

    if (!cart.items.length) {
        return (
            <div className="rounded-xl border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">Your cart is currently empty.</p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/">Continue shopping</Link>
                </Button>
            </div>
        );
    }

    const disabled = !ready || status.state === "submitting" || Boolean(pricingError);

    return (
        <>
            <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
                <section className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
                        <p className="text-muted-foreground mt-2">Complete your order details.</p>
                    </div>

                    <div className="space-y-4 rounded-lg border p-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">1</span>
                            Contact Information
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="fullname">Full Name *</Label>
                                <Input
                                    id="fullname"
                                    value={customer.fullName}
                                    onChange={(event) => updateCustomer({ fullName: event.target.value })}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone *</Label>
                                <Input
                                    id="phone"
                                    value={customer.phone}
                                    onChange={(event) => updateCustomer({ phone: event.target.value })}
                                    placeholder="+1 (555) 000-0000"
                                    required
                                />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="email">Email (Optional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={customer.email}
                                    onChange={(event) => updateCustomer({ email: event.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">2</span>
                            Shipping & Delivery
                        </h2>
                        <div className="space-y-4">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="address">Shipping Address *</Label>
                                    <textarea
                                        id="address"
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={customer.address}
                                        onChange={(event) => updateCustomer({ address: event.target.value })}
                                        placeholder="Enter full shipping address..."
                                        required
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <Label className="mb-3 block">Delivery Method</Label>
                                {isCalculating && deliveryOptions.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading methods...</div>
                                ) : (
                                    <RadioGroup value={selectedDelivery} onValueChange={setSelectedDelivery} className="grid gap-3">
                                        {deliveryOptions.map((opt) => {
                                            const isSelected = opt.id === selectedDelivery;
                                            return (
                                                <div key={opt.id}>
                                                    <RadioGroupItem value={opt.id} id={opt.id} className="peer sr-only" />
                                                    <Label
                                                        htmlFor={opt.id}
                                                        className={`flex flex-col items-start text-left w-full gap-0 rounded-lg border-2 p-3.5 transition-all cursor-pointer ${
                                                            isSelected
                                                                ? "border-primary bg-popover shadow-sm ring-1 ring-primary/20"
                                                                : "border-muted bg-popover/50 hover:bg-accent hover:text-accent-foreground"
                                                        }`}
                                                    >
                                                        <div className="flex w-full items-center justify-between">
                                                            <div className="flex items-center gap-3 font-semibold text-sm">
                                                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-primary text-primary" : "border-muted-foreground/40"}`}>
                                                                    {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                                                                </div>
                                                                <span>{opt.label}</span>
                                                            </div>
                                                            <span className="font-medium text-sm">{formatMoney(opt.amount, symbol)}</span>
                                                        </div>
                                                        {isSelected && opt.note ? (
                                                            <p className="mt-0.5 text-xs text-muted-foreground leading-tight pl-7 text-left">
                                                                {opt.note}
                                                            </p>
                                                        ) : null}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </RadioGroup>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">3</span>
                            Payment Options
                        </h2>
                        <div>
                            {isLoadingPayments ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> Loading payment options...
                                </div>
                            ) : paymentMethods.length === 0 ? (
                                <div className="rounded-md border p-4 bg-muted/20 text-sm text-muted-foreground">
                                    No payment options available.
                                </div>
                            ) : (
                                <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment} className="grid gap-3">
                                    {paymentMethods.map((pm) => {
                                        const isSelected = pm.id === selectedPayment;
                                        return (
                                            <div key={pm.id}>
                                                <RadioGroupItem value={pm.id} id={`pm-${pm.id}`} className="peer sr-only" />
                                                <Label
                                                    htmlFor={`pm-${pm.id}`}
                                                    className={`flex flex-col items-start text-left w-full gap-0 rounded-lg border-2 p-3.5 transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "border-primary bg-popover shadow-sm ring-1 ring-primary/20"
                                                            : "border-muted bg-popover/50 hover:bg-accent hover:text-accent-foreground"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 font-semibold text-sm">
                                                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-primary text-primary" : "border-muted-foreground/40"}`}>
                                                            {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                                                        </div>
                                                        <span>{pm.label}</span>
                                                    </div>
                                                    {isSelected && pm.note ? (
                                                        <p className="mt-0.5 text-xs text-muted-foreground leading-tight pl-7 text-left">
                                                            {pm.note}
                                                        </p>
                                                    ) : null}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </RadioGroup>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="lg:sticky lg:top-8 h-fit space-y-6">
                    <div className="rounded-lg border bg-card shadow-sm">
                        <div className="p-6 pb-4 border-b">
                            <h2 className="text-lg font-semibold">Order Summary</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <ul className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {cart.items.map((item) => (
                                    <li key={item.id} className="flex gap-4">
                                        <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center text-muted-foreground text-xs overflow-hidden">
                                            {item.imageUrl ? (
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    width={64}
                                                    height={64}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span>No image</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-medium">{formatMoney(item.price * item.quantity, symbol)}</p>
                                    </li>
                                ))}
                            </ul>

                            <div className="space-y-2">
                                <Label>Discount Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter coupon"
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(e.target.value.toUpperCase());
                                            if (!appliedCoupon && couponState.state !== "idle") {
                                                setCouponState({ state: "idle" });
                                            }
                                        }}
                                        disabled={!!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <Button type="button" variant="destructive" onClick={handleRemoveCoupon}>Remove</Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleApplyCoupon}
                                            disabled={isCalculating || !couponCode.trim()}
                                        >
                                            Apply
                                        </Button>
                                    )}
                                </div>
                                {couponState.state === "success" && couponState.message ? (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <Tag className="h-3 w-3" /> {couponState.message}
                                    </p>
                                ) : null}
                                {couponState.state === "error" && couponState.message ? (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> {couponState.message}
                                    </p>
                                ) : null}
                                {appliedCoupon && totals?.discount && (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <Tag className="h-3 w-3" /> Discount applied: {totals.discount.code}
                                    </p>
                                )}
                            </div>

                            <Separator />

                            {pricingError ? (
                                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{pricingError}</span>
                                </div>
                            ) : null}

                            {isCalculating ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">Calculating...</span>
                                </div>
                            ) : (
                                <div className="space-y-4 pt-6 text-sm">
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span className="text-foreground font-medium">{totals ? formatMoney(totals.subtotal, symbol) : "..."}</span>
                                    </div>

                                    {totals?.delivery && (
                                        <div className="flex justify-between items-center text-muted-foreground">
                                            <span>Delivery ({totals.delivery.label})</span>
                                            <span className="text-foreground font-medium">{formatMoney(totals.delivery.amount, symbol)}</span>
                                        </div>
                                    )}

                                    {/* Charges Analysis */}
                                    {(totals?.charges?.length ?? 0) > 0 && <Separator className="my-2 opacity-50" />}

                                    {totals?.charges.map(c => (
                                        <div key={c.id} className="flex justify-between items-center text-muted-foreground">
                                            <span>
                                                {c.label}
                                                {c.calc_type === 'percent' && c.raw_value ? (
                                                    <span className="text-xs ml-1 opacity-70">({c.raw_value}%)</span>
                                                ) : c.calc_type === 'amount' && c.raw_value ? (
                                                    <span className="text-xs ml-1 opacity-70">({symbol}{c.raw_value})</span>
                                                ) : ''}
                                            </span>
                                            <span className={c.type === 'discount' ? 'text-green-600 font-medium' : 'text-foreground font-medium'}>
                                                {c.type === 'discount' ? '-' : ''}{formatMoney(c.amount, symbol)}
                                            </span>
                                        </div>
                                    ))}

                                    {totals?.discount && (
                                        <div className="flex justify-between items-center text-green-600">
                                            <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" /> Discount ({totals.discount.code})</span>
                                            <span className="font-medium">-{formatMoney(totals.discount.amount, symbol)}</span>
                                        </div>
                                    )}

                                    <Separator className="my-2 bg-foreground/10" />
                                    <div className="flex justify-between items-end pt-2">
                                        <span className="font-semibold text-lg">Total</span>
                                        <span className="font-bold text-2xl tracking-tight">{totals ? formatMoney(totals.total, symbol) : "..."}</span>
                                    </div>
                                </div>
                            )}

                            <Button type="submit" disabled={disabled || status.state === "submitting"} className="w-full text-lg h-12">
                                {status.state === "submitting" ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                                ) : (
                                    checkoutButtonLabel
                                )}
                            </Button>

                            {status.state === "error" && status.message && (
                                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    {status.message}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </form>

            {/* Step 2 Modal for Instructions & Data Collection */}
            <Dialog open={isInstructionModalOpen} onOpenChange={setIsInstructionModalOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="pb-2 border-b">
                        <DialogTitle className="text-xl font-bold">{selectedPm?.label || "Payment Instructions"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {selectedPm?.instructions ? (
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <Markdown content={selectedPm.instructions} />
                            </div>
                        ) : null}

                        {customFieldsList.length > 0 ? (
                            <div className="space-y-4 rounded-lg border p-4">
                                <p className="text-sm font-semibold">Payment Details Required</p>
                                {customFieldsList.map((field) => (
                                    <div key={field.id} className="grid gap-2">
                                        <Label htmlFor={`mod-${field.id}`} className="text-xs font-medium">
                                            {field.label} {field.required ? <span className="text-destructive">*</span> : null}
                                        </Label>
                                        <Input
                                            id={`mod-${field.id}`}
                                            value={customFieldValues[field.id] || ""}
                                            onChange={(e) =>
                                                setCustomFieldValues((prev) => ({
                                                    ...prev,
                                                    [field.id]: e.target.value,
                                                }))
                                            }
                                            placeholder={field.placeholder || `Enter ${field.label}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {status.state === "error" && status.message && (
                            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{status.message}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsInstructionModalOpen(false)}
                            disabled={status.state === "submitting"}
                            className="w-full sm:w-auto min-w-[110px]"
                        >
                            Back
                        </Button>
                        <Button
                            type="button"
                            onClick={handleModalFinalSubmit}
                            disabled={!isInstructionFormValid || status.state === "submitting"}
                            className="w-full sm:w-auto min-w-[150px]"
                        >
                            {status.state === "submitting" ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                            ) : (
                                "Place Order"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
