'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { createPromotionItem, updatePromotionItem, deletePromotionItem } from '../actions';
import { Tables } from '@/lib/types/supabase';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, ImagePlus, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';
import { StorageService } from '@/lib/services/storageService';

interface PromoItemFormProps {
    promotionId: string;
    item?: Tables<'promotion_items'> | null;
    triggerButton?: React.ReactNode;
}

export function PromoItemForm({ promotionId, item, triggerButton }: PromoItemFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // State
    const [title, setTitle] = useState(item?.title || '');
    const [subtitle, setSubtitle] = useState(item?.subtitle || '');
    const [body, setBody] = useState(item?.body || '');
    // Renamed to manualUrl for clarity when typing, though we sync with final logic
    const [imageUrl, setImageUrl] = useState(item?.image_url || '');

    // Image Upload State
    const [pickedFile, setPickedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(item?.image_url || null);
    const [uploading, setUploading] = useState(false);

    const [ctaLabel, setCtaLabel] = useState(item?.cta_label || '');
    const [ctaUrl, setCtaUrl] = useState(item?.cta_url || '');
    const [sortOrder, setSortOrder] = useState(item?.sort_order || 0);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            ensureImageUnder1MB(file).then(() => {
                setPickedFile(file);
                setPreviewUrl(URL.createObjectURL(file));
            }).catch(err => {
                toast.error(err.message);
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalImageUrl = imageUrl;

            if (pickedFile) {
                setUploading(true);
                const { publicUrl } = await StorageService.uploadProductImage(pickedFile);
                finalImageUrl = publicUrl;
                setUploading(false);
            }

            const data = {
                promotion_id: promotionId,
                title,
                subtitle,
                body,
                image_url: finalImageUrl,
                cta_label: ctaLabel,
                cta_url: ctaUrl,
                sort_order: Number(sortOrder),
                is_active: true,
            };

            if (item) {
                await updatePromotionItem(item.id, promotionId, data);
                toast.success('Item updated');
            } else {
                await createPromotionItem(data);
                toast.success('Item added');
                // Reset form
                setTitle(''); setSubtitle(''); setBody(''); setImageUrl(''); setCtaLabel(''); setCtaUrl('');
                setPickedFile(null); setPreviewUrl(null);
            }
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!item) return;
        if (!confirm('Delete this item?')) return;

        setLoading(true);
        try {
            await deletePromotionItem(item.id, promotionId);
            toast.success('Item deleted');
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton || (
                    <Button size="sm" variant="outline">
                        {item ? <Pencil className="h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                        {item ? '' : 'Add Item'}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Headline" />
                        </div>
                        <div className="space-y-2">
                            <Label>Sort Order</Label>
                            <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Subtitle</Label>
                        <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Small text above title" />
                    </div>

                    <div className="space-y-2">
                        <Label>Body Text</Label>
                        <Textarea value={body} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)} placeholder="Main content..." />
                    </div>

                    <div className="space-y-2">
                        <Label>Image</Label>
                        <div className="flex items-start gap-4">
                            <div className="relative w-24 h-24 bg-muted border rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                                {previewUrl ? (
                                    <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <span className="text-xs text-muted-foreground">No image</span>
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80">
                                    <ImagePlus className="w-4 h-4" />
                                    <span>Pick Image</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                                </label>
                                <div className="text-xs text-muted-foreground">Or enter URL manually:</div>
                                <Input
                                    value={imageUrl}
                                    onChange={e => {
                                        setImageUrl(e.target.value);
                                        setPreviewUrl(e.target.value || null);
                                    }}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>CTA Label</Label>
                            <Input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Button Text" />
                        </div>
                        <div className="space-y-2">
                            <Label>CTA URL</Label>
                            <Input value={ctaUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCtaUrl(e.target.value)} placeholder="/products/..." />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        {item ? (
                            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                        ) : <div></div>}
                        <Button type="submit" disabled={loading || uploading}>
                            {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Saving...' : (uploading ? 'Uploading...' : 'Save Item')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
