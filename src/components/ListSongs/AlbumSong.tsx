"use client";

import { queue, queueIndex, songsInIndexedDB } from "@/stores/audio";
import { getTime } from "@/lib/getTime";
import LikeButton from "@/components/LikeButton";
import { EllipsisVertical, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { currentList, currentListSongs } from "@/stores/currentList";
import { songHandleClick } from "./HandleClick";
import SongContextMenu from "./SongContextMenu";
import type { SongDB } from "@/db/song";
import { networkStatus } from "@/stores/networkStatus";

export default function AlbumSong({
    song,
    index,
}: {
    song: SongDB<
        | "image"
        | "id"
        | "name"
        | "artists"
        | "albumId"
        | "albumName"
        | "path"
        | "duration"
    >;
    index: number;
}) {
    const [hovered, setHovered] = useState(false);
    const $queue = useStore(queue);
    const $queueIndex = useStore(queueIndex);
    const $currentList = useStore(currentList);
    const $songsInIndexedDB = useStore(songsInIndexedDB);
    const $networkStatus = useStore(networkStatus);

    const [_song, setSong] =
        useState<
            SongDB<
                | "image"
                | "id"
                | "name"
                | "artists"
                | "albumId"
                | "albumName"
                | "path"
                | "duration"
            >
        >(song);

    useEffect(() => {
        console.warn("TODO");
        setSong((value) => value);
    }, []);

    const handleOpenOptions = (
        e: React.MouseEvent<SVGSVGElement, MouseEvent>
    ) => {
        e.stopPropagation();
    };

    if (!$queue) return <div></div>;

    return (
        <SongContextMenu song={_song}>
            <div
                className={
                    "grid grid-cols-[min-content_1fr_min-content_min-content_40px] items-center gap-2 rounded py-[0.5rem] transition-colors select-none md:gap-4 md:px-2 md:py-[0.65rem] md:select-text " +
                    // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                    ((($networkStatus == "offline" &&
                        !songsInIndexedDB.get()?.includes(_song.id)) ||
                        !_song.path) &&
                        "pointer-events-none opacity-40") +
                    ($queue.find((song) => song.index == $queueIndex)?.list
                        ?.id == $currentList?.id &&
                    $queue.find((song) => song.index == $queueIndex)?.list
                        ?.type == $currentList?.type &&
                    $queue.find((song) => song.index == $queueIndex)?.song.id ==
                        song.id
                        ? " text-[#ec5588]"
                        : "")
                }
                onClick={() => songHandleClick(_song, currentListSongs.get())}
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
                        "grid w-full max-w-full min-w-0 grid-cols-[1fr_max-content] items-center gap-1 truncate text-base font-semibold md:text-clip" +
                        ($queue.find((song) => song.index == $queueIndex)?.list
                            ?.id == $currentList?.id &&
                        $queue.find((song) => song.index == $queueIndex)?.list
                            ?.type == $currentList?.type &&
                        $queue.find((song) => song.index == $queueIndex)?.song
                            .id == song.id
                            ? " text-[#ec5588]"
                            : "")
                    }
                >
                    <label className="w-auto max-w-full min-w-0 truncate">
                        {_song.name}
                    </label>
                </div>
                {$songsInIndexedDB?.includes(_song.id) ? (
                    <div className="min-h-6 min-w-6">
                        <CheckCircle2 className="flex h-full w-full text-[#ec5588]" />
                    </div>
                ) : (
                    <div></div>
                )}
                <LikeButton song={_song} />

                {/* <EllipsisVertical className="text-gray-400 flex md:hidden md:hover:text-white md:hover:scale-105" /> */}
                <label className="flex min-w-7 items-center justify-center text-sm text-white/80 select-none">
                    {hovered && window.innerWidth > 768 ? (
                        <EllipsisVertical
                            className="h-5 w-5 text-gray-400 md:hover:scale-105 md:hover:text-white"
                            onClick={handleOpenOptions}
                        />
                    ) : (
                        getTime(_song.duration)
                    )}
                </label>
            </div>
        </SongContextMenu>
    );
}
