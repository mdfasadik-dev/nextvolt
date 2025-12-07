"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface CustomerInfo {
    fullName: string;
    email: string; // Optional in form, but kept in string
    phone: string;
    address: string;
    notes: string;
    paymentMethod: "cod" | string;
}

const STORAGE_KEY = "nextvolt-customer";

const DEFAULT_CUSTOMER: CustomerInfo = {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    paymentMethod: "cod",
};

function sanitizeCustomer(input: unknown): CustomerInfo {
    if (!input || typeof input !== "object") return DEFAULT_CUSTOMER;
    const raw = input as Record<string, unknown>;
    return {
        fullName: typeof raw.fullName === "string" ? raw.fullName : "",
        email: typeof raw.email === "string" ? raw.email : "",
        phone: typeof raw.phone === "string" ? raw.phone : "",
        address: typeof raw.address === "string" ? raw.address : "",
        notes: typeof raw.notes === "string" ? raw.notes : "",
        paymentMethod: typeof raw.paymentMethod === "string" && raw.paymentMethod.length ? raw.paymentMethod : "cod",
    };
}

export function useCustomerStorage() {
    const [customer, setCustomer] = useState<CustomerInfo>(DEFAULT_CUSTOMER);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as unknown;
                setCustomer(sanitizeCustomer(parsed));
            }
        } catch (error) {
            console.error("Failed to load customer info", error);
        } finally {
            setReady(true);
        }
    }, []);

    const persist = useCallback((next: CustomerInfo) => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
            console.error("Failed to persist customer info", error);
        }
    }, []);

    const updateCustomer = useCallback(
        (patch: Partial<CustomerInfo>) => {
            setCustomer((prev) => {
                const next = { ...prev, ...patch };
                persist(next);
                return next;
            });
        },
        [persist],
    );

    const clearCustomer = useCallback(() => {
        setCustomer(DEFAULT_CUSTOMER);
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    const value = useMemo(
        () => ({
            customer,
            updateCustomer,
            clearCustomer,
            ready,
        }),
        [customer, updateCustomer, clearCustomer, ready],
    );

    return value;
}

