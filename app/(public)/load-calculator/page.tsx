import type { Metadata } from "next";
import { LoadCalculatorService } from "@/lib/services/loadCalculatorService";
import { StoreService } from "@/lib/services/storeService";
import { buildPageMetadata } from "@/lib/seo";
import { LoadCalculator } from "./_components/calculator";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
    title: "Load Calculator",
    description:
        "Estimate your total running load and get inverter and battery suggestions matched to your backup needs.",
    pathname: "/load-calculator",
});

export default async function LoadCalculatorPage() {
    const [groups, fields, store] = await Promise.all([
        LoadCalculatorService.listGroupsPublic(),
        LoadCalculatorService.listFieldsPublic(),
        StoreService.getFirstPublic(),
    ]);
    const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
    const contactPhone = store?.contact_phone || "";

    return (
        <div className="w-full max-w-7xl px-4 py-10 md:px-6">
            <header className="mb-8 max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Load Calculator</h1>
                <p className="mt-2 text-muted-foreground">
                    Pick the appliances you want to run during a power cut, and we will suggest the right solution.
                </p>
            </header>
            <LoadCalculator
                groups={groups}
                fields={fields}
                currencySymbol={currencySymbol}
                contactPhone={contactPhone}
            />
        </div>
    );
}
