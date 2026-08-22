import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase";

export type Project = Tables<"projects">;
export type ProjectSection = Tables<"project_sections">;
export type ProjectWithSections = Project & { project_sections: ProjectSection[] };
export type ProjectSectionInput = Omit<TablesInsert<"project_sections">, "project_id">;

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function sortSections(sections: ProjectSection[]) {
    return [...sections].sort((a, b) => a.sort_order - b.sort_order);
}

async function writeClient() {
    return SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : createClient();
}

export class ProjectService {
    static async listAdmin(): Promise<ProjectWithSections[]> {
        const client = await writeClient();
        const { data, error } = await client
            .from("projects")
            .select("*, project_sections(*)")
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(project => ({
            ...project,
            project_sections: sortSections((project.project_sections || []) as ProjectSection[]),
        })) as ProjectWithSections[];
    }

    static async getAdminById(id: string): Promise<ProjectWithSections | null> {
        const client = await writeClient();
        const { data, error } = await client
            .from("projects")
            .select("*, project_sections(*)")
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
            ...data,
            project_sections: sortSections((data.project_sections || []) as ProjectSection[]),
        } as ProjectWithSections;
    }

    static async listPublic(limit?: number): Promise<Project[]> {
        const client = createPublicClient();
        let query = client
            .from("projects")
            .select("*")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false });
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async listFeatured(limit = 3): Promise<Project[]> {
        const client = createPublicClient();
        const { data, error } = await client
            .from("projects")
            .select("*")
            .eq("is_featured", true)
            .eq("is_active", true)
            .eq("is_deleted", false)
            .order("sort_order", { ascending: true })
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    }

    static async getPublicBySlug(slug: string): Promise<ProjectWithSections | null> {
        const client = createPublicClient();
        const { data, error } = await client
            .from("projects")
            .select("*, project_sections(*)")
            .eq("slug", slug)
            .eq("is_active", true)
            .eq("is_deleted", false)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
            ...data,
            project_sections: sortSections(
                ((data.project_sections || []) as ProjectSection[]).filter(section => section.is_active),
            ),
        } as ProjectWithSections;
    }

    /** `slug` is optional here: it is derived from the title when omitted. */
    static async create(
        payload: Omit<TablesInsert<"projects">, "slug"> & { slug?: string | null },
        sections: ProjectSectionInput[] = [],
    ): Promise<Project> {
        const client = await writeClient();
        const title = payload.title?.trim() || "Untitled Project";
        const { data, error } = await client
            .from("projects")
            .insert({
                ...payload,
                title,
                slug: payload.slug?.trim() ? slugify(payload.slug) : slugify(title),
            })
            .select("*")
            .single();
        if (error) throw error;
        await this.replaceSections(data.id, sections);
        return data;
    }

    static async update(
        id: string,
        payload: TablesUpdate<"projects">,
        sections?: ProjectSectionInput[],
    ): Promise<Project> {
        const client = await writeClient();
        const next: TablesUpdate<"projects"> = { ...payload };
        if (typeof payload.slug === "string" && payload.slug.trim()) {
            next.slug = slugify(payload.slug);
        } else if (typeof payload.title === "string" && !payload.slug) {
            next.slug = slugify(payload.title);
        }
        const { data, error } = await client.from("projects").update(next).eq("id", id).select("*").single();
        if (error) throw error;
        if (sections) await this.replaceSections(id, sections);
        return data;
    }

    /** Sections are an ordered list owned by the project, so replace wholesale. */
    private static async replaceSections(projectId: string, sections: ProjectSectionInput[]) {
        const client = await writeClient();
        const { error } = await client.from("project_sections").delete().eq("project_id", projectId);
        if (error) throw error;
        if (!sections.length) return;
        const rows = sections.map((section, index) => ({
            ...section,
            project_id: projectId,
            sort_order: index,
        }));
        const { error: insertError } = await client.from("project_sections").insert(rows);
        if (insertError) throw insertError;
    }

    static async remove(id: string) {
        const client = await writeClient();
        const { error } = await client.from("projects").update({ is_deleted: true }).eq("id", id);
        if (error) throw error;
    }

    static async updateSortOrder(items: Array<{ id: string; sort_order: number }>) {
        if (!items.length) return;
        const client = await writeClient();
        for (const item of items) {
            const { error } = await client.from("projects").update({ sort_order: item.sort_order }).eq("id", item.id);
            if (error) throw error;
        }
    }
}
