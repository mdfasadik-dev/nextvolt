"use client";
import { Category } from "@/lib/services/categoryService";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2, Eye, X } from "lucide-react";
import { useState, useEffect } from "react";
import Image from 'next/image';
import { fetchCategoryAttributes } from "../detail-actions";
import type { Attribute } from "@/lib/services/attributeService";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";


export interface CategoryTableProps {
    data: Category[];
    onEdit: (c: Category) => void;
    onDelete: (id: string) => void;
    deletingIds: Set<string>;
}

interface DetailData { category: Category; attributes: Attribute[] }

function DetailModal({ open, onClose, detail }: { open: boolean; onClose: () => void; detail: DetailData | null }) {
    if (!detail) return null;
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} align="top">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Category Details</DialogTitle>
                    <button onClick={onClose} aria-label="Close" className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    {(detail.category as any).image_url && (
                        <div className="flex justify-center mb-2">
                            <div className="relative max-h-40 w-full flex items-center justify-center">
                                <Image
                                    src={(detail.category as any).image_url as string}
                                    alt={detail.category.name}
                                    width={320}
                                    height={320}
                                    className="max-h-40 w-auto rounded-md border object-contain bg-muted"
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">BASIC</h3>
                        <dl className="grid grid-cols-3 gap-y-1 text-xs">
                            <dt className="font-medium">Name</dt><dd className="col-span-2 break-words">{detail.category.name}</dd>
                            <dt className="font-medium">Slug</dt><dd className="col-span-2 break-words">{detail.category.slug || '—'}</dd>
                            <dt className="font-medium">Active</dt><dd className="col-span-2">{detail.category.is_active ? 'Yes' : 'No'}</dd>
                            <dt className="font-medium">Parent</dt><dd className="col-span-2">{detail.category.parent_id ? 'Linked' : '—'}</dd>
                        </dl>
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground mb-1">ATTRIBUTES</h3>
                        {detail.attributes.length ? (
                            <ul className="flex flex-wrap gap-2">
                                {detail.attributes.map(a => <li key={a.id} className="text-[10px] rounded bg-muted px-2 py-1">{a.name}<span className="ml-1 text-[9px] text-muted-foreground">({a.data_type})</span></li>)}
                            </ul>
                        ) : <p className="text-xs text-muted-foreground">No attributes linked.</p>}
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CategoryTable({ data, onEdit, onDelete, deletingIds }: CategoryTableProps) {
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState<DetailData | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    async function openDetail(cat: Category) {
        setLoadingId(cat.id);
        try {
            const resolved: Attribute[] = await fetchCategoryAttributes(cat.id) as any;
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
                        <th className="text-left px-3 py-2 font-medium">Image</th>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Slug</th>
                        <th className="text-left px-3 py-2 font-medium">Parent</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                        <th className="w-32" />
                    </tr>
                </thead>
                <tbody>
                    {data.map(row => (
                        <tr key={row.id} className="border-t">
                            <td className="px-3 py-2">
                                {(row as any).image_url ? (
                                    <div className="relative w-10 h-10 rounded border bg-muted overflow-hidden">
                                        <Image
                                            src={(row as any).image_url as string}
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
                            <td className="px-3 py-2 font-medium">{row.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.slug ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{data.find(p => p.id === row.parent_id)?.name ?? "—"}</td>
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
