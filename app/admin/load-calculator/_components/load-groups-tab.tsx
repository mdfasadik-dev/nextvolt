"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { getLoadIcon } from "@/lib/constants/load-icons";
import type { LoadGroupWithItems, LoadItem } from "@/lib/services/loadCalculatorService";
import {
    createLoadGroup,
    createLoadItem,
    deleteLoadGroup,
    deleteLoadItem,
    updateLoadGroup,
    updateLoadItem,
} from "../actions";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

type GroupForm = {
    id: string | null;
    name: string;
    slug: string;
    icon: string;
    description: string;
    unit_name: string;
    unit_symbol: string;
    is_active: boolean;
};

type ItemForm = {
    id: string | null;
    load_group_id: string;
    name: string;
    icon: string;
    unit_value: string;
    max_quantity: string;
    is_active: boolean;
};

const emptyGroup: GroupForm = {
    id: null,
    name: "",
    slug: "",
    icon: "",
    description: "",
    unit_name: "Watt",
    unit_symbol: "W",
    is_active: true,
};

/** Small icon preview used in the admin lists. */
function GroupIcon({ iconKey }: { iconKey: string | null }) {
    const Icon = getLoadIcon(iconKey);
    if (!Icon) return <Zap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />;
    return <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />;
}

export function LoadGroupsTab({ groups }: { groups: LoadGroupWithItems[] }) {
    const toast = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedId, setSelectedId] = useState<string | null>(groups[0]?.id ?? null);

    const [groupForm, setGroupForm] = useState<GroupForm | null>(null);
    const [itemForm, setItemForm] = useState<ItemForm | null>(null);
    const [confirm, setConfirm] = useState<{ kind: "group" | "item"; id: string; name: string } | null>(null);

    const selected = useMemo(
        () => groups.find(group => group.id === selectedId) || groups[0] || null,
        [groups, selectedId],
    );

    function saveGroup() {
        if (!groupForm) return;
        if (!groupForm.name.trim()) {
            toast.push({ variant: "error", title: "Group name is required" });
            return;
        }
        startTransition(async () => {
            try {
                const payload = {
                    name: groupForm.name.trim(),
                    slug: groupForm.slug.trim() || null,
                    icon: groupForm.icon.trim() || null,
                    description: groupForm.description.trim() || null,
                    unit_name: groupForm.unit_name.trim() || "Watt",
                    unit_symbol: groupForm.unit_symbol.trim() || "W",
                    is_active: groupForm.is_active,
                };
                if (groupForm.id) await updateLoadGroup(groupForm.id, payload);
                else await createLoadGroup(payload);
                toast.push({ variant: "success", title: groupForm.id ? "Group updated" : "Group created" });
                setGroupForm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Could not save group") });
            }
        });
    }

    function saveItem() {
        if (!itemForm) return;
        if (!itemForm.name.trim()) {
            toast.push({ variant: "error", title: "Load name is required" });
            return;
        }
        const unitValue = Number(itemForm.unit_value);
        if (!Number.isFinite(unitValue) || unitValue < 0) {
            toast.push({ variant: "error", title: "Enter a valid unit value" });
            return;
        }
        const maxQuantity = itemForm.max_quantity.trim() ? Number(itemForm.max_quantity) : null;
        if (maxQuantity !== null && (!Number.isFinite(maxQuantity) || maxQuantity <= 0)) {
            toast.push({ variant: "error", title: "Max quantity must be greater than 0" });
            return;
        }
        startTransition(async () => {
            try {
                const base = {
                    name: itemForm.name.trim(),
                    icon: itemForm.icon.trim() || null,
                    unit_value: unitValue,
                    max_quantity: maxQuantity,
                    is_active: itemForm.is_active,
                };
                if (itemForm.id) await updateLoadItem(itemForm.id, base);
                else await createLoadItem({ ...base, load_group_id: itemForm.load_group_id });
                toast.push({ variant: "success", title: itemForm.id ? "Load updated" : "Load added" });
                setItemForm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Could not save load") });
            }
        });
    }

    function runDelete() {
        if (!confirm) return;
        const target = confirm;
        startTransition(async () => {
            try {
                if (target.kind === "group") await deleteLoadGroup(target.id);
                else await deleteLoadItem(target.id);
                toast.push({ variant: "success", title: `${target.name} deleted` });
                setConfirm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Delete failed") });
            }
        });
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            {/* Groups list */}
            <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base">Load Groups</CardTitle>
                        <CardDescription className="text-xs">Each group defines its own unit.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setGroupForm({ ...emptyGroup })} disabled={isPending}>
                        <Plus className="mr-1 h-4 w-4" /> New
                    </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                    {groups.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">No groups yet.</p>
                    )}
                    {groups.map(group => (
                        <div
                            key={group.id}
                            className={`rounded-md border p-3 ${group.id === selected?.id ? "border-primary bg-primary/5" : "bg-card"}`}
                        >
                            <div className="flex items-start gap-2">
                                <button
                                    type="button"
                                    className="flex flex-1 items-start gap-2 text-left"
                                    onClick={() => setSelectedId(group.id)}
                                >
                                    <GroupIcon iconKey={group.icon} />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium">{group.name}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {group.load_items.length} loads · {group.unit_name} ({group.unit_symbol})
                                        </span>
                                    </span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {!group.is_active && (
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            Hidden
                                        </span>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() =>
                                            setGroupForm({
                                                id: group.id,
                                                name: group.name,
                                                slug: group.slug || "",
                                                icon: group.icon || "",
                                                description: group.description || "",
                                                unit_name: group.unit_name,
                                                unit_symbol: group.unit_symbol,
                                                is_active: group.is_active,
                                            })
                                        }
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => setConfirm({ kind: "group", id: group.id, name: group.name })}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Loads of selected group */}
            <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base">
                            {selected ? `Loads in ${selected.name}` : "Loads"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {selected
                                ? `Values are in ${selected.unit_name} (${selected.unit_symbol}).`
                                : "Select a group first."}
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        disabled={!selected || isPending}
                        onClick={() =>
                            selected &&
                            setItemForm({
                                id: null,
                                load_group_id: selected.id,
                                name: "",
                                icon: "",
                                unit_value: "",
                                max_quantity: "",
                                is_active: true,
                            })
                        }
                    >
                        <Plus className="mr-1 h-4 w-4" /> Add Load
                    </Button>
                </CardHeader>
                <CardContent>
                    {!selected || selected.load_items.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            No loads in this group yet.
                        </p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {selected.load_items.map((item: LoadItem) => (
                                <div key={item.id} className="rounded-md border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <GroupIcon iconKey={item.icon} />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {Number(item.unit_value)}
                                                    {selected.unit_symbol}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                    setItemForm({
                                                        id: item.id,
                                                        load_group_id: selected.id,
                                                        name: item.name,
                                                        icon: item.icon || "",
                                                        unit_value: String(Number(item.unit_value)),
                                                        max_quantity:
                                                            item.max_quantity != null ? String(item.max_quantity) : "",
                                                        is_active: item.is_active,
                                                    })
                                                }
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-destructive"
                                                onClick={() =>
                                                    setConfirm({ kind: "item", id: item.id, name: item.name })
                                                }
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    {!item.is_active && (
                                        <span className="mt-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            Hidden
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Group dialog */}
            <Dialog open={Boolean(groupForm)} onOpenChange={open => !open && setGroupForm(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{groupForm?.id ? "Edit Group" : "New Group"}</DialogTitle>
                        <DialogDescription>
                            Every load inside this group uses the unit set here.
                        </DialogDescription>
                    </DialogHeader>
                    {groupForm && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label>Name</Label>
                                <Input
                                    value={groupForm.name}
                                    onChange={event => setGroupForm({ ...groupForm, name: event.target.value })}
                                    placeholder="Lights"
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>Unit name</Label>
                                    <Input
                                        value={groupForm.unit_name}
                                        onChange={event =>
                                            setGroupForm({ ...groupForm, unit_name: event.target.value })
                                        }
                                        placeholder="Watt"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Unit symbol</Label>
                                    <Input
                                        value={groupForm.unit_symbol}
                                        onChange={event =>
                                            setGroupForm({ ...groupForm, unit_symbol: event.target.value })
                                        }
                                        placeholder="W"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Icon (optional)</Label>
                                <IconPicker
                                    value={groupForm.icon || null}
                                    onChange={key => setGroupForm({ ...groupForm, icon: key || "" })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Description (optional)</Label>
                                <Textarea
                                    rows={2}
                                    value={groupForm.description}
                                    onChange={event =>
                                        setGroupForm({ ...groupForm, description: event.target.value })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                    <p className="text-sm font-medium">Visible on public site</p>
                                    <p className="text-xs text-muted-foreground">Hidden groups are kept but not shown.</p>
                                </div>
                                <Switch
                                    checked={groupForm.is_active}
                                    onCheckedChange={checked => setGroupForm({ ...groupForm, is_active: checked })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGroupForm(null)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={saveGroup} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Item dialog */}
            <Dialog open={Boolean(itemForm)} onOpenChange={open => !open && setItemForm(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{itemForm?.id ? "Edit Load" : "Add Load"}</DialogTitle>
                        <DialogDescription>
                            {selected
                                ? `Unit is inherited from the group: ${selected.unit_name} (${selected.unit_symbol}).`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    {itemForm && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label>Name</Label>
                                <Input
                                    value={itemForm.name}
                                    onChange={event => setItemForm({ ...itemForm, name: event.target.value })}
                                    placeholder="LED Bulb ( 5W )"
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="flex items-center gap-1">
                                        <Zap className="h-3.5 w-3.5" />
                                        Value ({selected?.unit_symbol || "W"})
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={itemForm.unit_value}
                                        onChange={event =>
                                            setItemForm({ ...itemForm, unit_value: event.target.value })
                                        }
                                        placeholder="5"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Unit: {selected?.unit_name || "Watt"} ({selected?.unit_symbol || "W"})
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Max quantity (optional)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={itemForm.max_quantity}
                                        onChange={event =>
                                            setItemForm({ ...itemForm, max_quantity: event.target.value })
                                        }
                                        placeholder="No limit"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Icon (optional)</Label>
                                <IconPicker
                                    value={itemForm.icon || null}
                                    onChange={key => setItemForm({ ...itemForm, icon: key || "" })}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-md border p-3">
                                <p className="text-sm font-medium">Visible on public site</p>
                                <Switch
                                    checked={itemForm.is_active}
                                    onCheckedChange={checked => setItemForm({ ...itemForm, is_active: checked })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemForm(null)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={saveItem} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                title={`Delete ${confirm?.name || ""}?`}
                description={
                    confirm?.kind === "group"
                        ? "The group and its loads will be hidden from the calculator."
                        : "This load will be removed from the calculator."
                }
                confirmLabel="Delete"
                variant="danger"
                onConfirm={runDelete}
                onCancel={() => setConfirm(null)}
            />
        </div>
    );
}
