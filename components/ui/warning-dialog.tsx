"use client";
import React, { useEffect } from "react";
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";

interface WarningDialogProps {
    open: boolean;
    title?: string;
    description?: string;
    closeLabel?: string;
    onClose: () => void;
}

export function WarningDialog({ open, title = "Warning", description, closeLabel = "OK", onClose }: WarningDialogProps) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape" && open) onClose(); }
        if (open) {
            window.addEventListener("keydown", onKey);
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
        }
    }, [open, onClose]);
    if (!open) return null;
    const node = (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm rounded-lg border bg-background p-5 shadow-lg animate-in fade-in zoom-in-95">
                {title && <h2 className="text-sm font-semibold mb-2">{title}</h2>}
                {description && <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>}
                <div className="flex justify-end text-xs">
                    <Button type="button" size="sm" onClick={onClose}> {closeLabel} </Button>
                </div>
            </div>
        </div>
    );
    return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}
