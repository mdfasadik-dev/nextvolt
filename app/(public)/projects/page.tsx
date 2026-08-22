import type { Metadata } from "next";
import { ProjectService } from "@/lib/services/projectService";
import { buildPageMetadata } from "@/lib/seo";
import { ProjectCard } from "./_components/project-card";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
    title: "Projects",
    description: "A look at installations and power solutions we have delivered.",
    pathname: "/projects",
});

export default async function ProjectsPage() {
    const projects = await ProjectService.listPublic();

    return (
        <div className="w-full max-w-7xl px-4 py-10 md:px-6">
            <header className="mb-8 max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Projects</h1>
                <p className="mt-2 text-muted-foreground">
                    A look at installations and power solutions we have delivered.
                </p>
            </header>

            {projects.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                    No projects published yet. Please check back soon.
                </p>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </div>
    );
}
