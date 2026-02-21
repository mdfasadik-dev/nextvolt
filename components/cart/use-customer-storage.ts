"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface CustomerInfo {
    fullName: string;
    email: string; // Optional in form, but kept in string
    phone: string;
    address: string;
    notes: string;
    paymentMethod: "cod" | string;
}

const STORAGE_KEY = "nextvolt-customer";
const CUSTOMER_STORAGE_EVENT = "nextvolt-customer-updated";

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

function readStoredCustomer(): CustomerInfo {
    if (typeof window === "undefined") return DEFAULT_CUSTOMER;
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_CUSTOMER;
        return sanitizeCustomer(JSON.parse(stored) as unknown);
    } catch (error) {
        console.error("Failed to load customer info", error);
        return DEFAULT_CUSTOMER;
    }
}

function notifyCustomerUpdated() {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
        window.dispatchEvent(new Event(CUSTOMER_STORAGE_EVENT));
    }, 0);
}

export function useCustomerStorage() {
    const [customer, setCustomer] = useState<CustomerInfo>(DEFAULT_CUSTOMER);
    const [ready, setReady] = useState(false);
    const customerRef = useRef<CustomerInfo>(DEFAULT_CUSTOMER);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const sync = () => {
            const next = readStoredCustomer();
            customerRef.current = next;
            setCustomer(next);
        };
        sync();
        setReady(true);
        window.addEventListener("storage", sync);
        window.addEventListener(CUSTOMER_STORAGE_EVENT, sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener(CUSTOMER_STORAGE_EVENT, sync);
        };
    }, []);

    const persist = useCallback((next: CustomerInfo) => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            notifyCustomerUpdated();
        } catch (error) {
            console.error("Failed to persist customer info", error);
        }
    }, []);

    const updateCustomer = useCallback(
        (patch: Partial<CustomerInfo>) => {
            const next = { ...customerRef.current, ...patch };
            customerRef.current = next;
            setCustomer(next);
            persist(next);
        },
        [persist],
    );

    const setCustomerInfo = useCallback(
        (next: CustomerInfo) => {
            const sanitized = sanitizeCustomer(next);
            customerRef.current = sanitized;
            setCustomer(sanitized);
            persist(sanitized);
        },
        [persist],
    );

    const clearCustomer = useCallback(() => {
        customerRef.current = DEFAULT_CUSTOMER;
        setCustomer(DEFAULT_CUSTOMER);
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY);
            notifyCustomerUpdated();
        }
    }, []);

    const value = useMemo(
        () => ({
            customer,
            updateCustomer,
            setCustomerInfo,
            clearCustomer,
            ready,
        }),
        [customer, updateCustomer, setCustomerInfo, clearCustomer, ready],
    );

    return value;
}
