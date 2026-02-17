"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { Download, Loader2, Search } from "lucide-react";
import { PaginationControls } from "@/app/admin/variants/_components/pagination-controls";
import { listCustomersPaged } from "../actions";
import type { CustomerListResult, CustomerSummary } from "@/lib/services/customerTypes";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatDateTime(value: string | null) {
    if (!value) return "N/A";
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(value));
    } catch {
        return value;
    }
}

export function CustomersClient({ initial }: { initial: CustomerListResult }) {
    const toast = useToast();
    const toastRef = useRef(toast);

    const [rows, setRows] = useState<CustomerSummary[]>(initial.rows);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(initial.page ?? 1);
    const [pageSize, setPageSize] = useState(initial.pageSize ?? 20);
    const [total, setTotal] = useState(initial.total ?? initial.rows.length);
    const [isFetching, startTransition] = useTransition();
    const [isExporting, setIsExporting] = useState(false);
    const isFirstLoad = useRef(true);
    const previousSearchRef = useRef("");

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    const handleExport = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const response = await fetch("/api/admin/customers/export", { method: "GET" });
            if (!response.ok) {
                let message = "Failed to export customers.";
                try {
                    const payload = (await response.json()) as { error?: string };
                    if (payload.error) message = payload.error;
                } catch {
                    // ignore parsing failure
                }
                throw new Error(message);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            const disposition = response.headers.get("Content-Disposition");
            const fileName = disposition?.match(/filename="(.+)"/)?.[1] || `customers-${new Date().toISOString().slice(0, 10)}.csv`;
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to export customers.";
            toastRef.current.push({
                variant: "error",
                title: "Export failed",
                description: message,
            });
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            previousSearchRef.current = debouncedSearch;
            return;
        }

        if (previousSearchRef.current !== debouncedSearch && page !== 1) {
            previousSearchRef.current = debouncedSearch;
            setPage(1);
            return;
        }
        previousSearchRef.current = debouncedSearch;

        startTransition(async () => {
            try {
                const res = await listCustomersPaged({
                    page,
                    pageSize,
                    search: debouncedSearch || undefined,
                });
                setRows(res.rows);
                setTotal(res.total);
            } catch (error) {
                console.error(error);
                toastRef.current.push({
                    variant: "error",
                    title: "Unable to load customers",
                    description: "Please try again.",
                });
            }
        });
    }, [debouncedSearch, page, pageSize]);

    return (
        <Card>
            <CardHeader className="gap-4">
                <CardTitle className="text-lg">Customers</CardTitle>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-full max-w-md items-center gap-2">
                        <div className="relative w-full">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search by mobile, email or name"
                                className="pl-9"
                            />
                            {isFetching ? (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : null}
                        </div>
                        <Select
                            value={String(pageSize)}
                            onValueChange={value => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[128px]">
                                <SelectValue placeholder="Per page" />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map(option => (
                                    <SelectItem key={option} value={String(option)}>
                                        {option} / page
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isExporting ? "Exporting..." : "Download"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-hidden rounded-lg border">
                    <div className="max-h-[65vh] overflow-auto">
                        <table className="w-full min-w-[780px] text-sm">
                            <thead>
                                <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="px-4 py-2 text-left font-semibold">Mobile</th>
                                    <th className="px-4 py-2 text-left font-semibold">Name</th>
                                    <th className="px-4 py-2 text-left font-semibold">Email</th>
                                    <th className="px-4 py-2 text-center font-semibold">Orders</th>
                                    <th className="px-4 py-2 text-left font-semibold">Latest Order Date</th>
                                    <th className="px-4 py-2 text-left font-semibold">Latest Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            No customers found.
                                        </td>
                                    </tr>
                                ) : null}
                                {rows.map(customer => (
                                    <tr key={customer.phone} className="border-t">
                                        <td className="px-4 py-3 font-medium">{customer.phone}</td>
                                        <td className="px-4 py-3">{customer.name || "N/A"}</td>
                                        <td className="px-4 py-3">{customer.email || "N/A"}</td>
                                        <td className="px-4 py-3 text-center">{customer.ordersCount}</td>
                                        <td className="px-4 py-3">{formatDateTime(customer.latestOrderAt)}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {customer.latestOrderId ? `#${customer.latestOrderId}` : "N/A"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}
                        {" - "}
                        {Math.min(page * pageSize, total)} of {total} customers
                    </p>
                    <PaginationControls
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        disabled={isFetching}
                        onPageChange={setPage}
                        className="mt-0"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
