import type { Category } from "@/lib/services/categoryService";

type CategoryLike = Pick<Category, "id" | "name" | "parent_id" | "sort_order" | "created_at">;

export type CategoryTreeItem = {
    id: string;
    name: string;
    parent_id: string | null;
    depth: number;
    prefix: string;
    label: string;
};

function compareCategories(a: CategoryLike, b: CategoryLike) {
    const orderA = Number.isFinite(a.sort_order) ? Number(a.sort_order) : 0;
    const orderB = Number.isFinite(b.sort_order) ? Number(b.sort_order) : 0;
    if (orderA !== orderB) return orderA - orderB;
    const createdA = a.created_at || "";
    const createdB = b.created_at || "";
    if (createdA === createdB) return 0;
    return createdA < createdB ? 1 : -1;
}

function buildPrefix(depth: number) {
    if (depth <= 0) return "";
    let out = "";
    for (let i = 0; i < depth; i++) {
        out += i === depth - 1 ? "|__ " : "|  ";
    }
    return out;
}

export function buildCategoryTreeItems(categories: CategoryLike[]): CategoryTreeItem[] {
    if (!categories.length) return [];

    const byId = new Map(categories.map((category) => [category.id, category] as const));
    const childrenByParent = new Map<string | null, CategoryLike[]>();
    const pushChild = (parentId: string | null, category: CategoryLike) => {
        const next = childrenByParent.get(parentId) || [];
        next.push(category);
        childrenByParent.set(parentId, next);
    };

    for (const category of categories) {
        const parentId = category.parent_id && byId.has(category.parent_id) ? category.parent_id : null;
        pushChild(parentId, category);
    }

    for (const [key, list] of childrenByParent) {
        childrenByParent.set(key, [...list].sort(compareCategories));
    }

    const output: CategoryTreeItem[] = [];
    const visited = new Set<string>();

    const walk = (category: CategoryLike, depth: number, path: Set<string>) => {
        if (visited.has(category.id)) return;
        if (path.has(category.id)) return;
        visited.add(category.id);
        const prefix = buildPrefix(depth);
        output.push({
            id: category.id,
            name: category.name,
            parent_id: category.parent_id,
            depth,
            prefix,
            label: `${prefix}${category.name}`,
        });

        const nextPath = new Set(path);
        nextPath.add(category.id);
        const children = childrenByParent.get(category.id) || [];
        for (const child of children) {
            walk(child, depth + 1, nextPath);
        }
    };

    const roots = childrenByParent.get(null) || [];
    for (const root of roots) {
        walk(root, 0, new Set());
    }

    if (visited.size !== categories.length) {
        const leftovers = categories
            .filter((category) => !visited.has(category.id))
            .sort(compareCategories);
        for (const category of leftovers) {
            walk(category, 0, new Set());
        }
    }

    return output;
}

export function collectDescendantCategoryIds(rootId: string, categories: CategoryLike[]): string[] {
    const scopedRootId = rootId.trim();
    if (!scopedRootId) return [];

    const childrenByParent = new Map<string, string[]>();
    for (const category of categories) {
        if (!category.parent_id) continue;
        const next = childrenByParent.get(category.parent_id) || [];
        next.push(category.id);
        childrenByParent.set(category.parent_id, next);
    }

    const descendants = new Set<string>();
    const queue = [scopedRootId];
    while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        const children = childrenByParent.get(current) || [];
        for (const childId of children) {
            if (descendants.has(childId)) continue;
            descendants.add(childId);
            queue.push(childId);
        }
    }
    return Array.from(descendants);
}
