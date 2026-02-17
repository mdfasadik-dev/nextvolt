"use client";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { Pencil, Trash2, Loader2, Eye, GripVertical } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/services/productService";
import type { Category } from "@/lib/services/categoryService";
import { isProductBadgeVisibleAt } from "@/lib/constants/product-badge";
import { ProductBadgePill } from "@/components/products/product-badge-pill";

type BadgeSummary = {
    id: string;
    product_id: string;
    label: string;
    color: string;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
};

interface ProductTableProps {
    records: Product[];
    categories: Category[];
    badgeMap: Record<string, BadgeSummary>;
    loadingViewId: string | null;
    onEdit: (p: Product) => void;
    onDeleteRequest: (id: string) => void;
    onView: (id: string) => void;
    onReorder?: (dragId: string, targetId: string, placement: "before" | "after") => void;
    reorderDisabled?: boolean;
}

export function ProductTable({ records, categories, badgeMap, loadingViewId, onEdit, onDeleteRequest, onView, onReorder, reorderDisabled = false }: ProductTableProps) {
    const [dragId, setDragId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; placement: "before" | "after" } | null>(null);

    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 w-8" />
                    <th className="py-2">Image</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Brand</th>
                    <th className="py-2">Badge</th>
                    <th className="py-2">Weight</th>
                    {/* <th className="py-2">Order</th> */}
                    <th className="py-2">Active</th>
                    <th className="py-2 w-px" />
                </tr>
            </thead>
            <tbody>
                {records.map((r) => {
                    const badge = badgeMap[r.id];
                    const badgeVisible = isProductBadgeVisibleAt(badge);
                    return (
                        <tr
                            key={r.id}
                            className={`border-t ${dragId === r.id ? "opacity-60" : ""} ${dropTarget?.id === r.id && dropTarget.placement === "before" ? "border-t-2 border-t-primary" : ""} ${dropTarget?.id === r.id && dropTarget.placement === "after" ? "border-b-2 border-b-primary" : ""}`}
                            draggable={!reorderDisabled}
                            onDragStart={() => setDragId(r.id)}
                            onDragEnd={() => {
                                setDragId(null);
                                setDropTarget(null);
                            }}
                            onDragOver={(event) => {
                                if (reorderDisabled || !dragId || dragId === r.id) return;
                                event.preventDefault();
                                const rect = event.currentTarget.getBoundingClientRect();
                                const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                                setDropTarget({ id: r.id, placement });
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (reorderDisabled || !dragId || dragId === r.id || !onReorder) return;
                                const placement = dropTarget?.id === r.id ? dropTarget.placement : "before";
                                onReorder(dragId, r.id, placement);
                                setDragId(null);
                                setDropTarget(null);
                            }}
                        >
                            <td className="py-2 pr-1 align-middle text-muted-foreground">
                                <span
                                    className={`inline-flex items-center justify-center ${reorderDisabled ? "cursor-not-allowed opacity-40" : "cursor-grab"}`}
                                    title="Drag to reorder"
                                >
                                    <GripVertical className="h-4 w-4" />
                                </span>
                            </td>
                            <td className="py-2 pr-2">
                                {r.main_image_url ? (
                                    <div className="relative w-10 h-10 rounded border bg-muted overflow-hidden">
                                        <Image src={r.main_image_url} alt={r.name} fill sizes="40px" className="object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center text-[9px] text-muted-foreground">—</div>
                                )}
                            </td>
                            <td className="py-2 align-middle">{r.name}</td>
                            <td className="py-2 text-xs align-middle">{categories.find(c => c.id === r.category_id)?.name || '-'}</td>
                            <td className="py-2 text-xs align-middle">{r.brand || '-'}</td>
                            <td className="py-2 text-xs align-middle">
                                {badge ? (
                                    <div className="flex flex-col gap-1">
                                        <ProductBadgePill
                                            label={badge.label}
                                            color={badge.color}
                                            className="relative left-auto top-auto inline-flex w-fit -translate-x-0 -translate-y-0 px-2 py-0.5 text-[10px]"
                                        />
                                        <span className="text-[10px] text-muted-foreground">
                                            {badgeVisible ? 'Visible now' : badge.is_active ? 'Scheduled / Expired' : 'Disabled'}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </td>
                            <td className="py-2 text-xs align-middle">{r.weight_grams ? `${r.weight_grams} g` : '0 g'}</td>
                            {/* <td className="py-2 text-xs align-middle">{r.sort_order ?? 0}</td> */}
                            <td className="py-2 text-xs align-middle">{r.is_active ? 'Yes' : 'No'}</td>
                            <td className="py-2 flex gap-1 justify-end align-middle">
                                <Button type="button" variant="ghost" size="icon" aria-label="View" onClick={() => onView(r.id)}>
                                    {loadingViewId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(r)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete" onClick={() => onDeleteRequest(r.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    );
}
