"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useCustomerStorage } from "@/components/cart/use-customer-storage";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
    const parts = name
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function ProfileNavButton({ className }: { className?: string }) {
    const { customer, ready } = useCustomerStorage();
    const hasProfile = !!(customer.fullName.trim() && customer.phone.trim());
    const initials = getInitials(customer.fullName);

    return (
        <Link
            href="/profile"
            className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border bg-background p-1.5 lg:px-2.5 text-sm hover:bg-accent",
                className,
            )}
            aria-label={hasProfile ? "Open profile" : "Create profile"}
        >
            <span
                className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                    hasProfile ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
            >
                {hasProfile ? initials : <UserRound className="h-3.5 w-3.5" />}
            </span>
            <span className="hidden text-left md:flex md:flex-col md:leading-tight">
                {!ready ? (
                    <span className="text-xs text-muted-foreground">Loading...</span>
                ) : hasProfile ? (
                    <>
                        <span className="max-w-[128px] truncate text-[11px] font-medium">{customer.fullName}</span>
                        <span className="max-w-[128px] truncate text-[10px] text-muted-foreground">{customer.phone}</span>
                    </>
                ) : (
                    <>
                        <span className="text-[11px] font-medium">Profile</span>
                        <span className="text-[10px] text-muted-foreground">Sign In</span>
                    </>
                )}
            </span>
        </Link>
    );
}
