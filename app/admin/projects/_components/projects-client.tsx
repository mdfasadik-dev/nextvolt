"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Pencil, Trash2, Star, LayoutTemplate, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ProjectWithSections } from "@/lib/services/projectService";
import { deleteProject } from "../actions";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export function ProjectsClient({ initialProjects }: { initialProjects: ProjectWithSections[] }) {
    const toast = useToast();
    const [isPending, startTransition] = useTransition();
    const [confirm, setConfirm] = useState<{ id: string; title: string; slug: string } | null>(null);

    function runDelete() {
        if (!confirm) return;
        const target = confirm;
        startTransition(async () => {
            try {
                await deleteProject(target.id, target.slug);
                toast.push({ variant: "success", title: `${target.title} deleted` });
                setConfirm(null);
            } catch (error) {
                toast.push({ variant: "error", title: errorMessage(error, "Delete failed") });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
                    <p className="text-sm text-muted-foreground">
                        Case studies built from stacked text and image blocks.
                    </p>
                </div>
                <Link
                    href="/admin/projects/new"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                    <Plus className="h-4 w-4" /> New Project
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Projects</CardTitle>
                    <CardDescription className="text-xs">
                        Featured projects also appear on the public home page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {initialProjects.length === 0 && (
                        <div className="py-12 text-center">
                            <LayoutTemplate className="mx-auto h-8 w-8 text-muted-foreground/50" />
                            <p className="mt-3 text-sm font-medium">No projects yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Create your first project to showcase your work.
                            </p>
                            <Link
                                href="/admin/projects/new"
                                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md border px-4 text-sm hover:bg-muted"
                            >
                                <Plus className="h-4 w-4" /> New Project
                            </Link>
                        </div>
                    )}
                    {initialProjects.map(project => (
                        <div key={project.id} className="flex items-center gap-3 rounded-md border p-3">
                            <Link
                                href={`/admin/projects/${project.id}`}
                                className="relative h-14 w-20 shrink-0 overflow-hidden rounded bg-muted"
                            >
                                {project.cover_image_url ? (
                                    <Image
                                        src={project.cover_image_url}
                                        alt={project.title}
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center">
                                        <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                )}
                            </Link>
                            <Link href={`/admin/projects/${project.id}`} className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <p className="truncate text-sm font-medium">{project.title}</p>
                                    {project.is_featured && (
                                        <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" fill="currentColor" />
                                    )}
                                    {!project.is_active && (
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            Draft
                                        </span>
                                    )}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                    /projects/{project.slug} · {project.project_sections.length} block(s)
                                </p>
                            </Link>
                            <div className="flex shrink-0 items-center gap-1">
                                {project.is_active && (
                                    <Link
                                        href={`/projects/${project.slug}`}
                                        target="_blank"
                                        title="View live"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                )}
                                <Link
                                    href={`/admin/projects/${project.id}`}
                                    title="Edit"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Link>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive"
                                    disabled={isPending}
                                    onClick={() =>
                                        setConfirm({ id: project.id, title: project.title, slug: project.slug })
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={Boolean(confirm)}
                title={`Delete ${confirm?.title || ""}?`}
                description="The project will be removed from the public site."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={runDelete}
                onCancel={() => setConfirm(null)}
            />
        </div>
    );
}
