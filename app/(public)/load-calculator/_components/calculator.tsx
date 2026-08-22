"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCardsGrid } from "@/components/public/product-cards-grid";
import type { LoadGroupWithItems, MetaFieldWithOptions } from "@/lib/services/loadCalculatorService";
import { LoadIcon } from "./load-icon";
import { getSuggestions, type SuggestionResult } from "../actions";

type Quantities = Record<string, number>;
type MetaValues = Record<string, string | number | string[]>;

function initialMeta(fields: MetaFieldWithOptions[]): MetaValues {
    const values: MetaValues = {};
    for (const field of fields) {
        const defaultOption = field.calculator_meta_field_options.find(option => option.is_default);
        switch (field.field_type) {
            case "slider":
                values[field.key] = Number(field.default_number ?? field.min_value ?? 0);
                break;
            case "input":
                values[field.key] = field.default_number != null ? Number(field.default_number) : field.default_text || "";
                break;
            case "checkbox":
                values[field.key] = defaultOption ? [defaultOption.value] : [];
                break;
            case "dropdown":
            case "radio":
                values[field.key] =
                    defaultOption?.value ?? field.calculator_meta_field_options[0]?.value ?? "";
                break;
        }
    }
    return values;
}

export function LoadCalculator({
    groups,
    fields,
    currencySymbol,
}: {
    groups: LoadGroupWithItems[];
    fields: MetaFieldWithOptions[];
    currencySymbol: string;
}) {
    const [activeGroup, setActiveGroup] = useState(groups[0]?.id ?? "");
    const [quantities, setQuantities] = useState<Quantities>({});
    const [meta, setMeta] = useState<MetaValues>(() => initialMeta(fields));
    const [result, setResult] = useState<SuggestionResult | null>(null);
    const [isPending, startTransition] = useTransition();
    const resultRef = useRef<HTMLDivElement | null>(null);

    const selected = groups.find(group => group.id === activeGroup) || groups[0] || null;

    // Loads may use different units per group, so total per unit symbol.
    const totalsByUnit = useMemo(() => {
        const totals = new Map<string, number>();
        for (const group of groups) {
            for (const item of group.load_items) {
                const quantity = quantities[item.id] || 0;
                if (!quantity) continue;
                const current = totals.get(group.unit_symbol) || 0;
                totals.set(group.unit_symbol, current + quantity * Number(item.unit_value));
            }
        }
        return totals;
    }, [groups, quantities]);

    // The primary total drives rule matching (Watt by convention).
    const primaryUnit = groups[0]?.unit_symbol || "W";
    const primaryTotal = totalsByUnit.get(primaryUnit) || 0;
    const otherTotals = Array.from(totalsByUnit.entries()).filter(([unit]) => unit !== primaryUnit);
    const hasSelection = Array.from(totalsByUnit.values()).some(value => value > 0);

    function setQuantity(itemId: string, next: number, max?: number | null) {
        const clamped = Math.max(0, max != null ? Math.min(next, max) : next);
        setQuantities(current => ({ ...current, [itemId]: clamped }));
    }

    function reset() {
        setQuantities({});
        setMeta(initialMeta(fields));
        setResult(null);
    }

    function findSolution() {
        startTransition(async () => {
            try {
                const payload = await getSuggestions(primaryTotal, meta);
                setResult(payload);
                window.requestAnimationFrame(() => {
                    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            } catch {
                setResult({
                    products: [],
                    priceMap: {},
                    badgeMap: {},
                    headline: null,
                    note: null,
                    matched: false,
                });
            }
        });
    }

    if (!groups.length) {
        return (
            <p className="py-16 text-center text-sm text-muted-foreground">
                The load calculator has not been configured yet.
            </p>
        );
    }

    return (
        <div className="w-full space-y-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                {/* Loads picker */}
                <div className="min-w-0 rounded-2xl border bg-card">
                    {/* Group tabs */}
                    <div className="flex gap-1 overflow-x-auto border-b p-1">
                        {groups.map(group => {
                            const active = group.id === selected?.id;
                            return (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => setActiveGroup(group.id)}
                                    className={`flex min-w-[104px] shrink-0 flex-col items-center gap-1.5 rounded-lg px-4 py-3 text-center transition-colors ${
                                        active
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    <LoadIcon name={group.icon} className="h-6 w-6" />
                                    <span className="text-xs font-semibold leading-tight">{group.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Items grid */}
                    <div className="p-3 sm:p-4">
                        {!selected || selected.load_items.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No loads in this group yet.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {selected.load_items.map(item => {
                                    const quantity = quantities[item.id] || 0;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`rounded-xl border p-4 transition-colors ${
                                                quantity > 0 ? "border-primary/60 bg-primary/[0.03]" : "bg-background"
                                            }`}
                                        >
                                            <LoadIcon name={item.icon} className="h-7 w-7" />
                                            <p className="mt-3 text-sm font-semibold leading-tight">{item.name}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {Number(item.unit_value)}
                                                {selected.unit_symbol}
                                            </p>
                                            <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                                                <button
                                                    type="button"
                                                    aria-label={`Decrease ${item.name}`}
                                                    onClick={() => setQuantity(item.id, quantity - 1, item.max_quantity)}
                                                    disabled={quantity === 0}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label={`Increase ${item.name}`}
                                                    onClick={() => setQuantity(item.id, quantity + 1, item.max_quantity)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full border text-foreground transition-colors hover:bg-muted"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary panel */}
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="space-y-5 rounded-2xl bg-muted/60 p-6">
                        <div>
                            <p className="text-lg font-bold tracking-tight">Your Total Running Load</p>
                            <div className="mt-2 flex items-end gap-2">
                                <span className="text-5xl font-extrabold leading-none text-primary tabular-nums">
                                    {Math.round(primaryTotal)}
                                </span>
                                <span className="pb-1 text-xl font-bold text-primary">
                                    {primaryUnit}
                                    <span aria-hidden>*</span>
                                </span>
                            </div>
                            {otherTotals.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {otherTotals
                                        .map(([unit, value]) => `${Math.round(value)}${unit}`)
                                        .join(" · ")}{" "}
                                    from other units
                                </p>
                            )}
                        </div>

                        {fields.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Get product suggestions as per your required backup power. Choose your estimates below.
                            </p>
                        )}

                        {/* Admin-configured meta fields */}
                        <div className="space-y-5">
                            {fields.map(field => (
                                <MetaFieldControl
                                    key={field.id}
                                    field={field}
                                    value={meta[field.key]}
                                    onChange={value => setMeta(current => ({ ...current, [field.key]: value }))}
                                />
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Button
                                className="h-12 w-full text-base font-semibold"
                                disabled={!hasSelection || isPending}
                                onClick={findSolution}
                            >
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Find Solution
                            </Button>
                            {hasSelection && (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <RotateCcw className="h-3 w-3" /> Reset selection
                                </button>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            * Estimated figure. Actual consumption may vary by appliance and usage.
                        </p>
                    </div>
                </aside>
            </div>

            {/* Results */}
            <div ref={resultRef}>
                {result && (
                    <section className="space-y-5 rounded-2xl border bg-card p-6">
                        {result.matched && result.products.length > 0 ? (
                            <>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">
                                        {result.headline || "Suggested for you"}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Based on {Math.round(primaryTotal)}
                                        {primaryUnit} of running load.
                                    </p>
                                    {result.note && (
                                        <p className="mt-1 text-xs text-muted-foreground">{result.note}</p>
                                    )}
                                </div>
                                <ProductCardsGrid
                                    products={result.products}
                                    priceMap={result.priceMap}
                                    badgeMap={result.badgeMap}
                                    symbol={currencySymbol}
                                />
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-base font-semibold">No matching products yet</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    We could not find a configured solution for {Math.round(primaryTotal)}
                                    {primaryUnit}. Please contact us and we will help you pick the right setup.
                                </p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}

function MetaFieldControl({
    field,
    value,
    onChange,
}: {
    field: MetaFieldWithOptions;
    value: string | number | string[] | undefined;
    onChange: (value: string | number | string[]) => void;
}) {
    const options = field.calculator_meta_field_options;

    if (field.field_type === "slider") {
        const min = Number(field.min_value ?? 0);
        const max = Number(field.max_value ?? 10);
        const step = Number(field.step_value ?? 1) || 1;
        const current = typeof value === "number" ? value : min;
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{field.label}</span>
                    <span className="text-sm font-bold text-primary">
                        {current} {field.unit_symbol || ""}
                    </span>
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={current}
                    onChange={event => onChange(Number(event.target.value))}
                    aria-label={field.label}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted-foreground/25 accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                        {min} {field.unit_symbol || ""}
                    </span>
                    <span>
                        {max} {field.unit_symbol || ""}
                    </span>
                </div>
                {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
            </div>
        );
    }

    if (field.field_type === "input") {
        return (
            <div className="space-y-1.5">
                <label className="text-sm font-bold" htmlFor={`field-${field.key}`}>
                    {field.label}
                </label>
                <Input
                    id={`field-${field.key}`}
                    type={field.is_numeric ? "number" : "text"}
                    value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
                    min={field.min_value != null ? Number(field.min_value) : undefined}
                    max={field.max_value != null ? Number(field.max_value) : undefined}
                    step={field.step_value != null ? Number(field.step_value) : undefined}
                    onChange={event =>
                        onChange(field.is_numeric ? Number(event.target.value) : event.target.value)
                    }
                />
                {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
            </div>
        );
    }

    if (field.field_type === "dropdown") {
        return (
            <div className="space-y-1.5">
                <label className="text-sm font-bold" htmlFor={`field-${field.key}`}>
                    {field.label}
                </label>
                <select
                    id={`field-${field.key}`}
                    value={typeof value === "string" ? value : ""}
                    onChange={event => onChange(event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                    {options.map(option => (
                        <option key={option.id} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
            </div>
        );
    }

    if (field.field_type === "radio") {
        return (
            <fieldset className="space-y-2">
                <legend className="text-sm font-bold">{field.label}</legend>
                <div className="flex flex-wrap gap-2">
                    {options.map(option => {
                        const active = value === option.value;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => onChange(option.value)}
                                aria-pressed={active}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                                    active ? "border-primary bg-primary text-primary-foreground" : "bg-background"
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
                {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
            </fieldset>
        );
    }

    // checkbox
    const selectedValues = Array.isArray(value) ? value : [];
    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-bold">{field.label}</legend>
            <div className="space-y-1.5">
                {options.map(option => {
                    const checked = selectedValues.includes(option.value);
                    return (
                        <label key={option.id} className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                    onChange(
                                        checked
                                            ? selectedValues.filter(item => item !== option.value)
                                            : [...selectedValues, option.value],
                                    )
                                }
                                className="h-4 w-4 accent-primary"
                            />
                            {option.label}
                        </label>
                    );
                })}
            </div>
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </fieldset>
    );
}
