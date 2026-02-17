"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { marked } from "marked";
import createDOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    Heading3,
    Link as LinkIcon,
    Code,
    List,
    ListOrdered,
    Quote,
    Table as TableIcon,
    Image as ImageIcon,
    Strikethrough,
    Underline,
    Minus,
    CheckSquare,
} from "lucide-react";

export interface MarkdownEditorProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
    minHeight?: number;
    placeholder?: string;
    debounceMs?: number;
    preview?: "toggle" | "split";
    /** If true, don't push any change upstream until user pauses (debounce). */
    debounceOutboundOnly?: boolean;
}

function MarkdownEditorInner({
    value,
    onChange,
    className,
    minHeight = 160,
    placeholder = "Write markdown...",
    debounceMs = 250,
    preview = "toggle",
    debounceOutboundOnly = true,
}: MarkdownEditorProps) {
    const [internal, setInternal] = useState(value);
    const [previewHtml, setPreviewHtml] = useState("");
    const [showPreview, setShowPreview] = useState(preview === "split");
    const debounceRef = useRef<number | null>(null);
    const purifierRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Sync when external value changes
    useEffect(() => {
        if (value !== internal) setInternal(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // DOMPurify init
    useEffect(() => {
        if (typeof window !== "undefined") {
            purifierRef.current = createDOMPurify(window as any);
        }
    }, []);

    const updatePreview = useCallback((src: string) => {
        try {
            const raw = marked.parse(src || "") as string;
            const safe = purifierRef.current ? purifierRef.current.sanitize(raw) : raw;
            setPreviewHtml(safe);
        } catch {
            setPreviewHtml("");
        }
    }, []);

    // Debounce upstream onChange + preview
    useEffect(() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        const current = internal;
        const fire = () => {
            onChange(current);
            updatePreview(current);
        };
        if (debounceOutboundOnly) {
            debounceRef.current = window.setTimeout(fire, debounceMs) as unknown as number;
        } else {
            fire();
        }
        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [internal, onChange, updatePreview, debounceMs, debounceOutboundOnly]);

    // ===== Selection helpers =====
    const getSel = () => {
        const ta = textareaRef.current!;
        return {
            ta,
            start: ta.selectionStart ?? 0,
            end: ta.selectionEnd ?? 0,
            val: ta.value,
        };
    };

    const setValAndCaret = (next: string, caretPos?: number) => {
        setInternal(next);
        requestAnimationFrame(() => {
            const ta = textareaRef.current!;
            ta.focus();
            if (typeof caretPos === "number") ta.setSelectionRange(caretPos, caretPos);
        });
    };

    // Surround selected text with before/after
    const applyWrap = (before: string, after: string, placeholderText?: string) => {
        const { val, start, end } = getSel();
        const selected = val.slice(start, end) || placeholderText || "";
        const next = val.slice(0, start) + before + selected + after + val.slice(end);
        const pos = start + before.length + selected.length;
        setValAndCaret(next, pos);
    };

    // Prefix each selected line with a token (e.g., "# ", "- ", "1. ")
    const applyLinePrefix = (prefix: string) => {
        const { val, start, end } = getSel();
        const pre = val.slice(0, start);
        const sel = val.slice(start, end);
        const post = val.slice(end);

        const block = sel || "";
        const lines = block.split("\n");
        const updated =
            lines.length > 0
                ? lines
                    .map((line, i) => {
                        // Avoid double prefixing if already present
                        if (line.startsWith(prefix)) return line;
                        // For ordered list auto-numbering
                        if (prefix.match(/^\d+\. /)) {
                            const n = i + 1;
                            return `${n}. ${line || "item"}`;
                        }
                        return `${prefix}${line || (prefix.trim() === "-" ? "item" : "Heading")}`;
                    })
                    .join("\n")
                : `${prefix}${"item"}`;

        const next = pre + updated + post;
        const pos = pre.length + updated.length;
        setValAndCaret(next, pos);
    };

    // Insert fenced code block
    const insertCodeBlock = () => {
        const { val, start, end } = getSel();
        const selected = val.slice(start, end) || "code";
        const block = "```" + "\n" + selected + "\n" + "```";
        const next = val.slice(0, start) + block + val.slice(end);
        setValAndCaret(next, start + block.length);
    };

    // Insert image template
    const insertImage = () => {
        const { val, start, end } = getSel();
        const selected = val.slice(start, end) || "alt text";
        const tpl = `![${selected}](https://example.com/image.png)`;
        const next = val.slice(0, start) + tpl + val.slice(end);
        setValAndCaret(next, start + tpl.length);
    };

    // Insert horizontal rule
    const insertHr = () => {
        const { val, start, end } = getSel();
        const tpl = `\n\n---\n\n`;
        const next = val.slice(0, start) + tpl + val.slice(end);
        setValAndCaret(next, start + tpl.length);
    };

    // Insert GitHub-style task list
    const insertTaskList = () => {
        const { val, start, end } = getSel();
        const sel = val.slice(start, end);
        const lines = (sel || "Task 1\nTask 2\nTask 3").split("\n");
        const updated = lines.map((l) => `- [ ] ${l.trim()}`).join("\n");
        const next = val.slice(0, start) + updated + val.slice(end);
        setValAndCaret(next, start + updated.length);
    };

    // Insert a 3x3 Markdown table
    const insertTable = () => {
        const { val, start, end } = getSel();
        const headers = ["Column 1", "Column 2", "Column 3"];
        const headerRow = `| ${headers.join(" | ")} |`;
        const sepRow = `| ${headers.map(() => "---").join(" | ")} |`;
        const row = `| ${headers.map(() => "cell").join(" | ")} |`;
        const tpl = `\n${headerRow}\n${sepRow}\n${row}\n${row}\n${row}\n`;
        const next = val.slice(0, start) + tpl + val.slice(end);
        setValAndCaret(next, start + tpl.length);
    };

    // Keyboard shortcuts (Cmd/Ctrl+B, I, K, `, 1/2/3 for headings)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey;
            if (!meta) return;

            // Ignore if preview-only view
            if (showPreview && preview !== "split") return;

            switch (e.key.toLowerCase()) {
                case "b":
                    e.preventDefault();
                    applyWrap("**", "**", "bold");
                    break;
                case "i":
                    e.preventDefault();
                    applyWrap("*", "*", "italic");
                    break;
                case "k":
                    e.preventDefault();
                    applyWrap("[", "](url)", "link text");
                    break;
                case "`":
                    e.preventDefault();
                    insertCodeBlock();
                    break;
                case "1":
                    e.preventDefault();
                    applyLinePrefix("# ");
                    break;
                case "2":
                    e.preventDefault();
                    applyLinePrefix("## ");
                    break;
                case "3":
                    e.preventDefault();
                    applyLinePrefix("### ");
                    break;
                default:
                    break;
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [showPreview, preview]);

    // ===== Toolbar button factory (icon-only, compact, “bold” look) =====
    const toolbarBtn = (
        Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
        action: () => void,
        aria: string
    ) => (
        <button
            type="button"
            onClick={action}
            title={aria}
            aria-label={aria}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border bg-background hover:bg-muted hover:border-foreground/20 transition"
        >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
    );

    return (
        <div className={cn("border rounded-md bg-background flex min-w-0 flex-col overflow-hidden", className)}>
            <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1">
                {/* Inline styles */}
                {toolbarBtn(Bold, () => applyWrap("**", "**", "bold"), "Bold")}
                {toolbarBtn(Italic, () => applyWrap("*", "*", "italic"), "Italic")}
                {toolbarBtn(Strikethrough, () => applyWrap("~~", "~~", "strikethrough"), "Strikethrough")}
                {toolbarBtn(Underline, () => applyWrap("<u>", "</u>", "underline"), "Underline")}

                <span className="mx-1 h-5 w-px bg-border" />

                {/* Headings */}
                {toolbarBtn(Heading1, () => applyLinePrefix("# "), "Heading 1")}
                {toolbarBtn(Heading2, () => applyLinePrefix("## "), "Heading 2")}
                {toolbarBtn(Heading3, () => applyLinePrefix("### "), "Heading 3")}

                <span className="mx-1 h-5 w-px bg-border" />

                {/* Lists & tasks */}
                {toolbarBtn(List, () => applyLinePrefix("- "), "Bulleted list")}
                {toolbarBtn(ListOrdered, () => applyLinePrefix("1. "), "Numbered list")}
                {toolbarBtn(CheckSquare, () => insertTaskList(), "Task list")}

                <span className="mx-1 h-5 w-px bg-border" />

                {/* Blocks & embeds */}
                {toolbarBtn(Code, () => insertCodeBlock(), "Code block")}
                {toolbarBtn(Quote, () => applyLinePrefix("> "), "Blockquote")}
                {toolbarBtn(TableIcon, () => insertTable(), "Table")}
                {/* {toolbarBtn(ImageIcon, () => insertImage(), "Image")} */}
                {toolbarBtn(Minus, () => insertHr(), "Horizontal rule")}

                {/* {preview === "toggle" && (
                    <button
                        type="button"
                        onClick={() => setShowPreview((p) => !p)}
                        className="ml-auto text-[11px] px-2 py-1 rounded border bg-background hover:bg-muted transition"
                        aria-label="Toggle preview"
                    >
                        {showPreview ? "Edit" : "Preview"}
                    </button>
                )} */}
                {preview === "split" && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">Split View</span>}
            </div>

            <div className={cn(preview === "split" ? "grid gap-0 md:grid-cols-2" : "block", "min-w-0 w-full")}>
                {(!showPreview || preview === "split") && (
                    <textarea
                        ref={textareaRef}
                        value={internal}
                        onChange={(e) => setInternal(e.target.value)}
                        placeholder={placeholder}
                        style={{ minHeight }}
                        className={cn(
                            "w-full resize-y bg-transparent p-2 text-xs font-mono leading-snug outline-none",
                            preview === "split" && "border-r"
                        )}
                    />
                )}
                {(showPreview || preview === "split") && (
                    <div
                        className={cn(
                            "p-2 overflow-auto text-xs prose prose-sm dark:prose-invert max-w-none",
                            preview === "split" ? "" : "min-h-[140px]"
                        )}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                )}
            </div>
        </div>
    );
}

export const MarkdownEditor = React.memo(MarkdownEditorInner);
