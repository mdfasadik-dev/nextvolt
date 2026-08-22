"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
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
import type { MetaFieldWithOptions } from "@/lib/services/loadCalculatorService";
import { createMetaField, deleteMetaField, updateMetaField, type MetaFieldInput } from "../actions";

type FieldType = MetaFieldInput["field_type"];

const FIELD_TYPES: Array<{ value: FieldType; label: string; hint: string }> = [
    { value: "slider", label: "Slider", hint: "Numeric range with a draggable handle" },
    { value: "input", label: "Input", hint: "Free numeric / text entry" },
    { value: "dropdown", label: "Dropdown", hint: "Single choice from a list" },
    { value: "radio", label: "Radio", hint: "Single choice, all visible" },
    { value: "checkbox", label: "Checkbox", hint: "Multiple choices" },
];

const CHOICE_TYPES: FieldType[] = ["dropdown", "radio", "checkbox"];

type OptionRow = { label: string; value: string; number_value: string; is_default: boolean };

type FieldForm = {
    id: string | null;
    key: string;
    label: string;
    help_text: string;
    field_type: FieldType;
    unit_name: string;
    unit_symbol: string;
    min_value: string;
    max_value: string;
    step_value: string;
    default_number: string;
    default_text: string;
    is_required: boolean;
    is_active: boolean;
    options: OptionRow[];
};

const emptyField: FieldForm = {
    id: null,
    key: "",
    label: "",
    help_text: "",
    field_type: "slider",
    unit_name: "",
    unit_symbol: "",
    min_value: "1",
    max_value: "10",
    step_value: "1",
    default_number: "5",
    default_text: "",
    is_required: false,
    is_active: true,
    options: [],
};

function toKey(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_-]/g, "")
        .replace(/[\s-]+/g, "_")
        .replace(/_+/g, "_");
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export function MetaFieldsTab({ fields }: { fields: MetaFieldWithOptions[] }) {
    const toast = useToast();
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState<FieldForm | null>(null);
    const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);

    const isChoice = form ? CHOICE_TYPES.includes(form.field_type) : false;

    function save() {
        if (!form) return;
        if (!form.label.trim()) {
            toast.push({ variant: "error", title: "Label is required" });
            return;
        }
        const key = toKey(form.key || form.label);
        if (!key) {
            toast.push({ variant: "error", title: "Could not derive a field key" });
            return;
        }
        const numeric = form.field_type === "slider" || (form.field_type === "input" && !isChoice);
        if (form.field_type === "slider") {
            const min = Number(form.min_value);
            const max = Number(form.max_value);
            if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
                toast.push({ variant: "error", title: "Slider needs a valid min and max" });
                return;
            }
        }
        if (isChoice && form.options.filter(option => option.label.trim()).length === 0) {
            toast.push({ variant: "error", title: "Add at least one option" });
            return;
        }
        startTransition(async () => {
            try {
                const payload: MetaFieldInput = {
                    key,
                    label: form.label.trim(),
                    help_text: form.help_text.trim() || null,
                    field_type: form.field_type,
                    unit_name: form.unit_name.trim() || null,
                    unit_symbol: form.unit_symbol.trim() || null,
                    min_value: form.min_value.trim() ? Number(form.min_value) : null,
                    max_value: form.max_value.trim() ? Number(form.max_value) : null,
                    step_value: form.step_value.trim() ? Number(form.step_value) : null,
                    default_number: form.default_number.trim() ? Number(form.default_number) : null,
                    default_text: form.default_text.trim() || null,
                    is_numeric: numeric,
                    is_required: form.is_required,
                    is_active: form.is_active,
                    options: isChoice
                        ? form.options
                              .filter(option => option.label.trim())
                              .map(option => ({
                                  label: option.label.trim(),
                                  value: toKey(option.value || option.label),
                                  number_value: option.number_value.trim()
                                      ? Number(option.number_value)
                                      : null,
                                  is_default: option.is_default,
                              }))
                        : [],
                };
                if (form.id) await updateMetaField(form.id, payload);
                else await createMetaField(payload);
                toast.push({ variant: "success", title: form.id ? "Field updated" : "Field created" });
                setForm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Could not save field") });
            }
        });
    }

    function runDelete() {
        if (!confirm) return;
        const target = confirm;
        startTransition(async () => {
            try {
                await deleteMetaField(target.id);
                toast.push({ variant: "success", title: `${target.label} deleted` });
                setConfirm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Delete failed") });
            }
        });
    }

    function updateOption(index: number, patch: Partial<OptionRow>) {
        if (!form) return;
        const options = form.options.map((option, i) => (i === index ? { ...option, ...patch } : option));
        setForm({ ...form, options });
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-base">Calculator Fields</CardTitle>
                    <CardDescription className="text-xs">
                        Extra inputs shown under the load total, rendered exactly as configured.
                    </CardDescription>
                </div>
                <Button size="sm" onClick={() => setForm({ ...emptyField })} disabled={isPending}>
                    <Plus className="mr-1 h-4 w-4" /> New Field
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {fields.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No fields configured.</p>
                )}
                {fields.map(field => (
                    <div key={field.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium">
                                {field.label}
                                {field.unit_symbol ? (
                                    <span className="ml-1 text-xs text-muted-foreground">({field.unit_symbol})</span>
                                ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <code className="rounded bg-muted px-1">{field.key}</code> · {field.field_type}
                                {field.field_type === "slider"
                                    ? ` · ${Number(field.min_value ?? 0)}–${Number(field.max_value ?? 0)}`
                                    : ""}
                                {field.calculator_meta_field_options.length
                                    ? ` · ${field.calculator_meta_field_options.length} options`
                                    : ""}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {!field.is_active && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    Hidden
                                </span>
                            )}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() =>
                                    setForm({
                                        id: field.id,
                                        key: field.key,
                                        label: field.label,
                                        help_text: field.help_text || "",
                                        field_type: field.field_type,
                                        unit_name: field.unit_name || "",
                                        unit_symbol: field.unit_symbol || "",
                                        min_value: field.min_value != null ? String(Number(field.min_value)) : "",
                                        max_value: field.max_value != null ? String(Number(field.max_value)) : "",
                                        step_value: field.step_value != null ? String(Number(field.step_value)) : "",
                                        default_number:
                                            field.default_number != null ? String(Number(field.default_number)) : "",
                                        default_text: field.default_text || "",
                                        is_required: field.is_required,
                                        is_active: field.is_active,
                                        options: field.calculator_meta_field_options.map(option => ({
                                            label: option.label,
                                            value: option.value,
                                            number_value:
                                                option.number_value != null ? String(Number(option.number_value)) : "",
                                            is_default: option.is_default,
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
                                onClick={() => setConfirm({ id: field.id, label: field.label })}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>

            <Dialog open={Boolean(form)} onOpenChange={open => !open && setForm(null)}>
                <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{form?.id ? "Edit Field" : "New Field"}</DialogTitle>
                        <DialogDescription>
                            This control appears on the public calculator and can be used in suggestion rules.
                        </DialogDescription>
                    </DialogHeader>
                    {form && (
                        <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>Label</Label>
                                    <Input
                                        value={form.label}
                                        onChange={event => setForm({ ...form, label: event.target.value })}
                                        placeholder="Average Daily Backup (Hrs)"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Key</Label>
                                    <Input
                                        value={form.key}
                                        disabled={Boolean(form.id)}
                                        onChange={event => setForm({ ...form, key: event.target.value })}
                                        placeholder="backup_hours"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        {form.id ? "Key cannot change after creation." : "Auto-derived from the label."}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Field type</Label>
                                <Select
                                    value={form.field_type}
                                    onValueChange={value => setForm({ ...form, field_type: value as FieldType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FIELD_TYPES.map(type => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label} — {type.hint}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Help text (optional)</Label>
                                <Input
                                    value={form.help_text}
                                    onChange={event => setForm({ ...form, help_text: event.target.value })}
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>Unit name (optional)</Label>
                                    <Input
                                        value={form.unit_name}
                                        onChange={event => setForm({ ...form, unit_name: event.target.value })}
                                        placeholder="Hour"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Unit symbol (optional)</Label>
                                    <Input
                                        value={form.unit_symbol}
                                        onChange={event => setForm({ ...form, unit_symbol: event.target.value })}
                                        placeholder="h"
                                    />
                                </div>
                            </div>

                            {(form.field_type === "slider" || form.field_type === "input") && (
                                <div className="grid gap-3 sm:grid-cols-4">
                                    <div className="space-y-1.5">
                                        <Label>Min</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={form.min_value}
                                            onChange={event => setForm({ ...form, min_value: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Max</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={form.max_value}
                                            onChange={event => setForm({ ...form, max_value: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Step</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={form.step_value}
                                            onChange={event => setForm({ ...form, step_value: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Default</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={form.default_number}
                                            onChange={event =>
                                                setForm({ ...form, default_number: event.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {isChoice && (
                                <div className="space-y-2 rounded-md border p-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Options</Label>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setForm({
                                                    ...form,
                                                    options: [
                                                        ...form.options,
                                                        { label: "", value: "", number_value: "", is_default: false },
                                                    ],
                                                })
                                            }
                                        >
                                            <Plus className="mr-1 h-3.5 w-3.5" /> Add option
                                        </Button>
                                    </div>
                                    {form.options.length === 0 && (
                                        <p className="py-2 text-xs text-muted-foreground">No options yet.</p>
                                    )}
                                    {form.options.map((option, index) => (
                                        <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_110px_auto]">
                                            <div className="space-y-1">
                                                <Label className="text-[11px]">Label</Label>
                                                <Input
                                                    value={option.label}
                                                    onChange={event => updateOption(index, { label: event.target.value })}
                                                    placeholder="Single Phase"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px]">Value</Label>
                                                <Input
                                                    value={option.value}
                                                    onChange={event => updateOption(index, { value: event.target.value })}
                                                    placeholder="single"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px]">Number</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    value={option.number_value}
                                                    onChange={event =>
                                                        updateOption(index, { number_value: event.target.value })
                                                    }
                                                    placeholder="—"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-9 w-9 text-destructive"
                                                onClick={() =>
                                                    setForm({
                                                        ...form,
                                                        options: form.options.filter((_, i) => i !== index),
                                                    })
                                                }
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between rounded-md border p-3">
                                <p className="text-sm font-medium">Visible on public site</p>
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
                title={`Delete ${confirm?.label || ""}?`}
                description="Rules using this field will lose that condition."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={runDelete}
                onCancel={() => setConfirm(null)}
            />
        </Card>
    );
}
