"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetContextValue { open: boolean; setOpen: (v: boolean) => void }
const SheetContext = React.createContext<SheetContextValue | null>(null);

export function Sheet({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

export function useSheetContext() {
    const ctx = React.useContext(SheetContext);
    if (!ctx) throw new Error("Sheet components must be used within <Sheet>");
    return ctx;
}

interface SheetTriggerProps {
    children: React.ReactNode;
    className?: string;
    asChild?: boolean;
}

export function SheetTrigger({ children, className, asChild = false }: SheetTriggerProps) {
    const ctx = React.useContext(SheetContext)!;
    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLElement> }>;
        const existing = child.props.onClick;
        return React.cloneElement(child, {
            onClick: (event: React.MouseEvent<HTMLElement>) => {
                existing?.(event);
                if (!event.defaultPrevented) ctx.setOpen(true);
            },
        });
    }
    return (
        <button
            type="button"
            onClick={() => ctx.setOpen(true)}
            className={cn("inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent", className)}
        >
            {children}
        </button>
    );
}

export function SheetClose({ children, className }: { children?: React.ReactNode; className?: string }) {
    const ctx = React.useContext(SheetContext)!;
    return (
        <button
            type="button"
            onClick={() => ctx.setOpen(false)}
            className={cn("p-1 rounded hover:bg-accent", className)}
        >
            {children || <X className="w-5 h-5" />}
        </button>
    );
}

export function SheetContent({ side = "left", title, children }: { side?: "left" | "right"; title?: string; children: React.ReactNode }) {
    const ctx = React.useContext(SheetContext)!;
    const [visible, setVisible] = React.useState(ctx.open);
    const [mounted, setMounted] = React.useState(false); // true => in-place, false => off-screen
    const isBrowser = typeof window !== "undefined";
    React.useEffect(() => {
        if (ctx.open) {
            setVisible(true);
            setMounted(false); // start from hidden position
            // delay to next tick so browser paints initial transform before transitioning
            const t = setTimeout(() => setMounted(true), 16); // ~ one frame
            return () => clearTimeout(t);
        } else if (visible) {
            // run exit
            setMounted(false);
            const t = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(t);
        }
    }, [ctx.open, visible]);
    if (!isBrowser || !visible) return null;
    const translateClass = (openNow: boolean) => side === 'left'
        ? (openNow ? 'translate-x-0' : '-translate-x-full')
        : (openNow ? 'translate-x-0' : 'translate-x-full');
    const motionClass = translateClass(mounted);
    return createPortal(
        <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/50" onClick={() => ctx.setOpen(false)} />
            <div className={`absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-80 max-w-[85%] bg-background border-${side === 'left' ? 'r' : 'l'} shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out will-change-transform ${motionClass}`}>
                <div className="flex items-center justify-between border-b px-4 h-14">
                    <h2 className="font-semibold text-sm">{title}</h2>
                    <SheetClose />
                </div>
                <div className="flex-1 overflow-auto px-1 pb-6">{children}</div>
            </div>
        </div>, document.body);
}
