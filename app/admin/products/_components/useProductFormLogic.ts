"use client";
import { useState, useEffect, useMemo } from 'react';
import type { Product } from '@/lib/services/productService';
import type { Category } from '@/lib/services/categoryService';
import type { Attribute } from '@/lib/services/attributeService';
import { StorageService } from '@/lib/services/storageService';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';

export interface ProductFormValues {
    name: string;
    slug: string | null;
    category_id: string;
    brand: string | null;
    is_active: boolean;
    is_featured: boolean;
    main_image_url: string | null;
    description: string | null;
    details_md: string | null;
    attributeValues?: { attribute_id: string; value: string | number | boolean | null }[];
}

export function useProductFormLogic(editing: Product | null, categories: Category[], attributes: Attribute[]) {
    const [nameDraft, setNameDraft] = useState('');
    const [slugDraft, setSlugDraft] = useState('');
    const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
    const [detailsMd, setDetailsMd] = useState('');
    const [/*deprecatedDetailsHtml*/] = useState(''); // placeholder to avoid ref errors after hot reload
    const [/*deprecatedSpecs*/] = useState('');
    const [selectedAttrIds, setSelectedAttrIds] = useState<string[]>([]);
    const [attrToAdd, setAttrToAdd] = useState('');
    const [categoryIdDraft, setCategoryIdDraft] = useState('');
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
    const [pickedFile, setPickedFile] = useState<File | null>(null); // not uploaded yet
    const [removalRequested, setRemovalRequested] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false); // during submit
    // Stable preview URL to avoid re-creating object URLs each render
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
            setExistingImageUrl((editing as any).main_image_url || null);
            setPickedFile(null);
            setRemovalRequested(false);
        } else {
            setNameDraft('');
            setSlugDraft('');
            // Default: no category preselected; force user to choose
            setCategoryIdDraft('');
            setAttributeValues({});
            setDetailsMd('');
            // removed details_html & specs
            setSelectedAttrIds([]);
            setExistingImageUrl(null);
            setPickedFile(null);
            setRemovalRequested(false);
        }
    }, [editing, categories]);

    // Manage preview URL lifecycle
    useEffect(() => {
        // If a new file picked, create object URL; else use existing image URL
        if (pickedFile) {
            const url = URL.createObjectURL(pickedFile);
            setPreviewUrl(url);
            return () => { URL.revokeObjectURL(url); };
        }
        setPreviewUrl(existingImageUrl);
    }, [pickedFile, existingImageUrl]);

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

            let finalImageUrl = existingImageUrl;
            // If removal requested and there was an existing image, schedule delete
            let deleteOld = false;
            if (removalRequested && existingImageUrl) {
                deleteOld = true;
                finalImageUrl = null;
            }
            // If user picked a new file, upload now (server route)
            if (pickedFile) {
                setUploading(true);
                const { publicUrl } = await StorageService.uploadProductImage(pickedFile);
                finalImageUrl = publicUrl;
                // if replacing, mark old for deletion
                if (existingImageUrl && existingImageUrl !== publicUrl) deleteOld = true;
            }

            const payload: ProductFormValues = {
                name: fd.get('name') as string,
                slug: finalSlug,
                category_id: fd.get('category_id') as string,
                brand: (fd.get('brand') as string) || null,
                is_active: fd.get('is_active') === 'on',
                is_featured: fd.get('is_featured') === 'on',
                main_image_url: finalImageUrl,
                description: (fd.get('description') as string) || null,
                details_md: detailsMd.trim() ? detailsMd : null,
                attributeValues: buildAttributeValues(),
            };
            if (editingRef) await onUpdate(editingRef.id, payload); else await onCreate(payload);

            // Delete old after successful persistence
            if (deleteOld && existingImageUrl) {
                try { await fetch('/api/uploads/delete', { method: 'POST', body: JSON.stringify({ url: existingImageUrl }), headers: { 'Content-Type': 'application/json' } }); } catch { /* ignore */ }
            }

            if (!editingRef) {
                form.reset();
                setNameDraft(''); setSlugDraft(''); setCategoryIdDraft(''); setPickedFile(null); setExistingImageUrl(null); setSelectedAttrIds([]); setAttributeValues({}); setRemovalRequested(false); setDetailsMd('');
            }
            callbacks?.onAfterSuccess?.();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[product-form] submit failed', err);
            throw err;
        } finally {
            setSubmitting(false); setUploading(false);
        }
    }

    function pickNewFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            if (!input.files || !input.files[0]) return;
            const file = input.files[0];
            ensureImageUnder1MB(file)
                .then(() => {
                    setPickedFile(file);
                    // If we pick a new file, we are replacing existing image but we delay delete until commit
                    setRemovalRequested(false);
                })
                .catch((err: any) => {
                    setImageWarning(err?.message || 'Invalid image. Must be under 1 MB.');
                });
        };
        input.click();
    }

    return {
        // state / values
        nameDraft, setNameDraft, slugDraft, setSlugDraft, autoSlug,
        categoryIdDraft, setCategoryIdDraft,
        attributeValues, setAttributeValues, selectedAttrIds, setSelectedAttrIds,
        attrToAdd, setAttrToAdd,
        existingImageUrl, pickedFile, removalRequested, setRemovalRequested,
        submitting, uploading,
        detailsMd, setDetailsMd,
        // derived display image
        displayImageUrl: previewUrl,
        // actions
        pickNewFile,
        handleSubmit,
        // expose setters used externally (e.g., remove button logic)
        setPickedFile, setExistingImageUrl,
        // warning state
        imageWarning, setImageWarning,
    };
}
