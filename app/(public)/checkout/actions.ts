"use server";

import { CheckoutService } from "@/lib/services/checkoutService";

export async function getCheckoutDeliveryOptions() {
    return CheckoutService.getDeliveryOptions();
}

export async function calculateCheckout(items: any[], deliveryId?: string, couponCode?: string) {
    try {
        const result = await CheckoutService.calculateOrderTotals(items, deliveryId, couponCode);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
