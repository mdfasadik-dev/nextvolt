"use client";

import { useEffect, useState } from "react";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast-provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Coupon = {
    id: string;
    code: string;
    calc_type: "percent" | "amount";
    amount: number;
    min_order_amount: number | null;
    is_active: boolean;
    valid_from: string | null;
    valid_to: string | null;
    description: string | null;
};

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

export default function CouponsPage() {
    const toast = useToast();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [current, setCurrent] = useState<Coupon | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getCoupons();
            setCoupons(data as Coupon[]);
        } catch (error) {
            console.error("Failed to load coupons:", error);
            toast.push({ title: "Error", description: "Failed to load coupons", variant: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const payload = {
            code: formData.get("code")?.toString().toUpperCase(),
            calc_type: formData.get("calc_type"),
            amount: Number(formData.get("amount")),
            min_order_amount: Number(formData.get("min_order_amount")) || null,
            valid_from: formData.get("valid_from") || null,
            valid_to: formData.get("valid_to") || null,
            is_active: formData.get("is_active") === "on",
            description: formData.get("description"),
        };

        try {
            if (current) {
                await updateCoupon(current.id, payload);
                toast.push({ title: "Updated", description: "Coupon updated successfully", variant: "success" });
            } else {
                await createCoupon(payload);
                toast.push({ title: "Created", description: "Coupon created successfully", variant: "success" });
            }
            setIsDialogOpen(false);
            load();
        } catch (error: any) {
            console.error("Failed to save:", error);
            toast.push({ title: "Error", description: error.message || "Failed to save", variant: "error" });
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteCoupon(deleteId);
            toast.push({ title: "Deleted", description: "Coupon removed", variant: "success" });
            load();
        } catch (error) {
            console.error("Failed to delete:", error);
            toast.push({ title: "Error", description: "Failed to delete", variant: "error" });
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Coupons</h2>
                    <p className="text-muted-foreground">Manage discount codes and promotions.</p>
                </div>
                <Button onClick={() => { setCurrent(null); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Create Coupon
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Coupons</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Min Spend</TableHead>
                                    <TableHead>Validity</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-mono font-medium">{c.code}</TableCell>
                                        <TableCell>
                                            {c.calc_type === 'percent' ? `${c.amount}%` : `${CURRENCY}${c.amount}`}
                                        </TableCell>
                                        <TableCell>
                                            {c.min_order_amount ? `${CURRENCY}${c.min_order_amount}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {c.valid_to ? `Ends ${format(new Date(c.valid_to), 'MMM d, yyyy')}` : 'Forever'}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}`}>
                                                {c.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => { setCurrent(c); setIsDialogOpen(true); }}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(c.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{current ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="flex gap-4">
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="code">Code</Label>
                                <Input id="code" name="code" defaultValue={current?.code} required className="uppercase" placeholder="e.g. SUMMER25" />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="calc_type">Type</Label>
                                <Select name="calc_type" defaultValue={current?.calc_type || "percent"}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">Percent Off</SelectItem>
                                        <SelectItem value="amount">Fixed Amount Off</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="amount">Value</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" defaultValue={current?.amount} required />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="min_order_amount">Min Spend (Optional)</Label>
                                <Input id="min_order_amount" name="min_order_amount" type="number" step="0.01" defaultValue={current?.min_order_amount || ""} />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="valid_from">Start Date</Label>
                                <Input id="valid_from" name="valid_from" type="date" defaultValue={current?.valid_from ? new Date(current.valid_from).toISOString().split('T')[0] : ""} />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="valid_to">End Date</Label>
                                <Input id="valid_to" name="valid_to" type="date" defaultValue={current?.valid_to ? new Date(current.valid_to).toISOString().split('T')[0] : ""} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" name="description" defaultValue={current?.description || ""} placeholder="Internal note or customer visible text" />
                        </div>

                        <div className="flex items-center justify-between border p-3 rounded-md">
                            <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                            <Switch id="is_active" name="is_active" defaultChecked={current ? current.is_active : true} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this coupon. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
