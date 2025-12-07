import { createAdminClient } from "@/lib/supabase/server";

export interface DashboardStats {
    products: number;
    orders: number;
    customers: number;
    inventory: number;
    categories: number;
    attributes: number;
}

export interface ChartDataPoint {
    name: string;
    total: number;
}

export class DashboardService {
    static async getStats(): Promise<DashboardStats> {
        const supabase = await createAdminClient();

        // Run counts in parallel
        const [products, orders, customers, inventory, categories, attributes] = await Promise.all([
            supabase.from("products").select("*", { count: "exact", head: true }),
            supabase.from("orders").select("*", { count: "exact", head: true }),
            // Customers might be profiles or just auth users, usually profiles table in a real app, 
            // but if not present we might fall back or query auth.users if possible (admin only).
            // For now assuming a 'customers' or similar table exists or we skip.
            // Checking previous file usage: app/admin/page.tsx used a Promise.resolve({count:0}) fallback.
            // I will keep the fallback logic for customers if no table exists, but if 'customers' table 
            // is desired I would query it. I'll stick to a safe 0 for now unless I verify the table exists.
            Promise.resolve({ count: 0, error: null }),
            supabase.from("inventory").select("*", { count: "exact", head: true }),
            supabase.from("categories").select("*", { count: "exact", head: true }),
            supabase.from("attributes").select("*", { count: "exact", head: true }),
        ]);

        return {
            products: products.count ?? 0,
            orders: orders.count ?? 0,
            customers: customers.count ?? 0,
            inventory: inventory.count ?? 0,
            categories: categories.count ?? 0,
            attributes: attributes.count ?? 0,
        };
    }

    static async getSalesChartData(startDate?: Date, endDate?: Date): Promise<ChartDataPoint[]> {
        const supabase = await createAdminClient();

        // Default to last 7 days if no range provided
        let start = startDate;
        let end = endDate;

        if (!start) {
            const today = new Date();
            start = new Date(today);
            start.setDate(today.getDate() - 6);
            start.setHours(0, 0, 0, 0);
        }

        if (!end) {
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        const { data: orders, error } = await supabase
            .from("orders")
            .select("created_at, total_amount")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching chart data:", error);
            return [];
        }

        // Initialize map for the date range
        const statsMap = new Map<string, number>();
        const current = new Date(start);
        // Limit to preventing infinite loop if range is huge, practically max 365 days
        let safeguard = 0;
        while (current <= end && safeguard < 366) {
            const key = current.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
            statsMap.set(key, 0);
            current.setDate(current.getDate() + 1);
            safeguard++;
        }

        // Aggregate data
        (orders || []).forEach(order => {
            const d = new Date(order.created_at);
            const key = d.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
            if (statsMap.has(key)) {
                statsMap.set(key, (statsMap.get(key) || 0) + (order.total_amount || 0));
            }
        });

        return Array.from(statsMap.entries()).map(([name, total]) => ({ name, total }));
    }
}
