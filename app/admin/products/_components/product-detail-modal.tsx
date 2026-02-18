"use client";
import { useState, type MouseEvent } from "react";
import { ProductDetail } from "../detail-actions";
import Image from 'next/image';
import { Markdown } from '@/components/markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ProductBadgePill } from "@/components/products/product-badge-pill";
import { cn } from "@/lib/utils";

function getStockBadge(status: ProductDetail["stock_status"]) {
    if (status === "out") return { label: "Out of Stock", className: "bg-red-100 text-red-700 border-red-200" };
    if (status === "low") return { label: "Low Stock", className: "bg-amber-100 text-amber-800 border-amber-200" };
    return { label: "In Stock", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

interface ProductDetailModalProps {
    detail: ProductDetail;
    onClose: () => void;
}

interface ZoomableImageProps {
    src: string;
    alt: string;
    sizes: string;
    imageClassName: string;
}

function ZoomableImage({ src, alt, sizes, imageClassName }: ZoomableImageProps) {
    const [zoomActive, setZoomActive] = useState(false);
    const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

    function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setZoomOrigin({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        });
    }

    return (
        <div
            className="relative h-full w-full cursor-zoom-in overflow-hidden"
            onMouseEnter={() => setZoomActive(true)}
            onMouseLeave={() => setZoomActive(false)}
            onMouseMove={handleMouseMove}
        >
            <Image
                src={src}
                alt={alt}
                fill
                sizes={sizes}
                className={cn(
                    "absolute inset-0 transition-transform duration-150",
                    imageClassName,
                    zoomActive ? "scale-[1.9]" : "scale-100"
                )}
                style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }}
            />
        </div>
    );
}

export function ProductDetailModal({ detail, onClose }: ProductDetailModalProps) {
    const stockBadge = getStockBadge(detail.stock_status);

    return (
        <Dialog open={!!detail} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col overflow-hidden sm:max-w-4xl lg:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Product Details</DialogTitle>
                    {/* <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button> */}
                </DialogHeader>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1">
                    {detail.image_urls.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-3">
                            {detail.image_urls.map((url, index) => (
                                <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                                    <ZoomableImage
                                        src={url}
                                        alt={`${detail.name} ${index + 1}`}
                                        sizes="(max-width:768px) 95vw, 280px"
                                        imageClassName="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : detail.main_image_url ? (
                        <div className="mx-auto w-full max-w-sm">
                            <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                                <ZoomableImage
                                    src={detail.main_image_url}
                                    alt={detail.name}
                                    sizes="(max-width:768px) 95vw, 520px"
                                    imageClassName="object-contain"
                                />
                            </div>
                        </div>
                    ) : null}
                    <div className="overflow-hidden rounded-lg border">
                        <div className="border-b bg-muted/40 px-3 py-2">
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">BASIC INFORMATION</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <tbody>
                                    <tr className="border-b">
                                        <th className="w-36 bg-muted/20 px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                                        <td className="px-3 py-2 font-medium">{detail.name}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="bg-muted/20 px-3 py-2 text-left font-medium text-muted-foreground">Slug</th>
                                        <td className="px-3 py-2 break-words">{detail.slug || '—'}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="bg-muted/20 px-3 py-2 text-left font-medium text-muted-foreground">Brand</th>
                                        <td className="px-3 py-2">{detail.brand || '—'}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="bg-muted/20 px-3 py-2 text-left font-medium text-muted-foreground">Sort Order</th>
                                        <td className="px-3 py-2">{detail.sort_order ?? 0}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="bg-muted/20 px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-wrap gap-2">
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${detail.is_active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                                    {detail.is_active ? "Active" : "Inactive"}
                                                </span>
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${detail.is_featured ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                                    {detail.is_featured ? "Featured" : "Not Featured"}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="bg-muted/20 px-3 py-2 text-left font-medium text-muted-foreground">Badge</th>
                                        <td className="px-3 py-2">
                                            {detail.badge ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <ProductBadgePill label={detail.badge.label} color={detail.badge.color} className="relative left-auto top-auto -translate-x-0 -translate-y-0 px-2 py-0.5 text-[10px]" />
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {detail.badge.starts_at ? `from ${new Date(detail.badge.starts_at).toLocaleString()}` : 'starts immediately'}
                                                        {detail.badge.ends_at ? ` to ${new Date(detail.badge.ends_at).toLocaleString()}` : ', no end date'}
                                                    </span>
                                                </div>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th className="bg-muted/20 px-3 py-2 text-left font-medium text-muted-foreground">Stock</th>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${stockBadge.className}`}>
                                                    {stockBadge.label}
                                                </span>
                                                <span>{detail.stock_total_qty} {detail.stock_unit_label}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">DESCRIPTION</h3>
                        <p className="text-xs whitespace-pre-wrap break-words">{detail.description || '—'}</p>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">ATTRIBUTES</h3>
                        {detail.attributes.length ? (
                            <ul className="flex flex-wrap gap-2">
                                {detail.attributes.map(av => <li key={av.attribute.id} className="text-[10px] rounded bg-muted px-2 py-1">{av.attribute.name}: <span className="font-medium">{String(av.value ?? '—')}</span></li>)}
                            </ul>
                        ) : <p className="text-xs text-muted-foreground">No attributes assigned.</p>}
                    </div>

                    {detail.details_md && (
                        <div>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">DETAILS</h3>
                            <div className="border rounded p-3 bg-background">
                                <Markdown content={detail.details_md} />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <button onClick={onClose} className="text-xs rounded-md border px-3 py-1">Close</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
