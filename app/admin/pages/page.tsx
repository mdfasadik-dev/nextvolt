import { ContentPageService } from "@/lib/services/contentPageService";
import { PagesClient } from "./_components/pages-client";

export const revalidate = 0;

export default async function AdminPagesPage() {
    const pages = await ContentPageService.listAdmin();
    return <PagesClient initialPages={pages} />;
}
