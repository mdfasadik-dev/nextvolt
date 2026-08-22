import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, User } from "lucide-react";
import { ProjectService } from "@/lib/services/projectService";
import { buildPageMetadata } from "@/lib/seo";
import { ProjectSections } from "../_components/project-sections";

type RouteParams = { slug: string };
type Props = { params: Promise<RouteParams> };

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<RouteParams[]> {
    try {
        const projects = await ProjectService.listPublic();
        return projects.map(project => ({ slug: project.slug }));
    } catch (error) {
        console.error("[projects] generateStaticParams failed:", error);
        return [];
    }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params;
    const project = await ProjectService.getPublicBySlug(params.slug);
    if (!project) {
        return buildPageMetadata({
            title: "Project Not Found",
            description: "The requested project could not be found.",
            pathname: `/projects/${params.slug}`,
            noIndex: true,
        });
    }
    return buildPageMetadata({
        title: project.seo_title || project.title,
        description: project.seo_description || project.summary || project.title,
        pathname: `/projects/${project.slug}`,
        images: project.cover_image_url ? [project.cover_image_url] : undefined,
    });
}

export default async function ProjectDetailPage(props: Props) {
    const params = await props.params;
    const project = await ProjectService.getPublicBySlug(params.slug);
    if (!project) notFound();

    const completed = project.completed_at
        ? new Date(project.completed_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
        : null;

    return (
        <article className="w-full max-w-5xl px-4 py-10 md:px-6">
            <Link
                href="/projects"
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" /> All projects
            </Link>

            <header className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{project.title}</h1>
                {project.summary && <p className="text-lg text-muted-foreground">{project.summary}</p>}
                {(project.client_name || project.location || completed) && (
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {project.client_name && (
                            <span className="inline-flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                {project.client_name}
                            </span>
                        )}
                        {project.location && (
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {project.location}
                            </span>
                        )}
                        {completed && (
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-4 w-4" />
                                {completed}
                            </span>
                        )}
                    </div>
                )}
            </header>

            {project.cover_image_url && (
                <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted">
                    <Image
                        src={project.cover_image_url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 1024px"
                        className="object-cover"
                        priority
                    />
                </div>
            )}

            <div className="mt-10">
                <ProjectSections sections={project.project_sections} />
            </div>
        </article>
    );
}
