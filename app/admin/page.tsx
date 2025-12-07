import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users2, Boxes, Tags, CircleDot } from "lucide-react";
import { SalesOverview } from "./_components/sales-overview";
import { QuickActions } from "./_components/quick-actions";
import { DashboardService } from "@/lib/services/dashboardService";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [stats, salesData] = await Promise.all([
    DashboardService.getStats(),
    DashboardService.getSalesChartData(),
  ]);

  const statCards = [
    { title: "Products", icon: Package, value: stats.products },
    { title: "Orders", icon: ShoppingCart, value: stats.orders },
    { title: "Customers", icon: Users2, value: stats.customers },
    { title: "Inventory Items", icon: Boxes, value: stats.inventory },
    { title: "Categories", icon: Tags, value: stats.categories },
    { title: "Attributes", icon: CircleDot, value: stats.attributes },
  ];

  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map(card => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold tracking-tight">
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <SalesOverview data={salesData} currencySymbol={currencySymbol} />
        <QuickActions />
      </div>
    </div>
  );
}
