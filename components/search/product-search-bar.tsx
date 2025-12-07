"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search } from "lucide-react";

type ProductRow = Tables<"products">;

type ProductResult = Pick<ProductRow, "id" | "name" | "slug" | "brand">;

interface ProductSearchBarProps {
    className?: string;
    placeholder?: string;
    debounceMs?: number;
    maxResults?: number;
}

export function ProductSearchBar({
    className,
    placeholder = "Search products...",
    debounceMs = 400,
    maxResults = 8,
}: ProductSearchBarProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const [results, setResults] = useState<ProductResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handle = window.setTimeout(() => setDebounced(query), debounceMs);
        return () => window.clearTimeout(handle);
    }, [query, debounceMs]);

    useEffect(() => {
        const term = debounced.trim();
        if (!term) {
            setResults([]);
            setIsOpen(false);
            setErrorMessage(null);
            return;
        }
        const sanitizedTerm = term.replace(/[%_]/g, "").replace(/[',]/g, " ").trim();
        if (!sanitizedTerm) {
            setResults([]);
            setIsOpen(false);
            setErrorMessage(null);
            return;
        }
        let cancelled = false;
        async function run() {
            setIsLoading(true);
            setErrorMessage(null);
            const { data, error } = await supabase
                .from("products")
                .select("id,name,slug,brand")
                .eq("is_active", true)
                .or(`name.ilike.%${sanitizedTerm}%,slug.ilike.%${sanitizedTerm}%,brand.ilike.%${sanitizedTerm}%`)
                .order("created_at", { ascending: false })
                .limit(maxResults);
            if (cancelled) return;
            if (error) {
                console.error("Product search failed", error);
                setErrorMessage("Problem searching products");
                setResults([]);
                setIsOpen(true);
            } else {
                setResults(data ?? []);
                setIsOpen(true);
            }
            setIsLoading(false);
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [debounced, maxResults, supabase]);

    const handleSelect = useCallback(
        (product: ProductResult) => {
            setQuery("");
            setResults([]);
            setIsOpen(false);
            const identifier = product.slug || product.id;
            router.push(`/products/${identifier}`);
        },
        [router],
    );

    const showDropdown = isOpen;

    return (
        <div className={cn("relative", className)}>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    onBlur={() => {
                        window.setTimeout(() => setIsOpen(false), 150);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && results.length > 0) {
                            event.preventDefault();
                            handleSelect(results[0]);
                        }
                    }}
                    placeholder={placeholder}
                    className="pl-9"
                    aria-label="Search products"
                    autoComplete="off"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
            {showDropdown && (
                <div className="absolute left-0 right-0 z-[70] mt-2 w-full rounded-md border bg-popover shadow-md">
                    {results.map((product) => (
                        <button
                            key={product.id}
                            type="button"
                            onMouseDown={(event) => {
                                event.preventDefault();
                                handleSelect(product);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted focus:bg-muted"
                        >
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">{product.name}</span>
                                {product.brand && (
                                    <span className="text-xs text-muted-foreground">{product.brand}</span>
                                )}
                            </div>
                        </button>
                    ))}
                    {!results.length && errorMessage && (
                        <div className="px-4 py-3 text-sm text-destructive">{errorMessage}</div>
                    )}
                    {!results.length && !errorMessage && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">No products found</div>
                    )}
                </div>
            )}
        </div>
    );
}
