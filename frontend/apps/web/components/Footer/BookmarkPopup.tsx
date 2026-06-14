"use client";

import type { JSX } from "react";
import { useState, useRef, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { Bookmark, BookmarkCheck, ChevronDown, Trash2 } from "lucide-react";
import { type BookmarkResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

interface BookmarkPopupProps {
    onClose: () => void;
}

const MODES = ["NOTHING", "AUTOSKIP"] as const;
type Mode = (typeof MODES)[number];

const MODE_ICONS: Record<Mode, typeof Bookmark> = {
    NOTHING: Bookmark,
    AUTOSKIP: BookmarkCheck,
};

const MODE_LABELS: Record<Mode, string> = {
    NOTHING: "Marker",
    AUTOSKIP: "Auto-skip",
};

export default function BookmarkPopup({ onClose }: BookmarkPopupProps): JSX.Element {
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentMediaBookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );

    const [description, setDescription] = useState("");
    const [mode, setMode] = useState<Mode>("NOTHING");
    const [editingBookmark, setEditingBookmark] =
        useState<BookmarkResponse | null>(null);
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    // Timestamp is derived from current time or existing bookmark; stored as formatted text only
    const [timestampText, setTimestampText] = useState("0:00");

    const popupRef = useRef<HTMLDivElement>(null);
    const modeBtnRef = useRef<HTMLButtonElement>(null);
    const modeDropdownRef = useRef<HTMLDivElement>(null);

    const existingAtCurrentTime = $currentMediaBookmarks.find(
        (b): boolean => Math.abs(b.timestamp - $currentTime) < 0.5
    );

    useEffect(() => {
        const ts = existingAtCurrentTime
            ? existingAtCurrentTime.timestamp
            : ($currentTime ?? 0);

        setTimestampText(getTime(ts));
        if (existingAtCurrentTime) {
            setEditingBookmark(existingAtCurrentTime);
            setDescription(existingAtCurrentTime.description ?? "");
            setMode(existingAtCurrentTime.mode as Mode);
        } else {
            setEditingBookmark(null);
            setDescription("");
            setMode("NOTHING");
        }
    }, [existingAtCurrentTime?.publicId, $currentMedia?.publicId, $currentTime]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleDropdownOutside = (e: MouseEvent): void => {
            if (
                modeDropdownRef.current &&
                !modeDropdownRef.current.contains(e.target as Node) &&
                modeBtnRef.current &&
                !modeBtnRef.current.contains(e.target as Node)
            ) {
                setShowModeDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("mousedown", handleDropdownOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("mousedown", handleDropdownOutside);
        };
    }, [onClose]);

    if (!$currentMedia) return <></>;

    const parseTimestamp = (text: string): number => {
        const parts = text.split(":").map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return Number(text) || 0;
    };

    const handleSave = async (): Promise<void> => {
        const ts = parseTimestamp(timestampText);
        if (editingBookmark) {
            await rockIt.bookmarkManager.updateBookmarkAsync(
                editingBookmark.publicId,
                ts,
                description || null,
                mode
            );
        } else {
            await rockIt.bookmarkManager.createBookmarkAsync(
                ts,
                description || null,
                mode
            );
        }
        onClose();
    };

    const handleDelete = async (): Promise<void> => {
        if (editingBookmark) {
            await rockIt.bookmarkManager.deleteBookmarkAsync(
                editingBookmark.publicId
            );
        }
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === "Enter") {
            handleSave();
        }
    };

    const ModeIcon = MODE_ICONS[mode];

    return (
        <div
            ref={popupRef}
            className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-lg border border-neutral-700 bg-[#1a1a1a] p-2 shadow-xl"
        >
            {/* Title row + Save */}
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">
                    {editingBookmark ? "Edit bookmark" : "New bookmark"}
                </span>
                <div className="flex items-center gap-1">
                    <input
                        type="text"
                        value={timestampText}
                        onChange={(e): void => setTimestampText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-12 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-[10px] text-neutral-300 outline-none focus:border-[#ee1086]"
                    />
                    {editingBookmark && (
                        <button
                            onClick={handleDelete}
                            className="rounded p-1 text-neutral-500 transition-colors hover:text-red-400"
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="rounded bg-[#ee1086] px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#fb6467]"
                    >
                        Save
                    </button>
                </div>
            </div>

            {/* Label input + mode toggle */}
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={description}
                    onChange={(e): void => setDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Label (optional)"
                    className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-white outline-none placeholder:text-neutral-500 focus:border-[#ee1086]"
                />
                <div className="relative">
                    <button
                        ref={modeBtnRef}
                        onClick={(): void =>
                            setShowModeDropdown(!showModeDropdown)
                        }
                        className="flex items-center gap-0.5 rounded px-1.5 py-1 text-neutral-400 transition-colors hover:text-white"
                        title={MODE_LABELS[mode]}
                    >
                        <ModeIcon className="h-3.5 w-3.5" />
                        <ChevronDown className="h-2.5 w-2.5" />
                    </button>

                    {showModeDropdown && (
                        <div
                            ref={modeDropdownRef}
                            className="absolute right-0 top-full z-50 mt-1 w-28 rounded-lg border border-neutral-700 bg-[#1a1a1a] py-1 shadow-xl"
                        >
                            {MODES.map((m): JSX.Element => {
                                const Icon = MODE_ICONS[m];
                                return (
                                    <button
                                        key={m}
                                        onClick={(): void => {
                                            setMode(m);
                                            setShowModeDropdown(false);
                                        }}
                                        className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-xs transition-colors ${
                                            m === mode
                                                ? "text-white"
                                                : "text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        <span>{MODE_LABELS[m]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
