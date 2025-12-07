"use client";

import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const STORAGE_KEY = "nextvolt-cart";

export interface CartItem {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string | null;
    slug?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    metadata?: Record<string, string | number | boolean | null | undefined>;
}

export type CartItemInput = Omit<CartItem, "id" | "quantity"> & { quantity?: number };

interface CartContextValue {
    items: CartItem[];
    addItem: (item: CartItemInput, quantity?: number) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clear: () => void;
    itemCount: number;
    subtotal: number;
    isReady: boolean;
}

function buildKey(productId: string, variantId?: string | null) {
    return `${productId}::${variantId || "base"}`;
}

function sanitizeItems(raw: unknown): CartItem[] {
    if (!Array.isArray(raw)) return [];
    const sanitized: CartItem[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;
        const obj = entry as Record<string, unknown>;
        const productId = typeof obj.productId === "string" ? obj.productId : null;
        const name = typeof obj.name === "string" ? obj.name : null;
        const price = Number(obj.price);
        const quantity = Number(obj.quantity);
        if (!productId || !name || !Number.isFinite(price) || !Number.isFinite(quantity)) continue;
        const variantId = typeof obj.variantId === "string" ? obj.variantId : null;
        const id = typeof obj.id === "string" ? obj.id : buildKey(productId, variantId);
        sanitized.push({
            id,
            productId,
            name,
            price,
            quantity: Math.max(1, Math.floor(quantity)),
            imageUrl: typeof obj.imageUrl === "string" ? obj.imageUrl : null,
            slug: typeof obj.slug === "string" ? obj.slug : null,
            variantId,
            variantName: typeof obj.variantName === "string" ? obj.variantName : null,
            metadata: typeof obj.metadata === "object" && obj.metadata !== null ? (obj.metadata as Record<string, string | number | boolean | null | undefined>) : undefined,
        });
    }
    return sanitized;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as unknown;
                setItems((prev) => (prev.length ? prev : sanitizeItems(parsed)));
            }
        } catch (error) {
            console.error("Failed to load cart from storage", error);
        } finally {
            setIsReady(true);
        }
    }, []);

    useEffect(() => {
        if (!isReady || typeof window === "undefined") return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error("Failed to persist cart", error);
        }
    }, [items, isReady]);

    const addItem = useCallback((input: CartItemInput, quantity = 1) => {
        if (!input.productId || !input.name) return;
        const price = Number(input.price);
        if (!Number.isFinite(price)) return;
        const qty = Math.max(1, Math.floor(quantity));
        const key = buildKey(input.productId, input.variantId);
        setItems((prev) => {
            const next = [...prev];
            const index = next.findIndex((item) => item.id === key);
            if (index >= 0) {
                const existing = next[index];
                next[index] = {
                    ...existing,
                    price,
                    quantity: existing.quantity + qty,
                    name: input.name || existing.name,
                    imageUrl: input.imageUrl ?? existing.imageUrl,
                    slug: input.slug ?? existing.slug,
                    variantName: input.variantName ?? existing.variantName,
                    metadata: input.metadata ?? existing.metadata,
                };
                return next;
            }
            next.push({
                id: key,
                productId: input.productId,
                name: input.name,
                price,
                quantity: qty,
                imageUrl: input.imageUrl ?? null,
                slug: input.slug ?? null,
                variantId: input.variantId ?? null,
                variantName: input.variantName ?? null,
                metadata: input.metadata,
            });
            return next;
        });
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const updateQuantity = useCallback((id: string, quantity: number) => {
        setItems((prev) => {
            const qty = Math.max(0, Math.floor(quantity));
            return prev
                .map((item) => (item.id === id ? { ...item, quantity: qty } : item))
                .filter((item) => item.quantity > 0);
        });
    }, []);

    const clear = useCallback(() => {
        setItems([]);
    }, []);

    const itemCount = useMemo(
        () => items.reduce((count, item) => count + item.quantity, 0),
        [items],
    );

    const subtotal = useMemo(
        () => items.reduce((total, item) => total + item.price * item.quantity, 0),
        [items],
    );

    const value = useMemo<CartContextValue>(
        () => ({
            items,
            addItem,
            removeItem,
            updateQuantity,
            clear,
            itemCount,
            subtotal,
            isReady,
        }),
        [items, addItem, removeItem, updateQuantity, clear, itemCount, subtotal, isReady],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) {
        throw new Error("useCart must be used within <CartProvider>");
    }
    return ctx;
}

