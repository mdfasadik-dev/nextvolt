import Image from "next/image";
import { Markdown } from "@/components/markdown";
import type { ProjectSection } from "@/lib/services/projectService";

/**
 * Consecutive half-width sections are paired into one desktop row.
 * A 'left' with no following 'right' (or vice versa) still renders in its
 * own column so the admin can leave one side intentionally empty.
 * Every row collapses to a single column on mobile.
 */
type Row =
    | { type: "full"; section: ProjectSection }
    | { type: "split"; left: ProjectSection | null; right: ProjectSection | null };

function buildRows(sections: ProjectSection[]): Row[] {
    const rows: Row[] = [];
    let index = 0;
    while (index < sections.length) {
        const section = sections[index];
        if (section.layout === "full") {
            rows.push({ type: "full", section });
            index += 1;
            continue;
        }
        const next = sections[index + 1];
        // Pair a left with an immediately following right.
        if (section.layout === "left" && next && next.layout === "right") {
            rows.push({ type: "split", left: section, right: next });
            index += 2;
            continue;
        }
        if (section.layout === "right" && next && next.layout === "left") {
            rows.push({ type: "split", left: next, right: section });
            index += 2;
            continue;
        }
        rows.push(
            section.layout === "left"
                ? { type: "split", left: section, right: null }
                : { type: "split", left: null, right: section },
        );
        index += 1;
    }
    return rows;
}

function SectionBlock({ section }: { section: ProjectSection }) {
    if (section.kind === "image") {
        if (!section.image_url) return null;
        return (
            <figure className="space-y-2">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
                    <Image
                        src={section.image_url}
                        alt={section.image_alt || ""}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                    />
                </div>
                {section.caption && (
                    <figcaption className="text-xs text-muted-foreground">{section.caption}</figcaption>
                )}
            </figure>
        );
    }

    return (
        <div className="space-y-3">
            {section.heading && (
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{section.heading}</h2>
            )}
            <Markdown content={section.content_md || ""} className="md:prose-base" />
        </div>
    );
}

export function ProjectSections({ sections }: { sections: ProjectSection[] }) {
    if (!sections.length) return null;
    const rows = buildRows(sections);

    return (
        <div className="space-y-10">
            {rows.map((row, index) =>
                row.type === "full" ? (
                    <SectionBlock key={row.section.id} section={row.section} />
                ) : (
                    <div key={`split-${index}`} className="grid gap-6 md:grid-cols-2 md:items-start">
                        <div>{row.left && <SectionBlock section={row.left} />}</div>
                        <div>{row.right && <SectionBlock section={row.right} />}</div>
                    </div>
                ),
            )}
        </div>
    );
}
