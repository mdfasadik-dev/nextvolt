"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Markdown } from '@/components/markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { StorageService } from '@/lib/services/storageService';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';
import type { Variant } from '@/lib/services/variantService';
import type { Product } from '@/lib/services/productService';
import { useToast } from '@/components/ui/toast-provider';

interface Props {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    editing: Variant | null;
    products: Product[];
    onSave: (payload: VariantFormPayload) => Promise<void>; // create
    onUpdate: (id: string, payload: VariantFormPayload) => Promise<void>;
    isPending: boolean;
}

type VariantFormPayload = {
    product_id: string;
    title: string | null;
    sku: string | null;
    is_active: boolean;
    image_url: string | null;
    details_md: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export function VariantFormDialog({ open, onOpenChange, editing, products, onSave, onUpdate, isPending }: Props) {
    const toast = useToast();
    const [pickedFile, setPickedFile] = useState<File | null>(null);
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [removalRequested, setRemovalRequested] = useState(false);
    const [warningMsg, setWarningMsg] = useState<string | null>(null);
    const [detailsMd, setDetailsMd] = useState("");
    const [showMdPreview, setShowMdPreview] = useState(false);

    useEffect(() => {
        if (!open) {
            setWarningMsg(null);
            setShowMdPreview(false);
        }
    }, [open]);

    useEffect(() => {
        if (editing) {
            const row = editing as Variant & {
                image_url?: string | null;
                details_md?: string | null;
            };
            setExistingImageUrl(row.image_url || null);
            setDetailsMd(row.details_md || "");
            setPickedFile(null);
            setRemovalRequested(false);
        } else {
            setExistingImageUrl(null);
            setPickedFile(null);
            setRemovalRequested(false);
            setDetailsMd("");
        }
    }, [editing]);

    useEffect(() => {
        if (pickedFile) {
            const url = URL.createObjectURL(pickedFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(existingImageUrl);
    }, [pickedFile, existingImageUrl]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        let finalUrl = existingImageUrl;
        let deleteOld = false;
        try {
            if (removalRequested && existingImageUrl) {
                finalUrl = null;
                deleteOld = true;
            }
            if (pickedFile) {
                setUploadingImg(true);
                const { publicUrl } = await StorageService.uploadEntityImage('variants', pickedFile);
                if (existingImageUrl && existingImageUrl !== publicUrl) deleteOld = true;
                finalUrl = publicUrl;
            }
        } finally {
            setUploadingImg(false);
        }

        const payload = {
            product_id: fd.get("product_id") as string,
            title: (fd.get("title") as string) || null,
            sku: (fd.get("sku") as string) || null,
            is_active: fd.get("is_active") === "on",
            image_url: finalUrl,
            details_md: detailsMd || null,
        };
        try {
            if (editing) {
                await onUpdate(editing.id, payload);
                toast.push({ variant: "success", title: "Variant updated" });
            } else {
                await onSave(payload);
                toast.push({ variant: "success", title: "Variant created" });
            }
            form?.reset();
            if (!editing) {
                setPickedFile(null);
                setExistingImageUrl(null);
                setPreviewUrl(null);
                setDetailsMd("");
            }
            if (deleteOld && existingImageUrl) {
                try {
                    await fetch('/api/uploads/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: existingImageUrl }),
                    });
                } catch { }
            }
            onOpenChange(false);
        } catch (e: unknown) {
            toast.push({
                variant: "error",
                title: "Save failed",
                description: getErrorMessage(e, "Unable to save variant."),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-4xl lg:max-w-5xl">
                <div className="flex h-[min(90vh,920px)] min-h-0 min-w-0 flex-col">
                    <DialogHeader className="border-b px-4 py-4 sm:px-6">
                        <DialogTitle>{editing ? 'Edit Variant' : 'New Variant'}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
                        <form onSubmit={handleSubmit} className="min-w-0 space-y-3" id="variant-form">
                            <div className="space-y-1">
                                <label className="text-xs">Product</label>
                                <select
                                    name="product_id"
                                    defaultValue={editing?.product_id || ''}
                                    required
                                    className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                >
                                    {!editing && <option value="" disabled>Select product...</option>}
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs">Title</label>
                                <Input name="title" defaultValue={editing?.title || undefined} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs">SKU</label>
                                <Input name="sku" defaultValue={editing?.sku || undefined} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox id="is_active_v" name="is_active" defaultChecked={editing?.is_active ?? true} />
                                <label htmlFor="is_active_v" className="text-xs">
                                    Active
                                </label>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs">Image</label>
                                <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                                    {!removalRequested && previewUrl ? (
                                        <div className="relative w-16 h-16 object-cover rounded border bg-muted overflow-hidden">
                                            <Image
                                                src={previewUrl}
                                                alt="preview"
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded border flex items-center justify-center text-[10px] text-muted-foreground">
                                            {removalRequested ? 'Removed' : 'No Image'}
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = () => {
                                                if (input.files && input.files[0]) {
                                                    const file = input.files[0];
                                                    ensureImageUnder1MB(file)
                                                        .then(() => {
                                                            setPickedFile(file);
                                                            setRemovalRequested(false);
                                                        })
                                                        .catch((err) => setWarningMsg(err?.message || 'Invalid image. Must be under 1 MB.'));
                                                }
                                            };
                                            input.click();
                                        }}
                                        disabled={uploadingImg}
                                        className="w-full sm:w-auto"
                                    >
                                        <ImagePlus className="w-3 h-3 mr-1" />
                                        {pickedFile ? 'Change' : existingImageUrl ? 'Replace' : 'Select'}
                                    </Button>
                                    {(existingImageUrl || pickedFile) && !uploadingImg && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                if (pickedFile) setPickedFile(null);
                                                if (existingImageUrl) {
                                                    setRemovalRequested(true);
                                                }
                                            }}
                                            className="w-full sm:w-auto"
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />Remove
                                        </Button>
                                    )}
                                </div>
                                {removalRequested && (
                                    <p className="text-[10px] text-amber-600">Image will be removed on save.</p>
                                )}
                                {uploadingImg && (
                                    <p className="text-[10px] text-muted-foreground">Uploading...</p>
                                )}
                                <p className="text-[10px] text-muted-foreground">
                                    Max size 1 MB. For best results, use a square (1:1) image.
                                </p>
                                {warningMsg && (
                                    <p className="text-[10px] text-red-600">{warningMsg}</p>
                                )}
                            </div>
                            <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <label className="text-xs font-medium">Details (Markdown)</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowMdPreview((p) => !p)}
                                    >
                                        {showMdPreview ? 'Edit' : 'Preview'}
                                    </Button>
                                </div>
                                {!showMdPreview ? (
                                    <MarkdownEditor value={detailsMd} onChange={setDetailsMd} className="min-w-0" />
                                ) : (
                                    <div className="border rounded-md p-2 bg-muted/30 max-h-[250px] overflow-auto">
                                        <Markdown content={detailsMd || '*No content*'} />
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="border-t px-4 py-3 sm:px-6">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="text-xs rounded-md border px-3 py-1"
                        >
                            Cancel
                        </button>
                        <Button
                            form="variant-form"
                            type="submit"
                            disabled={isPending || uploadingImg}
                            className="text-xs"
                        >
                            {(isPending || uploadingImg) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editing
                                ? (isPending || uploadingImg) ? 'Updating' : 'Update'
                                : (isPending || uploadingImg) ? 'Creating' : 'Create'}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
