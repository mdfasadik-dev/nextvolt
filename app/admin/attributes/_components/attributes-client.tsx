"use client";
import { useCrud } from "@/lib/hooks/useCrud";
import { Attribute } from "@/lib/services/attributeService";
import { listAttributes, createAttribute, updateAttribute, deleteAttribute } from "../actions";
import { ATTRIBUTE_TYPES } from "@/lib/constants/attributes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2 } from "lucide-react";

export function AttributesClient({ initial }: { initial: Attribute[] }) {
    const toast = useToast();
    const { records, create, update, remove, isPending, error } = useCrud<Attribute>({ initialData: initial, listAction: listAttributes, createAction: async (d) => await createAttribute(d as any), updateAction: async (d) => await updateAttribute(d as any), deleteAction: deleteAttribute });
    const [editing, setEditing] = useState<Attribute | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const rawType = fd.get("data_type") as string;
        const safeType = (ATTRIBUTE_TYPES as readonly string[]).includes(rawType) ? rawType : ATTRIBUTE_TYPES[0];
        const payload = { name: fd.get("name") as string, code: (fd.get("code") as string) || null, data_type: safeType as typeof ATTRIBUTE_TYPES[number] };
        try {
            if (editing) {
                await update({ id: editing.id, ...payload });
                toast.push({ variant: "success", title: "Attribute updated" });
                setEditing(null);
            } else {
                await create(payload as any);
                toast.push({ variant: "success", title: "Attribute created" });
            }
            form?.reset();
        } catch (err: any) {
            toast.push({ variant: "error", title: "Save failed", description: err?.message });
        }
    }
    async function executeDelete(id: string) { try { await remove(id); toast.push({ variant: "success", title: "Attribute deleted" }); } catch (e: any) { toast.push({ variant: "error", title: "Delete failed", description: e?.message }); } finally { setConfirmId(null); } }

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 self-start">
                <CardHeader><CardTitle>{editing ? "Edit Attribute" : "New Attribute"}</CardTitle></CardHeader>
                <CardContent>
                    {error && <div className="mb-4 text-xs text-red-500">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Name</label>
                            <Input name="name" defaultValue={editing?.name} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Code</label>
                            <Input name="code" defaultValue={editing?.code || undefined} placeholder="optional" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Data Type</label>
                            <select name="data_type" defaultValue={editing?.data_type} className="w-full h-9 rounded-md border bg-background px-2 text-sm" required>
                                {ATTRIBUTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <Button type="submit" disabled={isPending} className="w-full">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? (isPending ? "Updating" : "Update") : (isPending ? "Creating" : "Create")}</Button>
                        {editing && <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setEditing(null)}>Cancel edit</button>}
                    </form>
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader><CardTitle>Attributes</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Name</th><th className="py-2">Code</th><th className="py-2">Type</th><th className="py-2 w-px" /></tr></thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id} className="border-t">
                                    <td className="py-2">{r.name}</td>
                                    <td className="py-2">{r.code || "-"}</td>
                                    <td className="py-2 uppercase text-xs">{r.data_type}</td>
                                    <td className="py-2 flex gap-1 justify-end">
                                        <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /></Button>
                                        <Button type="button" variant="ghost" size="icon" aria-label="Delete" onClick={() => setConfirmId(r.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
            <ConfirmDialog open={!!confirmId} title="Delete Attribute" description="This will permanently delete the attribute." confirmLabel="Delete" variant="danger" onCancel={() => setConfirmId(null)} onConfirm={() => confirmId && executeDelete(confirmId)} />
        </div>
    );
}
