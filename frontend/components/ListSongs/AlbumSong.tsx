"use client";

import { useMemo, useState } from "react";
import { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { CheckCircle2, EllipsisVertical } from "lucide-react";
import useWindowSize from "@/hooks/useWindowSize";
import { AlbumManager } from "@/lib/managers/albumManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { networkStatus } from "@/lib/stores/networkStatus";
import { getTime } from "@/lib/utils/getTime";
import LikeButton from "@/components/LikeButton";
import SongContextMenu from "@/components/ListSongs/SongContextMenu";

export default function AlbumSong({
    song,
    index,
}: {
    song: BaseSongWithAlbumResponse;
    index: number;
}) {
    const [hovered, setHovered] = useState(false);
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $currentList = useStore(rockIt.queueManager.currentListAtom);
    const $songsInIndexedDB = useStore(
        rockIt.indexedDBManager.songsInIndexedDBAtom
    );

    const $networkStatus = useStore(networkStatus);
    const { width: innerWidth } = useWindowSize();

    const songUnavailable = useMemo(() => {
        const offline = $networkStatus === "offline";
        const inCache = $songsInIndexedDB?.includes(song.publicId);
        const downloaded = song.downloaded;

        if (downloaded) return false;
        if (offline && inCache) return false;

        return true;
    }, [$songsInIndexedDB, $networkStatus, song.downloaded, song.publicId]);

    const songPlaying = useMemo(() => {
        return (
            $queue.find((song) => song.queueMediaId == $currentQueueMediaId)
                ?.listPublicId == $currentList &&
            $queue.find((song) => song.queueMediaId == $currentQueueMediaId)
                ?.song.publicId == song.publicId
        );
    }, [song.publicId, $currentList, $queue, $currentQueueMediaId]);

    if (!$queue) return <div></div>;

    return (
        <SongContextMenu song={song}>
            <div
                className={
                    "grid select-none grid-cols-[min-content_1fr_min-content_min-content_40px] items-center gap-2 rounded py-[0.5rem] transition-colors md:select-text md:gap-4 md:px-2 md:py-[0.65rem]" +
                    (songUnavailable ? " pointer-events-none opacity-40" : "") +
                    (songPlaying ? " text-[#ec5588]" : "")
                }
                onClick={() =>
                    AlbumManager.playAlbum(
                        rockIt.currentListManager.currentListSongsAtom.get(),
                        "album",
                        song.album.publicId,
                        song.publicId
                    )
                }
                onMouseEnter={() => {
                    setHovered(true);
                }}
                onMouseLeave={() => {
                    setHovered(false);
                }}
            >
                <label className="text-md w-6 text-center text-white/80">
                    {index + 1}
                </label>
                <div
                    className={
                        "grid w-full min-w-0 max-w-full grid-cols-[1fr_max-content] items-center gap-1 truncate text-base font-semibold md:text-clip" +
                        (songPlaying ? " text-[#ec5588]" : "")
                    }
                >
                    <label className="w-auto min-w-0 max-w-full truncate">
                        {song.name}
                    </label>
                </div>
                {$songsInIndexedDB?.includes(song.publicId) ? (
                    <div className="min-h-6 min-w-6">
                        <CheckCircle2 className="flex h-full w-full text-[#ec5588]" />
                    </div>
                ) : (
                    <div></div>
                )}
                <LikeButton mediaPublicId={song.publicId} />

                <label className="flex min-w-7 select-none items-center justify-center text-sm text-white/80">
                    {hovered && (innerWidth ?? 0) > 768 ? (
                        <EllipsisVertical
                            className="h-5 w-5 text-gray-400 md:hover:scale-105 md:hover:text-white"
                            onClick={() => {
                                console.warn("AblumSong options");
                            }}
                        />
                    ) : (
                        getTime(song.duration)
                    )}
                </label>
            </div>
        </SongContextMenu>
    );
}
