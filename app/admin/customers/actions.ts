"use server";

import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CustomerService } from "@/lib/services/customerService";

async function assertAuthenticated() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }
}

export async function listCustomersPaged(params: {
    page?: number;
    pageSize?: number;
    search?: string;
} = {}) {
    noStore();
    await assertAuthenticated();
    return CustomerService.listPaged(params);
}

