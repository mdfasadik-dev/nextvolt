import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectService, type Project } from "@/lib/services/projectService";
import { ProjectCard } from "@/app/(public)/projects/_components/project-card";

export async function FeaturedProjects({ limit = 3 }: { limit?: number }) {
    let projects: Project[] = [];
    try {
        projects = await ProjectService.listFeatured(limit);
    } catch {
        return null;
    }
    if (!projects.length) return null;

    return (
        <section className="flex w-full flex-col gap-6" aria-labelledby="featured-projects-heading">
            <div className="flex items-center justify-center">
                <h2
                    id="featured-projects-heading"
                    className="mb-2 text-center text-3xl font-bold tracking-tight"
                >
                    Our Projects
                </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
            <div className="flex justify-center">
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                    View all projects <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </section>
    );
}
