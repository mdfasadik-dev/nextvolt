"use client";

import { useCallback, useEffect, useState } from "react";
import {
    getPaymentMethodsAdmin,
    createPaymentMethodAction,
    updatePaymentMethodAction,
    deletePaymentMethodAction,
    updatePaymentMethodOrderAction,
    getChargeOptions,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, GripVertical, Check } from "lucide-react";
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
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PaymentMethodWithCharges, ChargeOption, PaymentMethodCustomField } from "@/lib/services/paymentMethodService";
import { MarkdownEditor } from "@/components/ui/markdown-editor";

function SortableRow({
    pm,
    onEdit,
    onDelete,
}: {
    pm: PaymentMethodWithCharges;
    onEdit: (pm: PaymentMethodWithCharges) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: pm.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell>
                <div {...attributes} {...listeners} className="cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
            </TableCell>
            <TableCell className="font-medium">
                <div>
                    <p className="font-semibold">{pm.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{pm.key}</p>
                </div>
            </TableCell>
            <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                {pm.note || "—"}
            </TableCell>
            <TableCell>
                {pm.charges.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {pm.charges.map((c) => (
                            <span key={c.id} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                {c.label} ({c.calc_type === 'percent' ? `${c.amount}%` : `$${c.amount}`})
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">No charge profile</span>
                )}
            </TableCell>
            <TableCell>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pm.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {pm.is_active ? "Active" : "Inactive"}
                </span>
            </TableCell>
            <TableCell>
                {pm.is_default ? <span className="text-blue-600 font-semibold text-xs">Default</span> : null}
            </TableCell>
            <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(pm)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDelete(pm.id)}><Trash2 className="h-4 w-4" /></Button>
            </TableCell>
        </TableRow>
    );
}

export default function PaymentSettingsPage() {
    const { push } = useToast();
    const [methods, setMethods] = useState<PaymentMethodWithCharges[]>([]);
    const [allCharges, setAllCharges] = useState<ChargeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentMethod, setCurrentMethod] = useState<PaymentMethodWithCharges | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [key, setKey] = useState("");
    const [label, setLabel] = useState("");
    const [note, setNote] = useState("");
    const [buttonLabel, setButtonLabel] = useState("Place Order");
    const [instructions, setInstructions] = useState("");
    const [customFields, setCustomFields] = useState<PaymentMethodCustomField[]>([]);
    const [active, setActive] = useState(true);
    const [isDefault, setIsDefault] = useState(false);
    const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pms, charges] = await Promise.all([
                getPaymentMethodsAdmin(),
                getChargeOptions(),
            ]);
            setMethods(pms as PaymentMethodWithCharges[]);
            setAllCharges((charges || []) as ChargeOption[]);
        } catch (error) {
            console.error("Failed to load payment methods data:", error);
            push({ title: "Error", description: "Failed to load payment settings", variant: "error" });
        } finally {
            setLoading(false);
        }
    }, [push]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const resetForm = (pm: PaymentMethodWithCharges | null) => {
        setCurrentMethod(pm);
        setKey(pm?.key || "");
        setLabel(pm?.label || "");
        setNote(pm?.note || "");
        setButtonLabel(pm?.button_label || "Place Order");
        setInstructions(pm?.instructions || "");
        setCustomFields(pm?.custom_fields ? (pm.custom_fields as PaymentMethodCustomField[]) : []);
        setActive(pm?.is_active ?? true);
        setIsDefault(pm?.is_default ?? false);
        setSelectedChargeIds(pm ? pm.charges.map((c) => c.id) : []);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active: activeItem, over } = event;
        if (activeItem.id === over?.id) return;

        let newItems: PaymentMethodWithCharges[] = [];
        setMethods((items) => {
            const oldIndex = items.findIndex((item) => item.id === activeItem.id);
            const newIndex = items.findIndex((item) => item.id === over?.id);
            newItems = arrayMove(items, oldIndex, newIndex);
            return newItems;
        });

        if (newItems.length > 0) {
            const updates = newItems.map((item, index) => ({ id: item.id, sort_order: index }));
            updatePaymentMethodOrderAction(updates).catch(() => {
                push({ title: "Update failed", description: "Failed to save order", variant: "error" });
                void loadData();
            });
        }
    };

    const toggleChargeSelection = (chargeId: string) => {
        setSelectedChargeIds((prev) =>
            prev.includes(chargeId) ? prev.filter((id) => id !== chargeId) : [...prev, chargeId]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanLabel = label.trim();
        const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");

        if (!cleanLabel) {
            push({ title: "Label required", description: "Enter a payment method label.", variant: "error" });
            return;
        }
        if (!cleanKey) {
            push({ title: "Key required", description: "Enter a unique key identifier.", variant: "error" });
            return;
        }

        const payload = {
            label: cleanLabel,
            key: cleanKey,
            note: note.trim() || null,
            button_label: buttonLabel.trim() || "Place Order",
            instructions: instructions.trim() || null,
            custom_fields: customFields,
            is_active: active,
            is_default: isDefault,
            sort_order: currentMethod ? currentMethod.sort_order : methods.length,
        };

        setSaving(true);
        try {
            if (currentMethod) {
                await updatePaymentMethodAction(currentMethod.id, payload, selectedChargeIds);
                push({ title: "Updated", description: "Payment method updated", variant: "success" });
            } else {
                await createPaymentMethodAction(payload, selectedChargeIds);
                push({ title: "Created", description: "Payment method created", variant: "success" });
            }
            setIsDialogOpen(false);
            await loadData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save payment method.";
            push({ title: "Save failed", description: message, variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deletePaymentMethodAction(deleteId);
            push({ title: "Deleted", description: "Payment method removed", variant: "success" });
            await loadData();
        } catch (error) {
            console.error("Failed to delete:", error);
            push({ title: "Error", description: "Failed to delete payment method", variant: "error" });
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Payment Settings</h2>
                    <p className="text-muted-foreground">Manage payment options, customer instructions, custom fields, and linked charge profiles.</p>
                </div>
                <Button
                    onClick={() => {
                        resetForm(null);
                        setIsDialogOpen(true);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Payment Method
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Drag to reorder options shown on checkout.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Customer Note</TableHead>
                                        <TableHead>Charge Profiles</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Default</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <SortableContext items={methods.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                                        {methods.map((pm) => (
                                            <SortableRow
                                                key={pm.id}
                                                pm={pm}
                                                onEdit={(item) => {
                                                    resetForm(item);
                                                    setIsDialogOpen(true);
                                                }}
                                                onDelete={(id) => setDeleteId(id)}
                                            />
                                        ))}
                                    </SortableContext>
                                </TableBody>
                            </Table>
                        </DndContext>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentMethod ? "Edit Payment Method" : "New Payment Method"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-5 py-2">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="label">Label *</Label>
                                <Input
                                    id="label"
                                    value={label}
                                    onChange={(e) => {
                                        setLabel(e.target.value);
                                        if (!currentMethod) {
                                            setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"));
                                        }
                                    }}
                                    placeholder="e.g. Direct bank transfer"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="key">Unique Key *</Label>
                                <Input
                                    id="key"
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    placeholder="e.g. bank_transfer"
                                    required
                                    disabled={!!currentMethod}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="note">Customer Note</Label>
                            <textarea
                                id="note"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. Make your payment directly into our bank account."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="buttonLabel">Checkout Button Label</Label>
                            <Input
                                id="buttonLabel"
                                value={buttonLabel}
                                onChange={(e) => setButtonLabel(e.target.value)}
                                placeholder="e.g. Proceed to Payment Instructions or Place Order"
                            />
                            <p className="text-xs text-muted-foreground">Default: &quot;Place Order&quot;. If customized or instructions are added, it takes customer to the instructions step.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="instructions">Payment Instructions (Markdown)</Label>
                            <p className="text-xs text-muted-foreground font-medium">Markdown content shown on next page step (supports headings, bold, bullet points, bank account details, etc.).</p>
                            <MarkdownEditor
                                value={instructions}
                                onChange={setInstructions}
                                preview="toggle"
                                placeholder="Enter detailed payment instructions (e.g. Bank Account Number, Bkash Agent number...)"
                                minHeight={160}
                            />
                        </div>

                        <div className="space-y-3 rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-semibold">Data Collection Fields (User Inputs)</Label>
                                    <p className="text-xs text-muted-foreground">Add fields customer must fill out (e.g. Transaction ID, Sender Phone Number).</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const newField: PaymentMethodCustomField = {
                                            id: `field_${Date.now()}`,
                                            label: "",
                                            placeholder: "",
                                            required: true,
                                        };
                                        setCustomFields((prev) => [...prev, newField]);
                                    }}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Field
                                </Button>
                            </div>

                            {customFields.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No input fields added. Customers will proceed without submitting extra fields.</p>
                            ) : (
                                <div className="space-y-3">
                                    {customFields.map((field, idx) => (
                                        <div key={field.id} className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs md:grid-cols-[1.5fr,1.5fr,auto,auto] md:items-end">
                                            <div>
                                                <Label className="text-[11px]">Field Label *</Label>
                                                <Input
                                                    className="h-8 text-xs mt-1"
                                                    value={field.label}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setCustomFields((prev) =>
                                                            prev.map((f, i) => (i === idx ? { ...f, label: val } : f))
                                                        );
                                                    }}
                                                    placeholder="e.g. Transaction ID"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px]">Placeholder (Optional)</Label>
                                                <Input
                                                    className="h-8 text-xs mt-1"
                                                    value={field.placeholder || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setCustomFields((prev) =>
                                                            prev.map((f, i) => (i === idx ? { ...f, placeholder: val } : f))
                                                        );
                                                    }}
                                                    placeholder="e.g. e.g. 8N7X2P9Q"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 pb-2">
                                                <input
                                                    type="checkbox"
                                                    id={`req-${field.id}`}
                                                    checked={field.required}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setCustomFields((prev) =>
                                                            prev.map((f, i) => (i === idx ? { ...f, required: checked } : f))
                                                        );
                                                    }}
                                                    className="h-4 w-4 rounded text-primary"
                                                />
                                                <Label htmlFor={`req-${field.id}`} className="cursor-pointer text-xs">Required</Label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                                                onClick={() => {
                                                    setCustomFields((prev) => prev.filter((_, i) => i !== idx));
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 rounded-lg border p-3">
                            <Label className="text-sm font-semibold">Assign Charge Profiles (Taxes / Fees / Discounts)</Label>
                            <p className="text-xs text-muted-foreground">Select charges that will apply when a customer picks this payment method.</p>

                            {allCharges.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No charge profiles created yet. Manage charge profiles under Settings &gt; Charges.</p>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {allCharges.map((c) => {
                                        const isChecked = selectedChargeIds.includes(c.id);
                                        return (
                                            <div
                                                key={c.id}
                                                onClick={() => toggleChargeSelection(c.id)}
                                                className={`flex cursor-pointer items-center justify-between rounded-md border p-2.5 text-xs transition-colors ${isChecked ? "border-primary bg-primary/10 font-semibold text-primary" : "bg-muted/40 hover:bg-muted"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex h-4 w-4 items-center justify-center rounded border ${isChecked ? "bg-primary border-primary text-white" : "border-input"}`}>
                                                        {isChecked && <Check className="h-3 w-3" />}
                                                    </div>
                                                    <span>{c.label}</span>
                                                </div>
                                                <span className="text-muted-foreground">
                                                    {c.type === "discount" ? "-" : "+"}{c.calc_type === "percent" ? `${c.amount}%` : `$${c.amount}`}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                                <Switch id="is_active" checked={active} onCheckedChange={setActive} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_default" className="cursor-pointer">Default Selection</Label>
                                <Switch id="is_default" checked={isDefault} onCheckedChange={setIsDefault} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancel</Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Method
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this payment method.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
