"use client";
import { useState, useEffect, useMemo } from "react";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Category } from "@/lib/services/categoryService";
import { ImagePlus, Trash2 } from 'lucide-react';
import { StorageService } from '@/lib/services/storageService';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';
import { WarningDialog } from "@/components/ui/warning-dialog";

export interface CategoryFormProps {
    initial?: Partial<Category>;
    onSubmit: (data: { name: string; slug: string | null; is_active: boolean; parent_id: string | null; image_url?: string | null; sort_order?: number }) => Promise<void> | void;
    submitting?: boolean;
    parents: Category[];
}

export function CategoryForm({ initial, onSubmit, submitting, parents }: CategoryFormProps) {
    const [name, setName] = useState(initial?.name ?? "");
    const [slug, setSlug] = useState(initial?.slug ?? "");
    const [isActive, setIsActive] = useState(initial?.is_active ?? true);
    const [parentId, setParentId] = useState(initial?.parent_id ?? "");
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>((initial as any)?.image_url || null);
    const [pickedFile, setPickedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [removalRequested, setRemovalRequested] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl);
    const [warningMsg, setWarningMsg] = useState<string | null>(null);

    useEffect(() => {
        setName(initial?.name ?? "");
        setSlug(initial?.slug ?? "");
        setIsActive(initial?.is_active ?? true);
        setParentId(initial?.parent_id ?? "");
        setExistingImageUrl((initial as any)?.image_url || null);
        setPickedFile(null);
        setRemovalRequested(false);
    }, [initial]);

    useEffect(() => {
        if (pickedFile) {
            const url = URL.createObjectURL(pickedFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(existingImageUrl);
    }, [pickedFile, existingImageUrl]);

    // derived auto slug (not persisted state) when slug field empty
    const autoSlug = useMemo(() => {
        if (slug.trim()) return slug.trim();
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    }, [name, slug]);

    return (
        <form
            className="space-y-4"
            onSubmit={async e => {
                e.preventDefault();
                let finalUrl = existingImageUrl;
                let deleteOld = false;
                try {
                    if (removalRequested && existingImageUrl) { finalUrl = null; deleteOld = true; }
                    if (pickedFile) { setUploading(true); const { publicUrl } = await StorageService.uploadEntityImage('categories', pickedFile); if (existingImageUrl && existingImageUrl !== publicUrl) deleteOld = true; finalUrl = publicUrl; }
                } finally { setUploading(false); }
                await onSubmit({
                    name,
                    slug: (slug || autoSlug) || null,
                    is_active: isActive,
                    parent_id: parentId || null,
                    image_url: finalUrl || null,
                    sort_order: Number.isFinite(initial?.sort_order) ? Number(initial?.sort_order) : undefined,
                });
                if (!initial?.id) {
                    setPickedFile(null); setExistingImageUrl(null); setRemovalRequested(false); setPreviewUrl(null);
                }
                if (deleteOld && existingImageUrl) { try { await fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: existingImageUrl }) }); } catch { /* ignore */ } }
            }}
        >
            <div className="space-y-1">
                <label className="text-xs font-medium">Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Category name" />
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Slug</label>
                    <span className="text-[10px] text-muted-foreground">{slug ? "custom" : "auto"}</span>
                </div>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated if empty" />
                {!slug && name && <p className="text-[10px] text-muted-foreground">Preview: <code className="font-mono">{autoSlug || '-'}</code></p>}
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium">Parent</label>
                <select
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                >
                    <option value="">None</option>
                    {parents.filter(p => p.id !== initial?.id).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox id="is_active" checked={isActive} onCheckedChange={v => setIsActive(Boolean(v))} />
                <label htmlFor="is_active" className="text-xs">Active</label>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium">Image</label>
                <div className="flex items-center gap-3">
                    {!removalRequested && previewUrl ? (
                        <div className="relative w-16 h-16 rounded border bg-muted overflow-hidden">
                            <Image src={previewUrl} alt="preview" fill sizes="64px" className="object-cover" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded border flex items-center justify-center text-[10px] text-muted-foreground">{removalRequested ? 'Removed' : 'No Image'}</div>
                    )}
                    <Button type="button" size="sm" variant="secondary" onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file'; input.accept = 'image/*';
                        input.onchange = () => {
                            if (input.files && input.files[0]) {
                                const file = input.files[0];
                                ensureImageUnder1MB(file)
                                    .then(() => { setPickedFile(file); setRemovalRequested(false); })
                                    .catch(err => setWarningMsg(err?.message || 'Invalid image. Must be under 1 MB.'));
                            }
                        };
                        input.click();
                    }} disabled={uploading}>
                        <ImagePlus className="w-3 h-3 mr-1" />{pickedFile ? 'Change' : (existingImageUrl ? 'Replace' : 'Select')}
                    </Button>
                    {(existingImageUrl || pickedFile) && !uploading && (
                        <Button
                            type="button" size="sm" variant="ghost"
                            onClick={() => {
                                if (pickedFile) setPickedFile(null);
                                if (existingImageUrl) setRemovalRequested(true); // don't clear now; needed for delete
                            }}
                        >
                            <Trash2 className="w-3 h-3 mr-1" />Remove
                        </Button>
                    )}
                </div>
                {removalRequested && <p className="text-[10px] text-amber-600">Image will be removed on save.</p>}
                {uploading && <p className="text-[10px] text-muted-foreground">Uploading...</p>}
                <p className="text-[10px] text-muted-foreground">Max size 1 MB. For best results, use a square (1:1) image.</p>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initial?.id ? (submitting ? "Updating" : "Update") : (submitting ? "Creating" : "Create")}
            </Button>
            <WarningDialog open={!!warningMsg} title="Image warning" description={warningMsg || undefined} onClose={() => setWarningMsg(null)} />
        </form>
    );
}
