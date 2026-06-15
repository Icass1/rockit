"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { isStation } from "@rockit/packages/shared";
import { getMediaDuration } from "@/models/types/media";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import BookmarkTooltip from "@/components/Bookmark/BookmarkTooltip";

export default function Bookmarks(): JSX.Element {
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
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
                return (
                    <BookmarkTooltip
                        key={b.publicId}
                        text={b.description ?? `${getTime(b.timestamp)}`}
                        style={{ left }}
                    >
                        <button
                            onClick={(): void =>
                                rockIt.mediaPlayerManager.setCurrentTime(
                                    b.timestamp,
                                    true
                                )
                            }
                            className="absolute h-2 w-2 rounded-full transition-transform hover:scale-150"
                            style={{
                                backgroundColor: BOOKMARK_MODE_COLORS[b.mode],
                            }}
                        />
                    </BookmarkTooltip>
                );
            })}
        </>
    );
}
