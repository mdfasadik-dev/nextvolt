"use client";
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    align?: 'center' | 'top';
}
export function Dialog({ open, onOpenChange, children, align = 'center' }: DialogProps) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);
    React.useEffect(() => {
        if (open) {
            const prevOverflow = document.documentElement.style.overflow;
            document.documentElement.style.overflow = 'hidden';
            return () => { document.documentElement.style.overflow = prevOverflow; };
        }
    }, [open]);
    if (!open || !mounted) return null;
    return createPortal(
        <div className={cn(
            'fixed inset-0 z-50 flex px-4 py-6 sm:px-6 sm:py-8', 'touch-none'
            , align === 'center' ? 'items-center justify-center' : 'items-start justify-center')}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
            {children}
        </div>,
        document.body
    );
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={cn("relative w-full max-w-lg rounded-lg border bg-background shadow-lg animate-in fade-in-0 zoom-in-95 pointer-events-auto", className)}>
            {children}
        </div>
    );
}
export function DialogHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <div className={cn("border-b px-4 py-3 flex items-center justify-between", className)}>{children}</div>;
}
export function DialogTitle({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <h2 className={cn("text-sm font-semibold leading-none tracking-tight", className)}>{children}</h2>;
}
export function DialogBody({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <div className={cn("px-4 py-4 max-h-[70vh] overflow-auto text-sm", className)}>{children}</div>;
}
export function DialogFooter({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <div className={cn("border-t px-4 py-3 flex justify-end gap-2", className)}>{children}</div>;
}
