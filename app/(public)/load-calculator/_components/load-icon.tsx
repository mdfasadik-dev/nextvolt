"use client";

import Image from "next/image";
import { Lightbulb } from "lucide-react";
import { getLoadIcon } from "@/lib/constants/load-icons";

type IconProps = { name?: string | null; className?: string };

/**
 * Icons are stored as a key from LOAD_ICON_OPTIONS, or an image URL.
 * Falls back to a bulb so an unknown key never breaks the grid.
 */
export function LoadIcon({ name, className = "h-7 w-7" }: IconProps) {
    if (!name) return <Lightbulb className={className} strokeWidth={1.5} />;

    if (/^https?:\/\//i.test(name)) {
        return (
            <span className={`relative inline-block ${className}`}>
                <Image src={name} alt="" fill sizes="32px" className="object-contain" />
            </span>
        );
    }

    const Resolved = getLoadIcon(name);
    if (!Resolved) return <Lightbulb className={className} strokeWidth={1.5} />;
    return <Resolved className={className} strokeWidth={1.5} />;
}
