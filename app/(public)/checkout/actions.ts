"use server";

import { CheckoutService } from "@/lib/services/checkoutService";

type CheckoutItemInput = {
    productId: string;
    variantId?: string;
    quantity: number;
    price?: number;
};

export async function getCheckoutDeliveryOptions() {
    return CheckoutService.getDeliveryOptions();
}

export async function getCheckoutDeliveryOptionsForItems(items: CheckoutItemInput[]) {
    return CheckoutService.getDeliveryOptions(
        items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
        })),
    );
}

export async function calculateCheckout(items: CheckoutItemInput[], deliveryId?: string, couponCode?: string) {
    try {
        const result = await CheckoutService.calculateOrderTotals(
            items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price ?? 0,
            })),
            deliveryId,
            couponCode,
        );
        return { success: true, data: result };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Checkout calculation failed." };
    }
}
