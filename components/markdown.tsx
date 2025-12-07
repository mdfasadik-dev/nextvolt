"use client";
import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import clsx from 'clsx';

interface MarkdownProps {
    content: string | null | undefined;
    className?: string;
    emptyFallback?: React.ReactNode;
}

export function Markdown({ content, className, emptyFallback = null }: MarkdownProps) {
    const [html, setHtml] = useState<string>('');
    const isClient = typeof window !== 'undefined';
    // Pre-parse markdown (pure) – identical on server & client
    const raw = useMemo(() => {
        if (!content) return '';
        return marked.parse(content) as string;
    }, [content]);

    useEffect(() => {
        if (!content || !isClient) return;
        try {
            // Cast to any to satisfy DOMPurify factory expectations in TS when using ESM
            const purifier = createDOMPurify((window as unknown) as any);
            setHtml(purifier.sanitize(raw));
        } catch {
            // Fallback to unsanitized (already minimal) if DOMPurify fails
            setHtml(raw);
        }
    }, [content, raw, isClient]);

    if (!content) return emptyFallback as any;

    // While hydrating / before effect runs, avoid mismatch by rendering empty safe container
    const safeHtml = html || '';
    return (
        // eslint-disable-next-line react/no-danger
        <div
            suppressHydrationWarning
            className={clsx(
                'prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-li:marker:text-muted-foreground prose-table:rounded-md prose-th:bg-muted prose-th:text-xs prose-td:text-xs prose-code:text-primary',
                className
            )}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
    );
}
