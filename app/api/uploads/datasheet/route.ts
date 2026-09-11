import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB max for PDF
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB max for image

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "File missing" }, { status: 400 });
        }

        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const maxAllowed = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;

        if (file.size > maxAllowed) {
            const limitMb = Math.round(maxAllowed / (1024 * 1024));
            return NextResponse.json(
                { error: `File exceeds the ${limitMb} MB limit.` },
                { status: 400 }
            );
        }

        const supabase = await createAdminClient();
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "public";
        const prefix = "datasheets";

        const orig = file.name || "upload";
        const dot = orig.lastIndexOf(".");
        const baseName = dot !== -1 ? orig.slice(0, dot) : orig;
        const ext = dot !== -1 ? orig.slice(dot) : "";
        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "-");
        const objectPath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanBaseName}${ext}`;

        const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
            upsert: false,
            contentType: file.type || (isPdf ? "application/pdf" : "image/webp"),
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        return NextResponse.json({
            path: objectPath,
            publicUrl: pub.publicUrl,
            fileType: isPdf ? "pdf" : "image",
            fileSize: file.size,
        });
    } catch (e: unknown) {
        const message = e && typeof e === "object" && "message" in e ? (e as { message: string }).message : "Unexpected error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
