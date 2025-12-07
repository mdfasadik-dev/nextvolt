"use client";

import Link from "next/link";
import { PlusCircle, ShoppingBag, Box, Users, Settings, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
    { label: "New Product", icon: PlusCircle, href: "/admin/products/new", variant: "default" as const },
    { label: "View Orders", icon: ShoppingBag, href: "/admin/orders", variant: "outline" as const },
    { label: "Inventory", icon: Box, href: "/admin/inventory", variant: "outline" as const },
    { label: "Categories", icon: Tag, href: "/admin/categories", variant: "outline" as const },
    { label: "Customers", icon: Users, href: "/admin/customers", variant: "outline" as const },
    { label: "Settings", icon: Settings, href: "/admin/settings", variant: "ghost" as const },
];

export function QuickActions() {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    {actions.map((action) => (
                        <Button
                            key={action.label}
                            variant={action.variant}
                            asChild
                            className="h-auto flex-col gap-2 py-4"
                        >
                            <Link href={action.href}>
                                <action.icon className="h-5 w-5" />
                                <span>{action.label}</span>
                            </Link>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
