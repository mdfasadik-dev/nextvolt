import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Centralized product image upload endpoint (server-side, uses service role)
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'File missing' }, { status: 400 });
        }
        if (file.size > 1048576) {
            return NextResponse.json({ error: 'Image must be 1 MB or smaller.' }, { status: 400 });
        }
        // Ratio is not restricted server-side.
        const supabase = await createAdminClient();
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || 'public';
        const prefix = 'products';

        // Compose filename
        const orig = file.name || 'upload';
        const dot = orig.lastIndexOf('.');
        const baseName = dot !== -1 ? orig.slice(0, dot) : orig;
        const ext = dot !== -1 ? orig.slice(dot) : '';
        let objectPath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}${ext}`.replace(/\s+/g, '-');

        const { error } = await supabase.storage.from(bucket).upload(objectPath, file, { upsert: false });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        return NextResponse.json({ path: objectPath, publicUrl: pub.publicUrl });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
    }
}
