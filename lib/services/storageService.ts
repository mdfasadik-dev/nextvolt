import { createClient as createBrowserClient } from '@/lib/supabase/client';

export class StorageService {

    static async uploadPublic(options: {
        bucket: string;
        file: File | Blob;
        filename?: string;
        prefix?: string;
        dedupe?: boolean;
    }): Promise<{ path: string; publicUrl: string }> {

        const { bucket, file, filename, prefix = '', dedupe = true } = options;
        const supabase = createBrowserClient();

        // Derive filename
        let base = filename || (file instanceof File ? file.name : `upload-${Date.now()}`);
        if (!base.includes('.')) {
            const ext = (file instanceof File ? file.type : '')?.split('/')[1];
            if (ext) base += `.${ext}`;
        }

        let objectPath = prefix ? `${prefix.replace(/\/$/, '')}/${base}` : base;


        if (dedupe) {
            let attempt = 0;
            while (attempt < 5) {
                const { data: existsCheck } = await supabase.storage.from(bucket).list(prefix || undefined, { search: base });
                const exists = existsCheck?.some(o => (prefix ? `${prefix.replace(/\/$/, '')}/${o.name}` : o.name) === objectPath);
                if (!exists) break;
                const dot = base.lastIndexOf('.');
                const name = dot !== -1 ? base.slice(0, dot) : base;
                const ext = dot !== -1 ? base.slice(dot) : '';
                base = `${name}-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
                objectPath = prefix ? `${prefix.replace(/\/$/, '')}/${base}` : base;
                attempt++;
            }
        }

        const { error } = await supabase.storage.from(bucket).upload(objectPath, file, { upsert: !dedupe });
        if (error) throw error;

        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        const publicUrl = pub.publicUrl;
        // eslint-disable-next-line no-console
        console.log('[StorageService] uploaded', { path: objectPath, publicUrl });
        return { path: objectPath, publicUrl };
    }


    static async uploadProductImage(file: File): Promise<{ publicUrl: string; path: string }> {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/uploads/product', { method: 'POST', body: fd });
        if (!res.ok) {
            let msg = 'Upload failed';
            try { const j = await res.json(); msg = j.error || msg; } catch { /* ignore */ }
            throw new Error(msg);
        }
        const data = await res.json();
        return data;
    }

    static async uploadEntityImage(type: 'products' | 'categories' | 'variants', file: File): Promise<{ publicUrl: string; path: string }> {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/uploads/entity?type=${encodeURIComponent(type)}`, { method: 'POST', body: fd });
        if (!res.ok) {
            let msg = 'Upload failed';
            try { const j = await res.json(); msg = j.error || msg; } catch { /* ignore */ }
            throw new Error(msg);
        }
        return res.json();
    }
}
