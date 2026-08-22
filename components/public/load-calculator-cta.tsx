import Link from "next/link";
import { ArrowRight, Calculator, Gauge, PlugZap } from "lucide-react";
import { LoadCalculatorService } from "@/lib/services/loadCalculatorService";

/**
 * Home page entry point for the load calculator. Renders nothing until the
 * admin has configured at least one load group, so a fresh install stays clean.
 */
export async function LoadCalculatorCta() {
    let groups: Awaited<ReturnType<typeof LoadCalculatorService.listGroupsPublic>> = [];
    try {
        groups = await LoadCalculatorService.listGroupsPublic();
    } catch {
        return null;
    }
    if (!groups.length) return null;

    const totalLoads = groups.reduce((sum, group) => sum + group.load_items.length, 0);
    const previewGroups = groups.slice(0, 5);

    return (
        <section
            className="w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.07] via-background to-background"
            aria-labelledby="load-calculator-cta-heading"
        >
            <div className="grid gap-8 p-6 md:grid-cols-2 md:items-center md:p-10">
                <div className="space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <Calculator className="h-3.5 w-3.5" />
                        Free tool
                    </span>
                    <h2 id="load-calculator-cta-heading" className="text-3xl font-bold tracking-tight">
                        Not sure which IPS or inverter you need?
                    </h2>
                    <p className="text-muted-foreground">
                        Pick the appliances you want to run during a power cut, tell us how many hours of backup
                        you need, and we&apos;ll suggest the right solution for your home or office.
                    </p>
                    <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <li className="flex items-center gap-2">
                            <PlugZap className="h-4 w-4 shrink-0 text-primary" />
                            {totalLoads}+ appliances covered
                        </li>
                        <li className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 shrink-0 text-primary" />
                            Instant load estimate
                        </li>
                    </ul>
                    <Link
                        href="/load-calculator"
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                        Calculate my load
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* Category preview mirroring the calculator's own tabs */}
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Choose from
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {previewGroups.map(group => (
                            <div
                                key={group.id}
                                className="rounded-lg border bg-background px-3 py-2.5 text-center"
                            >
                                <p className="truncate text-xs font-semibold leading-tight">{group.name}</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {group.load_items.length} items
                                </p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                        Estimates are indicative; actual consumption varies by appliance.
                    </p>
                </div>
            </div>
        </section>
    );
}
