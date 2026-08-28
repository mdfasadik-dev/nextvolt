"use client";

import Image from "next/image";
import {
    AlignLeft,
    ChevronDown,
    ChevronUp,
    Columns2,
    ImageIcon,
    RectangleHorizontal,
    Trash2,
    Type as TypeIcon,
    Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { cn } from "@/lib/utils";
import { sectionImageSrc, type SectionDraft } from "./builder-types";
import { useImageCropper } from "@/lib/hooks/useImageCropper";
import { IMAGE_PRESETS } from "@/lib/constants/image-presets";
import type { SectionInput } from "../actions";

const LAYOUT_CHOICES: Array<{
    value: SectionInput["layout"];
    label: string;
    icon: typeof RectangleHorizontal;
}> = [
    { value: "full", label: "Full", icon: RectangleHorizontal },
    { value: "left", label: "Left", icon: Columns2 },
    { value: "right", label: "Right", icon: Columns2 },
];

export function SectionInspector({
    section,
    position,
    total,
    onChange,
    onMove,
    onRemove,
}: {
    section: SectionDraft;
    position: number;
    total: number;
    onChange: (patch: Partial<SectionDraft>) => void;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
}) {
    const cropper = useImageCropper(IMAGE_PRESETS.projectSection);

    /**
     * Only stage the cropped file locally — the actual upload happens once,
     * when the project is saved. Keeps abandoned edits from littering storage.
     */
    function handleFile(file: File) {
        if (section.previewUrl) URL.revokeObjectURL(section.previewUrl);
        onChange({ pendingFile: file, previewUrl: URL.createObjectURL(file) });
    }

    const imageSrc = sectionImageSrc(section);
    const hasImage = Boolean(imageSrc);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    {section.kind === "text" ? (
                        <TypeIcon className="h-4 w-4 text-primary" />
                    ) : (
                        <ImageIcon className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm font-semibold">
                        {section.kind === "text" ? "Text block" : "Image block"}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {position + 1} / {total}
                    </span>
                </div>
                <div className="flex items-center gap-0.5">
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Move up"
                        disabled={position === 0}
                        onClick={() => onMove(-1)}
                    >
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Move down"
                        disabled={position === total - 1}
                        onClick={() => onMove(1)}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        title="Delete block"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {/* Type switch */}
                <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Block type</Label>
                    <div className="grid grid-cols-2 gap-1 rounded-md border p-1">
                        <button
                            type="button"
                            onClick={() => onChange({ kind: "text" })}
                            className={cn(
                                "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium",
                                section.kind === "text" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                            )}
                        >
                            <TypeIcon className="h-3.5 w-3.5" /> Text
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ kind: "image" })}
                            className={cn(
                                "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium",
                                section.kind === "image" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                            )}
                        >
                            <ImageIcon className="h-3.5 w-3.5" /> Image
                        </button>
                    </div>
                </div>

                {/* Layout */}
                <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Width</Label>
                    <div className="grid grid-cols-3 gap-1 rounded-md border p-1">
                        {LAYOUT_CHOICES.map(choice => {
                            const active = section.layout === choice.value;
                            return (
                                <button
                                    key={choice.value}
                                    type="button"
                                    onClick={() => onChange({ layout: choice.value })}
                                    className={cn(
                                        "flex flex-col items-center gap-1 rounded px-1 py-2 text-[11px] font-medium",
                                        active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                                    )}
                                >
                                    <LayoutGlyph layout={choice.value} active={active} />
                                    {choice.label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Half-width blocks pair up side by side on desktop and stack on mobile.
                    </p>
                </div>

                {section.kind === "text" ? (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Heading
                            </Label>
                            <Input
                                value={section.heading || ""}
                                onChange={event => onChange({ heading: event.target.value })}
                                placeholder="Optional heading"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                                <AlignLeft className="h-3 w-3" /> Content (markdown)
                            </Label>
                            <MarkdownEditor
                                value={section.content_md || ""}
                                onChange={value => onChange({ content_md: value })}
                                minHeight={220}
                                placeholder="Write the section content…"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Image</Label>
                            {imageSrc ? (
                                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border bg-muted">
                                    <Image
                                        src={imageSrc}
                                        unoptimized
                                        alt={section.image_alt || "Section image"}
                                        fill
                                        sizes="320px"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => cropper.pick(handleFile)}
                                    className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50"
                                >
                                    <Upload className="h-5 w-5" />
                                    Click to upload
                                </button>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => cropper.pick(handleFile)}
                                >
                                    <Upload className="mr-1 h-3.5 w-3.5" />
                                    {hasImage ? "Replace" : "Choose image"}
                                </Button>
                                {hasImage && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive"
                                        onClick={() => {
                                            if (section.previewUrl) URL.revokeObjectURL(section.previewUrl);
                                            onChange({ image_url: null, pendingFile: null, previewUrl: null });
                                        }}
                                    >
                                        Remove
                                    </Button>
                                )}
                                {section.pendingFile && (
                                    <span className="text-[11px] text-muted-foreground">
                                        Will upload on save
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Alt text
                            </Label>
                            <Input
                                value={section.image_alt || ""}
                                onChange={event => onChange({ image_alt: event.target.value })}
                                placeholder="Describes the image for screen readers"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Caption
                            </Label>
                            <Input
                                value={section.caption || ""}
                                onChange={event => onChange({ caption: event.target.value })}
                                placeholder="Optional caption shown under the image"
                            />
                        </div>
                    </>
                )}
            </div>
            {cropper.cropperUi}
        </div>
    );
}

/** Tiny visual glyph showing how the block sits in the row. */
function LayoutGlyph({ layout, active }: { layout: SectionInput["layout"]; active: boolean }) {
    const fill = active ? "bg-primary-foreground" : "bg-foreground/70";
    const ghost = active ? "bg-primary-foreground/30" : "bg-foreground/15";
    return (
        <span className="flex h-3 w-7 gap-0.5">
            {layout === "full" ? (
                <span className={cn("h-full w-full rounded-[2px]", fill)} />
            ) : (
                <>
                    <span className={cn("h-full w-1/2 rounded-[2px]", layout === "left" ? fill : ghost)} />
                    <span className={cn("h-full w-1/2 rounded-[2px]", layout === "right" ? fill : ghost)} />
                </>
            )}
        </span>
    );
}
