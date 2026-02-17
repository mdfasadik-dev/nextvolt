"use client";
import React from "react";

interface Props {
    page: number;
    pageSize: number;
    total: number;
    disabled?: boolean;
    onPageChange: (p: number) => void;
    className?: string;
}

export function PaginationControls({
    page,
    pageSize,
    total,
    disabled,
    onPageChange,
    className = "",
}: Props) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;

    const canPrev = page > 1;
    const canNext = page < totalPages;
    const windowSize = 1;
    const pages: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) pages.push(i);
        else if (pages[pages.length - 1] !== "…") pages.push("…");
    }

    const go = (p: number) => {
        if (!disabled && p >= 1 && p <= totalPages && p !== page) onPageChange(p);
    };

    return (
        <div className={`flex items-center gap-2 justify-end mt-4 ${className}`}>
            <button
                disabled={!canPrev || disabled}
                onClick={() => go(page - 1)}
                className="h-8 px-2 text-xs rounded-md border disabled:opacity-40"
            >
                Prev
            </button>
            <ul className="flex items-center gap-1">
                {pages.map((p, i) =>
                    p === "…" ? (
                        <li key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                            …
                        </li>
                    ) : (
                        <li key={`page-${p}`}>
                            <button
                                disabled={disabled || p === page}
                                onClick={() => go(p)}
                                aria-current={p === page ? "page" : undefined}
                                className={`h-8 w-8 rounded-md text-xs border ${p === page ? "bg-accent font-medium" : "hover:bg-accent/60"
                                    }`}
                            >
                                {p}
                            </button>
                        </li>
                    )
                )}
            </ul>
            <button
                disabled={!canNext || disabled}
                onClick={() => go(page + 1)}
                className="h-8 px-2 text-xs rounded-md border disabled:opacity-40"
            >
                Next
            </button>
        </div>
    );
}
