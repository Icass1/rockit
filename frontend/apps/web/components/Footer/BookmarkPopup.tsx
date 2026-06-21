"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { type BookmarkResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    Bookmark,
    BookmarkCheck,
    ChevronDown,
    Repeat1,
    SkipBack,
    Trash2,
} from "lucide-react";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

enum EBookmarkModes {
    Nothing = "NOTHING",
    Autoskip = "AUTOSKIP",
    RepeatFromBeginning = "REPEAT_FROM_BEGINNING",
    PreviousBookmark = "PREVIOUS_BOOKMARK",
}

const MODE_ICONS: Record<
    EBookmarkModes,
    typeof Bookmark | typeof Repeat1 | typeof SkipBack
> = {
    [EBookmarkModes.Nothing]: Bookmark,
    [EBookmarkModes.Autoskip]: BookmarkCheck,
    [EBookmarkModes.RepeatFromBeginning]: Repeat1,
    [EBookmarkModes.PreviousBookmark]: SkipBack,
};

function BookmarkPopupForm({
    existingAtCurrentTime,
    currentTime,
    onClose,
}: {
    existingAtCurrentTime: BookmarkResponse | undefined;
    currentTime: number | null;
    onClose: () => void;
}): JSX.Element {
    const editingBookmark = existingAtCurrentTime ?? null;
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [description, setDescription] = useState(
        editingBookmark?.description ?? ""
    );
    const [mode, setMode] = useState<EBookmarkModes>(
        (editingBookmark?.mode as EBookmarkModes) ?? EBookmarkModes.Nothing
    );
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [timestampText, setTimestampText] = useState(
        getTime(editingBookmark?.timestamp ?? currentTime ?? 0)
    );

    const modeBtnRef = useRef<HTMLButtonElement>(null);
    const modeDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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
        document.addEventListener("mousedown", handleDropdownOutside);
        return () => {
            document.removeEventListener("mousedown", handleDropdownOutside);
        };
    }, []);

    const parseTimestamp = (text: string): number => {
        const parts = text.split(":").map(Number);
        if (parts.length === 3)
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
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
        <>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">
                    {editingBookmark
                        ? $vocabulary.EDIT_BOOKMARK
                        : $vocabulary.NEW_BOOKMARK}
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
                            title={$vocabulary.DELETE}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="rounded bg-[#ee1086] px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#fb6467]"
                    >
                        {$vocabulary.SAVE}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={description}
                    onChange={(e): void => setDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={$vocabulary.BOOKMARK_DESCRIPTION_PLACEHOLDER}
                    className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-white outline-none placeholder:text-neutral-500 focus:border-[#ee1086]"
                />
                <div className="relative">
                    <button
                        ref={modeBtnRef}
                        onClick={(): void =>
                            setShowModeDropdown(!showModeDropdown)
                        }
                        className="flex items-center gap-0.5 rounded px-1.5 py-1 text-neutral-400 transition-colors hover:text-white"
                        title={$vocabulary[mode]}
                    >
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{
                                backgroundColor: BOOKMARK_MODE_COLORS[mode],
                            }}
                        />
                        <ModeIcon className="h-3.5 w-3.5" />
                        <ChevronDown className="h-2.5 w-2.5" />
                    </button>

                    {showModeDropdown && (
                        <div
                            ref={modeDropdownRef}
                            className="absolute top-full right-0 z-50 mt-1 max-h-20 w-56 overflow-y-auto rounded-lg border border-neutral-700 bg-[#1a1a1a] py-1 shadow-xl"
                        >
                            {Object.values(EBookmarkModes).map(
                                (m): JSX.Element => {
                                    const Icon = MODE_ICONS[m];
                                    return (
                                        <button
                                            key={m}
                                            onClick={(): void => {
                                                setMode(m);
                                                setShowModeDropdown(false);
                                            }}
                                            className={`ignore-click-player-ui flex w-full items-center gap-2 px-2.5 py-1.5 text-xs transition-colors ${
                                                m === mode
                                                    ? "text-white"
                                                    : "text-neutral-400 hover:text-white"
                                            }`}
                                        >
                                            <span
                                                className="ignore-click-player-ui h-2 w-2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        BOOKMARK_MODE_COLORS[m],
                                                }}
                                            />
                                            <Icon className="ignore-click-player-ui h-3.5 w-3.5" />
                                            <span className="ignore-click-player-ui">
                                                {$vocabulary[m]}
                                            </span>
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function BookmarkPopup({
    onClose,
}: {
    onClose: () => void;
}): JSX.Element {
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentMediaBookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const $editingBookmark = useStore(
        rockIt.bookmarkManager.editingBookmarkAtom
    );

    const popupRef = useRef<HTMLDivElement>(null);

    const existingAtCurrentTime = $editingBookmark
        ? $editingBookmark
        : $currentMediaBookmarks.find(
              (b): boolean => Math.abs(b.timestamp - $currentTime) < 0.5
          );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (
                popupRef.current &&
                !popupRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    if (!$currentMedia) return <></>;

    const popupContentKey = `${
        $currentMedia.publicId
    }-${existingAtCurrentTime?.publicId ?? "new"}`;

    return (
        <div
            ref={popupRef}
            className="absolute right-0 bottom-full z-50 mb-2 w-64 rounded-lg border border-neutral-700 bg-[#1a1a1a] p-2 shadow-xl"
        >
            <div key={popupContentKey}>
                <BookmarkPopupForm
                    existingAtCurrentTime={existingAtCurrentTime}
                    currentTime={$currentTime}
                    onClose={onClose}
                />
            </div>
        </div>
    );
}
