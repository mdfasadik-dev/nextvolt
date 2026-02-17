"use client";

import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { useToast } from "@/components/ui/toast-provider";

export interface AddToCartButtonProps extends ComponentProps<typeof Button> {
    productId: string;
    productName: string;
    price: number | null;
    productSlug?: string | null;
    productImage?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    quantity?: number;
    showIcon?: boolean;
}

export const AddToCartButton = forwardRef<HTMLButtonElement, AddToCartButtonProps>(function AddToCartButton(
    {
        productId,
        productName,
        price,
        productSlug,
        productImage,
        variantId,
        variantName,
        quantity = 1,
        showIcon = true,
        className,
        children,
        disabled,
        size = "icon",
        ...rest
    },
    ref,
) {
    const { addItem, isReady } = useCart();
    const toast = useToast();
    const isDisabled = disabled || !isReady || price == null || !Number.isFinite(price);
    const { ["aria-label"]: ariaLabelProp, ...buttonProps } = rest;
    const ariaLabel = ariaLabelProp ?? `Add ${productName} to cart`;

    const handleClick = () => {
        if (isDisabled || price == null) return;

        addItem(
            {
                productId,
                name: productName,
                price,
                slug: productSlug ?? undefined,
                imageUrl: productImage ?? undefined,
                variantId: variantId ?? undefined,
                variantName: variantName ?? undefined,
            },
            quantity,
        );
        toast.push({ variant: "success", title: "Added to cart", description: `${productName} has been added to your cart.` })
    };

    return (
        <Button
            type="button"
            ref={ref}
            onClick={handleClick}
            disabled={isDisabled}
            size={size}
            className={cn(size === "icon" ? "p-0" : "", className)}
            aria-label={ariaLabel}
            {...buttonProps}
        >
            {showIcon && <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
            {children ?? <span className="sr-only">Add to cart</span>}
        </Button>
    );
});
