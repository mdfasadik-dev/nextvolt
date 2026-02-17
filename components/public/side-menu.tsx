"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { PublicCategory } from "@/lib/services/public/categoryPublicService";

export interface SideMenuProps { categories: PublicCategory[] }

interface TreeNode extends PublicCategory { children: TreeNode[] }

function buildTree(categories: PublicCategory[]): TreeNode[] {
    const map: Record<string, TreeNode> = {};
    categories.forEach(c => { map[c.id] = { ...c, children: [] }; });
    const roots: TreeNode[] = [];
    Object.values(map).forEach(node => {
        if (node.parent_id && map[node.parent_id]) {
            map[node.parent_id].children.push(node);
        } else { roots.push(node); }
    });
    const sortRec = (arr: TreeNode[]) => {
        arr.sort((a, b) => {
            const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
            if (orderDiff !== 0) return orderDiff;
            return a.name.localeCompare(b.name);
        });
        arr.forEach(n => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
}

export function SideMenu({ categories }: SideMenuProps) {
    const tree = useMemo(() => buildTree(categories), [categories]);
    const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
    const toggle = (id: string) => setOpenMap(m => ({ ...m, [id]: !m[id] }));

    function Node({ node, depth }: { node: TreeNode; depth: number }) {
        const hasChildren = node.children.length > 0;
        const isOpen = openMap[node.id] ?? false;
        return (
            <li>
                <div className="flex items-center py-1 pr-2">
                    {hasChildren ? (
                        <button
                            type="button"
                            aria-label={isOpen ? "Collapse" : "Expand"}
                            aria-expanded={isOpen}
                            onClick={() => toggle(node.id)}
                            className="ml-1 mr-1 w-5 h-5 flex items-center justify-center rounded hover:bg-accent/40 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    ) : <span className="w-7" />}
                    <Link
                        href={`/categories/${node.slug || node.id}`}
                        className="flex-1 text-sm truncate rounded px-1 py-1 hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {node.name}
                    </Link>
                </div>
                {hasChildren && isOpen && (
                    <ul className="ml-4 border-l pl-2">
                        {node.children.map(ch => <Node key={ch.id} node={ch} depth={depth + 1} />)}
                    </ul>
                )}
            </li>
        );
    }

    if (!tree.length) return <div className="text-xs text-muted-foreground p-3">No categories</div>;

    return (
        <nav aria-label="Categories" className="text-foreground text-sm">
            <h3 className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Catalog</h3>
            <ul className="space-y-0.5">
                {tree.map(n => <Node key={n.id} node={n} depth={0} />)}
            </ul>
        </nav>
    );
}
