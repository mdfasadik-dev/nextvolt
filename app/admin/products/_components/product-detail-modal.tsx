"use client";
import { ProductDetail } from "../detail-actions";
import Image from 'next/image';
import { Markdown } from '@/components/markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';

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
                <DialogBody className="space-y-4">
                    {(detail as any).main_image_url && (
                        <div className="flex justify-center">
                            <Image src={(detail as any).main_image_url as string} alt={detail.name} width={320} height={320} className="max-h-40 w-auto rounded-md border object-contain bg-muted" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">BASIC</h3>
                        <dl className="grid grid-cols-3 gap-y-1 text-xs">
                            <dt className="font-medium">Name</dt><dd className="col-span-2 break-words">{detail.name}</dd>
                            <dt className="font-medium">Slug</dt><dd className="col-span-2 break-words">{detail.slug || '—'}</dd>
                            <dt className="font-medium">Brand</dt><dd className="col-span-2">{detail.brand || '—'}</dd>
                            <dt className="font-medium">Active</dt><dd className="col-span-2">{detail.is_active ? 'Yes' : 'No'}</dd>
                            <dt className="font-medium">Featured</dt><dd className="col-span-2">{(detail as any).is_featured ? 'Yes' : 'No'}</dd>
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

                    {(detail as any).details_md && (
                        <div>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">DETAILS</h3>
                            <div className="border rounded p-3 bg-background">
                                <Markdown content={(detail as any).details_md as string} />
                            </div>
                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    <button onClick={onClose} className="text-xs rounded-md border px-3 py-1">Close</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
