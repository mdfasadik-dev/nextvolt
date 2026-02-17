"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Image from "next/image";
import { Markdown } from '@/components/markdown';
import { fetchVariantDetail, VariantDetail } from "../detail-actions";

interface Props {
    id: string | null;
    onClose: () => void;
}

export function VariantDetailDialog({ id, onClose }: Props) {
    const [detail, setDetail] = useState<VariantDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!id) {
            setDetail(null);
            return;
        }
        setLoading(true);
        fetchVariantDetail(id)
            .then((d) => d && setDetail(d))
            .finally(() => setLoading(false));
    }, [id]);

    return (
        <Dialog open={!!id} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Variant Details</DialogTitle>
                    <button
                        onClick={onClose}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Close
                    </button>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
                    {!loading && detail?.image_url && (
                        <div className="flex justify-center mb-2">
                            <div className="relative max-h-40 w-full flex items-center justify-center">
                                <Image
                                    src={detail.image_url}
                                    alt={detail.title || "variant"}
                                    width={320}
                                    height={320}
                                    className="max-h-40 w-auto rounded-md border object-contain bg-muted"
                                />
                            </div>
                        </div>
                    )}
                    {detail && (
                        <div>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">
                                BASIC
                            </h3>
                            <dl className="grid grid-cols-3 gap-y-1 text-xs">
                                <dt className="font-medium">Title</dt>
                                <dd className="col-span-2 break-words">{detail.title || '-'}</dd>
                                <dt className="font-medium">SKU</dt>
                                <dd className="col-span-2 break-words">{detail.sku || '-'}</dd>
                                <dt className="font-medium">Product</dt>
                                <dd className="col-span-2 break-words">{detail.productName || '-'}</dd>
                                <dt className="font-medium">Active</dt>
                                <dd className="col-span-2">{detail.is_active ? 'Yes' : 'No'}</dd>
                            </dl>
                        </div>
                    )}
                    {detail?.details_md && (
                        <div>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">DETAILS</h3>
                            <div className="border rounded p-3 bg-background">
                                <Markdown content={detail.details_md} />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <button
                        onClick={onClose}
                        className="text-xs rounded-md border px-3 py-1"
                    >
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
