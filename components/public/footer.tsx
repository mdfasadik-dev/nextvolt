import { StoreService } from '@/lib/services/storeService';
import Link from "next/link";
import { ContentPageService } from "@/lib/services/contentPageService";
import { Mail, LocateFixed, Phone, Facebook, MessageCircle } from "lucide-react";

type OpeningHoursSlot = { open?: string; close?: string };
type OpeningHoursMap = Record<string, OpeningHoursSlot[]>;

export async function Footer() {
    const year = new Date().getFullYear();
    const [store, footerPages] = await Promise.all([
        StoreService.getFirst(),
        ContentPageService.listPublicFooter(),
    ]);

    const addressParts = [store?.address, store?.city, store?.state, store?.postal_code, store?.country]
        .filter(Boolean)
        .join(", ");

    const hasHours = store?.opening_hours && typeof store.opening_hours === "object";
    const hasCoords = typeof store?.latitude === "number" && typeof store?.longitude === "number";

    let mapIframeSrc: string | null = null;
    if (hasCoords) {
        const lat = store!.latitude as number;
        const lng = store!.longitude as number;
        const delta = 0.002;
        const left = lng - delta;
        const right = lng + delta;
        const bottom = lat - delta;
        const top = lat + delta;
        mapIframeSrc = `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${lat},${lng}&bbox=${left},${bottom},${right},${top}`;
    }

    function getFacebookProfile(raw?: string | null) {
        if (!raw) return null;
        const value = raw.trim();
        if (!value) return null;

        if (/^https?:\/\//i.test(value)) {
            try {
                const url = new URL(value);
                const cleanPath = url.pathname.replace(/\/+$/, "");
                const handle = cleanPath.split("/").filter(Boolean).pop() || "";
                const display = handle ? `/${handle}` : url.hostname;
                return { href: value, display };
            } catch {
                return { href: value, display: value };
            }
        }

        const username = value.replace(/^@/, "").replace(/^\/+/, "");
        return {
            href: `https://facebook.com/${username}`,
            display: `/${username}`,
        };
    }

    const normalizedHours: OpeningHoursMap =
        hasHours && store?.opening_hours && typeof store.opening_hours === "object" && !Array.isArray(store.opening_hours)
            ? (store.opening_hours as OpeningHoursMap)
            : {};

    const facebookProfile = getFacebookProfile(store?.website_url);
    const phoneHref = store?.contact_phone ? `tel:${store.contact_phone.replace(/[^0-9+]/g, "")}` : null;
    const whatsappDigits = (store?.contact_phone || "").replace(/[^0-9]/g, "");
    const hasWhatsAppNumber = whatsappDigits.length >= 8;
    const whatsappText = encodeURIComponent(`Hello ${store?.name || "there"}, I need support.`);
    const whatsappHref = hasWhatsAppNumber ? `https://wa.me/${whatsappDigits}?text=${whatsappText}` : null;

    return (
        <footer className="border-t border-border/70 bg-gradient-to-b from-background to-muted/20 text-sm">
            <div className="mx-auto max-w-6xl px-6 py-12 md:py-14">
                <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
                    <div className="space-y-5 lg:col-span-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {store?.country || "Official Store"}
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{store?.name || "Store"}</h2>
                            {addressParts && (
                                <div className="mt-3 flex max-w-md items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                                    <LocateFixed className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{addressParts}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 text-sm">
                            {store?.contact_email && (
                                <a
                                    href={`mailto:${store.contact_email}`}
                                    className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <Mail className="h-4 w-4" />
                                    <span>{store.contact_email}</span>
                                </a>
                            )}
                            {facebookProfile && (
                                <a
                                    href={facebookProfile.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <Facebook className="h-4 w-4" />
                                    {/* <span className="font-medium">facebook.com</span> */}
                                    <span className="font-semibold underline text-foreground">{facebookProfile.display}</span>
                                </a>
                            )}
                            {store?.contact_phone && (
                                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{store.contact_phone}</span>
                                    </div>
                                    {whatsappHref ? (
                                        <a
                                            href={whatsappHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-md border border-emerald-600/30 bg-emerald-600/15 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white dark:text-emerald-400"
                                            aria-label={`Chat with support on WhatsApp at ${store.contact_phone}`}
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            <span>WhatsApp Support</span>
                                        </a>
                                    ) : (
                                        <a
                                            href={phoneHref || "#"}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                        >
                                            <span>Call Support</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Legal</h3>
                        {footerPages.length > 0 ? (
                            <ul className="space-y-2">
                                {footerPages.map((page) => (
                                    <li key={page.id}>
                                        <Link
                                            href={`/${page.slug}`}
                                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {page.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No legal pages published yet.</p>
                        )}
                    </div>

                    <div className="space-y-4 lg:col-span-3">
                        {/* <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business Hours</h3>
                        <div className="rounded-xl border bg-background/80 p-4">
                            <div className="space-y-3 text-sm">
                                <div className="rounded-lg border bg-muted/40 p-3">
                                    <div className="mb-2 flex items-start gap-2">
                                        <Clock3 className="mt-0.5 h-4 w-4 text-foreground" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Business Hours</p>
                                            <p className="text-xs text-muted-foreground">Local store timing</p>
                                        </div>
                                    </div>
                                    {orderedHours.length > 0 ? (
                                        <ul className="divide-y divide-border/60">
                                            {orderedHours.map(([day, slots]) => (
                                                <li key={day} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                                    <span className="text-sm font-medium text-foreground">{formatDayLabel(day)}</span>
                                                    {Array.isArray(slots) && slots.length > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                                                Open
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">{formatTimeSlots(slots)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                            Closed
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Business hours are available on request.</p>
                                    )}
                                </div>
                            </div>
                        </div> */}
                        {hasHours && <div className="space-y-3">
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Business Hours</h3>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                                {Object.entries(normalizedHours).map(([day, slots]) => (
                                    <li key={day} className="flex gap-2">
                                        <span className="w-14 capitalize">{day}</span>
                                        <span>
                                            {Array.isArray(slots) && slots.length > 0
                                                ? slots.map((slot) => `${slot.open || "00:00"}-${slot.close || "00:00"}`).join(", ")
                                                : "Closed"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>}
                    </div>

                    <div className="space-y-4 lg:col-span-3">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Location</h3>
                        <div className="rounded-xl border bg-background/80 p-4">
                            {hasCoords && mapIframeSrc ? (
                                <div className="space-y-3">
                                    <div className="overflow-hidden rounded-lg border">
                                        <iframe
                                            title="Store Location"
                                            src={mapIframeSrc}
                                            loading="lazy"
                                            className="h-44 w-full"
                                            referrerPolicy="no-referrer-when-downgrade"
                                        />
                                    </div>
                                    {addressParts ? (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <LocateFixed className="mt-0.5 h-4 w-4 shrink-0" />
                                            <span>{addressParts}</span>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <LocateFixed className="h-4 w-4" />
                                    <span>{addressParts || "Location not added yet."}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © {year} {store?.name || "Store"}. All rights reserved.
                    </p>
                    <p>
                        Developed by{" "}
                        <a
                            href="https://pixeleak.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-foreground transition-colors hover:text-primary"
                        >
                            Pixeleak
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
