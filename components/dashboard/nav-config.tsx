import { LayoutDashboard, Package, Layers3, ShoppingCart, Users2, Settings, Tags, BarChart3, Boxes, FileText, Database, CircleDot, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    items?: NavItem[];
    badge?: string;
};
// Top-level navigation supports grouping via nested items
export const mainNav: NavItem[] = [
    { title: "Overview", href: "/admin", icon: LayoutDashboard },
    {
        title: "Catalog",
        href: "/admin/products",
        icon: Package,
        items: [
            { title: "Categories", href: "/admin/categories", icon: Tags },
            { title: "Products", href: "/admin/products", icon: Package },
            { title: "Inventory", href: "/admin/inventory", icon: Boxes },
            { title: "Variants", href: "/admin/variants", icon: Layers3 },
            { title: "Attributes", href: "/admin/attributes", icon: CircleDot },
        ],
    },
    {
        title: "Commerce",
        href: "/admin/orders",
        icon: ShoppingCart,
        items: [
            { title: "Orders", href: "/admin/orders", icon: ShoppingCart },
            { title: "Customers", href: "/admin/customers", icon: Users2 },
        ],
    }
];

export const secondaryNav: NavItem[] = [
    {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        items: [
            { title: "Store", href: "/admin/settings", icon: Store },
            { title: "Delivery", href: "/admin/settings/delivery", icon: Package },
            { title: "Charges", href: "/admin/settings/charges", icon: FileText },
            { title: "Coupons", href: "/admin/coupons", icon: Tags },
        ]
    },
];
