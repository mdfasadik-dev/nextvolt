import { StoreService } from '@/lib/services/storeService';

export async function Footer() {
    const year = new Date().getFullYear();
    const store = await StoreService.getFirst();
    const addressParts = [store?.address, store?.city, store?.state, store?.postal_code, store?.country].filter(Boolean).join(', ');
    const hasHours = store?.opening_hours && typeof store.opening_hours === 'object';
    const hasCoords = typeof store?.latitude === 'number' && typeof store?.longitude === 'number';
    let mapIframeSrc: string | null = null;
    if (hasCoords) {
        const lat = store!.latitude as number; const lng = store!.longitude as number;
        // Tighter bounding box for closer zoom (~250m radius)
        const delta = 0.002;
        const left = lng - delta; const right = lng + delta; const bottom = lat - delta; const top = lat + delta;
        mapIframeSrc = `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${lat},${lng}&bbox=${left},${bottom},${right},${top}`;
    }
    function normalizeUrl(u?: string | null) {
        if (!u) return null;
        if (/^https?:\/\//i.test(u)) return u;
        return `https://${u}`;
    }
    const websiteHref = normalizeUrl(store?.website_url);
    return (
        <footer className="mt-24 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-sm">
            <div className={`max-w-6xl mx-auto px-6 py-14 grid gap-10 ${hasHours && hasCoords ? 'md:grid-cols-4' : (hasHours || hasCoords) ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                <div className="space-y-3">
                    <span className="text-lg font-bold tracking-tight">{store?.name || 'Store'}</span>
                    {addressParts && <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">{addressParts}</p>}
                    <ul className="space-y-1 text-xs text-muted-foreground">
                        {store?.contact_email && <li>Email: {store.contact_email}</li>}
                        {store?.contact_phone && (() => {
                            const raw = store.contact_phone;
                            const digits = (raw || '').replace(/[^0-9]/g, '');
                            // Only show WhatsApp button if we have a plausible number (>=8 digits)
                            if (digits.length >= 8) {
                                const waUrl = `https://wa.me/${digits}`;
                                return (
                                    <li>
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded border px-2 py-1 font-medium text-foreground hover:bg-muted transition-colors"
                                            aria-label={`Chat on WhatsApp (${raw})`}
                                        >
                                            <span className="text-[11px]">WhatsApp</span>
                                            <span className="text-[10px] text-muted-foreground">{raw}</span>
                                        </a>
                                    </li>
                                );
                            }
                            return <li>Phone: {raw}</li>;
                        })()}
                        {websiteHref && (
                            <li>
                                <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="underline font-semibold underline-offset-2 hover:text-foreground transition-colors">
                                    Facebook
                                </a>
                            </li>
                        )}
                    </ul>
                </div>
                {hasHours && <div className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Hours</h3>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                        {Object.entries(store.opening_hours as any).map(([day, slots]: any) => (
                            <li key={day} className="flex gap-2">
                                <span className="w-14 capitalize">{day}</span>
                                <span>{Array.isArray(slots) && slots.length > 0 ? slots.map((s: any) => `${s.open}-${s.close}`).join(', ') : 'Closed'}</span>
                            </li>
                        ))}
                    </ul>
                </div>}
                {hasCoords && mapIframeSrc && <div className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Location</h3>
                    <div className="rounded-md overflow-hidden border aspect-video bg-muted">
                        <iframe
                            title="Store Location"
                            src={mapIframeSrc}
                            loading="lazy"
                            className="w-full h-full"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Map data © OpenStreetMap contributors</p>
                </div>}
                <div className="space-y-1">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Legal</h3>
                    <p className="text-[10px] text-muted-foreground">© {year} {store?.name || 'Store'}.</p>
                    <p className="text-[10px] text-muted-foreground">
                        Developed by {" "}
                        <a href="https://pixeleak.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold underline-offset-2 hover:text-foreground transition-colors">
                            Pixeleak
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
