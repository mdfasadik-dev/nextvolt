"use client";

import { useEffect, useState } from "react";
import { getDeliveryOptions, createDeliveryOption, updateDeliveryOption, deleteDeliveryOption, updateDeliveryOrder } from "../../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type DeliveryOption = {
    id: string;
    label: string;
    amount: number;
    is_active: boolean;
    is_default: boolean;
    sort_order: number;
};

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

function SortableRow({ opt, onEdit, onDelete }: { opt: DeliveryOption, onEdit: (opt: DeliveryOption) => void, onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: opt.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell>
                <div {...attributes} {...listeners} className="cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
            </TableCell>
            <TableCell className="font-medium">{opt.label}</TableCell>
            <TableCell>{CURRENCY}{opt.amount.toFixed(2)}</TableCell>
            <TableCell>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${opt.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {opt.is_active ? "Active" : "Inactive"}
                </span>
            </TableCell>
            <TableCell>
                {opt.is_default && <span className="text-blue-600 font-semibold text-xs">Default</span>}
            </TableCell>
            <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(opt)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDelete(opt.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
}

export default function DeliverySettingsPage() {
    const toast = useToast();
    const [options, setOptions] = useState<DeliveryOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentOption, setCurrentOption] = useState<DeliveryOption | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const loadOptions = async () => {
        setLoading(true);
        try {
            const data = await getDeliveryOptions();
            setOptions(data as DeliveryOption[]);
        } catch (error) {
            console.error("Failed to load delivery options:", error);
            toast.push({ title: "Error", description: "Failed to load options", variant: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOptions();
    }, []);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            let newItems: DeliveryOption[] = [];
            setOptions((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                newItems = arrayMove(items, oldIndex, newIndex);
                return newItems;
            });

            if (newItems.length > 0) {
                const updates = newItems.map((item, index) => ({ id: item.id, sort_order: index }));
                updateDeliveryOrder(updates).catch(() => {
                    toast.push({ title: "Update failed", description: "Failed to save order", variant: "error" });
                    loadOptions();
                });
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const payload = {
            label: formData.get("label"),
            amount: Number(formData.get("amount")),
            sort_order: currentOption ? currentOption.sort_order : options.length,
            is_active: formData.get("is_active") === "on",
            is_default: formData.get("is_default") === "on",
        };

        try {
            if (currentOption) {
                await updateDeliveryOption(currentOption.id, payload);
                toast.push({ title: "Updated", description: "Delivery method updated", variant: "success" });
            } else {
                await createDeliveryOption(payload);
                toast.push({ title: "Created", description: "Delivery method created", variant: "success" });
            }
            setIsDialogOpen(false);
            loadOptions();
        } catch (error: any) {
            console.error("Failed to save delivery option:", error);
            toast.push({ title: "Error", description: error.message || "Failed to save", variant: "error" });
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDeliveryOption(deleteId);
            toast.push({ title: "Deleted", description: "Delivery method removed", variant: "success" });
            loadOptions();
        } catch (error) {
            console.error("Failed to delete:", error);
            toast.push({ title: "Error", description: "Failed to delete", variant: "error" });
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Delivery Settings</h2>
                    <p className="text-muted-foreground">Manage shipping methods and fees.</p>
                </div>
                <Button onClick={() => { setCurrentOption(null); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Method
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Delivery Methods</CardTitle>
                    <CardDescription>
                        Active delivery options visible to customers. Drag to reorder.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Label</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Default</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <SortableContext
                                        items={options.map(opt => opt.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {options.map((opt) => (
                                            <SortableRow
                                                key={opt.id}
                                                opt={opt}
                                                onEdit={(o) => { setCurrentOption(o); setIsDialogOpen(true); }}
                                                onDelete={(id) => setDeleteId(id)}
                                            />
                                        ))}
                                    </SortableContext>
                                </TableBody>
                            </Table>
                        </DndContext>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentOption ? "Edit Delivery Method" : "New Delivery Method"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 pt-4 px-2">
                        <div className="grid gap-2">
                            <Label htmlFor="label">Label</Label>
                            <Input id="label" name="label" defaultValue={currentOption?.label} required placeholder="e.g. Express Shipping" />
                        </div>
                        <div className="flex gap-4">
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="amount">Amount ({CURRENCY})</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" defaultValue={currentOption?.amount} required />
                            </div>
                        </div>
                        <div className="flex items-center justify-between border p-3 rounded-md">
                            <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                            <Switch id="is_active" name="is_active" defaultChecked={currentOption ? currentOption.is_active : true} />
                        </div>
                        <div className="flex items-center justify-between border p-3 rounded-md">
                            <Label htmlFor="is_default" className="cursor-pointer">Default Selection</Label>
                            <Switch id="is_default" name="is_default" defaultChecked={currentOption?.is_default} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this delivery method. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
