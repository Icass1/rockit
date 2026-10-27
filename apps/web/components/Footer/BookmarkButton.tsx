"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { Bookmark } from "lucide-react";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";
import BookmarkPopup from "@/components/Footer/BookmarkPopup";

export default function BookmarkButton(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentMediaBookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $showPopup = useStore(rockIt.bookmarkManager.showPopupAtom);

    const bookmarkAtCurrentTime = $currentMediaBookmarks.find(
        (b): boolean => Math.abs(b.timestamp - ($currentTime ?? 0)) < 0.5
    );

    if (!$currentMedia) return <></>;

    return (
        <div className="relative">
            <button
                aria-label="Bookmark"
                onClick={(): void => rockIt.bookmarkManager.togglePopup()}
                className="flex items-center justify-center transition-colors hover:text-white"
            >
                <Bookmark
                    className={`h-4.5 w-4.5 transition-all ${
                        bookmarkAtCurrentTime ? "" : "fill-none text-gray-400"
                    }`}
                    style={
                        bookmarkAtCurrentTime
                            ? {
                                  fill: BOOKMARK_MODE_COLORS[
                                      bookmarkAtCurrentTime.mode
                                  ],
                                  color: BOOKMARK_MODE_COLORS[
                                      bookmarkAtCurrentTime.mode
                                  ],
                              }
                            : undefined
                    }
                />
            </button>

            {$showPopup && (
                <BookmarkPopup
                    onClose={(): void => rockIt.bookmarkManager.hidePopup()}
                />
            )}
        </div>
    );
}
