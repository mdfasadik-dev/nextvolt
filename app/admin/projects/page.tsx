import { ProjectService } from "@/lib/services/projectService";
import { ProjectsClient } from "./_components/projects-client";

export const revalidate = 0;

export default async function AdminProjectsPage() {
    const projects = await ProjectService.listAdmin();
    return <ProjectsClient initialProjects={projects} />;
}
