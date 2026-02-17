import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { ContentPageService } from "@/lib/services/contentPageService";
import { buildPageMetadata } from "@/lib/seo";

type RouteParams = { slug: string };
type PublicContentPageProps = { params: Promise<RouteParams> };

export const revalidate = 900;
export const dynamicParams = true;

async function getContentPage(slug: string) {
    return ContentPageService.getPublicBySlug(slug);
}

export async function generateStaticParams(): Promise<RouteParams[]> {
    try {
        const pages = await ContentPageService.listPublicActive();
        return pages
            .filter((page) => typeof page.slug === "string" && page.slug.length > 0)
            .map((page) => ({ slug: page.slug }));
    } catch (error) {
        console.error("[content-pages] generateStaticParams failed:", error);
        return [];
    }
}

export async function generateMetadata(props: PublicContentPageProps): Promise<Metadata> {
    const params = await props.params;
    const page = await getContentPage(params.slug);

    if (!page) {
        return buildPageMetadata({
            title: "Page Not Found",
            description: "The requested page could not be found.",
            pathname: `/${params.slug}`,
            noIndex: true,
        });
    }

    return buildPageMetadata({
        title: page.seo_title || page.title,
        description: page.seo_description || page.summary || page.title,
        pathname: `/${page.slug}`,
    });
}

export default async function PublicContentPage(props: PublicContentPageProps) {
    const params = await props.params;
    const page = await getContentPage(params.slug);
    if (!page) notFound();

    return (
        <main className="w-full max-w-4xl px-4 py-12 md:px-6">
            <article className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
                <header className="mb-6 space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
                    {page.summary ? <p className="text-muted-foreground">{page.summary}</p> : null}
                </header>
                <div className="prose prose-sm max-w-none dark:prose-invert md:prose-base">
                    <Markdown content={page.content_md || ""} />
                </div>
            </article>
        </main>
    );
}
