"use client";

import type { CSSProperties, JSX, ReactNode } from "react";

interface BookmarkTooltipProps {
    children: ReactNode;
    text: string;
    style?: CSSProperties;
}

export default function BookmarkTooltip({
    children,
    text,
    style,
}: BookmarkTooltipProps): JSX.Element {
    return (
        <div
            className="group absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2"
            style={style}
        >
            {children}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="rounded-md bg-neutral-800 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
                    {text}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
            </div>
        </div>
    );
}
