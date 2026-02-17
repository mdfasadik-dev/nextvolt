import { createAdminClient } from "@/lib/supabase/server";
import { Tables } from "@/lib/types/supabase";

export type CartItem = {
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
};

type DeliveryOptionRow = Tables<"delivery">;
type DeliveryWeightRuleRow = Tables<"delivery_weight_rules">;

type DeliveryPricingContext = {
    totalWeightGrams: number;
    rulesByDeliveryId: Map<string, DeliveryWeightRuleRow[]>;
};

export type CalculatedTotals = {
    subtotal: number;
    delivery: { id: string; label: string; amount: number } | null;
    discount: { id: string; code: string; amount: number; type: string } | null;
    charges: { id: string; label: string; amount: number; type: 'tax' | 'fee' | 'charge' | 'discount'; raw_value?: number; calc_type?: 'percent' | 'amount' }[];
    total: number;
};

function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
}

function computeUnits(value: number, rounding: string) {
    if (rounding === "floor") return Math.floor(value);
    if (rounding === "round") return Math.round(value);
    return Math.ceil(value);
}

function ruleApplies(totalWeight: number, rule: DeliveryWeightRuleRow) {
    if (totalWeight < rule.min_weight_grams) return false;
    if (rule.max_weight_grams != null && totalWeight > rule.max_weight_grams) return false;
    return true;
}

function computeRuleCharge(totalWeight: number, rule: DeliveryWeightRuleRow) {
    const baseCharge = Number(rule.base_charge || 0);
    const unitGrams = Number(rule.incremental_unit_grams || 0);
    const unitCharge = Number(rule.incremental_charge || 0);
    const baseWeight = Number(rule.base_weight_grams || 0);
    const rounding = rule.increment_rounding || "ceil";

    if (unitGrams <= 0 || unitCharge <= 0) {
        return roundMoney(baseCharge);
    }

    const extraWeight = Math.max(0, totalWeight - baseWeight);
    if (extraWeight <= 0) {
        return roundMoney(baseCharge);
    }

    const units = Math.max(0, computeUnits(extraWeight / unitGrams, rounding));
    return roundMoney(baseCharge + units * unitCharge);
}

export class CheckoutService {
    private static async assertProductsAreCheckoutAvailable(items: Array<{ productId: string }>) {
        const productIds = Array.from(new Set(items.map((item) => item.productId).filter(Boolean)));
        if (productIds.length === 0) return;

        const supabase = await createAdminClient();
        const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id,name,is_active,is_deleted,category_id")
            .in("id", productIds);

        if (productsError) throw productsError;

        const productMap = new Map((products || []).map((product) => [product.id, product]));

        const unavailableNames = new Set<string>();
        for (const id of productIds) {
            const product = productMap.get(id);
            if (!product || !product.is_active || product.is_deleted) {
                unavailableNames.add(product?.name || id);
            }
        }

        const categoryIds = Array.from(
            new Set(
                (products || [])
                    .map((product) => product.category_id)
                    .filter((categoryId): categoryId is string => Boolean(categoryId))
            )
        );

        if (categoryIds.length > 0) {
            const { data: activeCategories, error: categoriesError } = await supabase
                .from("categories")
                .select("id")
                .eq("is_active", true)
                .eq("is_deleted", false)
                .in("id", categoryIds);
            if (categoriesError) throw categoriesError;

            const activeCategorySet = new Set((activeCategories || []).map((category) => category.id));
            for (const product of products || []) {
                if (product.category_id && !activeCategorySet.has(product.category_id)) {
                    unavailableNames.add(product.name || product.id);
                }
            }
        }

        if (unavailableNames.size > 0) {
            const list = Array.from(unavailableNames);
            const head = list.slice(0, 3).join(", ");
            const suffix = list.length > 3 ? ` and ${list.length - 3} more` : "";
            throw new Error(
                `Some items in your cart are unavailable (inactive/deleted product or category): ${head}${suffix}. Please remove them and try again.`
            );
        }
    }

    private static async getProductWeightMap(items: Array<{ productId: string; quantity: number }>) {
        const productIds = Array.from(new Set(items.map((item) => item.productId)));
        if (productIds.length === 0) return new Map<string, number>();

        const supabase = await createAdminClient();
        const { data, error } = await supabase
            .from("products")
            .select("id,weight_grams")
            .eq("is_deleted", false)
            .in("id", productIds);

        if (error) throw error;

        const map = new Map<string, number>();
        (data || []).forEach((row) => {
            map.set(row.id, Number(row.weight_grams || 0));
        });
        return map;
    }

    private static async buildDeliveryPricingContext(items: Array<{ productId: string; quantity: number }>): Promise<DeliveryPricingContext> {
        if (!items.length) {
            return { totalWeightGrams: 0, rulesByDeliveryId: new Map() };
        }

        const weightMap = await this.getProductWeightMap(items);
        const totalWeightGrams = items.reduce((total, item) => {
            const unitWeight = weightMap.get(item.productId) || 0;
            return total + unitWeight * item.quantity;
        }, 0);

        const supabase = await createAdminClient();
        const { data: rules, error } = await supabase
            .from("delivery_weight_rules")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("min_weight_grams", { ascending: true });

        if (error) throw error;

        const grouped = new Map<string, DeliveryWeightRuleRow[]>();
        (rules || []).forEach((rule) => {
            const list = grouped.get(rule.delivery_id) || [];
            list.push(rule);
            grouped.set(rule.delivery_id, list);
        });

        return { totalWeightGrams, rulesByDeliveryId: grouped };
    }

    private static resolveDeliveryAmount(option: DeliveryOptionRow, context: DeliveryPricingContext) {
        const rules = context.rulesByDeliveryId.get(option.id) || [];
        const activeRule = rules.find((rule) => ruleApplies(context.totalWeightGrams, rule));
        if (!activeRule) return Number(option.amount || 0);
        return computeRuleCharge(context.totalWeightGrams, activeRule);
    }

    static async getDeliveryOptions(items?: Array<{ productId: string; quantity: number }>) {
        const supabase = await createAdminClient();
        const { data, error } = await supabase
            .from('delivery')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        const normalizedItems = (items || []).filter((item) => item.productId && item.quantity > 0);
        const context = normalizedItems.length > 0 ? await this.buildDeliveryPricingContext(normalizedItems) : null;

        return data.map(d => ({
            id: d.id,
            label: d.label,
            amount: context ? this.resolveDeliveryAmount(d, context) : Number(d.amount),
            base_amount: Number(d.amount),
            is_default: d.is_default,
            total_weight_grams: context?.totalWeightGrams ?? 0,
            has_weight_rules: context ? (context.rulesByDeliveryId.get(d.id)?.length || 0) > 0 : false,
        }));
    }

    static async validateCoupon(code: string, subtotal: number) {
        const supabase = await createAdminClient();
        const normalizedCode = code.trim().toUpperCase();
        if (!normalizedCode) {
            throw new Error("Please enter a coupon code.");
        }

        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', normalizedCode)
            .single();

        if (error || !coupon) {
            throw new Error("Coupon code is invalid.");
        }

        if (!coupon.is_active) {
            throw new Error("Coupon is inactive.");
        }

        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            throw new Error("Coupon is not yet active.");
        }
        if (coupon.valid_to && new Date(coupon.valid_to) < now) {
            throw new Error("Coupon has expired.");
        }
        if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
            throw new Error(`Minimum order amount of ${coupon.min_order_amount} is required for this coupon.`);
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
        await this.assertProductsAreCheckoutAvailable(items);
        const supabase = await createAdminClient();

        // 1. Calculate Subtotal
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        let currentTotal = subtotal;

        // 2. Apply Coupon
        let discount = null;
        if (couponCode) {
            const cop = await this.validateCoupon(couponCode, subtotal);
            discount = {
                code: cop.code,
                amount: cop.amount,
                type: cop.type,
                id: cop.id // Internal use
            };
            currentTotal -= discount.amount;
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
                const context = await this.buildDeliveryPricingContext(items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })));
                const amount = this.resolveDeliveryAmount(delOption, context);
                delivery = {
                    id: delOption.id,
                    label: delOption.label,
                    amount,
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
            discount: discount ? { id: discount.id, code: discount.code, amount: discount.amount, type: discount.type } : null,
            charges: charges.map(c => ({ id: c.id, label: c.label, amount: c.amount, type: c.type, calc_type: c.calc_type, raw_value: c.raw_value })),
            total: Math.max(0, currentTotal) // Prevent negative total
        };
    }
}
