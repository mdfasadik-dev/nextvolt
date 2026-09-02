/**
 * Store currency, shared by the storefront, checkout and notifications.
 *
 * Defaults to BDT to match the `orders.currency` schema default; override with
 * NEXT_PUBLIC_CURRENCY_CODE / NEXT_PUBLIC_CURRENCY_SYMBOL to run another store.
 */
export const DEFAULT_CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY_CODE || "BDT";

export const DEFAULT_CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "৳";
