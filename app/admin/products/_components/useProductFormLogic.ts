"use client";
import { useState, useEffect, useMemo } from 'react';
import type { Product } from '@/lib/services/productService';
import type { Category } from '@/lib/services/categoryService';
import type { Attribute } from '@/lib/services/attributeService';
import { StorageService } from '@/lib/services/storageService';
import { DEFAULT_PRODUCT_BADGE_COLOR, type ProductBadgeColor } from '@/lib/constants/product-badge';

import { listProductDatasheets } from '../actions';
import type { ProductDatasheetInput } from '@/lib/services/productDatasheetService';

export interface FormDatasheetItem {
    key: string;
    id?: string;
    name: string;
    file_url?: string;
    file_type: "pdf" | "image";
    file_size?: number | null;
    file?: File;
}

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
    datasheets?: ProductDatasheetInput[];
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
    inventory?: {
        quantity: number;
        purchase_price: number;
        sale_price: number;
        unit: string;
        discount_type: "none" | "percent" | "amount";
        discount_value: number;
    } | null;
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
    // Opening stock captured alongside the product on create.
    const [invEnabled, setInvEnabled] = useState(true);
    const [invQuantity, setInvQuantity] = useState('0');
    const [invPurchasePrice, setInvPurchasePrice] = useState('0');
    const [invSalePrice, setInvSalePrice] = useState('0');
    const [invUnit, setInvUnit] = useState('pcs');
    const [invDiscountType, setInvDiscountType] = useState<'none' | 'percent' | 'amount'>('none');
    const [invDiscountValue, setInvDiscountValue] = useState('0');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false); // during submit
    const [imageWarning, setImageWarning] = useState<string | null>(null);
    const [datasheets, setDatasheets] = useState<FormDatasheetItem[]>([]);

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

            listProductDatasheets(editing.id).then((list) => {
                setDatasheets(
                    list.map((d) => ({
                        key: d.id,
                        id: d.id,
                        name: d.name,
                        file_url: d.file_url,
                        file_type: d.file_type as "pdf" | "image",
                        file_size: d.file_size,
                    }))
                );
            }).catch(() => {
                setDatasheets([]);
            });
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
            setInvEnabled(true);
            setInvQuantity('0');
            setInvPurchasePrice('0');
            setInvSalePrice('0');
            setInvUnit('pcs');
            setInvDiscountType('none');
            setInvDiscountValue('0');
            setDatasheets([]);
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

            // Upload pending datasheets
            const resolvedDatasheets: ProductDatasheetInput[] = [];
            for (let i = 0; i < datasheets.length; i++) {
                const item = datasheets[i];
                if (item.file) {
                    const body = new FormData();
                    body.append('file', item.file);
                    const res = await fetch('/api/uploads/datasheet', {
                        method: 'POST',
                        body,
                    });
                    const json = await res.json();
                    if (!res.ok) {
                        throw new Error(json.error || `Failed to upload datasheet "${item.name}"`);
                    }
                    resolvedDatasheets.push({
                        name: item.name,
                        file_url: json.publicUrl,
                        file_type: json.fileType || item.file_type,
                        file_size: json.fileSize || item.file_size,
                        sort_order: i,
                    });
                } else if (item.file_url) {
                    resolvedDatasheets.push({
                        id: item.id,
                        name: item.name,
                        file_url: item.file_url,
                        file_type: item.file_type,
                        file_size: item.file_size,
                        sort_order: i,
                    });
                }
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
                datasheets: resolvedDatasheets,
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
                // Inventory is only created with the product; edits go through
                // the Inventory page so existing stock is never overwritten.
                inventory: !editingRef && invEnabled
                    ? {
                        quantity: Number(invQuantity || 0),
                        purchase_price: Number(invPurchasePrice || 0),
                        sale_price: Number(invSalePrice || 0),
                        unit: invUnit.trim() || 'pcs',
                        discount_type: invDiscountType,
                        discount_value: invDiscountType === 'none' ? 0 : Number(invDiscountValue || 0),
                    }
                    : null,
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
                setInvEnabled(true);
                setInvQuantity('0');
                setInvPurchasePrice('0');
                setInvSalePrice('0');
                setInvUnit('pcs');
                setInvDiscountType('none');
                setInvDiscountValue('0');
                setDatasheets([]);
            }
            callbacks?.onAfterSuccess?.();
        } catch (err) {
            console.error('[product-form] submit failed', err);
            throw err;
        } finally {
            setSubmitting(false); setUploading(false);
        }
    }

    /** Called by the form once each selected image has been cropped. */
    function addCroppedFile(file: File) {
        setPickedFiles((prev) => [...prev, file]);
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

    function addDatasheet(name: string, file: File, fileType: "pdf" | "image") {
        const item: FormDatasheetItem = {
            key: `pending-ds-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: name.trim(),
            file,
            file_type: fileType,
            file_size: file.size,
        };
        setDatasheets((prev) => [...prev, item]);
    }

    function removeDatasheet(key: string) {
        setDatasheets((prev) => prev.filter((d) => d.key !== key));
    }

    function updateDatasheetName(key: string, name: string) {
        setDatasheets((prev) => prev.map((d) => (d.key === key ? { ...d, name } : d)));
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
        invEnabled, setInvEnabled,
        invQuantity, setInvQuantity,
        invPurchasePrice, setInvPurchasePrice,
        invSalePrice, setInvSalePrice,
        invUnit, setInvUnit,
        invDiscountType, setInvDiscountType,
        invDiscountValue, setInvDiscountValue,
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
        // datasheets
        datasheets, setDatasheets, addDatasheet, removeDatasheet, updateDatasheetName,
        // actions
        addCroppedFile,
        removeExistingImage,
        removePickedFile,
        setImageAsCover,
        handleSubmit,
        // warning state
        imageWarning, setImageWarning,
    };
}
