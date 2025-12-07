"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { PublicCategory } from '@/lib/services/public/categoryPublicService';
import { createClient as createBrowserSupabase } from '@/lib/supabase/client';
import { ChevronRight } from 'lucide-react';

// --- Type Definition & Tree Building ---
interface TreeNode extends PublicCategory { children: TreeNode[] }

function buildTree(data: PublicCategory[]): TreeNode[] {
    const map: Record<string, TreeNode> = {};
    data.forEach(c => { (map[c.id] = { ...(c as any), children: [] }); });
    const roots: TreeNode[] = [];
    Object.values(map).forEach(n => {
        if (n.parent_id && map[n.parent_id]) map[n.parent_id].children.push(n); else roots.push(n);
    });
    const sortRec = (arr: TreeNode[]) => { arr.sort((a, b) => a.name.localeCompare(b.name)); arr.forEach(ch => sortRec(ch.children)); };
    sortRec(roots);
    return roots;
}

// --- Recursive Branch Component for Submenus ---
type Orientation = 'right' | 'down';

interface BranchProps {
    nodes: TreeNode[];
    level: number;
    path: string[];
    openPath: string[];
    openOrientations: Orientation[];
    onEnter: (path: string[], orientation: Orientation | null, level: number) => void;
}

function Branch({ nodes, level, path, openPath, openOrientations, onEnter }: BranchProps) {
    return (
        <ul className="min-w-48 py-2 text-sm overflow-visible">
            {nodes.map(node => {
                const nodePath = [...path, node.id];
                const hasChildren = node.children.length > 0;
                const isOpen = openPath[path.length] === node.id;
                const orientation = openOrientations[level];

                return (
                    // The overflow-visible here is a good safeguard against global li styles.
                    <li
                        key={node.id}
                        className="relative overflow-visible"
                        onMouseEnter={(e) => {
                            if (hasChildren) {
                                try {
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const remainingRight = window.innerWidth - rect.right;
                                    // approximate submenu width (tailwind min-w-52 => 208px) + some gutter
                                    const threshold = 230;
                                    const chosen: Orientation = remainingRight < threshold ? 'down' : 'right';
                                    onEnter(nodePath, chosen, level);
                                } catch {
                                    onEnter(nodePath, 'right', level);
                                }
                            } else {
                                onEnter(nodePath, null, level);
                            }
                        }}
                    >
                        <Link
                            href={`/categories/${node.slug || node.id}`}
                            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md transition-colors hover:bg-accent/60 focus:bg-accent/60 outline-none"
                        >
                            <span className="truncate">{node.name}</span>
                            {hasChildren && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                        </Link>
                        {hasChildren && isOpen && (
                            <div
                                className={orientation === 'down' ? 'absolute left-0 top-full pt-1' : 'absolute top-0 left-full'}
                                style={{ zIndex: 50 + level }}
                            >
                                <div className="bg-popover border rounded-md shadow-md min-w-52 max-h-[70vh]">
                                    <Branch nodes={node.children} level={level + 1} path={nodePath} openPath={openPath} openOrientations={openOrientations} onEnter={onEnter} />
                                </div>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}


// --- Main Exported Top Bar Component ---
export function CategoryTopBar() {
    const [cats, setCats] = useState<PublicCategory[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const sb = createBrowserSupabase();
                const { data, error } = await sb.from('categories').select('*').eq('is_active', true);
                if (error) throw error;
                setCats(data as PublicCategory[]);
            } catch (e) {
                setCats([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const tree = useMemo(() => cats ? buildTree(cats).filter(c => !c.parent_id) : [], [cats]);

    const [openPath, setOpenPath] = useState<string[]>([]);
    const [openOrientations, setOpenOrientations] = useState<Orientation[]>([]); // orientation per level
    const closeTimer = useRef<number | null>(null);

    const handleEnterRoot = useCallback((id: string) => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setOpenPath([id]);
        // reset orientations below root level
        setOpenOrientations(o => { const next = [...o]; next[1] = 'right'; return next; });
    }, []);

    const handleEnter = useCallback((path: string[], orientation: Orientation | null, level: number) => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setOpenPath(path);
        if (orientation) {
            setOpenOrientations(prev => {
                const next = [...prev];
                next[level] = orientation;
                return next;
            });
        }
    }, []);

    const scheduleClose = useCallback(() => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setOpenPath([]), 250);
    }, []);

    const cancelClose = useCallback(() => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    }, []);

    if (loading || !tree.length) {
        return null;
    }

    return (
        <div
            className="hidden md:block border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70"
            onMouseLeave={scheduleClose}
            onMouseEnter={cancelClose}
        >
            <div className="max-w-6xl mx-auto px-4">
                <ul className="flex flex-wrap gap-2 relative">
                    {tree.map(root => {
                        const isRootOpen = openPath[0] === root.id && root.children.length > 0;
                        return (
                            <li key={root.id} className="relative py-2" onMouseEnter={() => handleEnterRoot(root.id)}>
                                <Link
                                    href={`/categories/${root.slug || root.id}`}
                                    className="text-sm font-medium px-2 py-1.5 rounded-md hover:bg-accent/60 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                    <span className="whitespace-nowrap">{root.name}</span>
                                    {root.children.length > 0 && <ChevronRight className="w-3.5 h-3.5 rotate-90 text-muted-foreground" />}
                                </Link>
                                {isRootOpen && (
                                    <div className="absolute left-0 top-full z-50 pt-1">
                                        {/* ---- FINAL CSS FIX IS HERE: Removed overflow-y-auto and overflow-x-visible ---- */}
                                        <div className="bg-popover border rounded-md shadow-md min-w-56 max-h-[70vh]">
                                            <Branch nodes={root.children} level={1} path={[root.id]} openPath={openPath} openOrientations={openOrientations} onEnter={handleEnter} />
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}