"use client";
import React, { useEffect } from "react";
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "default";
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "default", onConfirm, onCancel }: ConfirmDialogProps) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape" && open) onCancel(); }
        if (open) {
            window.addEventListener("keydown", onKey);
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
        }
    }, [open, onCancel]);
    if (!open) return null;
    const node = (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-sm rounded-lg border bg-background p-5 shadow-lg animate-in fade-in zoom-in-95">
                {title && <h2 className="text-sm font-semibold mb-2">{title}</h2>}
                {description && <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>}
                <div className="flex justify-end gap-2 text-xs">
                    <Button type="button" variant="secondary" size="sm" onClick={onCancel}>{cancelLabel}</Button>
                    <Button type="button" size="sm" onClick={onConfirm} className={cn(variant === "danger" && "bg-red-600 hover:bg-red-600/90 text-white")}>{confirmLabel}</Button>
                </div>
            </div>
        </div>
    );
    return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}
