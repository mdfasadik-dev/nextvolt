'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast-provider';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PromotionWithItems } from '@/lib/data/promotions';
import { getPromotionImageRatio } from '@/lib/promotions/image-ratio';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';
import { StorageService } from '@/lib/services/storageService';
import { cn } from '@/lib/utils';
import { PromotionImage } from '@/components/promotions/PromotionImage';
import {
    getDefaultCustomPromotionItemMetadata,
    parseCustomPromotionItemMetadata,
    type CustomCardStyle,
    type CustomPromotionItemMetadata,
} from '@/lib/promotions/custom-metadata';
import { deletePromotion, savePromotionFromBuilder } from '../actions';
import { TYPE_OPTIONS, coerceItemsByType, createDefaultItem, PROMOTION_PLACEHOLDER_IMAGE } from './promotion-builder/config';
import { formatDateForInput, getErrorMessage, slugify } from './promotion-builder/helpers';
import { PromotionLivePreview } from './promotion-builder/previews';
import { CtaTargetCombobox } from './promotion-builder/cta-target-combobox';
import type { DraftItem, PendingUpload, PromotionType } from './promotion-builder/types';

interface PromotionFormProps {
    promotion?: PromotionWithItems | null;
}

export function PromotionForm({ promotion }: PromotionFormProps) {
    const router = useRouter();
    const toast = useToast();
    const isNew = !promotion;

    const [type, setType] = useState<PromotionType | ''>(promotion?.type || '');
    const [campaignName, setCampaignName] = useState(promotion?.title || '');
    const [campaignNotes, setCampaignNotes] = useState(promotion?.description || '');
    const [isActive, setIsActive] = useState(promotion?.is_active ?? true);
    const [startAt, setStartAt] = useState(formatDateForInput(promotion?.start_at || null));
    const [endAt, setEndAt] = useState(formatDateForInput(promotion?.end_at || null));

    const initialItems = useMemo(() => {
        if (promotion?.items?.length) {
            return promotion.items.map((item) => ({
                id: item.id,
                title: item.title || '',
                subtitle: item.subtitle || '',
                body: item.body || '',
                image_url: item.image_url || '',
                mobile_image_url: item.mobile_image_url || '',
                cta_label: item.cta_label || '',
                cta_url: item.cta_url || '',
                cta_target: item.cta_target || '_self',
                is_active: item.is_active,
                sort_order: item.sort_order,
                metadata: item.metadata || null,
            }));
        }

        if (!promotion?.type) return [];
        return coerceItemsByType(promotion.type, []);
    }, [promotion]);

    const [items, setItems] = useState<DraftItem[]>(initialItems);
    const [activeItemIndex, setActiveItemIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingUploads, setPendingUploads] = useState<Record<number, PendingUpload>>({});

    const pendingUploadsRef = useRef<Record<number, PendingUpload>>({});

    useEffect(() => {
        pendingUploadsRef.current = pendingUploads;
    }, [pendingUploads]);

    useEffect(() => {
        return () => {
            Object.values(pendingUploadsRef.current).forEach((entry) => {
                URL.revokeObjectURL(entry.previewUrl);
            });
        };
    }, []);

    const selectedTypeConfig = useMemo(
        () => TYPE_OPTIONS.find((entry) => entry.value === type),
        [type]
    );
    const selectedImageRatio = useMemo(() => getPromotionImageRatio(type), [type]);

    const generatedSlotKey = useMemo(() => {
        const titleSeed = campaignName.trim() || 'promotion';
        const typeSeed = type || 'custom';
        return slugify(`${titleSeed}-${typeSeed}`);
    }, [campaignName, type]);

    const resolvedSlotKey = promotion?.slot_key || generatedSlotKey;
    const selectedItem = items[activeItemIndex] || null;
    const isCustomType = type === 'custom';
    const selectedCustomMetadata = selectedItem
        ? parseCustomPromotionItemMetadata(selectedItem.metadata)
        : getDefaultCustomPromotionItemMetadata();

    const selectedImagePreview = selectedItem
        ? pendingUploads[activeItemIndex]?.previewUrl || selectedItem.image_url || PROMOTION_PLACEHOLDER_IMAGE
        : PROMOTION_PLACEHOLDER_IMAGE;

    const previewItems = useMemo(
        () => items.map((item, index) => ({
            ...item,
            image_url: pendingUploads[index]?.previewUrl || item.image_url,
        })),
        [items, pendingUploads]
    );
    const selectedPreviewItem = previewItems[activeItemIndex] || null;

    const previewPromotion = useMemo<PromotionWithItems | null>(() => {
        if (!type) return null;

        const now = new Date().toISOString();
        const activeItems = previewItems
            .map((item, index) => ({
                id: item.id || `draft-${index}`,
                promotion_id: promotion?.id || 'draft-promotion',
                sort_order: item.sort_order ?? index * 10,
                is_active: item.is_active,
                image_url: item.image_url || null,
                mobile_image_url: item.mobile_image_url || null,
                title: item.title || null,
                subtitle: item.subtitle || null,
                body: item.body || null,
                cta_label: item.cta_label || null,
                cta_url: item.cta_url || null,
                cta_target: item.cta_target || null,
                metadata: item.metadata || null,
                created_at: now,
                updated_at: now,
            }))
            .sort((a, b) => a.sort_order - b.sort_order);

        return {
            id: promotion?.id || 'draft-promotion',
            slot_key: resolvedSlotKey,
            type,
            title: campaignName || null,
            description: campaignNotes || null,
            is_active: isActive,
            start_at: startAt ? new Date(startAt).toISOString() : null,
            end_at: endAt ? new Date(endAt).toISOString() : null,
            metadata: promotion?.metadata || null,
            created_at: promotion?.created_at || now,
            updated_at: now,
            items: activeItems,
        };
    }, [
        campaignName,
        campaignNotes,
        endAt,
        isActive,
        previewItems,
        promotion?.created_at,
        promotion?.id,
        promotion?.metadata,
        resolvedSlotKey,
        startAt,
        type,
    ]);

    const clearPendingUpload = (index: number) => {
        setPendingUploads((prev) => {
            const current = prev[index];
            if (!current) return prev;

            URL.revokeObjectURL(current.previewUrl);
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const clearAllPendingUploads = () => {
        setPendingUploads((prev) => {
            Object.values(prev).forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
            return {};
        });
    };

    const applyType = (nextType: PromotionType) => {
        clearAllPendingUploads();
        setType(nextType);
        setItems((prev) => {
            const next = coerceItemsByType(nextType, prev);
            return next.map((item, index) => ({ ...item, sort_order: index * 10 }));
        });
        setActiveItemIndex(0);
    };

    const updateItem = (index: number, patch: Partial<DraftItem>) => {
        setItems((prev) =>
            prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
        );
    };

    const updateCustomMetadata = (
        index: number,
        patch: Partial<CustomPromotionItemMetadata>
    ) => {
        setItems((prev) =>
            prev.map((item, itemIndex) => {
                if (itemIndex !== index) return item;

                const current = parseCustomPromotionItemMetadata(item.metadata);
                const next = { ...current, ...patch };

                return {
                    ...item,
                    metadata: {
                        style: next.style || 'standard',
                        badge: next.badge || '',
                    },
                };
            })
        );
    };

    const clearHeroContent = (index: number) => {
        updateItem(index, {
            title: '',
            subtitle: '',
            body: '',
            cta_label: '',
            cta_url: '',
        });
    };

    const clearCustomContent = (index: number) => {
        updateItem(index, {
            title: '',
            subtitle: '',
            body: '',
            cta_label: '',
            cta_url: '',
        });
    };

    const addItem = () => {
        if (!type || !selectedTypeConfig) return;
        setItems((prev) => {
            if (prev.length >= selectedTypeConfig.maxItems) return prev;
            return [...prev, createDefaultItem(type, prev.length)];
        });
        setActiveItemIndex(items.length);
    };

    const removeItem = (index: number) => {
        setPendingUploads((prev) => {
            const next: Record<number, PendingUpload> = {};

            Object.entries(prev).forEach(([key, value]) => {
                const itemIndex = Number(key);

                if (itemIndex === index) {
                    URL.revokeObjectURL(value.previewUrl);
                    return;
                }

                if (itemIndex > index) {
                    next[itemIndex - 1] = value;
                    return;
                }

                next[itemIndex] = value;
            });

            return next;
        });

        setItems((prev) => {
            const next = prev.filter((_, idx) => idx !== index).map((item, idx) => ({
                ...item,
                sort_order: idx * 10,
            }));
            return next.length ? next : (type ? [createDefaultItem(type, 0)] : []);
        });

        setActiveItemIndex((prev) => Math.max(0, Math.min(prev, items.length - 2)));
    };

    const handleImagePick = async (file: File, index: number) => {
        try {
            await ensureImageUnder1MB(file);
            const previewUrl = URL.createObjectURL(file);

            setPendingUploads((prev) => {
                const existing = prev[index];
                if (existing) {
                    URL.revokeObjectURL(existing.previewUrl);
                }

                return {
                    ...prev,
                    [index]: { file, previewUrl },
                };
            });

            toast.push({
                variant: 'default',
                title: 'Image selected',
                description: 'Preview updated. Image will upload when you publish.',
            });
        } catch (error: unknown) {
            toast.push({
                variant: 'error',
                title: 'Invalid image',
                description: getErrorMessage(error, 'Unable to select image.'),
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!type) {
            toast.push({
                variant: 'error',
                title: 'Choose promotion type',
                description: 'Select a type before publishing.',
            });
            return;
        }

        if (!campaignName.trim()) {
            toast.push({
                variant: 'error',
                title: 'Campaign name required',
                description: 'Please add a campaign name.',
            });
            return;
        }

        setSaving(true);

        try {
            const pendingEntries = Object.entries(pendingUploadsRef.current)
                .map(([index, pending]) => ({ index: Number(index), pending }))
                .sort((a, b) => a.index - b.index);

            const itemsForPublish = [...items];

            if (pendingEntries.length > 0) {
                for (const { index, pending } of pendingEntries) {
                    if (!itemsForPublish[index]) continue;
                    const { publicUrl } = await StorageService.uploadProductImage(pending.file);
                    itemsForPublish[index] = {
                        ...itemsForPublish[index],
                        image_url: publicUrl,
                    };
                }
                setItems(itemsForPublish);
                clearAllPendingUploads();
            }

            await savePromotionFromBuilder({
                id: promotion?.id,
                promotion: {
                    slot_key: resolvedSlotKey,
                    type,
                    title: campaignName.trim(),
                    description: campaignNotes.trim() || null,
                    is_active: isActive,
                    start_at: startAt ? new Date(startAt).toISOString() : null,
                    end_at: endAt ? new Date(endAt).toISOString() : null,
                    metadata: promotion?.metadata || null,
                },
                items: itemsForPublish.map((item, index) => ({
                    title: item.title || null,
                    subtitle: item.subtitle || null,
                    body: item.body || null,
                    image_url: item.image_url || null,
                    mobile_image_url: item.mobile_image_url || null,
                    cta_label: item.cta_label || null,
                    cta_url: item.cta_url || null,
                    cta_target: item.cta_target || null,
                    is_active: item.is_active,
                    sort_order: index * 10,
                    metadata: item.metadata || null,
                })),
            });

            toast.push({
                variant: 'success',
                title: promotion ? 'Promotion updated' : 'Promotion published',
                description: promotion
                    ? 'Changes are now live according to schedule.'
                    : 'Promotion has been published to the website.',
            });

            if (isNew) {
                router.push('/admin/promotions');
            } else {
                router.refresh();
            }
        } catch (error: unknown) {
            toast.push({
                variant: 'error',
                title: 'Save failed',
                description: getErrorMessage(error, 'Could not save promotion.'),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!promotion) return;

        setDeleting(true);
        try {
            await deletePromotion(promotion.id);
            toast.push({
                variant: 'success',
                title: 'Promotion deleted',
                description: 'The promotion has been removed.',
            });
            setDeleteDialogOpen(false);
            router.push('/admin/promotions');
        } catch (error: unknown) {
            toast.push({
                variant: 'error',
                title: 'Delete failed',
                description: getErrorMessage(error, 'Unable to delete promotion.'),
            });
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 pb-16">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-4">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/promotions">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back to promotions
                        </Link>
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {isNew ? 'Create Promotion' : `Edit Promotion: ${promotion.title || 'Untitled'}`}
                    </h2>
                    <p className="text-muted-foreground">
                        Build the promotion visually and publish only when preview is final.
                    </p>
                </div>
                {type ? (
                    <Badge variant="secondary" className="capitalize h-fit py-1.5 px-3">
                        {type}
                    </Badge>
                ) : null}
            </div>

            {!type ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 1: Choose Promotion Type</CardTitle>
                        <CardDescription>
                            Start by selecting the website block you want to create.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {TYPE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => applyType(option.value)}
                                    className="rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary"
                                >
                                    <h3 className="font-semibold">{option.label}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Campaign Setup</CardTitle>
                                <CardDescription>Manage campaign details and schedule.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="campaignName">Campaign Name</Label>
                                    <Input
                                        id="campaignName"
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                        placeholder="e.g. Spring Fashion Launch"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="campaignType">Promotion Type</Label>
                                    <Select value={type} onValueChange={(value) => applyType(value as PromotionType)}>
                                        <SelectTrigger id="campaignType">
                                            <SelectValue placeholder="Select promotion type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TYPE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="campaignNotes">Internal Notes</Label>
                                    <Textarea
                                        id="campaignNotes"
                                        value={campaignNotes}
                                        onChange={(e) => setCampaignNotes(e.target.value)}
                                        placeholder="Optional planning notes for your team"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="startAt">Start</Label>
                                        <Input
                                            id="startAt"
                                            type="datetime-local"
                                            value={startAt}
                                            onChange={(e) => setStartAt(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endAt">End</Label>
                                        <Input
                                            id="endAt"
                                            type="datetime-local"
                                            value={endAt}
                                            onChange={(e) => setEndAt(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                                    <div>
                                        <p className="text-sm font-medium">Publish Status</p>
                                        <p className="text-xs text-muted-foreground">
                                            {isActive ? 'Visible on website (if within schedule)' : 'Saved as inactive'}
                                        </p>
                                    </div>
                                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle>Content Editor</CardTitle>
                                <CardDescription>
                                    {isCustomType
                                        ? 'Build a flexible custom section with optional CTA and different card styles.'
                                        : 'Edit copy, image and CTA. Preview updates instantly.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedTypeConfig && selectedTypeConfig.maxItems > 1 ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Items</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addItem}
                                                disabled={items.length >= selectedTypeConfig.maxItems}
                                            >
                                                <Plus className="mr-1 h-4 w-4" /> Add item
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {items.map((item, index) => (
                                                <Button
                                                    key={item.id || index}
                                                    type="button"
                                                    size="sm"
                                                    variant={activeItemIndex === index ? 'default' : 'outline'}
                                                    onClick={() => setActiveItemIndex(index)}
                                                >
                                                    {type === 'carousel'
                                                        ? `Slide ${index + 1}`
                                                        : type === 'custom'
                                                            ? `Block ${index + 1}`
                                                            : `Item ${index + 1}`}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {selectedItem ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label>{isCustomType ? 'Title' : 'Headline'}</Label>
                                            <Input
                                                value={selectedItem.title}
                                                onChange={(e) => updateItem(activeItemIndex, { title: e.target.value })}
                                                placeholder={isCustomType ? 'e.g. Why customers choose us' : 'Main promotional title'}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{isCustomType ? 'Subtext' : 'Sub-heading'}</Label>
                                            <Input
                                                value={selectedItem.subtitle}
                                                onChange={(e) => updateItem(activeItemIndex, { subtitle: e.target.value })}
                                                placeholder={isCustomType ? 'e.g. Trusted by 10k+ customers' : 'Optional short highlight'}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{isCustomType ? 'Body' : 'Description'}</Label>
                                            <Textarea
                                                value={selectedItem.body}
                                                onChange={(e) => updateItem(activeItemIndex, { body: e.target.value })}
                                                placeholder={isCustomType ? 'Add supportive content for this block.' : 'Add short campaign message'}
                                            />
                                        </div>

                                        {isCustomType ? (
                                            <>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Card Style</Label>
                                                        <Select
                                                            value={selectedCustomMetadata.style}
                                                            onValueChange={(value) =>
                                                                updateCustomMetadata(activeItemIndex, { style: value as CustomCardStyle })
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select style" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="standard">Standard card</SelectItem>
                                                                <SelectItem value="quote">Quote card</SelectItem>
                                                                <SelectItem value="spotlight">Spotlight card</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Badge Label</Label>
                                                        <Input
                                                            value={selectedCustomMetadata.badge}
                                                            onChange={(e) =>
                                                                updateCustomMetadata(activeItemIndex, { badge: e.target.value })
                                                            }
                                                            placeholder="Optional badge, e.g. New"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border border-dashed bg-muted/20 p-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-xs text-muted-foreground">
                                                            Need image-only custom block?
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => clearCustomContent(activeItemIndex)}
                                                        >
                                                            Use image only
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : null}

                                        {type === 'hero' ? (
                                            <div className="rounded-lg border border-dashed bg-muted/20 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        Want a clean hero image without overlay content?
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => clearHeroContent(activeItemIndex)}
                                                    >
                                                        Use image only
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="space-y-2">
                                            <Label>Image</Label>
                                            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                                                <div
                                                    className={cn(
                                                        'relative w-full overflow-hidden rounded-md border bg-muted',
                                                        selectedImageRatio.className
                                                    )}
                                                >
                                                    <PromotionImage
                                                        src={selectedImagePreview}
                                                        alt="Selected image preview"
                                                        className="object-cover"
                                                        sizes="100vw"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                                                        <ImagePlus className="h-4 w-4" />
                                                        Choose image
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    void handleImagePick(file, activeItemIndex);
                                                                }
                                                                e.currentTarget.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                    {pendingUploads[activeItemIndex] ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => clearPendingUpload(activeItemIndex)}
                                                        >
                                                            Discard selection
                                                        </Button>
                                                    ) : null}
                                                </div>

                                                <p className="text-xs text-muted-foreground">
                                                    Recommended ratio: {selectedImageRatio.label}. Max file size: 1MB.
                                                </p>
                                            </div>
                                            {/* <Input
                                                value={selectedItem.image_url}
                                                onChange={(e) => updateItem(activeItemIndex, { image_url: e.target.value })}
                                                placeholder="Paste image URL"
                                            /> */}
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>{isCustomType ? 'Link Label' : 'CTA Label'}</Label>
                                                <Input
                                                    value={selectedItem.cta_label}
                                                    onChange={(e) => updateItem(activeItemIndex, { cta_label: e.target.value })}
                                                    placeholder={isCustomType ? 'e.g. Learn more' : 'e.g. Shop now'}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{isCustomType ? 'Link Destination' : 'CTA Destination'}</Label>
                                                <CtaTargetCombobox
                                                    value={selectedItem.cta_url}
                                                    onChange={(next) => updateItem(activeItemIndex, { cta_url: next })}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {isCustomType
                                                        ? 'Leave label or destination empty to hide CTA. Use image-only to remove all text and CTA.'
                                                        : 'Select a category or product page destination.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                                            <div>
                                                <p className="text-sm font-medium">Item visibility</p>
                                                <p className="text-xs text-muted-foreground">Hide this item without deleting it.</p>
                                            </div>
                                            <Switch
                                                checked={selectedItem.is_active}
                                                onCheckedChange={(checked) => updateItem(activeItemIndex, { is_active: checked })}
                                            />
                                        </div>

                                        {selectedTypeConfig && selectedTypeConfig.maxItems > 1 && items.length > 1 ? (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => removeItem(activeItemIndex)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Remove item
                                            </Button>
                                        ) : null}
                                    </>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
                                </>
                            ) : 'Publish Promotion'}
                        </Button>
                        {promotion ? (
                            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive" disabled={deleting || saving}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this promotion?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action permanently removes the promotion and all its items from the website.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                void handleDelete();
                                            }}
                                            disabled={deleting}
                                        >
                                            {deleting ? 'Deleting...' : 'Delete promotion'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : null}
                    </div>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle>Live Website Preview</CardTitle>
                            <CardDescription>
                                This is rendered at website scale so non-technical users can review before publish.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <PromotionLivePreview
                                type={type as PromotionType}
                                previewPromotion={previewPromotion}
                                selectedItem={selectedPreviewItem}
                            />
                        </CardContent>
                    </Card>
                </form>
            )}
        </div>
    );
}
