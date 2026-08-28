"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    centeredCropForRatio,
    formatBytes,
    loadImageElement,
    processImage,
    type AspectRatio,
    type CropRect,
    type ImageProcessOptions,
} from "@/lib/utils/imageProcessing";

interface ImageCropDialogProps {
    file: File | null;
    /** Fixed to how the image renders publicly; not user-selectable. */
    aspectRatio?: AspectRatio;
    processOptions?: ImageProcessOptions;
    title?: string;
    description?: string;
    onCancel: () => void;
    onConfirm: (file: File) => void;
}

/**
 * Crop + compress dialog shown for every image upload.
 *
 * The user pans/zooms the source under a fixed frame; on confirm the visible
 * region is rendered to a canvas and compressed until it fits the byte limit,
 * so oversized uploads are fixed rather than rejected.
 */
export function ImageCropDialog({
    file,
    aspectRatio = 1,
    processOptions,
    title = "Crop image",
    description = "Drag to reposition and zoom to frame the image. It is compressed automatically.",
    onCancel,
    onConfirm,
}: ImageCropDialogProps) {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    // Separate from the decoded element: loadImageElement revokes its own URL
    // as soon as decoding finishes, so the preview needs a URL we control.
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [viewport, setViewport] = useState({ width: 1024, height: 768 });
    const [contentWidth, setContentWidth] = useState<number | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const frameRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

    useEffect(() => {
        const sync = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        sync();
        window.addEventListener("resize", sync);
        return () => window.removeEventListener("resize", sync);
    }, []);

    // Track the dialog's usable width so the frame is bounded by the dialog,
    // not by the window.
    useEffect(() => {
        const node = contentRef.current;
        if (!node) return;
        const apply = () => setContentWidth(node.clientWidth);
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(node);
        return () => observer.disconnect();
    }, [file]);

    // Load the picked file and reset the view.
    useEffect(() => {
        let cancelled = false;
        if (!file) {
            setImage(null);
            setObjectUrl(null);
            return;
        }
        setError(null);
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        loadImageElement(file)
            .then(img => {
                if (cancelled) return;
                setImage(img);
                setZoom(1);
                setOffset({ x: 0, y: 0 });
            })
            .catch(err => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Could not read image");
            });
        return () => {
            cancelled = true;
            URL.revokeObjectURL(url);
        };
    }, [file]);

    /**
     * Base scale makes the image *cover* the frame at zoom 1, so there is
     * never an empty gap inside the crop area.
     */
    const frameRatio = aspectRatio ?? (image ? image.naturalWidth / image.naturalHeight : 1);

    /**
     * Size the crop frame to fit inside both a width and a height budget while
     * keeping its aspect ratio exactly. Relying on `aspect-ratio` + `max-height`
     * alone distorts tall ratios, because the height gets clamped while the
     * width stays put.
     */
    const frameSize = (() => {
        // Width budget is the dialog's actual inner width once it has mounted,
        // so a wide ratio can never push past the dialog and scroll the page.
        // Falls back to the viewport estimate on the very first render.
        const fallbackW = Math.min(512, viewport.width - 96);
        const maxW = Math.max(160, contentWidth ?? fallbackW);
        // No lower clamp on height: forcing a minimum would distort the ratio
        // on very short viewports. The dialog scrolls instead.
        const maxH = viewport.height * 0.46;

        // Fit the ratio inside BOTH budgets — scaling by whichever is tighter
        // keeps the aspect ratio exact instead of letting one axis overflow.
        const scale = Math.min(maxW / frameRatio, maxH);
        return { width: Math.round(scale * frameRatio), height: Math.round(scale) };
    })();

    const frameStyle = { width: `${frameSize.width}px`, height: `${frameSize.height}px` };

    /**
     * Draw the image at exactly the size the crop math assumes: scaled to
     * *cover* the frame, then multiplied by zoom.
     *
     * Using width/height 100% + object-fit here would make the browser
     * pre-crop the image to the frame, so dragging would slide an
     * already-cropped box around and expose empty gaps — while computeCrop()
     * still reasoned about the full image. Sizing it explicitly keeps what the
     * user sees and what gets cropped in agreement.
     */
    const imageStyle = (() => {
        if (!image) return undefined;
        const base = Math.max(
            frameSize.width / image.naturalWidth,
            frameSize.height / image.naturalHeight,
        );
        const effective = base * zoom;
        return {
            width: `${image.naturalWidth * effective}px`,
            height: `${image.naturalHeight * effective}px`,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        };
    })();

    const clampOffset = useCallback(
        (next: { x: number; y: number }, currentZoom: number) => {
            if (!image) return next;
            // Use the computed frame size, not the DOM node, so clamping never
            // reads a stale layout mid-render.
            const fw = frameSize.width;
            const fh = frameSize.height;
            const base = Math.max(fw / image.naturalWidth, fh / image.naturalHeight);
            const dw = image.naturalWidth * base * currentZoom;
            const dh = image.naturalHeight * base * currentZoom;
            const maxX = Math.max(0, (dw - fw) / 2);
            const maxY = Math.max(0, (dh - fh) / 2);
            return {
                x: Math.min(maxX, Math.max(-maxX, next.x)),
                y: Math.min(maxY, Math.max(-maxY, next.y)),
            };
        },
        [image, frameSize.width, frameSize.height],
    );

    useEffect(() => {
        setOffset(current => clampOffset(current, zoom));
    }, [zoom, frameRatio, clampOffset]);

    function onPointerDown(event: React.PointerEvent) {
        if (!image) return;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    }
    function onPointerMove(event: React.PointerEvent) {
        const drag = dragRef.current;
        if (!drag) return;
        setOffset(
            clampOffset(
                { x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) },
                zoom,
            ),
        );
    }
    function endDrag() {
        dragRef.current = null;
    }

    /** Map the on-screen frame back to source pixels. */
    function computeCrop(): CropRect | null {
        if (!image) return null;
        const fw = frameSize.width;
        const fh = frameSize.height;
        const base = Math.max(fw / image.naturalWidth, fh / image.naturalHeight);
        const effective = base * zoom;
        const dw = image.naturalWidth * effective;
        const dh = image.naturalHeight * effective;
        // Top-left of the drawn image relative to the frame.
        const left = (fw - dw) / 2 + offset.x;
        const top = (fh - dh) / 2 + offset.y;
        const sx = Math.max(0, -left / effective);
        const sy = Math.max(0, -top / effective);
        const sw = Math.min(image.naturalWidth - sx, fw / effective);
        const sh = Math.min(image.naturalHeight - sy, fh / effective);
        return { x: sx, y: sy, width: sw, height: sh };
    }

    async function confirm() {
        if (!file || !image) return;
        setBusy(true);
        setError(null);
        try {
            const crop = computeCrop() ?? centeredCropForRatio(image.naturalWidth, image.naturalHeight, aspectRatio);
            const output = await processImage(file, crop, processOptions);
            onConfirm(output);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not process the image");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={Boolean(file)} onOpenChange={open => !open && !busy && onCancel()}>
            <DialogContent className="!flex max-h-[90dvh] !max-w-2xl min-w-0 !flex-col overflow-x-hidden overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>


                <div ref={contentRef} className="min-w-0 space-y-3">
                    <div
                        ref={frameRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        onPointerLeave={endDrag}
                        className="relative mx-auto shrink-0 touch-none select-none overflow-hidden rounded-lg border bg-muted"
                        style={frameStyle}
                    >
                        {image && objectUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={objectUrl}
                                alt="Crop preview"
                                draggable={false}
                                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                                style={imageStyle}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                {error || "Loading image…"}
                            </div>
                        )}
                        {/* rule-of-thirds guides */}
                        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="border border-white/20" />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                            type="range"
                            min={1}
                            max={4}
                            step={0.01}
                            value={zoom}
                            onChange={event => setZoom(Number(event.target.value))}
                            aria-label="Zoom"
                            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted-foreground/25 accent-primary"
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            title="Reset"
                            onClick={() => {
                                setZoom(1);
                                setOffset({ x: 0, y: 0 });
                            }}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {file && (
                        <p className="text-[11px] text-muted-foreground">
                            Original: {file.name} · {formatBytes(file.size)}
                            {image ? ` · ${image.naturalWidth}×${image.naturalHeight}` : ""}
                        </p>
                    )}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                    <Button onClick={confirm} disabled={!image || busy}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {busy ? "Processing…" : "Apply"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
