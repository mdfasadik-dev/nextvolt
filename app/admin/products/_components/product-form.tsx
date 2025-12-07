"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePlus, Loader2 as Spinner, Loader2, X, Trash2 } from "lucide-react";
import Image from 'next/image';
import type { Product } from "@/lib/services/productService";
import type { Category } from "@/lib/services/categoryService";
import type { Attribute } from "@/lib/services/attributeService";
import { useProductFormLogic, ProductFormValues } from "./useProductFormLogic";
import { WarningDialog } from "@/components/ui/warning-dialog";
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Markdown } from '@/components/markdown';

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
        existingImageUrl, pickedFile, removalRequested, setRemovalRequested,
        submitting, uploading, displayImageUrl,
        pickNewFile, handleSubmit,
        setPickedFile, setExistingImageUrl,
        imageWarning, setImageWarning,
        detailsMd, setDetailsMd,
    } = logic;

    // expose logic to parent once
    // eslint-disable-next-line react-hooks/rules-of-hooks
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
                        <Checkbox id="is_featured" name="is_featured" defaultChecked={(editing as any)?.is_featured ?? false} onCheckedChange={v => onValuesChange?.({ is_featured: !!v })} />
                        <label htmlFor="is_featured" className="text-xs">Featured</label>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs">Main Image</label>
                    <div className="flex items-center gap-3">
                        {!removalRequested && displayImageUrl ? (
                            <div className="relative w-16 h-16 rounded border overflow-hidden bg-muted">
                                <Image src={displayImageUrl!} alt="preview" fill sizes="64px" className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded border flex items-center justify-center text-muted-foreground text-[10px]">{removalRequested ? 'Removed' : 'No Image'}</div>
                        )}
                        <Button type="button" size="sm" variant="secondary" onClick={pickNewFile} disabled={uploading || submitting}>
                            <ImagePlus className="w-3 h-3 mr-1" />{pickedFile ? 'Change' : (existingImageUrl ? 'Replace' : 'Select')}
                        </Button>
                        {(existingImageUrl || pickedFile) && !uploading && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    if (pickedFile) setPickedFile(null);
                                    if (existingImageUrl) setRemovalRequested(true); // keep URL for deletion on submit
                                }}
                            >
                                <Trash2 className="w-3 h-3 mr-1" />Remove
                            </Button>
                        )}
                    </div>
                    {removalRequested && <p className="text-[10px] text-amber-600">Image will be removed on save.</p>}
                    {uploading && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Spinner className="w-3 h-3 animate-spin" />Uploading image…</p>}
                    <p className="text-[10px] text-muted-foreground">Max size 1 MB. For best results, use a square (1:1) image.</p>
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
                                                    value={attributeValues[id] ?? ''}
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
