"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    searchPromotionLinkTargets,
    type PromotionLinkTarget,
    type PromotionLinkTargetScope,
} from "../../actions";

interface CtaTargetComboboxProps {
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

const SCOPES: Array<{ value: PromotionLinkTargetScope; label: string }> = [
    { value: "all", label: "All" },
    { value: "categories", label: "Categories" },
    { value: "products", label: "Products" },
];

export function CtaTargetCombobox({
    value,
    onChange,
    disabled = false,
    placeholder = "Select destination page...",
}: CtaTargetComboboxProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const fetchIdRef = useRef(0);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [scope, setScope] = useState<PromotionLinkTargetScope>("all");
    const [options, setOptions] = useState<PromotionLinkTarget[]>([]);
    const [optionCache, setOptionCache] = useState<Record<string, PromotionLinkTarget>>({});
    const [isPending, startTransition] = useTransition();

    const loadOptions = useCallback((term: string, nextScope: PromotionLinkTargetScope) => {
        const fetchId = ++fetchIdRef.current;

        startTransition(async () => {
            try {
                const result = await searchPromotionLinkTargets({
                    query: term,
                    scope: nextScope,
                    limitPerType: 6,
                });

                if (fetchId !== fetchIdRef.current) return;

                setOptions(result);
                setOptionCache((prev) => {
                    const next = { ...prev };
                    for (const option of result) {
                        next[option.url] = option;
                    }
                    return next;
                });
            } catch (error) {
                if (fetchId === fetchIdRef.current) {
                    console.error("Failed to search promotion destinations", error);
                    setOptions([]);
                }
            }
        });
    }, []);

    useEffect(() => {
        if (!open) return;
        const delay = query.trim() ? 250 : 0;
        const handle = window.setTimeout(() => {
            loadOptions(query, scope);
        }, delay);
        return () => window.clearTimeout(handle);
    }, [query, scope, open, loadOptions]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    useEffect(() => {
        if (open) {
            window.requestAnimationFrame(() => inputRef.current?.focus());
        } else {
            setQuery("");
            setScope("all");
        }
    }, [open]);

    const categoryOptions = useMemo(
        () => options.filter((option) => option.type === "category"),
        [options]
    );

    const productOptions = useMemo(
        () => options.filter((option) => option.type === "product"),
        [options]
    );

    const buttonLabel = useMemo(() => {
        if (!value) return placeholder;
        const matched = optionCache[value];
        if (!matched) return value;
        return matched.type === "category"
            ? `${matched.title} (Category)`
            : `${matched.title} (Product)`;
    }, [optionCache, placeholder, value]);

    const renderOption = (option: PromotionLinkTarget) => {
        const isSelected = value === option.url;

        return (
            <button
                key={`${option.type}-${option.id}`}
                type="button"
                onClick={() => {
                    onChange(option.url);
                    setOptionCache((prev) => ({ ...prev, [option.url]: option }));
                    setOpen(false);
                }}
                className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    isSelected && "bg-accent text-accent-foreground"
                )}
            >
                <div className="min-w-0">
                    <p className="truncate font-medium">{option.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{option.url}</p>
                    {option.subtitle ? (
                        <p className="truncate text-[11px] text-muted-foreground">{option.subtitle}</p>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{option.type}</Badge>
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                </div>
            </button>
        );
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                    "h-9 w-full justify-between px-3 text-left font-normal",
                    !value && "text-muted-foreground"
                )}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="truncate">{buttonLabel}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                    {value && !disabled ? (
                        <X
                            className="h-3.5 w-3.5 hover:text-foreground"
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange("");
                                setOpen(false);
                            }}
                        />
                    ) : null}
                    <ChevronsUpDown className="h-4 w-4" />
                </span>
            </Button>

            {open ? (
                <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-lg">
                    <div className="space-y-2 border-b p-3">
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") setOpen(false);
                                }}
                                placeholder="Search category or product..."
                                className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                            {SCOPES.map((scopeItem) => (
                                <Button
                                    key={scopeItem.value}
                                    type="button"
                                    size="sm"
                                    variant={scope === scopeItem.value ? "default" : "outline"}
                                    className="h-7 text-xs"
                                    onClick={() => setScope(scopeItem.value)}
                                >
                                    {scopeItem.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-1 text-sm">
                        {isPending ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching destinations...
                            </div>
                        ) : options.length === 0 ? (
                            <div className="px-3 py-6 text-xs text-muted-foreground">
                                No matching category or product page found.
                            </div>
                        ) : (
                            <>
                                {(scope === "all" || scope === "categories") && categoryOptions.length > 0 ? (
                                    <div className="py-1">
                                        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Categories
                                        </p>
                                        {categoryOptions.map(renderOption)}
                                    </div>
                                ) : null}
                                {(scope === "all" || scope === "products") && productOptions.length > 0 ? (
                                    <div className="py-1">
                                        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Products
                                        </p>
                                        {productOptions.map(renderOption)}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
