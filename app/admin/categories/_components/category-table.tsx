"use client";
import { Category } from "@/lib/services/categoryService";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2, Eye, GripVertical } from "lucide-react";
import { useMemo, useState } from "react";
import Image from 'next/image';
import { fetchCategoryAttributes } from "../detail-actions";
import type { Attribute } from "@/lib/services/attributeService";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildCategoryTreeItems } from "@/lib/utils/categoryTree";


export interface CategoryTableProps {
    data: Category[];
    allCategories?: Category[];
    onEdit: (c: Category) => void;
    onDelete: (id: string) => void;
    deletingIds: Set<string>;
    onReorder?: (dragId: string, targetId: string, placement: "before" | "after") => void;
    reorderDisabled?: boolean;
}

interface DetailData { category: Category; attributes: Attribute[] }

function DetailModal({ open, onClose, detail }: { open: boolean; onClose: () => void; detail: DetailData | null }) {
    if (!detail) return null;
    const isActive = detail.category.is_active;
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-2xl flex-col overflow-hidden">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle>Category Details</DialogTitle>
                </DialogHeader>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1">
                    <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Category</p>
                                <p className="text-base font-semibold">{detail.category.name}</p>
                                <p className="text-xs text-muted-foreground">Slug: {detail.category.slug || "—"}</p>
                            </div>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}`}>
                                {isActive ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {detail.category.image_url ? (
                            <div className="rounded-lg border p-4">
                                <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">IMAGE</h3>
                                <div className="relative h-44 w-full overflow-hidden rounded-md border bg-muted">
                                    <Image
                                        src={detail.category.image_url}
                                        alt={detail.category.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 400px"
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-lg border p-4">
                            <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">DETAILS</h3>
                            <dl className="grid grid-cols-2 gap-y-2 text-xs">
                                <dt className="font-medium text-muted-foreground">Status</dt>
                                <dd className="text-right">{isActive ? "Active" : "Inactive"}</dd>
                                <dt className="font-medium text-muted-foreground">Parent</dt>
                                <dd className="text-right">{detail.category.parent_id ? "Linked" : "—"}</dd>
                                <dt className="font-medium text-muted-foreground">Slug</dt>
                                <dd className="truncate text-right">{detail.category.slug || "—"}</dd>
                            </dl>
                        </div>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">ATTRIBUTES</h3>
                        {detail.attributes.length ? (
                            <ul className="flex flex-wrap gap-2">
                                {detail.attributes.map(a => <li key={a.id} className="text-[10px] rounded bg-muted px-2 py-1">{a.name}<span className="ml-1 text-[9px] text-muted-foreground">({a.data_type})</span></li>)}
                            </ul>
                        ) : <p className="text-xs text-muted-foreground">No attributes linked.</p>}
                    </div>
                </div>
                <DialogFooter className="border-t pt-3">
                    <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CategoryTable({ data, allCategories = [], onEdit, onDelete, deletingIds, onReorder, reorderDisabled = false }: CategoryTableProps) {
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState<DetailData | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [dragId, setDragId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; placement: "before" | "after" } | null>(null);
    const treeItems = useMemo(
        () => buildCategoryTreeItems(allCategories.length ? allCategories : data),
        [allCategories, data],
    );
    const treeById = useMemo(() => {
        const map = new Map<string, { prefix: string; label: string }>();
        for (const item of treeItems) {
            map.set(item.id, { prefix: item.prefix, label: item.label });
        }
        return map;
    }, [treeItems]);
    const categoryNameById = useMemo(() => {
        const source = allCategories.length ? allCategories : data;
        return new Map(source.map((category) => [category.id, category.name] as const));
    }, [allCategories, data]);

    async function openDetail(cat: Category) {
        setLoadingId(cat.id);
        try {
            const resolved = await fetchCategoryAttributes(cat.id);
            setDetail({ category: cat, attributes: resolved });
            setOpen(true);
        } catch {
            setDetail({ category: cat, attributes: [] });
            setOpen(true);
        } finally { setLoadingId(null); }
    }
    if (!data.length) {
        return <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">No categories yet.</div>;
    }
    return (
        <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
                <thead className="bg-accent">
                    <tr>
                        <th className="w-8" />
                        <th className="text-left px-3 py-2 font-medium">Image</th>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Slug</th>
                        <th className="text-left px-3 py-2 font-medium">Parent</th>
                        {/* <th className="text-left px-3 py-2 font-medium">Order</th> */}
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                        <th className="w-32" />
                    </tr>
                </thead>
                <tbody>
                    {data.map(row => (
                        <tr
                            key={row.id}
                            className={`border-t ${dragId === row.id ? "opacity-60" : ""} ${dropTarget?.id === row.id && dropTarget.placement === "before" ? "border-t-2 border-t-primary" : ""} ${dropTarget?.id === row.id && dropTarget.placement === "after" ? "border-b-2 border-b-primary" : ""}`}
                            draggable={!reorderDisabled}
                            onDragStart={() => setDragId(row.id)}
                            onDragEnd={() => {
                                setDragId(null);
                                setDropTarget(null);
                            }}
                            onDragOver={(event) => {
                                if (reorderDisabled || !dragId || dragId === row.id) return;
                                event.preventDefault();
                                const rect = event.currentTarget.getBoundingClientRect();
                                const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                                setDropTarget({ id: row.id, placement });
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (reorderDisabled || !dragId || dragId === row.id || !onReorder) return;
                                const placement = dropTarget?.id === row.id ? dropTarget.placement : "before";
                                onReorder(dragId, row.id, placement);
                                setDragId(null);
                                setDropTarget(null);
                            }}
                        >
                            <td className="px-1 py-2 text-muted-foreground">
                                <span className={`inline-flex items-center justify-center ${reorderDisabled ? "cursor-not-allowed opacity-40" : "cursor-grab"}`} title="Drag to reorder">
                                    <GripVertical className="h-4 w-4" />
                                </span>
                            </td>
                            <td className="px-3 py-2">
                                {row.image_url ? (
                                    <div className="relative w-10 h-10 rounded border bg-muted overflow-hidden">
                                        <Image
                                            src={row.image_url}
                                            alt={row.name}
                                            fill
                                            sizes="40px"
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center text-[9px] text-muted-foreground">—</div>
                                )}
                            </td>
                            <td className="px-3 py-2 font-medium">
                                <span className="inline-flex items-center gap-1">
                                    {treeById.get(row.id)?.prefix ? (
                                        <span className="text-[10px] font-mono text-muted-foreground">{treeById.get(row.id)?.prefix}</span>
                                    ) : null}
                                    <span>{row.name}</span>
                                </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{row.slug ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.parent_id ? categoryNameById.get(row.parent_id) || "—" : "—"}</td>
                            {/* <td className="px-3 py-2 text-muted-foreground">{row.sort_order ?? 0}</td> */}
                            <td className="px-3 py-2">
                                {row.is_active ? <span className="text-green-600 text-xs font-semibold">ACTIVE</span> : <span className="text-muted-foreground text-xs">INACTIVE</span>}
                            </td>
                            <td className="px-3 py-2 flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openDetail(row)} aria-label="View">
                                    {loadingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" disabled={deletingIds.has(row.id)} onClick={() => onDelete(row.id)}>
                                    {deletingIds.has(row.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <DetailModal open={open} detail={detail} onClose={() => setOpen(false)} />
        </div>
    );
}
