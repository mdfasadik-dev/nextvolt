"use client";
import { useState, useEffect, useMemo } from 'react';
import type { Product } from '@/lib/services/productService';
import type { Category } from '@/lib/services/categoryService';
import type { Attribute } from '@/lib/services/attributeService';
import { StorageService } from '@/lib/services/storageService';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';
import { DEFAULT_PRODUCT_BADGE_COLOR, type ProductBadgeColor } from '@/lib/constants/product-badge';

export interface ProductFormValues {
    name: string;
    slug: string | null;
    category_id: string;
    brand: string | null;
    weight_grams: number;
    sort_order?: number;
    is_active: boolean;
    is_featured: boolean;
    main_image_url: string | null;
    image_urls?: string[];
    badge?: {
        label: string;
        color: ProductBadgeColor;
        starts_at?: string | null;
        ends_at?: string | null;
        is_active?: boolean;
    } | null;
    description: string | null;
    details_md: string | null;
    attributeValues?: { attribute_id: string; value: string | number | boolean | null }[];
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

type ProductWithImages = Product & {
    image_urls?: string[];
    badge?: {
        label: string;
        color: ProductBadgeColor;
        starts_at?: string | null;
        ends_at?: string | null;
        is_active?: boolean;
    } | null;
};
type PreviewImage = { key: string; url: string; source: 'existing' | 'pending'; sourceIndex: number; name?: string };
type CoverSelection = { source: 'existing' | 'pending'; index: number } | null;

function moveIndexToFront<T>(items: T[], index: number): T[] {
    if (index < 0 || index >= items.length) return items;
    const next = [...items];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    return next;
}

function toLocalDateTimeInput(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: string): string | null {
    if (!value.trim()) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

export function useProductFormLogic(editing: ProductWithImages | null, categories: Category[], attributes: Attribute[]) {
    const [nameDraft, setNameDraft] = useState('');
    const [slugDraft, setSlugDraft] = useState('');
    const [attributeValues, setAttributeValues] = useState<Record<string, unknown>>({});
    const [detailsMd, setDetailsMd] = useState('');
    const [/*deprecatedDetailsHtml*/] = useState(''); // placeholder to avoid ref errors after hot reload
    const [/*deprecatedSpecs*/] = useState('');
    const [selectedAttrIds, setSelectedAttrIds] = useState<string[]>([]);
    const [attrToAdd, setAttrToAdd] = useState('');
    const [categoryIdDraft, setCategoryIdDraft] = useState('');
    const [initialImageUrls, setInitialImageUrls] = useState<string[]>([]);
    const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
    const [pickedFiles, setPickedFiles] = useState<File[]>([]);
    const [pickedFilePreviews, setPickedFilePreviews] = useState<string[]>([]);
    const [coverSelection, setCoverSelection] = useState<CoverSelection>(null);
    const [badgeEnabled, setBadgeEnabled] = useState(false);
    const [badgeLabel, setBadgeLabel] = useState('');
    const [badgeColor, setBadgeColor] = useState<ProductBadgeColor>(DEFAULT_PRODUCT_BADGE_COLOR);
    const [badgeStartsAt, setBadgeStartsAt] = useState('');
    const [badgeEndsAt, setBadgeEndsAt] = useState('');
    const [badgeIsActive, setBadgeIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false); // during submit
    const [imageWarning, setImageWarning] = useState<string | null>(null);

    useEffect(() => {
        if (editing) {
            setNameDraft(editing.name || '');
            setSlugDraft(editing.slug || '');
            setCategoryIdDraft(editing.category_id);
            setAttributeValues({});
            setDetailsMd(editing.details_md || '');
            // removed details_html & specs in schema
            setSelectedAttrIds([]);
            const urls = (editing.image_urls || []).filter(Boolean);
            const fallback = editing.main_image_url ? [editing.main_image_url] : [];
            const nextUrls = urls.length ? urls : fallback;
            setInitialImageUrls(nextUrls);
            setExistingImageUrls(nextUrls);
            setPickedFiles([]);
            setCoverSelection(null);
            setBadgeEnabled(!!editing.badge?.label);
            setBadgeLabel(editing.badge?.label || '');
            setBadgeColor(editing.badge?.color || DEFAULT_PRODUCT_BADGE_COLOR);
            setBadgeStartsAt(toLocalDateTimeInput(editing.badge?.starts_at));
            setBadgeEndsAt(toLocalDateTimeInput(editing.badge?.ends_at));
            setBadgeIsActive(editing.badge?.is_active ?? true);
        } else {
            setNameDraft('');
            setSlugDraft('');
            // Default: no category preselected; force user to choose
            setCategoryIdDraft('');
            setAttributeValues({});
            setDetailsMd('');
            // removed details_html & specs
            setSelectedAttrIds([]);
            setInitialImageUrls([]);
            setExistingImageUrls([]);
            setPickedFiles([]);
            setCoverSelection(null);
            setBadgeEnabled(false);
            setBadgeLabel('');
            setBadgeColor(DEFAULT_PRODUCT_BADGE_COLOR);
            setBadgeStartsAt('');
            setBadgeEndsAt('');
            setBadgeIsActive(true);
        }
    }, [editing, categories]);

    useEffect(() => {
        const urls = pickedFiles.map((file) => URL.createObjectURL(file));
        setPickedFilePreviews(urls);
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [pickedFiles]);

    const autoSlug = useMemo(() => {
        if (slugDraft.trim()) return slugDraft.trim();
        return nameDraft.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    }, [nameDraft, slugDraft]);

    function buildAttributeValues(): { attribute_id: string; value: string | number | boolean | null }[] {
        return selectedAttrIds.map(attribute_id => {
            const attr = attributes.find(a => a.id === attribute_id);
            const raw = attributeValues[attribute_id];
            if (raw === undefined || raw === '') return null;
            let value: string | number | boolean | null = null;
            if (attr?.data_type === 'number') {
                const num = Number(raw);
                if (!Number.isNaN(num)) value = num; else return null;
            } else if (attr?.data_type === 'boolean') {
                value = !!raw;
            } else {
                value = String(raw);
            }
            return { attribute_id, value };
        }).filter((v): v is { attribute_id: string; value: string | number | boolean } => !!v);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>, onCreate: (p: ProductFormValues) => Promise<void> | void, onUpdate: (id: string, p: ProductFormValues) => Promise<void> | void, editingRef: Product | null, callbacks?: { onAfterSuccess?: () => void }) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const form = e.currentTarget;
            const fd = new FormData(form);
            const finalSlug = (fd.get('slug') as string) || autoSlug || null;
            const removedExisting = initialImageUrls.filter((url) => !existingImageUrls.includes(url));
            let uploadedUrls: string[] = [];
            if (pickedFiles.length > 0) {
                setUploading(true);
                uploadedUrls = await Promise.all(
                    pickedFiles.map(async (file) => {
                        const { publicUrl } = await StorageService.uploadProductImage(file);
                        return publicUrl;
                    })
                );
            }
            const existingOrdered = [...existingImageUrls];
            const uploadedOrdered = [...uploadedUrls];
            if (coverSelection?.source === 'existing') {
                const next = moveIndexToFront(existingOrdered, coverSelection.index);
                existingOrdered.splice(0, existingOrdered.length, ...next);
            }
            if (coverSelection?.source === 'pending') {
                const next = moveIndexToFront(uploadedOrdered, coverSelection.index);
                uploadedOrdered.splice(0, uploadedOrdered.length, ...next);
            }
            let finalImageUrls = [...existingOrdered, ...uploadedOrdered];
            if (coverSelection?.source === 'pending' && uploadedOrdered.length > 0) {
                finalImageUrls = [uploadedOrdered[0], ...existingOrdered, ...uploadedOrdered.slice(1)];
            }
            const finalImageUrl = finalImageUrls[0] || null;
            const normalizedBadgeLabel = badgeLabel.trim();
            const badgeStartIso = toIsoDateTime(badgeStartsAt);
            const badgeEndIso = toIsoDateTime(badgeEndsAt);
            if (badgeEnabled && badgeStartIso && badgeEndIso && new Date(badgeEndIso).getTime() < new Date(badgeStartIso).getTime()) {
                throw new Error('Badge end date must be later than start date.');
            }

            const payload: ProductFormValues = {
                name: fd.get('name') as string,
                slug: finalSlug,
                category_id: fd.get('category_id') as string,
                brand: (fd.get('brand') as string) || null,
                weight_grams: Number(fd.get('weight_grams') || 0),
                sort_order: editingRef?.sort_order,
                is_active: fd.get('is_active') === 'on',
                is_featured: fd.get('is_featured') === 'on',
                main_image_url: finalImageUrl,
                image_urls: finalImageUrls,
                badge: badgeEnabled && normalizedBadgeLabel
                    ? {
                        label: normalizedBadgeLabel,
                        color: badgeColor,
                        starts_at: badgeStartIso,
                        ends_at: badgeEndIso,
                        is_active: badgeIsActive,
                    }
                    : null,
                description: (fd.get('description') as string) || null,
                details_md: detailsMd.trim() ? detailsMd : null,
                attributeValues: buildAttributeValues(),
            };
            if (editingRef) await onUpdate(editingRef.id, payload); else await onCreate(payload);

            if (removedExisting.length > 0) {
                try {
                    await Promise.all(removedExisting.map((url) => fetch('/api/uploads/delete', {
                        method: 'POST',
                        body: JSON.stringify({ url }),
                        headers: { 'Content-Type': 'application/json' },
                    })));
                } catch {
                    // ignore stale image cleanup failures
                }
            }

            if (!editingRef) {
                form.reset();
                setNameDraft('');
                setSlugDraft('');
                setCategoryIdDraft('');
                setInitialImageUrls([]);
                setExistingImageUrls([]);
                setPickedFiles([]);
                setCoverSelection(null);
                setBadgeEnabled(false);
                setBadgeLabel('');
                setBadgeColor(DEFAULT_PRODUCT_BADGE_COLOR);
                setBadgeStartsAt('');
                setBadgeEndsAt('');
                setBadgeIsActive(true);
                setSelectedAttrIds([]);
                setAttributeValues({});
                setDetailsMd('');
            }
            callbacks?.onAfterSuccess?.();
        } catch (err) {
            console.error('[product-form] submit failed', err);
            throw err;
        } finally {
            setSubmitting(false); setUploading(false);
        }
    }

    function pickNewFiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        input.onchange = () => {
            if (!input.files || !input.files.length) return;
            const files = Array.from(input.files);
            void (async () => {
                const validFiles: File[] = [];
                for (const file of files) {
                    try {
                        await ensureImageUnder1MB(file);
                        validFiles.push(file);
                    } catch (err: unknown) {
                        setImageWarning(getErrorMessage(err, `Invalid image "${file.name}". Must be under 1 MB.`));
                    }
                }
                if (validFiles.length) {
                    setPickedFiles((prev) => [...prev, ...validFiles]);
                }
            })();
        };
        input.click();
    }

    function removeExistingImage(index: number) {
        setCoverSelection(null);
        setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    }

    function removePickedFile(index: number) {
        setCoverSelection(null);
        setPickedFiles((prev) => prev.filter((_, i) => i !== index));
    }

    function setImageAsCover(source: 'existing' | 'pending', index: number) {
        setCoverSelection({ source, index });
    }

    const previewImages: PreviewImage[] = useMemo(() => ([
        ...existingImageUrls.map((url, index) => ({
            key: `existing-${index}-${url}`,
            url,
            source: 'existing' as const,
            sourceIndex: index,
            name: `Image ${index + 1}`,
        })),
        ...pickedFilePreviews.map((url, index) => ({
            key: `pending-${index}-${url}`,
            url,
            source: 'pending' as const,
            sourceIndex: index,
            name: pickedFiles[index]?.name || `New image ${index + 1}`,
        })),
    ]), [existingImageUrls, pickedFilePreviews, pickedFiles]);

    const coverImageUrl = useMemo(() => {
        if (coverSelection?.source === 'existing') {
            return existingImageUrls[coverSelection.index] || previewImages[0]?.url || null;
        }
        if (coverSelection?.source === 'pending') {
            return pickedFilePreviews[coverSelection.index] || previewImages[0]?.url || null;
        }
        return previewImages[0]?.url || null;
    }, [coverSelection, existingImageUrls, pickedFilePreviews, previewImages]);

    return {
        // state / values
        nameDraft, setNameDraft, slugDraft, setSlugDraft, autoSlug,
        categoryIdDraft, setCategoryIdDraft,
        attributeValues, setAttributeValues, selectedAttrIds, setSelectedAttrIds,
        attrToAdd, setAttrToAdd,
        existingImageUrls,
        pickedFiles,
        previewImages,
        coverImageUrl,
        badgeEnabled, setBadgeEnabled,
        badgeLabel, setBadgeLabel,
        badgeColor, setBadgeColor,
        badgeStartsAt, setBadgeStartsAt,
        badgeEndsAt, setBadgeEndsAt,
        badgeIsActive, setBadgeIsActive,
        submitting, uploading,
        detailsMd, setDetailsMd,
        // actions
        pickNewFiles,
        removeExistingImage,
        removePickedFile,
        setImageAsCover,
        handleSubmit,
        // warning state
        imageWarning, setImageWarning,
    };
}
