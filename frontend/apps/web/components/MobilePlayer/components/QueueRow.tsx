"use client";

import type { JSX } from "react";
import { getMediaArtistsString, type TPlayableMedia } from "@rockit/shared";
import { GripVertical, Trash2 } from "lucide-react";

interface QueueRowProps {
    media: TPlayableMedia;
    index: number;
    isActive: boolean;
    isDragging: boolean;
    isDropTarget: boolean;
    registerRow: (index: number, el: HTMLElement | null) => void;
    onDragHandlePointerDown: (e: React.PointerEvent) => void;
    onDelete: () => void;
    onPlay: () => void;
}

export default function QueueRow({
    media,
    index,
    isActive,
    isDragging,
    isDropTarget,
    registerRow,
    onDragHandlePointerDown,
    onDelete,
    onPlay,
}: QueueRowProps): JSX.Element {
    return (
        <div
            ref={(el: HTMLElement | null) => registerRow(index, el)}
            className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                isActive ? "bg-(--color-rockit-pink)/10" : ""
            } ${
                isDropTarget
                    ? "border-t-2 border-(--color-rockit-pink)"
                    : "border-t-2 border-transparent"
            } ${isDragging ? "opacity-60" : ""}`}
        >
            <button
                type="button"
                onClick={onPlay}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={media.imageUrl}
                    alt=""
                    loading="lazy"
                    className={`h-11.5 w-11.5 shrink-0 rounded bg-(--color-surface) object-cover ${
                        isActive ? "opacity-60" : ""
                    }`}
                />
                <div className="min-w-0 flex-1">
                    <p
                        className={`truncate text-sm font-semibold ${
                            isActive
                                ? "text-(--color-rockit-pink)"
                                : "text-white"
                        }`}
                    >
                        {media.name}
                    </p>
                    <p className="truncate text-xs text-(--color-muted)">
                        {getMediaArtistsString(media)}
                    </p>
                </div>
            </button>

            <button
                type="button"
                onClick={onDelete}
                className="flex h-9 w-9 shrink-0 items-center justify-center text-white/40"
                aria-label="Quitar de la cola"
            >
                <Trash2 size={18} />
            </button>

            {/* Drag handle — the ONLY element that starts a reorder drag */}
            <button
                type="button"
                onPointerDown={onDragHandlePointerDown}
                className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-white/35"
                aria-label="Reordenar"
            >
                <GripVertical size={18} />
            </button>
        </div>
    );
}
