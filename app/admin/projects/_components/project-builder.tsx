"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Eye,
    ImageIcon,
    Loader2,
    Monitor,
    Pencil,
    Plus,
    Save,
    Settings2,
    Smartphone,
    Star,
    Trash2,
    Type as TypeIcon,
    Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/ui/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StorageService } from "@/lib/services/storageService";
import { cn } from "@/lib/utils";
import type { ProjectWithSections } from "@/lib/services/projectService";
import { createProject, updateProject, type ProjectInput } from "../actions";
import { SectionInspector } from "./section-inspector";
import {
    buildRows,
    isSectionComplete,
    makeSection,
    type SectionDraft,
} from "./builder-types";

type Meta = {
    title: string;
    slug: string;
    summary: string;
    cover_image_url: string;
    client_name: string;
    location: string;
    completed_at: string;
    is_featured: boolean;
    is_active: boolean;
    seo_title: string;
    seo_description: string;
};

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export function ProjectBuilder({ project }: { project: ProjectWithSections | null }) {
    const router = useRouter();
    const toast = useToast();
    const [isPending, startTransition] = useTransition();

    const [meta, setMeta] = useState<Meta>({
        title: project?.title || "",
        slug: project?.slug || "",
        summary: project?.summary || "",
        cover_image_url: project?.cover_image_url || "",
        client_name: project?.client_name || "",
        location: project?.location || "",
        completed_at: project?.completed_at || "",
        is_featured: project?.is_featured ?? false,
        is_active: project?.is_active ?? true,
        seo_title: project?.seo_title || "",
        seo_description: project?.seo_description || "",
    });

    const [sections, setSections] = useState<SectionDraft[]>(
        () =>
            project?.project_sections.map(section => ({
                key: section.id,
                kind: section.kind,
                layout: section.layout,
                heading: section.heading,
                content_md: section.content_md,
                image_url: section.image_url,
                image_alt: section.image_alt,
                caption: section.caption,
            })) ?? [],
    );

    const [selectedKey, setSelectedKey] = useState<string | null>(sections[0]?.key ?? null);
    const [panel, setPanel] = useState<"block" | "settings">(sections.length ? "block" : "settings");
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [coverUploading, setCoverUploading] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const coverRef = useRef<HTMLInputElement | null>(null);
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const headerRef = useRef<HTMLElement | null>(null);

    const selectedIndex = sections.findIndex(section => section.key === selectedKey);
    const selected = selectedIndex >= 0 ? sections[selectedIndex] : null;
    const rows = useMemo(() => buildRows(sections), [sections]);
    const incompleteCount = sections.filter(section => !isSectionComplete(section)).length;

    // Warn before losing unsaved edits.
    useEffect(() => {
        if (!dirty) return;
        function onBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
            event.returnValue = "";
        }
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty]);

    useEffect(() => {
        const header = headerRef.current;
        const root = rootRef.current;
        if (!header || !root) return;
        const apply = () => {
            root.style.setProperty("--builder-header-h", `${header.offsetHeight}px`);
        };
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!editingTitle) return;
        const input = titleInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
    }, [editingTitle]);

    const patchMeta = useCallback((patch: Partial<Meta>) => {
        setMeta(current => ({ ...current, ...patch }));
        setDirty(true);
    }, []);

    const patchSection = useCallback((index: number, patch: Partial<SectionDraft>) => {
        setSections(current => current.map((section, i) => (i === index ? { ...section, ...patch } : section)));
        setDirty(true);
    }, []);

    function addSection(kind: "text" | "image", layout: SectionDraft["layout"] = "full") {
        const section = makeSection(kind, layout);
        setSections(current => [...current, section]);
        setSelectedKey(section.key);
        setPanel("block");
        setDirty(true);
    }

    function moveSection(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= sections.length) return;
        setSections(current => {
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        setDirty(true);
    }

    function removeSection(key: string) {
        setSections(current => {
            const next = current.filter(section => section.key !== key);
            if (selectedKey === key) setSelectedKey(next[0]?.key ?? null);
            return next;
        });
        setConfirmDelete(null);
        setDirty(true);
    }

    async function uploadCover(file: File) {
        setCoverUploading(true);
        try {
            const { publicUrl } = await StorageService.uploadEntityImage("projects", file);
            patchMeta({ cover_image_url: publicUrl });
            toast.push({ variant: "success", title: "Cover uploaded" });
        } catch (error) {
            toast.push({ variant: "error", title: errorMessage(error, "Upload failed") });
        } finally {
            setCoverUploading(false);
            if (coverRef.current) coverRef.current.value = "";
        }
    }

    function save() {
        if (!meta.title.trim()) {
            toast.push({ variant: "error", title: "Add a project title before saving" });
            setPanel("settings");
            return;
        }
        startTransition(async () => {
            try {
                const payload: ProjectInput = {
                    title: meta.title.trim(),
                    slug: meta.slug.trim() || null,
                    summary: meta.summary.trim() || null,
                    cover_image_url: meta.cover_image_url || null,
                    client_name: meta.client_name.trim() || null,
                    location: meta.location.trim() || null,
                    completed_at: meta.completed_at || null,
                    is_featured: meta.is_featured,
                    is_active: meta.is_active,
                    seo_title: meta.seo_title.trim() || null,
                    seo_description: meta.seo_description.trim() || null,
                    sections: sections.map(section => ({
                        kind: section.kind,
                        layout: section.layout,
                        heading: section.heading,
                        content_md: section.content_md,
                        image_url: section.image_url,
                        image_alt: section.image_alt,
                        caption: section.caption,
                    })),
                };
                if (project) {
                    await updateProject(project.id, payload);
                } else {
                    await createProject(payload);
                }
                setDirty(false);
                toast.push({
                    variant: incompleteCount ? "warning" : "success",
                    title: project ? "Project saved" : "Project created",
                    description: incompleteCount
                        ? `${incompleteCount} empty block(s) were skipped.`
                        : undefined,
                });
                router.push("/admin/projects");
                router.refresh();
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Could not save project") });
            }
        });
    }

    return (
        <div
            ref={rootRef}
            className="-m-4 flex min-h-screen flex-col md:-m-6 lg:-m-8"
        >
            {/* Toolbar */}
            <header
                ref={headerRef}
                className="sticky -top-4 z-30 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:-top-6 md:px-6 lg:-top-8"
            >
                <Link
                    href="/admin/projects"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Projects
                </Link>
                <div className="min-w-0 flex-1">
                    {editingTitle ? (
                        <input
                            ref={titleInputRef}
                            value={meta.title}
                            onChange={event => patchMeta({ title: event.target.value })}
                            onBlur={() => setEditingTitle(false)}
                            onKeyDown={event => {
                                if (event.key === "Enter" || event.key === "Escape") {
                                    event.preventDefault();
                                    setEditingTitle(false);
                                }
                            }}
                            placeholder="Untitled project"
                            aria-label="Project title"
                            className="w-full max-w-md rounded border border-primary bg-background px-2 py-0.5 text-sm font-semibold outline-none"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setEditingTitle(true)}
                            title="Click to rename"
                            className="group/title flex max-w-full items-center gap-1.5 rounded px-2 py-0.5 -ml-2 text-left hover:bg-muted"
                        >
                            <span className="truncate text-sm font-semibold">
                                {meta.title.trim() || "Untitled project"}
                            </span>
                            <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
                        </button>
                    )}
                    <p className="truncate px-2 -ml-2 text-[11px] text-muted-foreground">
                        /projects/{meta.slug.trim() || slugify(meta.title) || "…"}
                        {dirty ? " · unsaved changes" : ""}
                    </p>
                </div>

                <div className="flex items-center gap-1 rounded-md border p-0.5">
                    <button
                        type="button"
                        title="Desktop preview"
                        onClick={() => setPreviewMode("desktop")}
                        className={cn(
                            "rounded p-1.5",
                            previewMode === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                    >
                        <Monitor className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        title="Mobile preview"
                        onClick={() => setPreviewMode("mobile")}
                        className={cn(
                            "rounded p-1.5",
                            previewMode === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                    >
                        <Smartphone className="h-4 w-4" />
                    </button>
                </div>

                {project && meta.is_active && (
                    <Link
                        href={`/projects/${project.slug}`}
                        target="_blank"
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"
                    >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">View live</span>
                    </Link>
                )}
                <Button onClick={save} disabled={isPending}>
                    {isPending ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-1.5 h-4 w-4" />
                    )}
                    Save
                </Button>
            </header>

            <div className="flex flex-1 flex-col lg:flex-row">
                {/* Canvas */}
                <div className="min-w-0 flex-1 bg-muted/30 p-4 pt-6 md:p-8 md:pt-8">
                    <div
                        className={cn(
                            "mx-auto rounded-xl border bg-background shadow-sm transition-all",
                            previewMode === "mobile" ? "max-w-sm" : "max-w-4xl",
                        )}
                    >
                        {/* Cover preview */}
                        <div className="border-b p-5">
                            {meta.cover_image_url ? (
                                <div className="relative aspect-[16/7] w-full overflow-hidden rounded-lg bg-muted">
                                    <Image
                                        src={meta.cover_image_url}
                                        alt={meta.title || "Cover"}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 720px"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setPanel("settings")}
                                    className="flex aspect-[16/7] w-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/40"
                                >
                                    Add a cover image in Settings
                                </button>
                            )}
                            <h1 className="mt-4 text-2xl font-bold tracking-tight">
                                {meta.title.trim() || "Untitled project"}
                            </h1>
                            {meta.summary.trim() && (
                                <p className="mt-1 text-sm text-muted-foreground">{meta.summary}</p>
                            )}
                        </div>

                        {/* Section canvas */}
                        <div className="space-y-4 p-5">
                            {sections.length === 0 ? (
                                <div className="rounded-lg border border-dashed py-16 text-center">
                                    <p className="text-sm font-medium">Start building your project page</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Add a text or image block to begin.
                                    </p>
                                    <div className="mt-4 flex justify-center gap-2">
                                        <Button type="button" size="sm" variant="outline" onClick={() => addSection("text")}>
                                            <TypeIcon className="mr-1 h-3.5 w-3.5" /> Text block
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => addSection("image")}>
                                            <ImageIcon className="mr-1 h-3.5 w-3.5" /> Image block
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                rows.map((row, rowIndex) => (
                                    <div
                                        key={`row-${rowIndex}`}
                                        className={cn(
                                            "gap-4",
                                            row.type === "split" && previewMode === "desktop"
                                                ? "grid md:grid-cols-2"
                                                : "grid grid-cols-1",
                                        )}
                                    >
                                        {row.type === "full" ? (
                                            <CanvasBlock
                                                section={row.section}
                                                index={row.indexes[0]}
                                                selected={row.section.key === selectedKey}
                                                onSelect={() => {
                                                    setSelectedKey(row.section.key);
                                                    setPanel("block");
                                                }}
                                                onDelete={() => setConfirmDelete(row.section.key)}
                                            />
                                        ) : (
                                            <>
                                                <SlotOrPlaceholder
                                                    section={row.left}
                                                    index={row.left ? sections.indexOf(row.left) : -1}
                                                    side="left"
                                                    selectedKey={selectedKey}
                                                    onSelect={key => {
                                                        setSelectedKey(key);
                                                        setPanel("block");
                                                    }}
                                                    onDelete={key => setConfirmDelete(key)}
                                                    onAdd={() => addSection("text", "left")}
                                                />
                                                <SlotOrPlaceholder
                                                    section={row.right}
                                                    index={row.right ? sections.indexOf(row.right) : -1}
                                                    side="right"
                                                    selectedKey={selectedKey}
                                                    onSelect={key => {
                                                        setSelectedKey(key);
                                                        setPanel("block");
                                                    }}
                                                    onDelete={key => setConfirmDelete(key)}
                                                    onAdd={() => addSection("text", "right")}
                                                />
                                            </>
                                        )}
                                    </div>
                                ))
                            )}

                            {sections.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-2 border-t pt-4">
                                    <Button type="button" size="sm" variant="outline" onClick={() => addSection("text")}>
                                        <Plus className="mr-1 h-3.5 w-3.5" /> Text
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => addSection("image")}>
                                        <Plus className="mr-1 h-3.5 w-3.5" /> Image
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            addSection("image", "left");
                                            addSection("text", "right");
                                        }}
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" /> Two columns
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right panel */}
                <aside className="w-full shrink-0 border-t bg-background lg:w-[360px] lg:border-l lg:border-t-0">
                    <div className="flex flex-col lg:sticky lg:top-[var(--builder-header-h,4rem)] lg:h-[calc(100vh-var(--builder-header-h,4rem))]">
                        <div className="grid shrink-0 grid-cols-2 gap-1 border-b p-2 pt-3 lg:pt-4">
                            <button
                                type="button"
                                onClick={() => setPanel("block")}
                                disabled={!selected}
                                className={cn(
                                    "rounded px-2 py-1.5 text-xs font-medium disabled:opacity-40",
                                    panel === "block" && selected
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted",
                                )}
                            >
                                Block
                            </button>
                            <button
                                type="button"
                                onClick={() => setPanel("settings")}
                                className={cn(
                                    "inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium",
                                    panel === "settings" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                                )}
                            >
                                <Settings2 className="h-3.5 w-3.5" /> Settings
                            </button>
                        </div>

                        {panel === "block" && selected ? (
                            <SectionInspector
                                key={selected.key}
                                section={selected}
                                position={selectedIndex}
                                total={sections.length}
                                onChange={patch => patchSection(selectedIndex, patch)}
                                onMove={direction => moveSection(selectedIndex, direction)}
                                onRemove={() => setConfirmDelete(selected.key)}
                            />
                        ) : (
                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Title
                                    </Label>
                                    <Input
                                        value={meta.title}
                                        onChange={event => patchMeta({ title: event.target.value })}
                                        placeholder="Solar rooftop, Gulshan"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Slug
                                    </Label>
                                    <Input
                                        value={meta.slug}
                                        onChange={event => patchMeta({ slug: event.target.value })}
                                        placeholder="Auto-generated from title"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Summary
                                    </Label>
                                    <Textarea
                                        rows={3}
                                        value={meta.summary}
                                        onChange={event => patchMeta({ summary: event.target.value })}
                                        placeholder="Short excerpt shown on project cards"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Cover image
                                    </Label>
                                    <input
                                        ref={coverRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={event => {
                                            const file = event.target.files?.[0];
                                            if (file) void uploadCover(file);
                                        }}
                                    />
                                    {meta.cover_image_url ? (
                                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
                                            <Image
                                                src={meta.cover_image_url}
                                                alt="Cover"
                                                fill
                                                sizes="320px"
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => coverRef.current?.click()}
                                            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50"
                                        >
                                            <Upload className="h-5 w-5" />
                                            Click to upload
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={coverUploading}
                                            onClick={() => coverRef.current?.click()}
                                        >
                                            {coverUploading ? (
                                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Upload className="mr-1 h-3.5 w-3.5" />
                                            )}
                                            {meta.cover_image_url ? "Replace" : "Upload"}
                                        </Button>
                                        {meta.cover_image_url && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => patchMeta({ cover_image_url: "" })}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            Client
                                        </Label>
                                        <Input
                                            value={meta.client_name}
                                            onChange={event => patchMeta({ client_name: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            Location
                                        </Label>
                                        <Input
                                            value={meta.location}
                                            onChange={event => patchMeta({ location: event.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Completed on
                                    </Label>
                                    <Input
                                        type="date"
                                        value={meta.completed_at}
                                        onChange={event => patchMeta({ completed_at: event.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        SEO title
                                    </Label>
                                    <Input
                                        value={meta.seo_title}
                                        onChange={event => patchMeta({ seo_title: event.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        SEO description
                                    </Label>
                                    <Textarea
                                        rows={2}
                                        value={meta.seo_description}
                                        onChange={event => patchMeta({ seo_description: event.target.value })}
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <div className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-amber-500" />
                                        <div>
                                            <p className="text-sm font-medium">Featured</p>
                                            <p className="text-[11px] text-muted-foreground">Show on home page</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={meta.is_featured}
                                        onCheckedChange={checked => patchMeta({ is_featured: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <p className="text-sm font-medium">Published</p>
                                        <p className="text-[11px] text-muted-foreground">Visible on public site</p>
                                    </div>
                                    <Switch
                                        checked={meta.is_active}
                                        onCheckedChange={checked => patchMeta({ is_active: checked })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            <ConfirmDialog
                open={Boolean(confirmDelete)}
                title="Delete this block?"
                description="The block and its content will be removed from this project."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => confirmDelete && removeSection(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}

function SlotOrPlaceholder({
    section,
    index,
    side,
    selectedKey,
    onSelect,
    onDelete,
    onAdd,
}: {
    section: SectionDraft | null;
    index: number;
    side: "left" | "right";
    selectedKey: string | null;
    onSelect: (key: string) => void;
    onDelete: (key: string) => void;
    onAdd: () => void;
}) {
    if (!section) {
        return (
            <button
                type="button"
                onClick={onAdd}
                className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/40"
            >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add {side} block
            </button>
        );
    }
    return (
        <CanvasBlock
            section={section}
            index={index}
            selected={section.key === selectedKey}
            onSelect={() => onSelect(section.key)}
            onDelete={() => onDelete(section.key)}
        />
    );
}

/** One block as it appears on the canvas: real content, click to select. */
function CanvasBlock({
    section,
    index,
    selected,
    onSelect,
    onDelete,
}: {
    section: SectionDraft;
    index: number;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}) {
    const complete = isSectionComplete(section);
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
            className={cn(
                "group relative cursor-pointer rounded-lg border p-4 transition-colors",
                selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/40",
                !complete && "border-dashed bg-muted/20",
            )}
        >
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    #{index + 1} {section.kind}
                </span>
                <button
                    type="button"
                    title="Delete block"
                    onClick={event => {
                        event.stopPropagation();
                        onDelete();
                    }}
                    className="rounded bg-background/90 p-1 text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            {section.kind === "image" ? (
                section.image_url ? (
                    <figure className="space-y-1.5">
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-muted">
                            <Image
                                src={section.image_url}
                                alt={section.image_alt || ""}
                                fill
                                sizes="(max-width: 768px) 100vw, 400px"
                                className="object-cover"
                            />
                        </div>
                        {section.caption && (
                            <figcaption className="text-[11px] text-muted-foreground">{section.caption}</figcaption>
                        )}
                    </figure>
                ) : (
                    <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                        Click to add an image
                    </div>
                )
            ) : section.content_md && section.content_md.trim() ? (
                <div>
                    {section.heading && (
                        <h2 className="mb-2 text-lg font-bold tracking-tight">{section.heading}</h2>
                    )}
                    <Markdown content={section.content_md} />
                </div>
            ) : (
                <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                    <TypeIcon className="h-5 w-5" />
                    Click to write content
                </div>
            )}
        </div>
    );
}
