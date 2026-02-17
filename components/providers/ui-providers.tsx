"use client";
import React from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { CartProvider } from "@/components/cart/cart-provider";

export function UIProviders({ children }: { children: React.ReactNode }) {
    return (
        <CartProvider>
            {children}
            <ToastProvider />
        </CartProvider>
    );
}
