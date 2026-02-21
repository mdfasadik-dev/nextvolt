"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/ui/toast-provider";
import { PageLoadingOverlay } from "@/components/ui/page-loading-overlay";
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
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tables } from "@/lib/types/supabase";
import { createContentPage, deleteContentPage, updateContentPage, updateContentPageOrder } from "../actions";

type ContentPage = Tables<"content_pages">;

type EditorState = {
    id: string | null;
    title: string;
    slug: string;
    summary: string;
    content_md: string;
    seo_title: string;
    seo_description: string;
    show_in_footer: boolean;
    is_active: boolean;
    sort_order: number;
};

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function makeInitialEditorState(): EditorState {
    return {
        id: null,
        title: "",
        slug: "",
        summary: "",
        content_md: "",
        seo_title: "",
        seo_description: "",
        show_in_footer: true,
        is_active: true,
        sort_order: 0,
    };
}

function pageToEditorState(page: ContentPage): EditorState {
    return {
        id: page.id,
        title: page.title,
        slug: page.slug,
        summary: page.summary || "",
        content_md: page.content_md || "",
        seo_title: page.seo_title || "",
        seo_description: page.seo_description || "",
        show_in_footer: page.show_in_footer,
        is_active: page.is_active,
        sort_order: page.sort_order,
    };
}

function sortPages(pages: ContentPage[]) {
    return [...pages].sort((a, b) => (a.sort_order - b.sort_order) || (a.created_at < b.created_at ? 1 : -1));
}

function SortablePageCard({
    page,
    selected,
    onSelect,
    onDelete,
    disabled,
}: {
    page: ContentPage;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    disabled?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: page.id,
        disabled,
    });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-md border p-3 ${selected ? "border-primary bg-primary/5" : "bg-card"}`}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    aria-label={`Reorder ${page.title}`}
                    className={`mt-0.5 rounded p-1 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing"}`}
                    {...attributes}
                    {...listeners}
                    disabled={disabled}
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                    type="button"
                    onClick={onSelect}
                    className="text-left flex-1"
                >
                    <p className="text-sm font-medium">{page.title}</p>
                    <p className="text-xs text-muted-foreground">/{page.slug}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {page.is_active ? "Published" : "Draft"} · {page.show_in_footer ? "Footer link on" : "Footer link off"}
                    </p>
                </button>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={onSelect}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StaticPageCard({
    page,
    selected,
    onSelect,
    onDelete,
}: {
    page: ContentPage;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}) {
    return (
        <div className={`rounded-md border p-3 ${selected ? "border-primary bg-primary/5" : "bg-card"}`}>
            <div className="flex items-start justify-between gap-2">
                <button
                    type="button"
                    onClick={onSelect}
                    className="text-left flex-1"
                >
                    <p className="text-sm font-medium">{page.title}</p>
                    <p className="text-xs text-muted-foreground">/{page.slug}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {page.is_active ? "Published" : "Draft"} · {page.show_in_footer ? "Footer link on" : "Footer link off"}
                    </p>
                </button>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={onSelect}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function PagesClient({ initialPages }: { initialPages: ContentPage[] }) {
    const toast = useToast();
    const [pages, setPages] = useState<ContentPage[]>(sortPages(initialPages));
    const [search, setSearch] = useState("");
    const [editor, setEditor] = useState<EditorState>(makeInitialEditorState());
    const [slugTouched, setSlugTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ordering, setOrdering] = useState(false);
    const [preview, setPreview] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ContentPage | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const orderedPages = useMemo(() => sortPages(pages), [pages]);
    const hasSearch = search.trim().length > 0;

    const filteredPages = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return orderedPages;
        return orderedPages.filter((page) =>
            page.title.toLowerCase().includes(term) ||
            page.slug.toLowerCase().includes(term),
        );
    }, [orderedPages, search]);

    const selectedId = editor.id;

    const resetEditor = () => {
        setEditor(makeInitialEditorState());
        setSlugTouched(false);
        setPreview(false);
    };

    const handleSelectPage = (page: ContentPage) => {
        setEditor(pageToEditorState(page));
        setSlugTouched(true);
        setPreview(false);
    };

    const handleTitleChange = (value: string) => {
        setEditor((prev) => ({
            ...prev,
            title: value,
            slug: slugTouched ? prev.slug : slugify(value),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editor.title.trim()) {
            toast.push({ variant: "error", title: "Title is required" });
            return;
        }

        const nextSortOrder = orderedPages.reduce((maxValue, page) => Math.max(maxValue, page.sort_order), -1) + 1;
        const payload = {
            title: editor.title.trim(),
            slug: (editor.slug.trim() || slugify(editor.title)) || null,
            summary: editor.summary.trim() || null,
            content_md: editor.content_md,
            seo_title: editor.seo_title.trim() || null,
            seo_description: editor.seo_description.trim() || null,
            show_in_footer: editor.show_in_footer,
            is_active: editor.is_active,
            sort_order: editor.id ? editor.sort_order : nextSortOrder,
        };

        setSaving(true);
        try {
            const saved = editor.id
                ? await updateContentPage(editor.id, payload)
                : await createContentPage(payload);

            setPages((prev) => {
                const exists = prev.some((page) => page.id === saved.id);
                const next = exists
                    ? prev.map((page) => (page.id === saved.id ? saved : page))
                    : [...prev, saved];
                return sortPages(next);
            });

            setEditor(pageToEditorState(saved));
            setSlugTouched(true);

            toast.push({
                variant: "success",
                title: editor.id ? "Page updated" : "Page created",
            });
        } catch (error: unknown) {
            toast.push({
                variant: "error",
                title: "Save failed",
                description: getErrorMessage(error, "Could not save page."),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteContentPage(deleteTarget.id, deleteTarget.slug);
            setPages((prev) => prev.filter((page) => page.id !== deleteTarget.id));
            if (selectedId === deleteTarget.id) resetEditor();
            toast.push({ variant: "success", title: "Page deleted" });
        } catch (error: unknown) {
            toast.push({
                variant: "error",
                title: "Delete failed",
                description: getErrorMessage(error, "Could not delete page."),
            });
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || hasSearch || ordering) return;

        const oldIndex = orderedPages.findIndex((page) => page.id === active.id);
        const newIndex = orderedPages.findIndex((page) => page.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const previous = orderedPages;
        const reordered = arrayMove(orderedPages, oldIndex, newIndex).map((page, index) => ({
            ...page,
            sort_order: index,
        }));

        setPages(reordered);
        setEditor((prev) => {
            if (!prev.id) return prev;
            const updated = reordered.find((page) => page.id === prev.id);
            if (!updated) return prev;
            return { ...prev, sort_order: updated.sort_order };
        });
        setOrdering(true);
        try {
            await updateContentPageOrder(
                reordered.map((page) => ({ id: page.id, sort_order: page.sort_order })),
            );
        } catch (error: unknown) {
            setPages(previous);
            setEditor((prev) => {
                if (!prev.id) return prev;
                const original = previous.find((page) => page.id === prev.id);
                if (!original) return prev;
                return { ...prev, sort_order: original.sort_order };
            });
            toast.push({
                variant: "error",
                title: "Reorder failed",
                description: getErrorMessage(error, "Could not update page order."),
            });
        } finally {
            setOrdering(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Custom Pages</h2>
                    <p className="text-muted-foreground">Create markdown pages like About, Privacy Policy, Terms, and more.</p>
                </div>
                <Button onClick={resetEditor}>
                    <Plus className="mr-2 h-4 w-4" /> New Page
                </Button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>All Pages</CardTitle>
                        <CardDescription>Drag to reorder pages shown in footer/public listings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title or slug"
                        />
                        {hasSearch ? (
                            <p className="text-xs text-muted-foreground">Clear search to reorder pages.</p>
                        ) : null}
                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {filteredPages.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No pages found.</p>
                            ) : hasSearch ? (
                                filteredPages.map((page) => (
                                    <StaticPageCard
                                        key={page.id}
                                        page={page}
                                        selected={selectedId === page.id}
                                        onSelect={() => handleSelectPage(page)}
                                        onDelete={() => setDeleteTarget(page)}
                                    />
                                ))
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext
                                        items={orderedPages.map((page) => page.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {orderedPages.map((page) => (
                                            <SortablePageCard
                                                key={page.id}
                                                page={page}
                                                selected={selectedId === page.id}
                                                onSelect={() => handleSelectPage(page)}
                                                onDelete={() => setDeleteTarget(page)}
                                                disabled={ordering}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{editor.id ? "Edit Page" : "Create Page"}</CardTitle>
                        <CardDescription>Slug is generated automatically from title, but you can customize it.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={editor.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        placeholder="About Us"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Slug</Label>
                                    <Input
                                        id="slug"
                                        value={editor.slug}
                                        onChange={(e) => {
                                            setSlugTouched(true);
                                            setEditor((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                                        }}
                                        placeholder="about-us"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="summary">Summary</Label>
                                <Textarea
                                    id="summary"
                                    value={editor.summary}
                                    onChange={(e) => setEditor((prev) => ({ ...prev, summary: e.target.value }))}
                                    placeholder="Short summary for snippets and previews"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Content (Markdown)</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={() => setPreview((prev) => !prev)}>
                                        {preview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                        {preview ? "Edit" : "Preview"}
                                    </Button>
                                </div>
                                {!preview ? (
                                    <MarkdownEditor
                                        value={editor.content_md}
                                        onChange={(next) => setEditor((prev) => ({ ...prev, content_md: next }))}
                                    />
                                ) : (
                                    <div className="max-h-[360px] overflow-auto rounded-md border bg-muted/20 p-4">
                                        <Markdown content={editor.content_md || "*No content*"} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="seo_title">SEO Title</Label>
                                <Input
                                    id="seo_title"
                                    value={editor.seo_title}
                                    onChange={(e) => setEditor((prev) => ({ ...prev, seo_title: e.target.value }))}
                                    placeholder="Optional SEO title"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="seo_description">SEO Description</Label>
                                <Textarea
                                    id="seo_description"
                                    value={editor.seo_description}
                                    onChange={(e) => setEditor((prev) => ({ ...prev, seo_description: e.target.value }))}
                                    placeholder="Optional SEO description"
                                />
                            </div>

                            <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="is_active" className="cursor-pointer">Publish Page</Label>
                                    <Switch
                                        id="is_active"
                                        checked={editor.is_active}
                                        onCheckedChange={(checked) => setEditor((prev) => ({ ...prev, is_active: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show_in_footer" className="cursor-pointer">Show in Footer</Label>
                                    <Switch
                                        id="show_in_footer"
                                        checked={editor.show_in_footer}
                                        onCheckedChange={(checked) => setEditor((prev) => ({ ...prev, show_in_footer: checked }))}
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {editor.id ? "Update Page" : "Create Page"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this page?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently remove the page and its public URL.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => {
                                e.preventDefault();
                                void handleDelete();
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <PageLoadingOverlay
                open={ordering}
                title="Saving page order..."
                description="Please wait while the custom pages order is being updated."
            />
        </div>
    );
}
