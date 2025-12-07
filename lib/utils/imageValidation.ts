export const MAX_IMAGE_BYTES = 1_048_576; // 1 MB

// Only enforce size on the client; ratio is advisory in the UI.
export async function ensureImageUnder1MB(file: File): Promise<void> {
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Image must be 1 MB or smaller.');
    }
}
