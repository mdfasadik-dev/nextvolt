import { useState, useEffect } from 'react';
import { StorageService } from '@/lib/services/storageService';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';

interface UseImageUploadOptions {
    bucketName?: string;
    existingImageUrl?: string | null;
    onUploadComplete?: (url: string) => void;
}

export function useImageUpload({ existingImageUrl, onUploadComplete }: UseImageUploadOptions = {}) {
    const [pickedFile, setPickedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (existingImageUrl) {
            setPreviewUrl(existingImageUrl);
        }
    }, [existingImageUrl]);

    // Manage preview URL lifecycle
    useEffect(() => {
        if (pickedFile) {
            const url = URL.createObjectURL(pickedFile);
            setPreviewUrl(url);
            return () => { URL.revokeObjectURL(url); };
        }
    }, [pickedFile]);

    const handleFileSelect = (file: File) => {
        setError(null);
        ensureImageUnder1MB(file)
            .then(() => {
                setPickedFile(file);
            })
            .catch((err: any) => {
                setError(err?.message || 'Invalid image. Must be under 1 MB.');
                setPickedFile(null);
            });
    };

    const upload = async (): Promise<string | null> => {
        if (!pickedFile) return existingImageUrl || null;

        setUploading(true);
        setError(null);

        try {
            // Defaults to 'products' bucket in StorageService for now, can be parameterized if needed
            const { publicUrl } = await StorageService.uploadProductImage(pickedFile);

            if (onUploadComplete) {
                onUploadComplete(publicUrl);
            }

            // Delete old image if it was replaced and is different
            // Note: This logic might need to be handled by the caller or refine strictness 
            // to avoid deleting shared images. For now, we return the new URL.

            return publicUrl;
        } catch (err: any) {
            setError(err.message || 'Upload failed');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const reset = () => {
        setPickedFile(null);
        setPreviewUrl(existingImageUrl || null);
        setError(null);
        setUploading(false);
    };

    return {
        pickedFile,
        previewUrl,
        uploading,
        error,
        handleFileSelect,
        upload,
        reset,
        setPreviewUrl, // Allow manual override if needed
    };
}
