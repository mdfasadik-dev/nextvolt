"use client";
import { ProductDetail } from "../detail-actions";
import Image from 'next/image';
import { Markdown } from '@/components/markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ProductBadgePill } from "@/components/products/product-badge-pill";

interface ProductDetailModalProps {
    detail: ProductDetail;
    onClose: () => void;
}

export function ProductDetailModal({ detail, onClose }: ProductDetailModalProps) {
    return (
        <Dialog open={!!detail} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Product Details</DialogTitle>
                    <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {detail.image_urls.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {detail.image_urls.map((url, index) => (
                                <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                                    <Image src={url} alt={`${detail.name} ${index + 1}`} fill sizes="140px" className="object-cover" />
                                </div>
                            ))}
                        </div>
                    ) : detail.main_image_url ? (
                        <div className="flex justify-center">
                            <Image src={detail.main_image_url} alt={detail.name} width={320} height={320} className="max-h-40 w-auto rounded-md border object-contain bg-muted" />
                        </div>
                    ) : null}
                    <div>
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">BASIC</h3>
                        <dl className="grid grid-cols-3 gap-y-1 text-xs">
                            <dt className="font-medium">Name</dt><dd className="col-span-2 break-words">{detail.name}</dd>
                            <dt className="font-medium">Slug</dt><dd className="col-span-2 break-words">{detail.slug || '—'}</dd>
                            <dt className="font-medium">Brand</dt><dd className="col-span-2">{detail.brand || '—'}</dd>
                            <dt className="font-medium">Order</dt><dd className="col-span-2">{detail.sort_order ?? 0}</dd>
                            <dt className="font-medium">Active</dt><dd className="col-span-2">{detail.is_active ? 'Yes' : 'No'}</dd>
                            <dt className="font-medium">Featured</dt><dd className="col-span-2">{detail.is_featured ? 'Yes' : 'No'}</dd>
                            <dt className="font-medium">Badge</dt>
                            <dd className="col-span-2">
                                {detail.badge ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <ProductBadgePill label={detail.badge.label} color={detail.badge.color} className="relative left-auto top-auto -translate-x-0 -translate-y-0 px-2 py-0.5 text-[10px]" />
                                        <span className="text-[10px] text-muted-foreground">
                                            {detail.badge.starts_at ? `from ${new Date(detail.badge.starts_at).toLocaleString()}` : 'starts immediately'}
                                            {detail.badge.ends_at ? ` to ${new Date(detail.badge.ends_at).toLocaleString()}` : ', no end date'}
                                        </span>
                                    </div>
                                ) : '—'}
                            </dd>
                        </dl>
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
