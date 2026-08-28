"use client";

import { useCallback, useRef, useState } from "react";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import type { AspectRatio, ImageProcessOptions } from "@/lib/utils/imageProcessing";

type CropperOptions = {
    aspectRatio?: AspectRatio;
    processOptions?: ImageProcessOptions;
    title?: string;
    description?: string;
};

/**
 * Central entry point for image uploads.
 *
 * `pick(onReady)` opens the OS file dialog, then the crop window, and hands
 * back a cropped + compressed File. Every upload in the admin goes through
 * here so behaviour (ratio, size limit, compression) is consistent, and no
 * call site needs its own size validation.
 */
export function useImageCropper(options: CropperOptions = {}) {
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [queue, setQueue] = useState<File[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const resolveRef = useRef<((file: File) => void) | null>(null);
    const multipleRef = useRef(false);

    const pick = useCallback((onReady: (file: File) => void) => {
        resolveRef.current = onReady;
        multipleRef.current = false;
        if (inputRef.current) inputRef.current.multiple = false;
        inputRef.current?.click();
    }, []);

    /**
     * Pick several images at once; the crop window is shown for each in turn
     * and `onReady` fires per processed file.
     */
    const pickMany = useCallback((onReady: (file: File) => void) => {
        resolveRef.current = onReady;
        multipleRef.current = true;
        if (inputRef.current) inputRef.current.multiple = true;
        inputRef.current?.click();
    }, []);

    /** Advance to the next queued file, or close. */
    const advance = useCallback(() => {
        setQueue(rest => {
            if (rest.length === 0) {
                setPendingFile(null);
                resolveRef.current = null;
                return rest;
            }
            const [next, ...remaining] = rest;
            setPendingFile(next);
            return remaining;
        });
    }, []);

    /** Route an already-obtained File (drop, paste) through the cropper. */
    const openWithFile = useCallback((file: File, onReady: (file: File) => void) => {
        resolveRef.current = onReady;
        setPendingFile(file);
    }, []);

    const input = (
        <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
                const files = Array.from(event.target.files || []);
                event.target.value = ""; // allow re-picking the same file
                if (!files.length) return;
                const [first, ...rest] = files;
                setPendingFile(first);
                setQueue(rest);
            }}
        />
    );

    const dialog = (
        <ImageCropDialog
            file={pendingFile}
            aspectRatio={options.aspectRatio}
            processOptions={options.processOptions}
            title={options.title}
            description={options.description}
            onCancel={() => {
                // Skip just this image; keep going if more were selected.
                advance();
            }}
            onConfirm={file => {
                resolveRef.current?.(file);
                advance();
            }}
        />
    );

    return {
        pick,
        pickMany,
        openWithFile,
        /** Render both once inside the component that uses the cropper. */
        cropperUi: (
            <>
                {input}
                {dialog}
            </>
        ),
        isCropping: Boolean(pendingFile),
        /** How many images are still waiting to be cropped. */
        queuedCount: queue.length,
    };
}
