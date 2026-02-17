import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DataBackupService } from "@/lib/services/dataBackupService";

export const runtime = "nodejs";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const backup = await DataBackupService.exportAll();
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

        return new NextResponse(JSON.stringify(backup, null, 2), {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": `attachment; filename="backup-${timestamp}.json"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to export backup";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

