"use client";

import type { JSX } from "react";
import type { BookmarkResponse } from "@/dto";
import { ERepeatMode, isStation } from "@rockit/shared";
import { getMediaDuration } from "@/models/types/media";
import { useCurrentMedia, usePlaybackStore } from "@/hooks/usePlaybackStore";
import {
    BOOKMARK_MODE_COLORS,
    BOOKMARK_MODE_MUTED_COLORS,
} from "@/lib/managers/bookmarkManager";
import { getTime } from "@/lib/utils/getTime";
import BookmarkTooltip from "@/components/Bookmark/BookmarkTooltip";
import { usePlaybackServices } from "@/components/providers/PlaybackProvider";
import { useInitialPlayback } from "@/components/providers/QueueProvider";

const EMPTY_BOOKMARKS: BookmarkResponse[] = [];
const EMPTY_IDS: string[] = [];

export default function Bookmarks(): JSX.Element {
    const { mediaPlayerManager, userManager, bookmarkManager } =
        usePlaybackServices();
    const { session } = useInitialPlayback();
    const $currentMedia = useCurrentMedia();
    const duration =
        usePlaybackStore(
            mediaPlayerManager.durationAtom,
            getMediaDuration($currentMedia) ?? 0
        ) || 1;
    const $bookmarks = usePlaybackStore(
        bookmarkManager.currentMediaBookmarksAtom,
        EMPTY_BOOKMARKS
    );
    const $repeatMode = usePlaybackStore(
        userManager.repeatModeAtom,
        ERepeatMode[session?.repeatMode ?? "OFF"]
    );
    const $triggeredPublicIds = usePlaybackStore(
        mediaPlayerManager.triggeredBookmarkPublicIdsAtom,
        EMPTY_IDS
    );
    const isLiveStation = $currentMedia && isStation($currentMedia);

    if (isLiveStation || !$currentMedia) return <></>;

    const currentPublicId = $currentMedia.publicId;

    const filtered = $bookmarks.filter(
        (b) => b.mediaPublicId === currentPublicId
    );

    return (
        <>
            {filtered.map((b) => {
                const left = `${Math.min(100, Math.max(0, (b.timestamp / duration) * 100))}%`;
                const isDisabled =
                    $repeatMode === ERepeatMode.OFF &&
                    b.mode === "PREVIOUS_BOOKMARK";
                const isUsed =
                    $repeatMode === ERepeatMode.ALL &&
                    $triggeredPublicIds.includes(b.publicId);
                const modeColor =
                    isDisabled || isUsed
                        ? BOOKMARK_MODE_MUTED_COLORS[b.mode]
                        : BOOKMARK_MODE_COLORS[b.mode];

                return (
                    <BookmarkTooltip
                        key={b.publicId}
                        text={b.description ?? `${getTime(b.timestamp)}`}
                        style={{
                            left,
                        }}
                        onClick={(): void =>
                            mediaPlayerManager.setCurrentTime(b.timestamp, true)
                        }
                        onContextMenu={(e): void => {
                            e.preventDefault();
                            bookmarkManager.openEditForBookmark(b.publicId);
                        }}
                    >
                        <div
                            className="absolute top-1/2 left-1/2 h-full w-1 -translate-x-1/2 -translate-y-1/2 rounded-t-md rounded-b-md transition-transform hover:scale-x-166 hover:scale-y-225"
                            style={
                                isDisabled || isUsed
                                    ? {
                                          backgroundColor: modeColor,
                                          opacity: 0.45,
                                      }
                                    : {
                                          backgroundColor: modeColor,
                                      }
                            }
                        ></div>
                    </BookmarkTooltip>
                );
            })}
        </>
    );
}
