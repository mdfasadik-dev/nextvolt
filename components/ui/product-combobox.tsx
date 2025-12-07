"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search, Loader2, Check, X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchProducts } from "@/app/admin/products/actions";

export interface ProductOption {
    id: string;
    name: string;
    brand?: string | null;
}

interface ProductComboboxProps {
    value: ProductOption | null;
    onChange: (option: ProductOption | null) => void;
    placeholder?: string;
    disabled?: boolean;
    allowClear?: boolean;
}

export function ProductCombobox({
    value,
    onChange,
    placeholder = "Select product…",
    disabled = false,
    allowClear = true,
}: ProductComboboxProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState<ProductOption[]>([]);
    const [isPending, startTransition] = useTransition();

    const fetchIdRef = useRef(0);

    const loadOptions = useCallback((term: string) => {
        const fetchId = ++fetchIdRef.current;
        startTransition(async () => {
            try {
                const results = await searchProducts(term);
                if (fetchId !== fetchIdRef.current) return;
                setOptions(prev => {
                    const next = [...results];
                    if (value && !next.some(option => option.id === value.id)) {
                        next.unshift({ ...value, brand: value.brand ?? null });
                    }
                    return next;
                });
            } catch (error) {
                console.error("Failed to search products", error);
                if (fetchId === fetchIdRef.current) setOptions(value ? [value] : []);
            }
        });
    }, [value]);

    useEffect(() => {
        if (!open) return;
        loadOptions("");
    }, [open, loadOptions]);

    useEffect(() => {
        if (!open) return;
        const handle = window.setTimeout(() => {
            loadOptions(query);
        }, 300);
        return () => window.clearTimeout(handle);
    }, [query, open, loadOptions]);

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
            window.requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        } else {
            setQuery("");
        }
    }, [open]);

    const renderLabel = useMemo(() => {
        if (!value) return placeholder;
        if (value.brand) return `${value.name} (${value.brand})`;
        return value.name;
    }, [value, placeholder]);

    return (
        <div ref={containerRef} className="relative w-full">
            <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                    "h-9 w-full justify-between px-3 text-left font-normal",
                    !value && "text-muted-foreground",
                )}
                onClick={() => setOpen(prev => !prev)}
            >
                <span className="truncate">{renderLabel}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                    {allowClear && value && !disabled && (
                        <X
                            className="h-3.5 w-3.5 hover:text-foreground"
                            onClick={event => {
                                event.stopPropagation();
                                onChange(null);
                                setOpen(false);
                            }}
                        />
                    )}
                    <ChevronsUpDown className="h-4 w-4" />
                </span>
            </Button>
            {open && (
                <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-lg">
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === "Escape") setOpen(false);
                            }}
                            placeholder="Search products…"
                            className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1 text-sm">
                        {isPending ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching…
                            </div>
                        ) : options.length === 0 ? (
                            <div className="px-3 py-6 text-xs text-muted-foreground">No products found.</div>
                        ) : (
                            options.map(option => {
                                const isActive = value?.id === option.id;
                                const description = option.brand ? option.brand : null;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        className={cn(
                                            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                                            isActive && "bg-accent text-accent-foreground",
                                        )}
                                        onClick={() => {
                                            onChange(option);
                                            setOpen(false);
                                        }}
                                    >
                                        <div className="flex flex-col truncate">
                                            <span className="truncate font-medium">{option.name}</span>
                                            {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
                                        </div>
                                        {isActive && <Check className="h-4 w-4" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
