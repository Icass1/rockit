"use client";

import type { JSX } from "react";
import type { BookmarkResponse } from "@/dto";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { usePlaybackStore } from "@/hooks/usePlaybackStore";
import { getCurrentBookmark } from "@/lib/managers/bookmarkManager";
import { usePlaybackServices } from "@/components/providers/PlaybackProvider";

const EMPTY_BOOKMARKS: BookmarkResponse[] = [];

export default function CurrentBookmark({
    mediaPublicId,
}: {
    mediaPublicId: string;
}): JSX.Element {
    const { bookmarkManager, mediaPlayerManager } = usePlaybackServices();
    const bookmarks = usePlaybackStore(
        bookmarkManager.currentMediaBookmarksAtom,
        EMPTY_BOOKMARKS
    );
    const currentTime = usePlaybackStore(
        mediaPlayerManager.currentTimeAtom,
        null
    );
    const reducedMotion = useReducedMotion();
    const bookmark = getCurrentBookmark(bookmarks, mediaPublicId, currentTime);
    const name = bookmark?.description?.trim();

    return (
        <div className="grid overflow-hidden">
            <span className="sr-only" aria-live="polite" aria-atomic="true">
                {name}
            </span>
            <AnimatePresence initial={false}>
                {bookmark && name && (
                    <motion.div
                        key={`${bookmark.publicId}:${name}`}
                        aria-hidden="true"
                        className="col-start-1 row-start-1 min-w-0"
                        initial={{
                            opacity: 0,
                            y: reducedMotion ? 0 : 10,
                            filter: reducedMotion ? "none" : "blur(4px)",
                        }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{
                            opacity: 0,
                            y: reducedMotion ? 0 : -10,
                            filter: reducedMotion ? "none" : "blur(4px)",
                        }}
                        transition={{
                            duration: reducedMotion ? 0 : 0.3,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <div className="border-on-media/15 bg-backdrop/40 text-on-media mt-3 flex w-fit max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium backdrop-blur-md">
                            <Bookmark
                                aria-hidden="true"
                                className="text-primary h-3.5 w-3.5 shrink-0"
                            />
                            <span className="truncate" title={name}>
                                {name}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
