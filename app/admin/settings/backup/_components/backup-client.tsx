"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Download, FileWarningIcon, Loader2, Upload } from "lucide-react";

type BackupTab = "export" | "import";

type ImportSummary = {
    importedAt: string;
    mode: "replace";
    tableCounts: Record<string, number>;
};

type ImportApiResponse = {
    ok: boolean;
    message: string;
    summary: ImportSummary;
};

function formatDateTime(value: string) {
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function isBackupTab(value: string): value is BackupTab {
    return value === "export" || value === "import";
}

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const raw = await response.text();
        if (!raw.trim()) return fallback;
        try {
            const payload = JSON.parse(raw) as { error?: string; message?: string };
            return payload.error || payload.message || fallback;
        } catch {
            return raw.trim() || fallback;
        }
    } catch {
        return fallback;
    }
}

export function BackupClient() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<BackupTab>("export");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null);

    const selectedFileLabel = useMemo(() => {
        if (!selectedFile) return "No file selected";
        const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
        return `${selectedFile.name} (${sizeMb} MB)`;
    }, [selectedFile]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setSelectedFile(file);
    };

    const requestImport = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedFile) {
            toast.push({
                variant: "error",
                title: "No backup file selected",
                description: "Choose a JSON backup file before importing.",
            });
            return;
        }
        setConfirmOpen(true);
    };

    const runImport = async () => {
        if (!selectedFile || isImporting) return;
        setConfirmOpen(false);
        setIsImporting(true);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await fetch("/api/admin/backup/import", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const message = await readErrorMessage(response, "Backup import failed.");
                throw new Error(message);
            }

            const payload = (await response.json()) as Partial<ImportApiResponse> & { error?: string };
            if (!payload.ok || !payload.summary) {
                throw new Error(payload.error || payload.message || "Backup import failed.");
            }

            setLastSummary(payload.summary);
            toast.push({
                variant: "success",
                title: "Import complete",
                description: payload.message || "Database restored from backup JSON.",
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Backup import failed.";
            toast.push({
                variant: "error",
                title: "Import failed",
                description: message,
            });
        } finally {
            setIsImporting(false);
        }
    };

    const runExport = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const response = await fetch("/api/admin/backup/export", {
                method: "GET",
            });
            if (!response.ok) {
                const message = await readErrorMessage(response, "Failed to export backup.");
                throw new Error(message);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            const disposition = response.headers.get("Content-Disposition");
            const fileName = disposition?.match(/filename="(.+)"/)?.[1] || `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to export backup.";
            toast.push({
                variant: "error",
                title: "Export failed",
                description: message,
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Data Backup</h2>
                <p className="text-sm text-muted-foreground">
                    Export and import full database snapshots in JSON format.
                </p>
            </div>

            <Tabs defaultValue="export" value={activeTab} onValueChange={value => {
                if (isBackupTab(value)) {
                    setActiveTab(value);
                }
            }}>
                <TabsList>
                    <TabsTrigger value="export">Export</TabsTrigger>
                    <TabsTrigger value="import">Import</TabsTrigger>
                </TabsList>

                <TabsContent value="export" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Export Full Database</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Download a complete JSON snapshot of all core tables.
                            </p>
                            <Button onClick={runExport} disabled={isExporting}>
                                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isExporting ? "Exporting..." : "Download Backup JSON"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Backup JSON</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground flex items-center">
                                <FileWarningIcon className="inline-block mr-2 h-4 w-4 text-yellow-500" />
                                Importing a backup will replace existing data in all managed tables. Make sure to export a backup before importing.
                            </p>

                            <form onSubmit={requestImport} className="space-y-3">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="backup-file" className="text-sm font-medium">
                                        Backup file
                                    </label>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            id="backup-file"
                                            type="file"
                                            accept="application/json,.json"
                                            onChange={handleFileChange}
                                            disabled={isImporting}
                                            className="sr-only"
                                        />
                                        <label
                                            htmlFor="backup-file"
                                            className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                            Choose JSON file
                                        </label>
                                        <span className="text-xs text-muted-foreground">
                                            {selectedFile ? selectedFile.name : "No file selected"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Click “Choose JSON file” to upload the backup.
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">{selectedFileLabel}</p>
                                <Button type="submit" disabled={!selectedFile || isImporting}>
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Import Backup
                                        </>
                                    )}
                                </Button>
                            </form>

                            {lastSummary ? (
                                <div className="rounded-md border bg-muted/20 p-3">
                                    <p className="text-sm font-medium">Last import</p>
                                    <p className="text-xs text-muted-foreground">
                                        Completed at {formatDateTime(lastSummary.importedAt)}
                                    </p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Imported rows:{" "}
                                        {Object.values(lastSummary.tableCounts).reduce((sum, count) => sum + count, 0)}
                                    </p>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={confirmOpen}
                title="Import Backup"
                description="This will replace existing data in all managed tables. Continue?"
                confirmLabel="Import Now"
                variant="danger"
                onCancel={() => setConfirmOpen(false)}
                onConfirm={runImport}
            />
        </div>
    );
}
