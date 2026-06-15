"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { ERepeatMode, isStation } from "@rockit/shared";
import { getMediaDuration } from "@/models/types/media";
import { BOOKMARK_MODE_COLORS, BOOKMARK_MODE_MUTED_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import BookmarkTooltip from "@/components/Bookmark/BookmarkTooltip";

export default function Bookmarks(): JSX.Element {
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $repeatMode = useStore(rockIt.userManager.repeatModeAtom);
    const $triggeredPublicIds = useStore(
        rockIt.mediaPlayerManager.triggeredBookmarkPublicIdsAtom
    );
    const isLiveStation = $currentMedia && isStation($currentMedia);

    if (isLiveStation || !$currentMedia) return <></>;

    const duration = getMediaDuration($currentMedia) ?? 1;
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
                const modeColor = isDisabled || isUsed
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
                            rockIt.mediaPlayerManager.setCurrentTime(
                                b.timestamp,
                                true
                            )
                        }
                        onContextMenu={(e): void => {
                            e.preventDefault();
                            rockIt.bookmarkManager.openEditForBookmark(b.publicId);
                        }}
                    >
                        <div
                            className="absolute left-1/2 top-1/2 h-full w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-t-md rounded-b-md transition-transform hover:scale-x-[166%] hover:scale-y-[225%]"
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
