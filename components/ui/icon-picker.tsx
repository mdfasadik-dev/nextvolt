"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    LOAD_ICON_OPTIONS,
    findLoadIconOption,
    type LoadIconOption,
} from "@/lib/constants/load-icons";

interface IconPickerProps {
    value: string | null;
    onChange: (key: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
}

/** Searchable icon dropdown with live previews, grouped by category. */
export function IconPicker({
    value,
    onChange,
    placeholder = "Choose an icon…",
    disabled = false,
}: IconPickerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const selected = useMemo(() => findLoadIconOption(value), [value]);

    const grouped = useMemo(() => {
        const term = query.trim().toLowerCase();
        const matches = term
            ? LOAD_ICON_OPTIONS.filter(
                  option =>
                      option.label.toLowerCase().includes(term) ||
                      option.key.includes(term) ||
                      option.keywords.includes(term),
              )
            : LOAD_ICON_OPTIONS;

        const map = new Map<LoadIconOption["group"], LoadIconOption[]>();
        for (const option of matches) {
            const list = map.get(option.group) || [];
            list.push(option);
            map.set(option.group, list);
        }
        return Array.from(map.entries());
    }, [query]);

    useEffect(() => {
        function onClick(event: MouseEvent) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    useEffect(() => {
        if (open) {
            window.requestAnimationFrame(() => inputRef.current?.focus());
        } else {
            setQuery("");
        }
    }, [open]);

    const SelectedIcon = selected?.Icon;

    return (
        <div ref={containerRef} className="relative w-full">
            <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => setOpen(prev => !prev)}
                className={cn(
                    "h-9 w-full justify-between px-3 text-left font-normal",
                    !selected && "text-muted-foreground",
                )}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {SelectedIcon ? (
                        <SelectedIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    ) : null}
                    <span className="truncate">{selected ? selected.label : placeholder}</span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                    {selected && !disabled && (
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
                            placeholder="Search icons…"
                            className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0"
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                        {grouped.length === 0 ? (
                            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                No icons match “{query}”.
                            </p>
                        ) : (
                            grouped.map(([group, options]) => (
                                <div key={group}>
                                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {group}
                                    </p>
                                    <div className="grid grid-cols-2 gap-0.5 px-1 pb-1">
                                        {options.map(option => {
                                            const Icon = option.Icon;
                                            const active = option.key === value;
                                            return (
                                                <button
                                                    key={option.key}
                                                    type="button"
                                                    title={option.label}
                                                    onClick={() => {
                                                        onChange(option.key);
                                                        setOpen(false);
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent",
                                                        active && "bg-accent text-accent-foreground",
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                                    <span className="truncate">{option.label}</span>
                                                    {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
