import type { SectionInput } from "../actions";

/**
 * Editor-only draft. `pendingFile` holds an image the user picked but that has
 * not been uploaded yet; `previewUrl` is its local object URL. Both are
 * stripped before the draft is sent to the server — uploads happen once, on
 * save, so abandoning the editor never leaves orphaned files in storage.
 */
export type SectionDraft = SectionInput & {
    key: string;
    pendingFile?: File | null;
    previewUrl?: string | null;
};

export const LAYOUT_LABELS: Record<SectionInput["layout"], string> = {
    full: "Full width",
    left: "Left half",
    right: "Right half",
};

export function newSectionKey() {
    return `s-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeSection(kind: SectionInput["kind"], layout: SectionInput["layout"] = "full"): SectionDraft {
    return {
        key: newSectionKey(),
        kind,
        layout,
        heading: null,
        content_md: kind === "text" ? "" : null,
        image_url: null,
        image_alt: null,
        caption: null,
        pendingFile: null,
        previewUrl: null,
    };
}

/** True when a section has enough content to be saved (mirrors the DB check). */
export function isSectionComplete(section: SectionDraft) {
    return section.kind === "text"
        ? Boolean(section.content_md && section.content_md.trim())
        : Boolean(section.pendingFile) || Boolean(section.image_url && section.image_url.trim());
}

/** What the canvas/inspector should display: local preview first, then saved URL. */
export function sectionImageSrc(section: SectionDraft) {
    return section.previewUrl || section.image_url || null;
}

/**
 * Group sections into visual rows exactly the way the public page does,
 * so the builder canvas is a faithful preview.
 */
export type BuilderRow =
    | { type: "full"; section: SectionDraft; indexes: number[] }
    | { type: "split"; left: SectionDraft | null; right: SectionDraft | null; indexes: number[] };

export function buildRows(sections: SectionDraft[]): BuilderRow[] {
    const rows: BuilderRow[] = [];
    let index = 0;
    while (index < sections.length) {
        const section = sections[index];
        if (section.layout === "full") {
            rows.push({ type: "full", section, indexes: [index] });
            index += 1;
            continue;
        }
        const next = sections[index + 1];
        if (section.layout === "left" && next && next.layout === "right") {
            rows.push({ type: "split", left: section, right: next, indexes: [index, index + 1] });
            index += 2;
            continue;
        }
        if (section.layout === "right" && next && next.layout === "left") {
            rows.push({ type: "split", left: next, right: section, indexes: [index + 1, index] });
            index += 2;
            continue;
        }
        rows.push(
            section.layout === "left"
                ? { type: "split", left: section, right: null, indexes: [index] }
                : { type: "split", left: null, right: section, indexes: [index] },
        );
        index += 1;
    }
    return rows;
}
