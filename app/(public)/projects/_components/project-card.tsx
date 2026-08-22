import Image from "next/image";
import Link from "next/link";
import { LayoutTemplate, MapPin } from "lucide-react";
import type { Project } from "@/lib/services/projectService";

export function ProjectCard({ project }: { project: Project }) {
    return (
        <Link
            href={`/projects/${project.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
        >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                {project.cover_image_url ? (
                    <Image
                        src={project.cover_image_url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
                <h3 className="text-base font-semibold leading-snug tracking-tight">{project.title}</h3>
                {project.summary && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{project.summary}</p>
                )}
                {project.location && (
                    <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                    </p>
                )}
            </div>
        </Link>
    );
}
