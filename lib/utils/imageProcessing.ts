export const MAX_IMAGE_BYTES = 1_048_576; // 1 MB — the server-side cap

/** Aspect ratio presets used across the admin. `null` = free-form. */
export type AspectRatio = number | null;

export type ImageProcessOptions = {
    /** Longest edge of the output, in px. Larger images are scaled down. */
    maxDimension?: number;
    /** Hard byte ceiling for the produced file. */
    maxBytes?: number;
    /** Output mime. PNG/transparent sources fall back to PNG when needed. */
    mimeType?: "image/jpeg" | "image/webp" | "image/png";
    /** Starting quality for lossy encoders. */
    quality?: number;
};

export type CropRect = { x: number; y: number; width: number; height: number };

const DEFAULTS: Required<ImageProcessOptions> = {
    maxDimension: 1600,
    maxBytes: MAX_IMAGE_BYTES,
    mimeType: "image/webp",
    quality: 0.9,
};

/** Read a File into an HTMLImageElement via object URL. */
export function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read that image file."));
        };
        img.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function replaceExtension(name: string, mime: string) {
    const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
    const dot = name.lastIndexOf(".");
    const base = dot === -1 ? name : name.slice(0, dot);
    return `${base || "image"}.${ext}`;
}

/**
 * Crop, downscale and compress an image entirely in the browser.
 *
 * Quality is stepped down, then dimensions, until the result fits under
 * `maxBytes` — so an oversized upload is fixed automatically instead of
 * being rejected. Returns a File ready to hand to the upload endpoint.
 */
export async function processImage(
    source: File,
    crop: CropRect | null,
    options: ImageProcessOptions = {},
): Promise<File> {
    const opts = { ...DEFAULTS, ...options };
    const img = await loadImageElement(source);

    const area: CropRect = crop ?? {
        x: 0,
        y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
    };

    // Never upscale: cap the output at the cropped region's own size.
    const longestEdge = Math.max(area.width, area.height);
    let scale = longestEdge > opts.maxDimension ? opts.maxDimension / longestEdge : 1;

    // A transparent source must stay PNG or the alpha turns black.
    const wantsAlpha = source.type === "image/png" || source.type === "image/gif";
    let mime = opts.mimeType === "image/jpeg" && wantsAlpha ? "image/png" : opts.mimeType;

    let quality = opts.quality;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 12; attempt++) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(area.width * scale));
        canvas.height = Math.max(1, Math.round(area.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is not available in this browser.");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
            img,
            area.x, area.y, area.width, area.height,
            0, 0, canvas.width, canvas.height,
        );

        blob = await canvasToBlob(canvas, mime, quality);
        if (!blob) throw new Error("Could not encode the image.");
        if (blob.size <= opts.maxBytes) break;

        // Shed quality first (cheap), then resolution once quality bottoms out.
        if (mime !== "image/png" && quality > 0.4) {
            quality = Math.max(0.4, quality - 0.15);
        } else if (mime === "image/png") {
            // PNG ignores quality, so go straight to WebP for real savings.
            mime = "image/webp";
            quality = 0.85;
        } else {
            scale *= 0.8;
        }
    }

    if (!blob) throw new Error("Could not process the image.");
    if (blob.size > opts.maxBytes) {
        throw new Error("This image could not be compressed below the size limit. Try a smaller image.");
    }

    return new File([blob], replaceExtension(source.name || "image", mime), {
        type: mime,
        lastModified: Date.now(),
    });
}

/** Largest centered rect of the given ratio that fits inside the image. */
export function centeredCropForRatio(
    width: number,
    height: number,
    ratio: AspectRatio,
): CropRect {
    if (!ratio) return { x: 0, y: 0, width, height };
    const current = width / height;
    if (current > ratio) {
        const w = height * ratio;
        return { x: (width - w) / 2, y: 0, width: w, height };
    }
    const h = width / ratio;
    return { x: 0, y: (height - h) / 2, width, height: h };
}

export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
