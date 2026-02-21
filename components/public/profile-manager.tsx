"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Pencil, Phone, UserRound } from "lucide-react";
import { useCustomerStorage } from "@/components/cart/use-customer-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrderStatus } from "@/lib/constants/order-status";

type LookupResponse = {
    exists: boolean;
    customer: {
        fullName: string;
        email: string;
        phone: string;
        address: string;
    } | null;
};

type ProfileOrder = {
    id: string;
    createdAt: string;
    status: OrderStatus;
    totalAmount: number;
    currency: string;
    itemsCount: number;
};

type OrdersResponse = {
    orders: ProfileOrder[];
};

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function formatOrderDate(value: string) {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function formatMoney(amount: number) {
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
    return `${symbol}${amount.toFixed(2)}`;
}

function getInitials(name: string) {
    const parts = name
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function getStatusClass(status: OrderStatus) {
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "accepted") return "bg-blue-100 text-blue-700";
    if (status === "shipped") return "bg-indigo-100 text-indigo-700";
    if (status === "cancelled") return "bg-red-100 text-red-700";
    return "bg-muted text-muted-foreground";
}

export function ProfileManager() {
    const { customer, setCustomerInfo, clearCustomer, ready } = useCustomerStorage();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [mobileInput, setMobileInput] = useState(customer.phone || "");
    const [submittingAuth, setSubmittingAuth] = useState(false);
    const [orders, setOrders] = useState<ProfileOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editDraft, setEditDraft] = useState({
        fullName: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

    const hasProfile = useMemo(() => !!customer.phone.trim(), [customer.phone]);
    const avatarInitials = getInitials(customer.fullName);

    useEffect(() => {
        if (!ready) return;
        if (customer.phone) setMobileInput(customer.phone);
        setIsAuthenticated(hasProfile);
    }, [customer.phone, hasProfile, ready]);

    async function fetchOrders(phone: string) {
        if (!phone.trim()) return;
        setLoadingOrders(true);
        try {
            const response = await fetch("/api/customer/profile/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = (await response.json()) as OrdersResponse & { error?: string };
            if (!response.ok) {
                throw new Error(data.error || "Unable to load order history.");
            }
            setOrders(data.orders || []);
        } catch (error: unknown) {
            setStatus({ type: "error", message: getErrorMessage(error, "Unable to load order history.") });
        } finally {
            setLoadingOrders(false);
        }
    }

    useEffect(() => {
        if (!isAuthenticated || !customer.phone.trim()) {
            setOrders([]);
            return;
        }
        void fetchOrders(customer.phone);
    }, [customer.phone, isAuthenticated]);

    async function handleAuth(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const phone = mobileInput.trim();
        if (!phone) {
            setStatus({ type: "error", message: "Please enter your mobile number." });
            return;
        }

        setSubmittingAuth(true);
        setStatus({ type: "idle" });
        try {
            const response = await fetch("/api/customer/profile/lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = (await response.json()) as LookupResponse & { error?: string };
            if (!response.ok) {
                throw new Error(data.error || "Unable to fetch profile information.");
            }

            if (data.exists && data.customer) {
                setCustomerInfo({
                    fullName: data.customer.fullName || "",
                    email: data.customer.email || "",
                    phone: data.customer.phone || phone,
                    address: data.customer.address || "",
                    notes: customer.notes || "",
                    paymentMethod: customer.paymentMethod || "cod",
                });
                setStatus({ type: "success", message: "Welcome back." });
            } else {
                setCustomerInfo({
                    fullName: "",
                    email: "",
                    phone,
                    address: "",
                    notes: customer.notes || "",
                    paymentMethod: customer.paymentMethod || "cod",
                });
                setStatus({ type: "success", message: "Profile created. Please complete your details." });
                setEditDraft({
                    fullName: "",
                    phone,
                    email: "",
                    address: "",
                    notes: "",
                });
                setEditOpen(true);
            }
            setIsAuthenticated(true);
        } catch (error: unknown) {
            setStatus({ type: "error", message: getErrorMessage(error, "Profile lookup failed.") });
        } finally {
            setSubmittingAuth(false);
        }
    }

    function openEditModal() {
        setEditDraft({
            fullName: customer.fullName,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            notes: customer.notes,
        });
        setEditOpen(true);
    }

    async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editDraft.fullName.trim() || !editDraft.phone.trim() || !editDraft.address.trim()) {
            setStatus({ type: "error", message: "Full name, mobile number, and address are required." });
            return;
        }

        setSavingEdit(true);
        setCustomerInfo({
            ...customer,
            fullName: editDraft.fullName.trim(),
            phone: editDraft.phone.trim(),
            email: editDraft.email.trim(),
            address: editDraft.address.trim(),
            notes: editDraft.notes.trim(),
            paymentMethod: customer.paymentMethod || "cod",
        });
        setMobileInput(editDraft.phone.trim());
        setEditOpen(false);
        setSavingEdit(false);
        setStatus({ type: "success", message: "Profile saved successfully." });
    }

    if (!ready) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading profile...
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
                <p className="text-sm text-muted-foreground">Manage your account and track your orders.</p>
            </header>

            {!isAuthenticated ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Sign In</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="lookup-mobile">Mobile Number</Label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="lookup-mobile"
                                        value={mobileInput}
                                        onChange={(event) => setMobileInput(event.target.value)}
                                        placeholder="+1 555 000 0000"
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={submittingAuth}>
                                {submittingAuth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Continue
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                                    {customer.fullName.trim() ? avatarInitials : <UserRound className="h-5 w-5" />}
                                </span>
                                <div>
                                    <p className="text-base font-semibold">{customer.fullName || "Guest User"}</p>
                                    <p className="text-sm text-muted-foreground">{customer.phone || mobileInput}</p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={openEditModal}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Profile
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Previous Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingOrders ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
                                </div>
                            ) : orders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No previous orders found.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {orders.map((order) => (
                                        <li key={order.id} className="rounded-lg border p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                                                    <p className="text-xs text-muted-foreground">{formatOrderDate(order.createdAt)}</p>
                                                    <p className="text-xs text-muted-foreground">{order.itemsCount} item(s)</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                    <span className="text-sm font-semibold">{formatMoney(order.totalAmount)}</span>
                                                    <Button size="sm" variant="outline" asChild>
                                                        <Link href={`/confirmation/${order.id}?mode=track`}>View Details</Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {isAuthenticated ? (
                <div className="flex flex-wrap items-center gap-3">
                    <Button asChild>
                        <Link href="/checkout">Go to Checkout</Link>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            clearCustomer();
                            setIsAuthenticated(false);
                            setStatus({ type: "idle" });
                            setOrders([]);
                        }}
                    >
                        Sign Out
                    </Button>
                </div>
            ) : null}

            {status.type !== "idle" && status.message ? (
                <div
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
                >
                    {status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{status.message}</span>
                </div>
            ) : null}

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>Update your personal and delivery information.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Full Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={editDraft.fullName}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Mobile Number *</Label>
                                <Input
                                    id="edit-phone"
                                    value={editDraft.phone}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, phone: event.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editDraft.email}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, email: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-notes">Delivery Notes</Label>
                                <Input
                                    id="edit-notes"
                                    value={editDraft.notes}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-address">Address *</Label>
                            <Textarea
                                id="edit-address"
                                value={editDraft.address}
                                onChange={(event) => setEditDraft((prev) => ({ ...prev, address: event.target.value }))}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={savingEdit}>
                                {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
