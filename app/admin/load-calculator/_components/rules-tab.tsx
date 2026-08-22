"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ProductCombobox, type ProductOption } from "@/components/ui/product-combobox";
import type { MetaFieldWithOptions, RuleWithRelations } from "@/lib/services/loadCalculatorService";
import {
    createSuggestionRule,
    deleteSuggestionRule,
    updateSuggestionRule,
    type RuleConditionInput,
    type RuleInput,
} from "../actions";

type Operator = RuleConditionInput["operator"];

const OPERATORS: Array<{ value: Operator; label: string }> = [
    { value: "between", label: "is between" },
    { value: "eq", label: "equals" },
    { value: "neq", label: "does not equal" },
    { value: "in", label: "is any of" },
    { value: "contains", label: "includes all of" },
];

type ConditionRow = {
    field_id: string;
    operator: Operator;
    min_value: string;
    max_value: string;
    value_text: string;
    value_set: string[];
};

type ProductRow = { product: ProductOption; is_primary: boolean };

type RuleForm = {
    id: string | null;
    name: string;
    min_load: string;
    max_load: string;
    unit_symbol: string;
    priority: string;
    headline: string;
    note: string;
    is_active: boolean;
    conditions: ConditionRow[];
    products: ProductRow[];
};

const emptyRule: RuleForm = {
    id: null,
    name: "",
    min_load: "0",
    max_load: "",
    unit_symbol: "W",
    priority: "0",
    headline: "",
    note: "",
    is_active: true,
    conditions: [],
    products: [],
};

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export function RulesTab({
    rules,
    fields,
}: {
    rules: RuleWithRelations[];
    fields: MetaFieldWithOptions[];
}) {
    const toast = useToast();
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState<RuleForm | null>(null);
    const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
    const [picker, setPicker] = useState<ProductOption | null>(null);

    const fieldById = (id: string) => fields.find(field => field.id === id);

    function save() {
        if (!form) return;
        if (!form.name.trim()) {
            toast.push({ variant: "error", title: "Rule name is required" });
            return;
        }
        const minLoad = Number(form.min_load || 0);
        const maxLoad = form.max_load.trim() ? Number(form.max_load) : null;
        if (!Number.isFinite(minLoad) || minLoad < 0) {
            toast.push({ variant: "error", title: "Enter a valid minimum load" });
            return;
        }
        if (maxLoad !== null && (!Number.isFinite(maxLoad) || maxLoad <= minLoad)) {
            toast.push({ variant: "error", title: "Maximum load must be greater than the minimum" });
            return;
        }
        if (!form.products.length) {
            toast.push({ variant: "error", title: "Add at least one product to suggest" });
            return;
        }
        for (const condition of form.conditions) {
            if (!condition.field_id) {
                toast.push({ variant: "error", title: "Every condition needs a field" });
                return;
            }
            if (condition.operator === "between") {
                const hasMin = condition.min_value.trim() !== "";
                const hasMax = condition.max_value.trim() !== "";
                if (!hasMin && !hasMax) {
                    toast.push({ variant: "error", title: "A range condition needs a min or a max" });
                    return;
                }
                if (
                    hasMin &&
                    hasMax &&
                    Number(condition.max_value) <= Number(condition.min_value)
                ) {
                    toast.push({ variant: "error", title: "Condition max must exceed its min" });
                    return;
                }
            }
            if ((condition.operator === "in" || condition.operator === "contains") && !condition.value_set.length) {
                toast.push({ variant: "error", title: "Pick at least one option for the condition" });
                return;
            }
            if ((condition.operator === "eq" || condition.operator === "neq") && !condition.value_text.trim()) {
                toast.push({ variant: "error", title: "Enter a value to compare against" });
                return;
            }
        }

        startTransition(async () => {
            try {
                const payload: RuleInput = {
                    name: form.name.trim(),
                    min_load: minLoad,
                    max_load: maxLoad,
                    unit_symbol: form.unit_symbol.trim() || "W",
                    priority: Number(form.priority || 0),
                    headline: form.headline.trim() || null,
                    note: form.note.trim() || null,
                    is_active: form.is_active,
                    conditions: form.conditions.map(condition => {
                        const field = fieldById(condition.field_id);
                        const numericValue =
                            condition.value_text.trim() !== "" && !Number.isNaN(Number(condition.value_text))
                                ? Number(condition.value_text)
                                : null;
                        return {
                            field_id: condition.field_id,
                            operator: condition.operator,
                            min_value: condition.min_value.trim() ? Number(condition.min_value) : null,
                            max_value: condition.max_value.trim() ? Number(condition.max_value) : null,
                            // Numeric fields compare on the number, choice fields on the text.
                            value_text:
                                field?.is_numeric && numericValue !== null ? null : condition.value_text || null,
                            value_number: field?.is_numeric ? numericValue : null,
                            value_set: condition.value_set.length ? condition.value_set : null,
                        };
                    }),
                    products: form.products.map(row => ({
                        product_id: row.product.id,
                        is_primary: row.is_primary,
                    })),
                };
                if (form.id) await updateSuggestionRule(form.id, payload);
                else await createSuggestionRule(payload);
                toast.push({ variant: "success", title: form.id ? "Rule updated" : "Rule created" });
                setForm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Could not save rule") });
            }
        });
    }

    function runDelete() {
        if (!confirm) return;
        const target = confirm;
        startTransition(async () => {
            try {
                await deleteSuggestionRule(target.id);
                toast.push({ variant: "success", title: `${target.name} deleted` });
                setConfirm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Delete failed") });
            }
        });
    }

    function updateCondition(index: number, patch: Partial<ConditionRow>) {
        if (!form) return;
        setForm({
            ...form,
            conditions: form.conditions.map((condition, i) =>
                i === index ? { ...condition, ...patch } : condition,
            ),
        });
    }

    function addPickedProduct() {
        if (!form || !picker) return;
        if (form.products.some(row => row.product.id === picker.id)) {
            toast.push({ variant: "info", title: "That product is already in this rule" });
            setPicker(null);
            return;
        }
        setForm({ ...form, products: [...form.products, { product: picker, is_primary: false }] });
        setPicker(null);
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-base">Suggestion Rules</CardTitle>
                    <CardDescription className="text-xs">
                        Match a load range (and optional field conditions) to the products you want to recommend.
                    </CardDescription>
                </div>
                <Button size="sm" onClick={() => setForm({ ...emptyRule })} disabled={isPending}>
                    <Plus className="mr-1 h-4 w-4" /> New Rule
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {rules.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No rules configured.</p>
                )}
                {rules.map(rule => (
                    <div key={rule.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                        <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium">{rule.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {Number(rule.min_load)}
                                {rule.unit_symbol} – {rule.max_load != null ? `${Number(rule.max_load)}${rule.unit_symbol}` : "∞"}
                                {" · priority "}
                                {rule.priority}
                                {" · "}
                                {rule.calculator_rule_products.length} product(s)
                            </p>
                            {rule.calculator_rule_conditions.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {rule.calculator_rule_conditions.map(condition => {
                                        const field = fieldById(condition.field_id);
                                        return (
                                            <span
                                                key={condition.id}
                                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                            >
                                                {field?.label || "field"} {condition.operator}
                                                {condition.operator === "between"
                                                    ? ` ${condition.min_value != null ? Number(condition.min_value) : "–"}…${condition.max_value != null ? Number(condition.max_value) : "∞"}`
                                                    : ""}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {!rule.is_active && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    Off
                                </span>
                            )}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() =>
                                    setForm({
                                        id: rule.id,
                                        name: rule.name,
                                        min_load: String(Number(rule.min_load)),
                                        max_load: rule.max_load != null ? String(Number(rule.max_load)) : "",
                                        unit_symbol: rule.unit_symbol,
                                        priority: String(rule.priority),
                                        headline: rule.headline || "",
                                        note: rule.note || "",
                                        is_active: rule.is_active,
                                        conditions: rule.calculator_rule_conditions.map(condition => ({
                                            field_id: condition.field_id,
                                            operator: condition.operator,
                                            min_value:
                                                condition.min_value != null ? String(Number(condition.min_value)) : "",
                                            max_value:
                                                condition.max_value != null ? String(Number(condition.max_value)) : "",
                                            value_text:
                                                condition.value_text ??
                                                (condition.value_number != null
                                                    ? String(Number(condition.value_number))
                                                    : ""),
                                            value_set: Array.isArray(condition.value_set)
                                                ? (condition.value_set as string[])
                                                : [],
                                        })),
                                        products: rule.calculator_rule_products.map(row => ({
                                            product: {
                                                id: row.product_id,
                                                name: row.products?.name || "Product",
                                                brand: row.products?.brand ?? null,
                                            },
                                            is_primary: row.is_primary,
                                        })),
                                    })
                                }
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => setConfirm({ id: rule.id, name: rule.name })}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>

            <Dialog open={Boolean(form)} onOpenChange={open => !open && setForm(null)}>
                <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{form?.id ? "Edit Rule" : "New Rule"}</DialogTitle>
                        <DialogDescription>
                            When several rules match, the highest priority is shown first.
                        </DialogDescription>
                    </DialogHeader>
                    {form && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label>Rule name</Label>
                                <Input
                                    value={form.name}
                                    onChange={event => setForm({ ...form, name: event.target.value })}
                                    placeholder="1000–2000W with 5–10h backup"
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label>Min load</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        min={0}
                                        value={form.min_load}
                                        onChange={event => setForm({ ...form, min_load: event.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Max load</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={form.max_load}
                                        onChange={event => setForm({ ...form, max_load: event.target.value })}
                                        placeholder="∞"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Unit</Label>
                                    <Input
                                        value={form.unit_symbol}
                                        onChange={event => setForm({ ...form, unit_symbol: event.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Priority</Label>
                                    <Input
                                        type="number"
                                        value={form.priority}
                                        onChange={event => setForm({ ...form, priority: event.target.value })}
                                    />
                                </div>
                            </div>
                            <p className="-mt-2 text-[11px] text-muted-foreground">
                                Range is inclusive of min and exclusive of max, so 0–1000 and 1000–2000 never overlap.
                                Leave max empty for “and above”.
                            </p>

                            {/* Conditions */}
                            <div className="space-y-2 rounded-md border p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Field conditions</Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            All conditions must match. Leave empty to match on load range alone.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!fields.length}
                                        onClick={() =>
                                            setForm({
                                                ...form,
                                                conditions: [
                                                    ...form.conditions,
                                                    {
                                                        field_id: fields[0]?.id || "",
                                                        operator: "between",
                                                        min_value: "",
                                                        max_value: "",
                                                        value_text: "",
                                                        value_set: [],
                                                    },
                                                ],
                                            })
                                        }
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" /> Add condition
                                    </Button>
                                </div>
                                {!fields.length && (
                                    <p className="py-2 text-xs text-muted-foreground">
                                        Create a calculator field first to add conditions.
                                    </p>
                                )}
                                {form.conditions.map((condition, index) => {
                                    const field = fieldById(condition.field_id);
                                    const options = field?.calculator_meta_field_options || [];
                                    return (
                                        <div key={index} className="space-y-2 rounded border bg-muted/30 p-2">
                                            <div className="grid items-end gap-2 sm:grid-cols-[1fr_150px_auto]">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px]">Field</Label>
                                                    <Select
                                                        value={condition.field_id}
                                                        onValueChange={value =>
                                                            updateCondition(index, {
                                                                field_id: value,
                                                                value_set: [],
                                                                value_text: "",
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {fields.map(item => (
                                                                <SelectItem key={item.id} value={item.id}>
                                                                    {item.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px]">Operator</Label>
                                                    <Select
                                                        value={condition.operator}
                                                        onValueChange={value =>
                                                            updateCondition(index, { operator: value as Operator })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {OPERATORS.map(operator => (
                                                                <SelectItem key={operator.value} value={operator.value}>
                                                                    {operator.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-destructive"
                                                    onClick={() =>
                                                        setForm({
                                                            ...form,
                                                            conditions: form.conditions.filter((_, i) => i !== index),
                                                        })
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {condition.operator === "between" && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px]">
                                                            From {field?.unit_symbol ? `(${field.unit_symbol})` : ""}
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            value={condition.min_value}
                                                            onChange={event =>
                                                                updateCondition(index, { min_value: event.target.value })
                                                            }
                                                            placeholder="5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px]">To (exclusive)</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            value={condition.max_value}
                                                            onChange={event =>
                                                                updateCondition(index, { max_value: event.target.value })
                                                            }
                                                            placeholder="10"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {(condition.operator === "eq" || condition.operator === "neq") && (
                                                <div className="space-y-1">
                                                    <Label className="text-[11px]">Value</Label>
                                                    {options.length ? (
                                                        <Select
                                                            value={condition.value_text}
                                                            onValueChange={value =>
                                                                updateCondition(index, { value_text: value })
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select value" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {options.map(option => (
                                                                    <SelectItem key={option.id} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input
                                                            value={condition.value_text}
                                                            onChange={event =>
                                                                updateCondition(index, { value_text: event.target.value })
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {(condition.operator === "in" || condition.operator === "contains") && (
                                                <div className="space-y-1">
                                                    <Label className="text-[11px]">Options</Label>
                                                    {options.length ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {options.map(option => {
                                                                const active = condition.value_set.includes(option.value);
                                                                return (
                                                                    <button
                                                                        key={option.id}
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateCondition(index, {
                                                                                value_set: active
                                                                                    ? condition.value_set.filter(
                                                                                          value => value !== option.value,
                                                                                      )
                                                                                    : [...condition.value_set, option.value],
                                                                            })
                                                                        }
                                                                        className={`rounded-full border px-2.5 py-1 text-xs ${
                                                                            active
                                                                                ? "border-primary bg-primary text-primary-foreground"
                                                                                : "bg-background"
                                                                        }`}
                                                                    >
                                                                        {option.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground">
                                                            This field has no options to choose from.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Products */}
                            <div className="space-y-2 rounded-md border p-3">
                                <Label>Suggested products</Label>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <ProductCombobox
                                            value={picker}
                                            onChange={setPicker}
                                            placeholder="Search products…"
                                        />
                                    </div>
                                    <Button type="button" variant="outline" disabled={!picker} onClick={addPickedProduct}>
                                        Add
                                    </Button>
                                </div>
                                {form.products.length === 0 ? (
                                    <p className="py-2 text-xs text-muted-foreground">No products added yet.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {form.products.map((row, index) => (
                                            <div
                                                key={row.product.id}
                                                className="flex items-center justify-between gap-2 rounded border bg-background px-2.5 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm">{row.product.name}</p>
                                                    {row.product.brand && (
                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                            {row.product.brand}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        title="Mark as recommended"
                                                        className={`h-7 w-7 ${row.is_primary ? "text-amber-500" : "text-muted-foreground"}`}
                                                        onClick={() =>
                                                            setForm({
                                                                ...form,
                                                                products: form.products.map((item, i) =>
                                                                    i === index
                                                                        ? { ...item, is_primary: !item.is_primary }
                                                                        : item,
                                                                ),
                                                            })
                                                        }
                                                    >
                                                        <Star
                                                            className="h-3.5 w-3.5"
                                                            fill={row.is_primary ? "currentColor" : "none"}
                                                        />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-destructive"
                                                        onClick={() =>
                                                            setForm({
                                                                ...form,
                                                                products: form.products.filter((_, i) => i !== index),
                                                            })
                                                        }
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>Public headline (optional)</Label>
                                    <Input
                                        value={form.headline}
                                        onChange={event => setForm({ ...form, headline: event.target.value })}
                                        placeholder="Recommended for your load"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Public note (optional)</Label>
                                    <Input
                                        value={form.note}
                                        onChange={event => setForm({ ...form, note: event.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-md border p-3">
                                <p className="text-sm font-medium">Rule active</p>
                                <Switch
                                    checked={form.is_active}
                                    onCheckedChange={checked => setForm({ ...form, is_active: checked })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setForm(null)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={save} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                title={`Delete ${confirm?.name || ""}?`}
                description="This rule will no longer suggest products."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={runDelete}
                onCancel={() => setConfirm(null)}
            />
        </Card>
    );
}
