"use client";
import Link from "next/link";
import Image from "next/image";
import { FileImage } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

export interface SimpleCategory { id: string; name: string; slug: string | null; image_url: string | null; }

// Maps Tailwind breakpoints used in the grid to their column counts
function computeCols(width: number) {
    if (width >= 1280) return 10; // xl
    if (width >= 768) return 8; // md
    if (width >= 640) return 6; // sm
    return 4; // base
}

export function CategoriesGrid({ categories }: { categories: SimpleCategory[] }) {
    const [rowsShown, setRowsShown] = useState(2); // show 2 rows initially
    const [cols, setCols] = useState(4);
    useEffect(() => {
        const update = () => setCols(computeCols(window.innerWidth));
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);
    const visibleCount = Math.min(categories.length, rowsShown * cols);
    const visible = categories.slice(0, visibleCount);
    const canShowMore = visibleCount < categories.length;

    return (
        <div className="w-full flex flex-col items-center">
            <ul className="grid gap-8 grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 justify-center">
                {visible.map((c) => (
                    <li key={c.id} className="flex flex-col items-center text-center group animate-fade-in">
                        <Link
                            href={`/categories/${c.slug || c.id}`}
                            className="relative flex h-20 w-20 items-center justify-center transition-transform duration-300 group-hover:scale-[1.1]"
                            aria-label={c.name}
                        >
                            {c.image_url ? (
                                <Image
                                    src={c.image_url}
                                    alt={c.name}
                                    fill
                                    sizes="80px"
                                    className="object-contain p-1"
                                    priority={false}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                                    <FileImage className="h-8 w-8" />
                                </div>
                            )}
                        </Link>
                        <Link
                            href={`/categories/${c.slug || c.id}`}
                            className="mt-3 text-[13px] font-medium tracking-tight text-foreground/90 line-clamp-2"
                        >
                            {c.name}
                        </Link>
                    </li>
                ))}
            </ul>
            {canShowMore && (
                <Button
                    type="button"
                    variant="ghost"
                    className="text-primary"
                    onClick={() => setRowsShown(r => r + 2)}
                >
                    View More →
                </Button>
            )}
            <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }
        .animate-fade-in { animation: fade-in 0.35s ease both; }
      `}</style>
        </div>
    );
}
