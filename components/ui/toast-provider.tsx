"use client"

import { useCallback, useMemo } from "react"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="system"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    title: "group-[.toast]:text-foreground group-[.toast]:font-medium",
                    description: "!text-foreground/90 dark:!text-foreground/80",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {...props}
        />
    )
}

export { Toaster as ToastProvider }

export function useToast() {
    const push = useCallback(({ variant, title, description }: { variant?: "default" | "success" | "error" | "warning" | "info"; title?: string; description?: string }) => {
            switch (variant) {
                case "success":
                    sonnerToast.success(title, { description });
                    break;
                case "error":
                    sonnerToast.error(title, { description });
                    break;
                case "warning":
                    sonnerToast.warning(title, { description });
                    break;
                case "info":
                    sonnerToast.info(title, { description });
                    break;
                default:
                    sonnerToast(title, { description });
                    break;
            }
            return "";
        }, []);

    const remove = useCallback((id: string) => {
        sonnerToast.dismiss(id);
    }, []);

    return useMemo(() => ({ push, remove }), [push, remove]);
}
