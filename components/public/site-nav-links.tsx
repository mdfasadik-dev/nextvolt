import Link from "next/link";
import { Calculator, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

export const SITE_NAV_LINKS = [
    { href: "/projects", label: "Projects", icon: LayoutTemplate },
    { href: "/load-calculator", label: "Load Calculator", icon: Calculator },
] as const;

/**
 * Static site links shown alongside the category tree. Kept separate from
 * CategoryTopBar because that component renders nothing when the store has
 * no categories, and these links must always be reachable.
 */
export function SiteNavLinks({ className }: { className?: string }) {
    return (
        <ul className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", className)}>
            {SITE_NAV_LINKS.map(link => {
                const Icon = link.icon;
                return (
                    <li key={link.href} className="py-0.5">
                        <Link
                            href={link.href}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-accent/60"
                        >
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {link.label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
