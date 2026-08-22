import { notFound } from "next/navigation";
import { ProjectService } from "@/lib/services/projectService";
import { ProjectBuilder } from "../_components/project-builder";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectBuilderPage({ params }: PageProps) {
    const { id } = await params;
    const isNew = id === "new";
    const project = isNew ? null : await ProjectService.getAdminById(id).catch(() => null);

    if (!isNew && !project) notFound();

    return <ProjectBuilder project={project} />;
}
