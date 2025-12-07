import { createAdminClient } from "@/lib/supabase/server";

export type CartItem = {
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
};

export type CalculatedTotals = {
    subtotal: number;
    delivery: { id: string; label: string; amount: number } | null;
    discount: { code: string; amount: number; type: string } | null;
    charges: { id: string; label: string; amount: number; type: 'tax' | 'fee' | 'charge' | 'discount'; raw_value?: number; calc_type?: 'percent' | 'amount' }[];
    total: number;
};

export class CheckoutService {
    static async getDeliveryOptions() {
        const supabase = await createAdminClient();
        const { data, error } = await supabase
            .from('delivery')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data.map(d => ({
            id: d.id,
            label: d.label,
            amount: d.amount,
            is_default: d.is_default
        }));
    }

    static async validateCoupon(code: string, subtotal: number) {
        const supabase = await createAdminClient();
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (error || !coupon) {
            throw new Error("Invalid or expired coupon code.");
        }

        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            throw new Error("Coupon is not yet active.");
        }
        if (coupon.valid_to && new Date(coupon.valid_to) < now) {
            throw new Error("Coupon has expired.");
        }
        if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
            throw new Error(`Minimum order amount of $${coupon.min_order_amount} required.`);
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (coupon.calc_type === 'percent') {
            discountAmount = (subtotal * coupon.amount) / 100;
        } else {
            discountAmount = coupon.amount;
        }

        // Ensure discount doesn't exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal);

        return {
            id: coupon.id,
            code: coupon.code,
            amount: discountAmount,
            type: coupon.calc_type as 'percent' | 'amount',
            raw_value: coupon.amount
        };
    }

    static async calculateOrderTotals(
        items: { productId: string; price: number; quantity: number }[],
        deliveryId?: string,
        couponCode?: string
    ): Promise<CalculatedTotals> {
        const supabase = await createAdminClient();

        // 1. Calculate Subtotal
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        let currentTotal = subtotal;

        // 2. Apply Coupon
        let discount = null;
        if (couponCode) {
            try {
                const cop = await this.validateCoupon(couponCode, subtotal);
                discount = {
                    code: cop.code,
                    amount: cop.amount,
                    type: cop.type,
                    id: cop.id // Internal use
                };
                currentTotal -= discount.amount;
            } catch (e) {
                // Ignore invalid coupons during calculation, or throw if strict?
                // For now, valid code lets it pass, invalid ignores it.
                // In a real app we might want to return an error state.
                console.warn("Coupon validation failed:", e);
            }
        }

        // 3. Apply Delivery
        let delivery = null;
        if (deliveryId) {
            const { data: delOption } = await supabase
                .from('delivery')
                .select('*')
                .eq('id', deliveryId)
                .single();

            if (delOption) {
                delivery = {
                    id: delOption.id,
                    label: delOption.label,
                    amount: delOption.amount
                };
                currentTotal += delivery.amount;
            }
        }

        // 4. Apply Charge Options (Taxes/Fees)
        // These are typically applied to subtotal (pre-discount? or post-discount?).
        // Usually taxes are on the discounted amount.
        const { data: chargeOptions } = await supabase
            .from('charge_options')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        const charges = [];
        if (chargeOptions) {
            // Determine taxable base. Usually (Subtotal - Discount).
            // Sometimes delivery is taxable too. Let's assume (Subtotal - Discount) for now.
            const taxableBase = Math.max(0, subtotal - (discount?.amount || 0));

            for (const opt of chargeOptions) {
                let amount = 0;
                if (opt.calc_type === 'percent') {
                    // For percent, calculate based on subtotal (or taxable base if needed)
                    // Usually fees are on subtotal
                    amount = (subtotal * opt.amount) / 100;
                } else {
                    amount = opt.amount;
                }

                // If type is discount, subtract it. If charge/tax, add it.
                if (opt.type === 'discount') {
                    currentTotal -= amount;
                } else {
                    currentTotal += amount;
                }

                charges.push({
                    id: opt.id,
                    label: opt.label,
                    amount: amount,
                    type: opt.type as 'tax' | 'fee' | 'charge' | 'discount', // Extend type if needed, or map to 'fee'/'tax'
                    calc_type: opt.calc_type as 'percent' | 'amount',
                    raw_value: opt.amount
                });
            }
        }

        return {
            subtotal,
            delivery,
            discount: discount ? { code: discount.code, amount: discount.amount, type: discount.type } : null,
            charges: charges.map(c => ({ id: c.id, label: c.label, amount: c.amount, type: c.type, calc_type: c.calc_type, raw_value: c.raw_value })),
            total: Math.max(0, currentTotal) // Prevent negative total
        };
    }
}
