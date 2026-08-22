"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ProjectService, type ProjectSectionInput } from "@/lib/services/projectService";

async function requireAdminUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
}

function revalidateProjects(slug?: string | null) {
    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    revalidatePath("/");
    if (slug) revalidatePath(`/projects/${slug}`);
}

export type SectionInput = {
    kind: "text" | "image";
    layout: "full" | "left" | "right";
    heading?: string | null;
    content_md?: string | null;
    image_url?: string | null;
    image_alt?: string | null;
    caption?: string | null;
};

export type ProjectInput = {
    title: string;
    slug?: string | null;
    summary?: string | null;
    cover_image_url?: string | null;
    client_name?: string | null;
    location?: string | null;
    completed_at?: string | null;
    is_featured?: boolean;
    is_active?: boolean;
    sort_order?: number;
    seo_title?: string | null;
    seo_description?: string | null;
    sections?: SectionInput[];
};

/**
 * Drop sections that would violate project_sections_payload_valid
 * (text needs markdown, image needs a url) so a half-filled row in the
 * editor can never fail the whole save.
 */
function toSectionRows(sections: SectionInput[] = []): ProjectSectionInput[] {
    return sections
        .filter(section =>
            section.kind === "text"
                ? Boolean(section.content_md && section.content_md.trim())
                : Boolean(section.image_url && section.image_url.trim()),
        )
        .map(section => ({
            kind: section.kind,
            layout: section.layout,
            heading: section.kind === "text" ? section.heading || null : null,
            content_md: section.kind === "text" ? section.content_md || null : null,
            image_url: section.kind === "image" ? section.image_url || null : null,
            image_alt: section.kind === "image" ? section.image_alt || null : null,
            caption: section.kind === "image" ? section.caption || null : null,
            is_active: true,
        }));
}

export async function createProject(payload: ProjectInput) {
    await requireAdminUser();
    const project = await ProjectService.create(
        {
            title: payload.title,
            // Blank slug -> the service derives one from the title.
            slug: payload.slug || null,
            summary: payload.summary || null,
            cover_image_url: payload.cover_image_url || null,
            client_name: payload.client_name || null,
            location: payload.location || null,
            completed_at: payload.completed_at || null,
            is_featured: payload.is_featured ?? false,
            is_active: payload.is_active ?? true,
            sort_order: payload.sort_order ?? 0,
            seo_title: payload.seo_title || null,
            seo_description: payload.seo_description || null,
            published_at: new Date().toISOString(),
        },
        toSectionRows(payload.sections),
    );
    revalidateProjects(project.slug);
    return project;
}

export async function updateProject(id: string, payload: ProjectInput) {
    await requireAdminUser();
    const project = await ProjectService.update(
        id,
        {
            title: payload.title,
            slug: payload.slug || undefined,
            summary: payload.summary || null,
            cover_image_url: payload.cover_image_url || null,
            client_name: payload.client_name || null,
            location: payload.location || null,
            completed_at: payload.completed_at || null,
            is_featured: payload.is_featured ?? false,
            is_active: payload.is_active ?? true,
            sort_order: payload.sort_order ?? 0,
            seo_title: payload.seo_title || null,
            seo_description: payload.seo_description || null,
        },
        toSectionRows(payload.sections),
    );
    revalidateProjects(project.slug);
    return project;
}

export async function deleteProject(id: string, slug?: string | null) {
    await requireAdminUser();
    await ProjectService.remove(id);
    revalidateProjects(slug || null);
}

export async function updateProjectOrder(items: Array<{ id: string; sort_order: number }>) {
    await requireAdminUser();
    await ProjectService.updateSortOrder(items);
    revalidateProjects();
}

export async function getProjectForEdit(id: string) {
    await requireAdminUser();
    return ProjectService.getAdminById(id);
}
