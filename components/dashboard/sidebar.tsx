"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav, secondaryNav, type NavItem } from "./nav-config";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Menu } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
    return <SidebarClient />;
}

function SidebarClient() {
    "use client";
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    return (
        <>
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 flex items-center gap-2 bg-background/80 backdrop-blur border-b px-3">
                <button
                    onClick={() => setOpen(o => !o)}
                    className="inline-flex items-center justify-center rounded-md border px-3 h-8 text-sm"
                >
                    <Menu className="size-4" />
                </button>
                <Link href="/admin" className="font-semibold text-sm">Dashboard</Link>
                <div className="ml-auto flex items-center gap-2">
                    <ThemeSwitcher />
                </div>
            </div>
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                />
            )}
            <aside
                className={cn(
                    "fixed md:sticky top-0 z-50 md:z-0 md:top-0 h-screen shrink-0 w-64 border-r bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col",
                    "transition-transform duration-200",
                    open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                )}
            >
                <div className="hidden md:flex h-16 items-center gap-2 px-5 border-b font-semibold tracking-tight">Dashboard</div>
                <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4">
                    <div className="space-y-1">
                        {mainNav.map(item => (
                            <NavEntry key={item.title} item={item} activePath={pathname} closeMenu={() => setOpen(false)} />
                        ))}
                    </div>
                    <div className="pt-4 mt-auto border-t space-y-1">
                        {secondaryNav.map(item => (
                            <NavEntry key={item.title} item={item} activePath={pathname} closeMenu={() => setOpen(false)} />
                        ))}
                    </div>
                </nav>
                {/* <div className="p-3 border-t flex items-center gap-2 text-xs">
                    <Link href="/auth/login" className="text-xs underline hover:no-underline">Account</Link>
                </div> */}
            </aside>
        </>
    );
}

type NavEntryProps = { item: NavItem; activePath: string; closeMenu: () => void };

function NavEntry({ item, activePath, closeMenu }: NavEntryProps) {
    const isActive = activePath === item.href || item.items?.some(i => i.href === activePath);
    const [expanded, setExpanded] = useState(isActive);
    if (!item.items || item.items.length === 0) {
        return (
            <Link
                href={item.href}
                className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                )}
                onClick={closeMenu}
            >
                <item.icon className="size-4 text-muted-foreground group-hover:text-accent-foreground" />
                <span>{item.title}</span>
                {item.badge && (
                    <span className="ml-auto inline-flex items-center bg-primary text-white px-2 py-0.5 text-xs font-semibold rounded-full">
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    }
    return (
        <div className="rounded-md">
            <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                    isActive && "bg-accent text-accent-foreground",
                )}
            >
                <item.icon className="size-4 text-muted-foreground" />
                <span className="flex-1">{item.title}</span>
                <svg
                    className={cn("size-3.5 transition-transform", expanded ? "rotate-180" : "rotate-0")}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            {expanded && (
                <div className="mt-1 ml-2 border-l pl-2 space-y-1">
                    {item.items.map(child => {
                        const childActive = activePath === child.href;
                        return (
                            <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                    "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground",
                                    childActive && "bg-accent text-accent-foreground",
                                )}
                                onClick={closeMenu}
                            >
                                <child.icon className="size-3.5 text-muted-foreground group-hover:text-accent-foreground" />
                                <span className="truncate">{child.title}</span>
                                {child.badge && (
                                    <span className="ml-auto inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                                        {child.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
