"use client";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { SideMenu } from "./side-menu";
import type { PublicCategory } from "@/lib/services/public/categoryPublicService";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

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
                    .order("created_at", { ascending: false });
                if (error) throw error;
                setCats(data as PublicCategory[]);
            } catch (e) {
                // eslint-disable-next-line no-console
                setCats([]);
            } finally { setLoading(false); }
        })();
    }, []);

    return (
        <Sheet>
            <SheetTrigger>
                <span className="inline-flex items-center gap-2">
                    <Menu className="w-4 h-4" />
                </span>
            </SheetTrigger>
            {/* Mirror open state changes */}
            <SheetContent title="Main Menu">
                {loading && <p className="text-xs p-3 text-muted-foreground">Loading...</p>}
                {cats && <SideMenu categories={cats} />}
            </SheetContent>
        </Sheet>
    );
}
