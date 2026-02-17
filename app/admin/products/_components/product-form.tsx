"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePlus, Loader2 as Spinner, Loader2, Star, Trash2, X } from "lucide-react";
import Image from 'next/image';
import type { Product } from "@/lib/services/productService";
import type { Category } from "@/lib/services/categoryService";
import type { Attribute } from "@/lib/services/attributeService";
import { useProductFormLogic, ProductFormValues } from "./useProductFormLogic";
import { WarningDialog } from "@/components/ui/warning-dialog";
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Markdown } from '@/components/markdown';
import { PRODUCT_BADGE_COLOR_OPTIONS, type ProductBadgeColor } from "@/lib/constants/product-badge";
import { ProductBadgePill } from "@/components/products/product-badge-pill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// values interface re-exported from hook

interface ProductFormProps {
    categories: Category[];
    attributes: Attribute[];
    editing: Product | null;
    isPending: boolean;
    onCreate: (payload: ProductFormValues) => Promise<void> | void;
    onUpdate: (id: string, payload: ProductFormValues) => Promise<void> | void;
    onEditCancel: () => void;
    mode?: 'default' | 'externalDetails';
    onValuesChange?: (partial: Partial<ProductFormValues>) => void;
    onLogic?: (logic: ReturnType<typeof useProductFormLogic>) => void;
    renderAfterDescription?: React.ReactNode;
}

export function ProductForm({ categories, attributes, editing, isPending, onCreate, onUpdate, onEditCancel, mode = 'default', onValuesChange, onLogic, renderAfterDescription }: ProductFormProps) {
    const logic = useProductFormLogic(editing, categories, attributes);
    const {
        nameDraft, setNameDraft, slugDraft, setSlugDraft, autoSlug,
        categoryIdDraft, setCategoryIdDraft,
        attributeValues, setAttributeValues, selectedAttrIds, setSelectedAttrIds,
        attrToAdd, setAttrToAdd,
        previewImages, coverImageUrl,
        badgeEnabled, setBadgeEnabled,
        badgeLabel, setBadgeLabel,
        badgeColor, setBadgeColor,
        badgeStartsAt, setBadgeStartsAt,
        badgeEndsAt, setBadgeEndsAt,
        badgeIsActive, setBadgeIsActive,
        submitting, uploading,
        pickNewFiles, removeExistingImage, removePickedFile, setImageAsCover, handleSubmit,
        imageWarning, setImageWarning,
        detailsMd, setDetailsMd,
    } = logic;

    const badgeColorOption = PRODUCT_BADGE_COLOR_OPTIONS.find((option) => option.value === badgeColor);
    const isCustomBadgeColor = !badgeColorOption && !!badgeColor;
    const isHexColor = (value: string) => /^#([0-9a-fA-F]{6})$/.test(value.trim());
    const customColorValue = isHexColor(badgeColor) ? badgeColor : "#ef4444";

    // expose logic to parent once
    React.useEffect(() => { onLogic?.(logic); }, [logic, onLogic]);

    return (
        <>
            <form onSubmit={(e) => handleSubmit(e, onCreate, onUpdate, editing)} className="space-y-3">
                <div className="space-y-1">
                    <div className="flex items-center justify-between"><label className="text-xs">Name</label>{!slugDraft && nameDraft && <span className="text-[10px] text-muted-foreground">slug: <code>{autoSlug}</code></span>}</div>
                    <Input name="name" value={nameDraft} onChange={e => { setNameDraft(e.target.value); onValuesChange?.({ name: e.target.value }); }} required />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-between"><label className="text-xs">Slug</label><span className="text-[10px] text-muted-foreground">{slugDraft ? "custom" : "auto"}</span></div>
                    <Input name="slug" value={slugDraft} onChange={e => { setSlugDraft(e.target.value); onValuesChange?.({ slug: e.target.value }); }} placeholder="auto if blank" />
                    {!slugDraft && nameDraft && <p className="text-[10px] text-muted-foreground">Preview: <code className="font-mono">{autoSlug || '-'}</code></p>}
                </div>
                <div className="space-y-1">
                    <label className="text-xs">Category</label>
                    <select
                        name="category_id"
                        value={categoryIdDraft}
                        onChange={e => { setCategoryIdDraft(e.target.value); onValuesChange?.({ category_id: e.target.value }); }}
                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                        required
                    >
                        <option value="" disabled>-- select category --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs">Brand</label>
                    <Input name="brand" defaultValue={editing?.brand || undefined} onChange={e => onValuesChange?.({ brand: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs">Weight (grams)</label>
                    <Input
                        name="weight_grams"
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={editing?.weight_grams ?? 0}
                        onChange={e => onValuesChange?.({ weight_grams: Number(e.target.value || 0) })}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs">Description</label>
                    <textarea name="description" defaultValue={editing?.description || undefined} onChange={e => onValuesChange?.({ description: e.target.value })} className="w-full rounded-md border bg-background p-2 text-sm min-h-[70px]" />
                </div>
                {renderAfterDescription}
                {mode === 'default' && (
                    <MarkdownDetailsField detailsMd={detailsMd} setDetailsMd={setDetailsMd} onValuesChange={onValuesChange} />
                )}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Checkbox id="is_active" name="is_active" defaultChecked={editing?.is_active ?? true} onCheckedChange={v => onValuesChange?.({ is_active: !!v })} />
                        <label htmlFor="is_active" className="text-xs">Active</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="is_featured" name="is_featured" defaultChecked={editing?.is_featured ?? false} onCheckedChange={v => onValuesChange?.({ is_featured: !!v })} />
                        <label htmlFor="is_featured" className="text-xs">Featured</label>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs">Product Images</label>
                    <div className="space-y-3">
                        {coverImageUrl ? (
                            <div className="relative aspect-square w-full max-w-[260px] rounded border overflow-hidden bg-muted">
                                <Image src={coverImageUrl} alt="Cover preview" fill sizes="260px" className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-full max-w-[260px] aspect-square rounded border flex items-center justify-center text-muted-foreground text-[10px]">
                                No image selected
                            </div>
                        )}
                        <Button type="button" size="sm" variant="secondary" onClick={pickNewFiles} disabled={uploading || submitting}>
                            <ImagePlus className="w-3 h-3 mr-1" />Add Images
                        </Button>
                        {previewImages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {previewImages.map((img) => {
                                    const isCover = !!coverImageUrl && img.url === coverImageUrl;
                                    const sourceIndex = img.sourceIndex;
                                    return (
                                        <div key={img.key} className="space-y-1">
                                            <div className="relative aspect-square w-full overflow-hidden rounded border bg-muted">
                                                <Image src={img.url} alt={img.name || "Product image"} fill sizes="120px" className="object-cover" />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant={isCover ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-6 flex-1 px-1 text-[10px]"
                                                    onClick={() => {
                                                        if (img.source === 'existing') {
                                                            setImageAsCover('existing', sourceIndex);
                                                        } else {
                                                            setImageAsCover('pending', sourceIndex);
                                                        }
                                                    }}
                                                    disabled={isCover || sourceIndex < 0}
                                                >
                                                    <Star className="mr-1 h-3 w-3" />
                                                    {isCover ? 'Cover' : 'Set cover'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-1 text-[10px] text-red-600 hover:text-red-700"
                                                    onClick={() => {
                                                        if (img.source === 'existing') {
                                                            removeExistingImage(sourceIndex);
                                                        } else {
                                                            removePickedFile(sourceIndex);
                                                        }
                                                    }}
                                                    disabled={sourceIndex < 0}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                    {uploading && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Spinner className="w-3 h-3 animate-spin" />Uploading image…</p>}
                    <p className="text-[10px] text-muted-foreground">Max size 1 MB per image. Cover image is the first image and used in listings.</p>
                </div>
                <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                        <label htmlFor="badge_enabled" className="text-xs font-medium">Badge</label>
                        <div className="flex items-center gap-2">
                            <Checkbox id="badge_enabled" checked={badgeEnabled} onCheckedChange={(value) => setBadgeEnabled(!!value)} />
                            <span className="text-[10px] text-muted-foreground">Enable badge</span>
                        </div>
                    </div>
                    {badgeEnabled ? (
                        <div className="space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted-foreground">Label</label>
                                    <Input
                                        value={badgeLabel}
                                        onChange={(e) => setBadgeLabel(e.target.value)}
                                        placeholder="e.g. Hot Deal"
                                        maxLength={32}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted-foreground">Color</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 text-sm"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            "h-4 w-4 rounded-full ring-1",
                                                            badgeColorOption ? badgeColorOption.className : "ring-black/10"
                                                        )}
                                                        style={isCustomBadgeColor ? { backgroundColor: customColorValue } : undefined}
                                                    />
                                                    <span>
                                                        {badgeColorOption?.label || (isCustomBadgeColor ? "Custom" : "Select color")}
                                                    </span>
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {badgeColorOption?.value || (isCustomBadgeColor ? customColorValue.toUpperCase() : "")}
                                                </span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-64 p-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                {PRODUCT_BADGE_COLOR_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setBadgeColor(option.value as ProductBadgeColor)}
                                                        className={cn(
                                                            "flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition hover:bg-muted",
                                                            badgeColor === option.value
                                                                ? "border-primary bg-muted"
                                                                : "border-transparent"
                                                        )}
                                                    >
                                                        <span className={cn("h-3 w-3 rounded-full ring-1", option.className)} />
                                                        <span>{option.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="mt-3 border-t pt-3">
                                                <p className="mb-2 text-[11px] text-muted-foreground">Custom color</p>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={customColorValue}
                                                        onChange={(e) => setBadgeColor(e.target.value as ProductBadgeColor)}
                                                        className="h-8 w-10 rounded border border-input bg-background p-0"
                                                    />
                                                    <Input
                                                        value={customColorValue}
                                                        readOnly
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <p className="mt-2 text-[10px] text-muted-foreground">
                                                    Pick a custom color if the preset palette doesn&apos;t match.
                                                </p>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted-foreground">Start Date</label>
                                    <Input
                                        type="datetime-local"
                                        value={badgeStartsAt}
                                        onChange={(e) => setBadgeStartsAt(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted-foreground">End Date (optional)</label>
                                    <Input
                                        type="datetime-local"
                                        value={badgeEndsAt}
                                        onChange={(e) => setBadgeEndsAt(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="badge_active" checked={badgeIsActive} onCheckedChange={(value) => setBadgeIsActive(!!value)} />
                                    <label htmlFor="badge_active" className="text-[11px]">Badge active</label>
                                </div>
                                <ProductBadgePill label={badgeLabel || "Badge Preview"} color={badgeColor} className="relative left-auto top-auto translate-x-0 translate-y-0 shadow-sm" />
                            </div>
                            <p className="text-[10px] text-muted-foreground">If end date is empty, the badge stays visible forever after start date.</p>
                        </div>
                    ) : (
                        <p className="text-[10px] text-muted-foreground">No badge will be shown on product images.</p>
                    )}
                </div>
                {attributes.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <select className="h-8 rounded-md border bg-background px-2 text-xs" value={attrToAdd} onChange={e => setAttrToAdd(e.target.value)}>
                                <option value="">Select attribute</option>
                                {attributes.filter(a => !selectedAttrIds.includes(a.id)).map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            <Button type="button" size="sm" variant="secondary" disabled={!attrToAdd} onClick={() => {
                                if (attrToAdd && !selectedAttrIds.includes(attrToAdd)) {
                                    setSelectedAttrIds(prev => [...prev, attrToAdd]);
                                    setAttrToAdd("");
                                }
                            }}>Add</Button>
                        </div>
                        {selectedAttrIds.length > 0 && (
                            <div className="space-y-2 max-h-52 overflow-auto pr-1 border rounded-md p-2">
                                {selectedAttrIds.map(id => {
                                    const attr = attributes.find(a => a.id === id)!;
                                    const rawValue = attributeValues[id];
                                    const inputValue =
                                        typeof rawValue === "string" || typeof rawValue === "number"
                                            ? rawValue
                                            : "";
                                    return (
                                        <div key={id} className="space-y-1 border-b last:border-b-0 pb-2 last:pb-0">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] uppercase tracking-wide">
                                                    {attr.name} <span className="text-[9px] lowercase text-muted-foreground">({attr.data_type})</span>
                                                </label>
                                                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => {
                                                    setSelectedAttrIds(prev => prev.filter(x => x !== id));
                                                    setAttributeValues(prev => { const clone = { ...prev }; delete clone[id]; return clone; });
                                                }}>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            {attr.data_type === 'boolean' ? (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Checkbox id={`attr-${id}`} checked={!!attributeValues[id]} onCheckedChange={v => setAttributeValues(prev => ({ ...prev, [id]: !!v }))} />
                                                    <label htmlFor={`attr-${id}`}>{attributeValues[id] ? 'True' : 'False'}</label>
                                                </div>
                                            ) : (
                                                <Input
                                                    type={attr.data_type === 'number' ? 'number' : 'text'}
                                                    placeholder={attr.data_type === 'number' ? 'Enter number' : 'Value'}
                                                    value={inputValue}
                                                    onChange={e => setAttributeValues(prev => ({ ...prev, [id]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">Only added attributes are saved. Leave blank to ignore.</p>
                    </div>
                )}
                <Button type="submit" disabled={isPending || submitting} className="w-full">
                    {(isPending || submitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editing ? ((isPending || submitting) ? "Updating" : "Update") : ((isPending || submitting) ? "Creating" : "Create")}
                </Button>
                {editing && <button type="button" className="text-xs underline text-muted-foreground" onClick={onEditCancel}>Cancel edit</button>}
            </form>
            <WarningDialog open={!!imageWarning} title="Image warning" description={imageWarning || undefined} onClose={() => setImageWarning(null)} />
        </>
    );
}

// Lightweight debounced markdown input to avoid flicker on each keystroke
function MarkdownDetailsField({ detailsMd, setDetailsMd, onValuesChange }: { detailsMd: string; setDetailsMd: (v: string) => void; onValuesChange?: (partial: Partial<ProductFormValues>) => void; }) {
    const [showPreview, setShowPreview] = React.useState(false);
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Details (Markdown)</label>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(p => !p)} className="h-6 px-2 text-[11px]">{showPreview ? 'Edit' : 'Preview'}</Button>
            </div>
            {!showPreview ? (
                <MarkdownEditor value={detailsMd} onChange={(v) => { setDetailsMd(v); onValuesChange?.({ details_md: v }); }} />
            ) : (
                <div className="border rounded-md p-2 bg-muted/30 max-h-[250px] overflow-auto">
                    <Markdown content={detailsMd || '*No content*'} />
                </div>
            )}
        </div>
    );
}
