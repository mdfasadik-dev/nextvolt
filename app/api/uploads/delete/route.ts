import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Delete a storage object by its public URL (same bucket configured for project).
export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();
        if (typeof url !== 'string' || !url.includes('/storage/v1/object/public/')) {
            return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
        }
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || 'public';
        // Extract path after bucket name
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx === -1) return NextResponse.json({ error: 'URL not in expected bucket' }, { status: 400 });
        const objectPath = url.substring(idx + marker.length);
        const supabase = await createAdminClient();
        const { error } = await supabase.storage.from(bucket).remove([objectPath]);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ removed: objectPath });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
    }
}