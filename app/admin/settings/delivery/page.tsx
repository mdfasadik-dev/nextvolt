"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    getDeliveryOptionsWithRules,
    createDeliveryOption,
    updateDeliveryOption,
    deleteDeliveryOption,
    replaceDeliveryWeightRules,
    updateDeliveryOrder,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
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

type RoundingMode = "ceil" | "floor" | "round";

type DeliveryRule = {
    id?: string;
    label: string;
    min_weight_grams: string;
    max_weight_grams: string;
    base_weight_grams: string;
    base_charge: string;
    incremental_unit_grams: string;
    incremental_charge: string;
    increment_rounding: RoundingMode;
    is_active: boolean;
    sort_order: number;
};

type DeliveryOption = {
    id: string;
    label: string;
    amount: number;
    is_active: boolean;
    is_default: boolean;
    sort_order: number;
    rules: DeliveryRule[];
};

type DeliveryOptionPayload = {
    label: string;
    amount: number;
    sort_order: number;
    is_active: boolean;
    is_default: boolean;
    metadata: null;
};

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

function createEmptyRule(nextSort: number): DeliveryRule {
    return {
        label: "",
        min_weight_grams: "0",
        max_weight_grams: "",
        base_weight_grams: "500",
        base_charge: "0",
        incremental_unit_grams: "1000",
        incremental_charge: "0",
        increment_rounding: "ceil",
        is_active: true,
        sort_order: nextSort,
    };
}

function toRuleDraft(raw: Record<string, unknown>, index: number): DeliveryRule {
    const readNumber = (key: string, fallback: number) => {
        const value = raw[key];
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
        return String(fallback);
    };
    return {
        id: typeof raw.id === "string" ? raw.id : undefined,
        label: typeof raw.label === "string" ? raw.label : "",
        min_weight_grams: readNumber("min_weight_grams", 0),
        max_weight_grams: raw.max_weight_grams == null ? "" : String(raw.max_weight_grams),
        base_weight_grams: readNumber("base_weight_grams", 0),
        base_charge: readNumber("base_charge", 0),
        incremental_unit_grams: readNumber("incremental_unit_grams", 0),
        incremental_charge: readNumber("incremental_charge", 0),
        increment_rounding: raw.increment_rounding === "floor" || raw.increment_rounding === "round" ? raw.increment_rounding : "ceil",
        is_active: typeof raw.is_active === "boolean" ? raw.is_active : true,
        sort_order: typeof raw.sort_order === "number" ? raw.sort_order : index,
    };
}

function toOption(raw: Record<string, unknown>): DeliveryOption | null {
    if (typeof raw.id !== "string" || typeof raw.label !== "string") return null;
    const rulesRaw = Array.isArray(raw.delivery_weight_rules) ? raw.delivery_weight_rules : [];
    return {
        id: raw.id,
        label: raw.label,
        amount: typeof raw.amount === "number" ? raw.amount : 0,
        is_active: typeof raw.is_active === "boolean" ? raw.is_active : true,
        is_default: typeof raw.is_default === "boolean" ? raw.is_default : false,
        sort_order: typeof raw.sort_order === "number" ? raw.sort_order : 0,
        rules: rulesRaw
            .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
            .map((rule, index) => toRuleDraft(rule, index)),
    };
}

function sortRules(rules: DeliveryRule[]) {
    return [...rules].sort((a, b) => a.sort_order - b.sort_order);
}

function SortableRow({
    opt,
    onEdit,
    onDelete,
}: {
    opt: DeliveryOption;
    onEdit: (opt: DeliveryOption) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: opt.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell>
                <div {...attributes} {...listeners} className="cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
            </TableCell>
            <TableCell className="font-medium">{opt.label}</TableCell>
            <TableCell>{CURRENCY}{opt.amount.toFixed(2)}</TableCell>
            <TableCell>{opt.rules.length}</TableCell>
            <TableCell>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${opt.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {opt.is_active ? "Active" : "Inactive"}
                </span>
            </TableCell>
            <TableCell>{opt.is_default ? <span className="text-blue-600 font-semibold text-xs">Default</span> : null}</TableCell>
            <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(opt)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDelete(opt.id)}><Trash2 className="h-4 w-4" /></Button>
            </TableCell>
        </TableRow>
    );
}

export default function DeliverySettingsPage() {
    const { push } = useToast();
    const [options, setOptions] = useState<DeliveryOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentOption, setCurrentOption] = useState<DeliveryOption | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("0");
    const [active, setActive] = useState(true);
    const [isDefault, setIsDefault] = useState(false);
    const [rules, setRules] = useState<DeliveryRule[]>([]);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const sortedRules = useMemo(() => sortRules(rules), [rules]);

    const loadOptions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDeliveryOptionsWithRules();
            const normalized = (data || [])
                .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
                .map((entry) => toOption(entry))
                .filter((entry): entry is DeliveryOption => !!entry)
                .sort((a, b) => a.sort_order - b.sort_order);
            setOptions(normalized);
        } catch (error) {
            console.error("Failed to load delivery options:", error);
            push({ title: "Error", description: "Failed to load delivery options", variant: "error" });
        } finally {
            setLoading(false);
        }
    }, [push]);

    useEffect(() => {
        void loadOptions();
    }, [loadOptions]);

    const resetForm = (option: DeliveryOption | null) => {
        setCurrentOption(option);
        setLabel(option?.label || "");
        setAmount(String(option?.amount ?? 0));
        setActive(option?.is_active ?? true);
        setIsDefault(option?.is_default ?? false);
        setRules(option ? sortRules(option.rules) : []);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active: activeItem, over } = event;
        if (activeItem.id === over?.id) return;

        let newItems: DeliveryOption[] = [];
        setOptions((items) => {
            const oldIndex = items.findIndex((item) => item.id === activeItem.id);
            const newIndex = items.findIndex((item) => item.id === over?.id);
            newItems = arrayMove(items, oldIndex, newIndex);
            return newItems;
        });

        if (newItems.length > 0) {
            const updates = newItems.map((item, index) => ({ id: item.id, sort_order: index }));
            updateDeliveryOrder(updates).catch(() => {
                push({ title: "Update failed", description: "Failed to save order", variant: "error" });
                void loadOptions();
            });
        }
    };

    const setRuleField = (index: number, patch: Partial<DeliveryRule>) => {
        setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
    };

    const addRule = () => {
        setRules((prev) => [...prev, createEmptyRule(prev.length)]);
    };

    const removeRule = (index: number) => {
        setRules((prev) =>
            prev
                .filter((_, i) => i !== index)
                .map((rule, i) => ({ ...rule, sort_order: i })),
        );
    };

    const validateRules = (input: DeliveryRule[]) => {
        for (const [index, rule] of input.entries()) {
            const min = Number(rule.min_weight_grams);
            const max = rule.max_weight_grams.trim() ? Number(rule.max_weight_grams) : null;
            const baseWeight = Number(rule.base_weight_grams);
            const baseCharge = Number(rule.base_charge);
            const unitGrams = Number(rule.incremental_unit_grams);
            const unitCharge = Number(rule.incremental_charge);

            if (!Number.isFinite(min) || min < 0) return `Rule ${index + 1}: minimum weight must be >= 0.`;
            if (max != null && (!Number.isFinite(max) || max <= min)) return `Rule ${index + 1}: max weight must be greater than min weight.`;
            if (!Number.isFinite(baseWeight) || baseWeight < 0) return `Rule ${index + 1}: base weight must be >= 0.`;
            if (!Number.isFinite(baseCharge) || baseCharge < 0) return `Rule ${index + 1}: base charge must be >= 0.`;
            if (!Number.isFinite(unitGrams) || unitGrams < 0) return `Rule ${index + 1}: incremental unit must be >= 0.`;
            if (!Number.isFinite(unitCharge) || unitCharge < 0) return `Rule ${index + 1}: incremental charge must be >= 0.`;
        }
        return null;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = Number(amount);

        if (!label.trim()) {
            push({ title: "Label required", description: "Enter a delivery method label.", variant: "error" });
            return;
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            push({ title: "Invalid amount", description: "Amount must be zero or more.", variant: "error" });
            return;
        }
        const rulesValidation = validateRules(sortedRules);
        if (rulesValidation) {
            push({ title: "Invalid rule", description: rulesValidation, variant: "error" });
            return;
        }

        const payload: DeliveryOptionPayload = {
            label: label.trim(),
            amount: parsedAmount,
            sort_order: currentOption ? currentOption.sort_order : options.length,
            is_active: active,
            is_default: isDefault,
            metadata: null,
        };

        const rulesPayload = sortedRules.map((rule, index) => ({
            delivery_id: currentOption?.id || "",
            label: rule.label.trim() || null,
            min_weight_grams: Number(rule.min_weight_grams),
            max_weight_grams: rule.max_weight_grams.trim() ? Number(rule.max_weight_grams) : null,
            base_weight_grams: Number(rule.base_weight_grams),
            base_charge: Number(rule.base_charge),
            incremental_unit_grams: Number(rule.incremental_unit_grams),
            incremental_charge: Number(rule.incremental_charge),
            increment_rounding: rule.increment_rounding,
            sort_order: index,
            is_active: rule.is_active,
            metadata: null,
        }));

        setSaving(true);
        try {
            const saved = currentOption
                ? await updateDeliveryOption(currentOption.id, payload)
                : await createDeliveryOption(payload);
            await replaceDeliveryWeightRules(saved.id, rulesPayload);
            push({
                title: currentOption ? "Updated" : "Created",
                description: "Delivery method saved with pricing rules.",
                variant: "success",
            });
            setIsDialogOpen(false);
            await loadOptions();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save delivery method.";
            push({ title: "Save failed", description: message, variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDeliveryOption(deleteId);
            push({ title: "Deleted", description: "Delivery method removed", variant: "success" });
            await loadOptions();
        } catch (error) {
            console.error("Failed to delete:", error);
            push({ title: "Error", description: "Failed to delete", variant: "error" });
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Delivery Settings</h2>
                    <p className="text-muted-foreground">Flat charges + advanced weight-range pricing rules.</p>
                </div>
                <Button
                    onClick={() => {
                        resetForm(null);
                        setIsDialogOpen(true);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Method
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Delivery Methods</CardTitle>
                    <CardDescription>Drag to reorder methods shown on checkout.</CardDescription>
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
                                        <TableHead>Label</TableHead>
                                        <TableHead>Fallback</TableHead>
                                        <TableHead>Rules</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Default</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <SortableContext items={options.map((opt) => opt.id)} strategy={verticalListSortingStrategy}>
                                        {options.map((opt) => (
                                            <SortableRow
                                                key={opt.id}
                                                opt={opt}
                                                onEdit={(option) => {
                                                    resetForm(option);
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
                <DialogContent className="w-[calc(100%-2rem)] overflow-auto sm:max-w-4xl lg:max-w-5xl">
                    <div className="flex h-[min(90vh,920px)] min-h-0 min-w-0 flex-col">
                        <DialogHeader>
                            <DialogTitle>{currentOption ? "Edit Delivery Method" : "New Delivery Method"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-6 p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="label">Label</Label>
                                    <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Home Delivery" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="amount">Fallback Amount ({CURRENCY})</Label>
                                    <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                                </div>
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

                            <div className="space-y-3 rounded-lg border p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-semibold">Weight Rules</h4>
                                        <p className="text-xs text-muted-foreground">Example: up to 500g base charge, then add per 1000g or per 1g.</p>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={addRule}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Rule
                                    </Button>
                                </div>

                                {sortedRules.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No rules configured. Fallback amount will be used.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {sortedRules.map((rule, index) => (
                                            <div key={`${rule.id || "new"}-${index}`} className="space-y-3 rounded-md border p-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium">Rule {index + 1}</span>
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRule(index)} className="text-red-500 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-3">
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Label (optional)</Label>
                                                        <Input value={rule.label} onChange={(e) => setRuleField(index, { label: e.target.value })} placeholder="e.g. 0-500g" />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Min Weight (g)</Label>
                                                        <Input type="number" min="0" step="0.001" value={rule.min_weight_grams} onChange={(e) => setRuleField(index, { min_weight_grams: e.target.value })} />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Max Weight (g)</Label>
                                                        <Input type="number" min="0" step="0.001" value={rule.max_weight_grams} onChange={(e) => setRuleField(index, { max_weight_grams: e.target.value })} placeholder="Leave empty = no max" />
                                                    </div>
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-4">
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Base Weight (g)</Label>
                                                        <Input type="number" min="0" step="0.001" value={rule.base_weight_grams} onChange={(e) => setRuleField(index, { base_weight_grams: e.target.value })} />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Base Charge</Label>
                                                        <Input type="number" min="0" step="0.01" value={rule.base_charge} onChange={(e) => setRuleField(index, { base_charge: e.target.value })} />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Increment Unit (g)</Label>
                                                        <Input type="number" min="0" step="0.001" value={rule.incremental_unit_grams} onChange={(e) => setRuleField(index, { incremental_unit_grams: e.target.value })} />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Increment Charge</Label>
                                                        <Input type="number" min="0" step="0.01" value={rule.incremental_charge} onChange={(e) => setRuleField(index, { incremental_charge: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <div className="grid gap-1">
                                                        <Label className="text-xs">Rounding</Label>
                                                        <Select value={rule.increment_rounding} onValueChange={(value) => setRuleField(index, { increment_rounding: value as RoundingMode })}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="ceil">Ceil (always round up)</SelectItem>
                                                                <SelectItem value="round">Round (nearest)</SelectItem>
                                                                <SelectItem value="floor">Floor (round down)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="flex items-end">
                                                        <div className="flex items-center justify-between w-full rounded-md border p-2">
                                                            <Label className="text-xs">Rule Active</Label>
                                                            <Switch checked={rule.is_active} onCheckedChange={(checked) => setRuleField(index, { is_active: checked })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancel</Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this delivery method and all weight rules.</AlertDialogDescription>
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
