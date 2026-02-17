export interface CustomerSummary {
    phone: string;
    name: string | null;
    email: string | null;
    ordersCount: number;
    latestOrderId: string | null;
    latestOrderAt: string | null;
}

export interface CustomerListResult {
    rows: CustomerSummary[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

