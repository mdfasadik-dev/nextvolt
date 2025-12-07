"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Markdown } from '@/components/markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
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
    onSave: (payload: any) => Promise<void>; // create
    onUpdate: (id: string, payload: any) => Promise<void>;
    isPending: boolean;
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
        if (editing) {
            setExistingImageUrl((editing as any).image_url || null);
            setDetailsMd((editing as any).details_md || "");
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
        } catch (e: any) {
            toast.push({ variant: "error", title: "Save failed", description: e?.message });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editing ? 'Edit Variant' : 'New Variant'}</DialogTitle>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Close
                    </button>
                </DialogHeader>
                <DialogBody>
                    <form onSubmit={handleSubmit} className="space-y-3" id="variant-form">
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
                            <div className="flex items-center gap-3">
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
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
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
                                <MarkdownEditor value={detailsMd} onChange={setDetailsMd} />
                            ) : (
                                <div className="border rounded-md p-2 bg-muted/30 max-h-[250px] overflow-auto">
                                    <Markdown content={detailsMd || '*No content*'} />
                                </div>
                            )}
                        </div>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <button
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
            </DialogContent>
        </Dialog>
    );
}
