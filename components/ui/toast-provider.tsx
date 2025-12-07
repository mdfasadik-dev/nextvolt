"use client";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";
export interface ToastOptions {
    id?: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number; // ms
}

interface ToastInternal extends Required<Omit<ToastOptions, "duration">> { duration: number; createdAt: number; }

interface ToastContextValue {
    push: (opts: ToastOptions) => string;
    remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastInternal[]>([]);
    const portalRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        portalRef.current = document.body;
    }, []);

    const remove = useCallback((id: string) => {
        setToasts(t => t.filter(x => x.id !== id));
    }, []);

    const push = useCallback((opts: ToastOptions) => {
        const id = opts.id || Math.random().toString(36).slice(2);
        const toast: ToastInternal = {
            id,
            title: opts.title ?? "",
            description: opts.description ?? "",
            variant: opts.variant ?? "default",
            duration: opts.duration ?? 3500,
            createdAt: Date.now(),
        };
        setToasts(t => [...t, toast]);
        if (toast.duration > 0) {
            setTimeout(() => remove(id), toast.duration + 50);
        }
        return id;
    }, [remove]);

    return (
        <ToastContext.Provider value={{ push, remove }}>
            {children}
            {portalRef.current && createPortal(
                <div className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 w-80 max-w-[90vw]">
                    {toasts.map(t => (
                        <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
                    ))}
                </div>,
                portalRef.current
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}

function variantClasses(variant: ToastVariant) {
    switch (variant) {
        case "success": return "border-green-500/40 bg-background text-green-600 dark:text-green-400";
        case "error": return "border-red-500/40 bg-background text-red-600 dark:text-red-400";
        case "warning": return "border-amber-500/40 bg-background text-amber-600 dark:text-amber-400";
        case "info": return "border-blue-500/40 bg-background text-blue-600 dark:text-blue-400";
        default: return "border-foreground/15 bg-background/95 backdrop-blur text-foreground";
    }
}

function ToastItem({ toast, onDismiss }: { toast: ToastInternal; onDismiss: () => void }) {
    return (
        <div
            className={cn("group relative overflow-hidden rounded-md border px-4 py-3 shadow-sm text-sm animate-in fade-in slide-in-from-bottom-2", variantClasses(toast.variant))}
            role="status"
            aria-live="polite"
        >
            <button
                onClick={onDismiss}
                className="absolute top-1 right-1 text-xs opacity-60 hover:opacity-100"
                aria-label="Close"
            >
                ×
            </button>
            {toast.title && <div className="font-medium leading-tight mb-0.5">{toast.title}</div>}
            {toast.description && <div className="text-xs opacity-90 leading-snug">{toast.description}</div>}
        </div>
    );
}
