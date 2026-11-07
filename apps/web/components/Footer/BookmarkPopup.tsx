"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { type BookmarkResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    Bookmark,
    BookmarkCheck,
    ChevronDown,
    Pencil,
    Plus,
    Repeat1,
    SkipBack,
    Trash2,
    X,
} from "lucide-react";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

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

function BookmarkEditForm({
    bookmark,
    onBack,
}: {
    bookmark: BookmarkResponse | null;
    onBack: () => void;
}): JSX.Element {
    const $vocabulary = useVocabulary();
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);

    const [description, setDescription] = useState(bookmark?.description ?? "");
    const [mode, setMode] = useState<EBookmarkModes>(
        (bookmark?.mode as EBookmarkModes) ?? EBookmarkModes.Nothing
    );
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [timestampText, setTimestampText] = useState(
        getTime(bookmark?.timestamp ?? $currentTime ?? 0)
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
        if (bookmark) {
            await rockIt.bookmarkManager.updateBookmarkAsync(
                bookmark.publicId,
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
        onBack();
    };

    const handleDelete = async (): Promise<void> => {
        if (bookmark) {
            await rockIt.bookmarkManager.deleteBookmarkAsync(bookmark.publicId);
        }
        onBack();
    };

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === "Enter") handleSave();
    };

    const ModeIcon = MODE_ICONS[mode];

    return (
        <>
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <button
                        onClick={onBack}
                        className="ignore-click-player-ui text-subtle-foreground hover:text-foreground-strong rounded p-0.5"
                        title="Back"
                    >
                        <ChevronDown className="ignore-click-player-ui h-3.5 w-3.5 rotate-90" />
                    </button>
                    <span className="text-muted-foreground text-xs font-semibold">
                        {bookmark
                            ? $vocabulary.EDIT_BOOKMARK
                            : $vocabulary.NEW_BOOKMARK}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        type="text"
                        value={timestampText}
                        onChange={(e): void => setTimestampText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="border-border bg-muted text-foreground focus:border-primary w-12 rounded border px-1 py-0.5 text-[10px] outline-none"
                    />
                    {bookmark && (
                        <button
                            onClick={handleDelete}
                            className="ignore-click-player-ui text-subtle-foreground hover:text-destructive-soft rounded p-1 transition-colors"
                            title={$vocabulary.DELETE}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="ignore-click-player-ui bg-primary text-primary-foreground hover:bg-brand-light rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
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
                    className="border-border bg-muted text-foreground-strong placeholder:text-subtle-foreground focus:border-primary min-w-0 flex-1 rounded border px-2 py-1 text-xs outline-none"
                />
                <div className="relative">
                    <button
                        ref={modeBtnRef}
                        onClick={(): void =>
                            setShowModeDropdown(!showModeDropdown)
                        }
                        className="text-muted-foreground hover:text-foreground-strong flex items-center gap-0.5 rounded px-1.5 py-1 transition-colors"
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
                            className="border-border bg-secondary absolute top-full right-0 z-50 mt-1 max-h-20 w-56 overflow-y-auto rounded-lg border py-1 shadow-xl"
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
                                                    ? "text-foreground-strong"
                                                    : "text-muted-foreground hover:text-foreground-strong"
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
    className = "absolute right-0 bottom-full z-50 mb-2 w-72 rounded-xl border border-foreground-strong/10 bg-secondary p-3 shadow-2xl",
}: {
    onClose: () => void;
    className?: string;
}): JSX.Element {
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentMediaBookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const $editingBookmark = useStore(
        rockIt.bookmarkManager.editingBookmarkAtom
    );
    const $vocabulary = useVocabulary();

    const [userOverride, setUserOverride] = useState<
        BookmarkResponse | "new" | null | undefined
    >(undefined);

    const formBookmark =
        userOverride !== undefined ? userOverride : $editingBookmark;

    const popupRef = useRef<HTMLDivElement>(null);

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

    const sortedBookmarks = [...$currentMediaBookmarks].sort(
        (a, b) => a.timestamp - b.timestamp
    );

    const handleBackToList = (): void => {
        setUserOverride(null);
        rockIt.bookmarkManager.clearEditingBookmark();
    };

    if (formBookmark === undefined) return <></>;

    if (formBookmark) {
        return (
            <div ref={popupRef} className={className}>
                <BookmarkEditForm
                    bookmark={formBookmark === "new" ? null : formBookmark}
                    onBack={handleBackToList}
                />
            </div>
        );
    }

    return (
        <div ref={popupRef} className={className}>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-semibold">
                    {$vocabulary.BOOKMARKS}
                </span>
                <button
                    onClick={onClose}
                    className="text-subtle-foreground hover:text-foreground-strong rounded p-0.5"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {sortedBookmarks.length === 0 && (
                    <p className="text-subtle-foreground py-2 text-center text-xs">
                        {$vocabulary.NO_BOOKMARKS}
                    </p>
                )}
                {sortedBookmarks.map((bookmark) => (
                    <div
                        key={bookmark.publicId}
                        className="group hover:bg-muted flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors"
                    >
                        <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                            style={{
                                backgroundColor:
                                    BOOKMARK_MODE_COLORS[bookmark.mode],
                            }}
                        />

                        <button
                            onClick={(): void => {
                                rockIt.mediaPlayerManager.setCurrentTime(
                                    bookmark.timestamp,
                                    true
                                );
                                onClose();
                            }}
                            className="ignore-click-player-ui min-w-0 flex-1 text-left"
                        >
                            <span className="ignore-click-player-ui text-foreground-strong text-xs font-medium">
                                {getTime(bookmark.timestamp)}
                            </span>
                            {bookmark.description && (
                                <p className="ignore-click-player-ui text-muted-foreground truncate text-[10px]">
                                    {bookmark.description}
                                </p>
                            )}
                        </button>

                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                                onClick={(): void => setUserOverride(bookmark)}
                                className="text-subtle-foreground hover:text-foreground-strong rounded p-1 transition-colors"
                                title="Edit"
                            >
                                <Pencil className="h-3 w-3" />
                            </button>
                            <button
                                onClick={async (): Promise<void> => {
                                    await rockIt.bookmarkManager.deleteBookmarkAsync(
                                        bookmark.publicId
                                    );
                                }}
                                className="text-subtle-foreground hover:text-destructive-soft rounded p-1 transition-colors"
                                title={$vocabulary.DELETE}
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={(): void => setUserOverride("new")}
                className="ignore-click-player-ui border-border text-muted-foreground hover:border-border-strong hover:text-foreground-strong mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors"
            >
                <Plus className="ignore-click-player-ui h-3 w-3" />
                {$vocabulary.ADD_BOOKMARK_AT} {getTime($currentTime ?? 0)}
            </button>
        </div>
    );
}
