"use client";

import { getTime } from "@/lib/utils/getTime";
import LikeButton from "@/components/LikeButton";
import { EllipsisVertical, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import SongContextMenu from "./SongContextMenu";
import { networkStatus } from "@/stores/networkStatus";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";

export default function AlbumSong({
    song,
    index,
}: {
    song: RockItSongWithAlbum;
    index: number;
}) {
    console.log(
        "(AlbumSong) update song",
        song.name,
        song.publicId,
        song.downloaded,
        song,
        song.atom
    );

    const [hovered, setHovered] = useState(false);
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $queueIndex = useStore(rockIt.queueManager.queueIndexAtom);
    const $currentList = useStore(rockIt.queueManager.currentListAtom);
    const $songsInIndexedDB = useStore(
        rockIt.indexedDBManager.songsInIndexedDBAtom
    );
    const $networkStatus = useStore(networkStatus);

    const [$songAtom] = useStore(song.atom);

    console.log(
        "(AlbumSong) update $songAtom",
        $songAtom.name,
        $songAtom.publicId,
        $songAtom.downloaded
    );

    const [songUnavaliable, setSongUnavaliable] = useState(true);
    const [songPlaying, setSongPlaying] = useState(false);

    useEffect(() => {
        setSongUnavaliable(
            ($networkStatus == "offline" &&
                !$songsInIndexedDB?.includes($songAtom.publicId)) ||
                !$songAtom.downloaded
        );
    }, [
        $songsInIndexedDB,
        $networkStatus,
        $songAtom.downloaded,
        $songAtom.publicId,
    ]);

    useEffect(() => {
        setSongPlaying(
            $queue.find((song) => song.index == $queueIndex)?.list?.publicId ==
                $currentList?.publicId &&
                $queue.find((song) => song.index == $queueIndex)?.list?.type ==
                    $currentList?.type &&
                $queue.find((song) => song.index == $queueIndex)?.song
                    .publicId == $songAtom.publicId
        );
    }, [$songAtom.publicId, $currentList, $queue, $queueIndex]);

    if (!$queue) return <div></div>;

    return (
        <SongContextMenu song={$songAtom}>
            <div
                className={
                    "grid grid-cols-[min-content_1fr_min-content_min-content_40px] items-center gap-2 rounded py-[0.5rem] transition-colors select-none md:gap-4 md:px-2 md:py-[0.65rem] md:select-text " +
                    (songUnavaliable ? " pointer-events-none opacity-40" : "") +
                    (songPlaying ? " text-[#ec5588]" : "")
                }
                onClick={() =>
                    rockIt.albumManager.playAlbum(
                        rockIt.currentListManager.currentListSongsAtom.get(),
                        "album",
                        $songAtom.album.publicId,
                        $songAtom.publicId
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
                        "grid w-full max-w-full min-w-0 grid-cols-[1fr_max-content] items-center gap-1 truncate text-base font-semibold md:text-clip" +
                        (songPlaying ? " text-[#ec5588]" : "")
                    }
                >
                    <label className="w-auto max-w-full min-w-0 truncate">
                        {$songAtom.name}
                    </label>
                </div>
                {$songsInIndexedDB?.includes($songAtom.publicId) ? (
                    <div className="min-h-6 min-w-6">
                        <CheckCircle2 className="flex h-full w-full text-[#ec5588]" />
                    </div>
                ) : (
                    <div></div>
                )}
                <LikeButton songPublicId={$songAtom.publicId} />

                <label className="flex min-w-7 items-center justify-center text-sm text-white/80 select-none">
                    {hovered && window.innerWidth > 768 ? (
                        <EllipsisVertical
                            className="h-5 w-5 text-gray-400 md:hover:scale-105 md:hover:text-white"
                            onClick={() => {
                                console.warn("AblumSong options");
                            }}
                        />
                    ) : (
                        getTime($songAtom.duration)
                    )}
                </label>
            </div>
        </SongContextMenu>
    );
}
