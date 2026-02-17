"use client";

import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/constants/order-status";

const STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "Pending",
    accepted: "Accepted",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    accepted: "secondary",
    shipped: "outline",
    completed: "default",
    cancelled: "destructive",
};

interface OrderStatusBadgeProps {
    status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
    const label = STATUS_LABELS[status] ?? status;
    return (
        <Badge variant={STATUS_VARIANTS[status] ?? "outline"} className="capitalize">
            {label}
        </Badge>
    );
}
