import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DataBackupService } from "@/lib/services/dataBackupService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Backup JSON file is required." }, { status: 400 });
        }

        const text = await file.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
        }

        const summary = await DataBackupService.importAll(parsed);

        revalidatePath("/admin");
        revalidatePath("/admin/categories");
        revalidatePath("/admin/products");
        revalidatePath("/admin/variants");
        revalidatePath("/admin/inventory");
        revalidatePath("/admin/orders");
        revalidatePath("/admin/customers");
        revalidatePath("/admin/promotions");
        revalidatePath("/admin/settings");
        revalidatePath("/admin/coupons");
        revalidatePath("/");

        return NextResponse.json({
            ok: true,
            message: "Backup import completed successfully.",
            summary,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import backup.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

