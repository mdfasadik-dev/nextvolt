"use client";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { SideMenu } from "./side-menu";
import type { PublicCategory } from "@/lib/services/public/categoryPublicService";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function CategoryMenu() {
    const [cats, setCats] = useState<PublicCategory[] | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try {
                const sb = createBrowserSupabase();
                const { data, error } = await sb
                    .from("categories")
                    .select("*")
                    .eq("is_active", true)
                    .eq("is_deleted", false)
                    .order("sort_order", { ascending: true })
                    .order("created_at", { ascending: false });
                if (error) throw error;
                setCats(data as PublicCategory[]);
            } catch {
                setCats([]);
            } finally { setLoading(false); }
        })();
    }, []);

    return (
        <Sheet>
            <SheetTrigger>
                <Menu className="w-6 h-6" />
            </SheetTrigger>
            <SheetContent>
                <SheetHeader className="sr-only">
                    <SheetTitle>Main Menu</SheetTitle>
                </SheetHeader>
                {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
                {cats && <SideMenu categories={cats} />}
            </SheetContent>
        </Sheet>
    );
}
