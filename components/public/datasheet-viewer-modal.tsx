"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Move, FileText, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatasheetViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fileUrl: string;
    fileType: "pdf" | "image";
}

export function DatasheetViewerModal({
    isOpen,
    onClose,
    title,
    fileUrl,
    fileType,
}: DatasheetViewerModalProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Reset zoom/pan when opening or changing file
    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setIsDragging(false);
        }
    }, [isOpen, fileUrl]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom <= 1 && fileType !== "image") return;
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y,
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((prev) => Math.max(0.5, Math.min(4, prev + delta)));
    }, []);

    useEffect(() => {
        const elem = containerRef.current;
        if (!elem || !isOpen) return;
        elem.addEventListener("wheel", handleWheel, { passive: false });
        return () => elem.removeEventListener("wheel", handleWheel);
    }, [isOpen, handleWheel]);

    const handleDownload = async () => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const ext = fileType === "pdf" ? ".pdf" : ".webp";
            const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
            a.download = cleanTitle.endsWith(ext) ? cleanTitle : `${cleanTitle}${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch {
            window.open(fileUrl, "_blank");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 text-foreground backdrop-blur-md transition-all duration-200">
            {/* Top Toolbar */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {fileType === "pdf" ? (
                        <FileText className="h-5 w-5 shrink-0 text-red-500" />
                    ) : (
                        <FileImage className="h-5 w-5 shrink-0 text-emerald-500" />
                    )}
                    <h3 className="truncate text-sm font-semibold text-foreground" title={title}>
                        {title}
                    </h3>
                </div>

                {/* Toolbar Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center rounded-md border border-border bg-muted/50 p-0.5">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={handleZoomOut}
                            title="Zoom Out (-)"
                        >
                            <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <span className="px-2 font-mono text-xs font-medium text-foreground">
                            {Math.round(zoom * 100)}%
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={handleZoomIn}
                            title="Zoom In (+)"
                        >
                            <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={handleResetZoom}
                            title="Reset Zoom"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-8 gap-1.5 px-3 text-xs"
                        onClick={handleDownload}
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download</span>
                    </Button>

                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={onClose}
                        title="Close (Esc)"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Viewer Body */}
            <div
                ref={containerRef}
                className="relative flex-1 overflow-hidden select-none cursor-grab active:cursor-grabbing bg-muted/20"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    className="flex h-full w-full items-center justify-center transition-transform duration-75 ease-out"
                    style={{
                        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                        transformOrigin: "center center",
                    }}
                >
                    {fileType === "pdf" ? (
                        <div className="h-full w-full p-2 sm:p-6 flex items-center justify-center">
                            <iframe
                                src={`${fileUrl}#toolbar=0&navpanes=0`}
                                className="h-full w-full max-w-5xl rounded-lg shadow-xl bg-background border border-border"
                                title={title}
                            />
                        </div>
                    ) : (
                        <div className="relative max-h-full max-w-full p-4 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={fileUrl}
                                alt={title}
                                className="max-h-[85vh] max-w-full object-contain rounded-md shadow-xl border border-border"
                                draggable={false}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
