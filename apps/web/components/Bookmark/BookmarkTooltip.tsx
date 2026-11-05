"use client";

import type { CSSProperties, JSX, ReactNode } from "react";

interface BookmarkTooltipProps {
    children: ReactNode;
    text: string;
    style?: CSSProperties;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export default function BookmarkTooltip({
    children,
    text,
    style,
    onClick,
    onContextMenu,
}: BookmarkTooltipProps): JSX.Element {
    return (
        <div
            className="group absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2"
            style={style}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {children}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-80 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="bg-muted text-foreground-strong rounded-md px-2 py-1 text-xs shadow-lg">
                    {text}
                </div>
                <div className="border-t-border-subtle absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" />
            </div>
        </div>
    );
}
