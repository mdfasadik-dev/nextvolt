"use client";
import { useEffect, useState } from 'react';
import { listStoresPaged, createStore, updateStore, deleteStore } from '../store-actions';
import type { Store } from '@/lib/services/storeService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StoreFormDialog } from './store-form-dialog';

export function StoreClient({ initial }: { initial: Store[] }) {
    const toast = useToast();
    const [records, setRecords] = useState<Store[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initial.length);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<Store | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [viewing, setViewing] = useState<Store | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    async function load(p = page, s = search) {
        setLoading(true);
        try {
            const res = await listStoresPaged({ page: p, pageSize, search: s });
            setRecords(res.rows); setTotal(res.total); setPage(res.page);
        } catch (e: any) {
            toast.push({ variant: 'error', title: 'Load failed', description: e?.message });
        } finally { setLoading(false); }
    }
    useEffect(() => { load(1, search); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSize]);
    useEffect(() => { const t = setTimeout(() => load(1, search), 350); return () => clearTimeout(t); }, [search]);

    async function handleCreate(payload: any) { await createStore(payload); await load(1, search); toast.push({ variant: 'success', title: 'Store created' }); }
    async function handleUpdate(id: string, payload: any) { await updateStore({ id, ...payload }); await load(page, search); toast.push({ variant: 'success', title: 'Store updated' }); }
    async function handleDelete(id: string) { try { await deleteStore({ id }); toast.push({ variant: 'success', title: 'Store deleted' }); await load(page, search); } catch (e: any) { toast.push({ variant: 'error', title: 'Delete failed', description: e?.message }); } }

    const isPending = loading;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Stores</h2>
                    <div className="relative">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name..." className="h-8 rounded-md border bg-background px-2 text-sm w-56" />
                        {search && <button onClick={() => setSearch('')} className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground">×</button>}
                    </div>
                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-xs">{[10, 20, 30, 50].map(sz => <option key={sz} value={sz}>{sz}/page</option>)}</select>
                    <div className="text-xs text-muted-foreground">{isPending ? 'Loading…' : total === 0 ? 'No results' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</div>
                </div>
                <Button onClick={() => { setEditing(null); setFormOpen(true); }}>Add Store</Button>
            </div>
            <Card>
                <CardHeader><CardTitle>All Stores</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Name</th><th className="py-2">Active</th><th className="py-2">City</th><th className="py-2">Country</th><th className="py-2">Website</th><th className="py-2 w-px" /></tr></thead>
                        <tbody>{records.map(r => <tr key={r.id} className="border-t"><td className="py-2">{r.name}</td><td className="py-2 text-xs">{r.is_active ? 'Yes' : 'No'}</td><td className="py-2 text-xs">{r.city || '-'}</td><td className="py-2 text-xs">{r.country || '-'}</td><td className="py-2 text-xs truncate max-w-[140px]">{r.website_url ? <a href={r.website_url} target="_blank" className="underline">{r.website_url}</a> : '-'}</td><td className="py-2 flex gap-1 justify-end"><Button size="icon" variant="ghost" aria-label="View" onClick={() => setViewing(r)}><Eye className="w-4 h-4" /></Button><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setConfirmId(r.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button></td></tr>)}</tbody>
                    </table>
                    <PaginationControls page={page} pageSize={pageSize} total={total} disabled={isPending} onPageChange={(p) => { setPage(p); load(p, search); }} />
                </CardContent>
            </Card>
            <StoreFormDialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditing(null); } else setFormOpen(true); }} editing={editing} onCreate={handleCreate} onUpdate={handleUpdate} isPending={isPending} />
            <StoreViewDialog store={viewing} onClose={() => setViewing(null)} />
            <ConfirmDialog open={!!confirmId} title="Delete Store" description="This will remove the store." confirmLabel="Delete" variant="danger" onCancel={() => setConfirmId(null)} onConfirm={() => confirmId && handleDelete(confirmId)} />
        </div>
    );
}

function PaginationControls({ page, pageSize, total, disabled, onPageChange }: { page: number; pageSize: number; total: number; disabled?: boolean; onPageChange: (p: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;
    const pages: (number | '…')[] = [];
    const windowSize = 1;
    for (let i = 1; i <= totalPages; i++) { if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) pages.push(i); else if (pages[pages.length - 1] !== '…') pages.push('…'); }
    return <div className="flex items-center gap-2 justify-end mt-4"><button disabled={page === 1 || disabled} onClick={() => onPageChange(page - 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Prev</button><ul className="flex items-center gap-1">{pages.map((p, i) => p === '…' ? <li key={i} className="px-1 text-xs text-muted-foreground">…</li> : <li key={p}><button disabled={disabled || p === page} onClick={() => onPageChange(p)} className={`h-8 w-8 rounded-md text-xs border ${p === page ? 'bg-accent font-medium' : 'hover:bg-accent/60'}`}>{p}</button></li>)}</ul><button disabled={page === totalPages || disabled} onClick={() => onPageChange(page + 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Next</button></div>;
}

function StoreViewDialog({ store, onClose }: { store: Store | null; onClose: () => void }) {
    return <Dialog open={!!store} onOpenChange={(o) => { if (!o) onClose(); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Store Details</DialogTitle><button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button></DialogHeader><DialogBody className="space-y-3">{store && <div className="space-y-2 text-xs"><div><span className="font-medium">Name:</span> {store.name}</div><div><span className="font-medium">Active:</span> {store.is_active ? 'Yes' : 'No'}</div><div><span className="font-medium">Contact:</span> {store.contact_name || '-'} / {store.contact_email || '-'} / {store.contact_phone || '-'}</div><div><span className="font-medium">Location:</span> {[store.city, store.state, store.country].filter(Boolean).join(', ') || '-'}</div><div><span className="font-medium">Address:</span> {store.address || '-'}</div><div><span className="font-medium">Website:</span> {store.website_url ? <a href={store.website_url} className="underline" target="_blank">{store.website_url}</a> : '-'}</div><div><span className="font-medium">Coords:</span> {store.latitude != null && store.longitude != null ? `${store.latitude}, ${store.longitude}` : '-'}</div>{(store as any).logo_light_mode && <div><span className="font-medium">Logo Light:</span> <img src={(store as any).logo_light_mode} alt="logo light" className="h-8 inline" /></div>}{(store as any).logo_dark_mode && <div><span className="font-medium">Logo Dark:</span> <img src={(store as any).logo_dark_mode} alt="logo dark" className="h-8 inline" /></div>}</div>}</DialogBody></DialogContent></Dialog>;
}
