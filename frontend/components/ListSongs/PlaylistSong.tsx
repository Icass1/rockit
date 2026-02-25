"use client";

import { getTime } from "@/lib/utils/getTime";
import LikeButton from "@/components/LikeButton";
import { EllipsisVertical, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import SongContextMenu from "@/components/ListSongs/SongContextMenu";
import { networkStatus } from "@/lib/stores/networkStatus";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import { useRouter } from "next/navigation";
import "@/styles/Skeleton.css";
import Image from "next/image";
import { RockItSongPlaylist } from "@/lib/rockit/rockItSongPlaylist";
import { rockIt } from "@/lib/rockit/rockIt";

export default function PlaylistSong({ song }: { song: RockItSongPlaylist }) {
    const [hovered, setHovered] = useState(false);

    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueSongId = useStore(
        rockIt.queueManager.currentQueueSongIdAtom
    );
    const $currentList = useStore(rockIt.queueManager.currentListAtom);
    const $networkStatus = useStore(networkStatus);
    const $songsInIndexedDB = useStore(
        rockIt.indexedDBManager.songsInIndexedDBAtom
    );

    const router = useRouter();
    const [$songAtom] = useStore(song.atom);

    if (!$queue) return <div className="skeleton h-10 w-full rounded"></div>;

    return (
        <SongContextMenu song={$songAtom}>
            <div
                className={
                    "flex flex-row items-center gap-2 rounded px-2 py-[0.5rem] transition-colors select-none md:gap-4 md:select-text " +
                    // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                    ((($networkStatus == "offline" &&
                        !$songsInIndexedDB?.includes($songAtom.publicId)) ||
                        !$songAtom.downloaded) &&
                        "pointer-events-none opacity-40") +
                    // If the song is playing and is from this playlist, change color, if the song has been added to the queue clicking the album, it won't show the color
                    ($queue.find(
                        (song) => song.queueSongId == $currentQueueSongId
                    )?.list?.publicId == $currentList?.publicId &&
                    $queue.find(
                        (song) => song.queueSongId == $currentQueueSongId
                    )?.list?.type == $currentList?.type &&
                    $queue.find(
                        (song) => song.queueSongId == $currentQueueSongId
                    )?.song.publicId == song.publicId
                        ? " text-[#ec5588]"
                        : "")
                }
                onClick={() =>
                    rockIt.playlistManager.playPlaylist(
                        rockIt.currentListManager.currentListSongsAtom.get(),
                        "album",
                        $songAtom.album.publicId,
                        $songAtom.publicId
                    )
                }
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {/* Imagen */}
                <div className="relative aspect-square h-10 w-auto rounded">
                    <Image
                        alt={$songAtom.name}
                        width={40}
                        height={40}
                        src={
                            $songAtom.internalImageUrl ??
                            rockIt.SONG_PLACEHOLDER_IMAGE_URL
                        }
                        className="absolute top-0 right-0 bottom-0 left-0 rounded"
                    />
                </div>

                {/* Contenedor principal */}
                <div className="grid w-full grid-cols-[1fr_min-content] items-center md:grid-cols-[1fr_2fr]">
                    {/* Título (alineado a la izquierda) */}
                    <div className="w-full max-w-full min-w-0">
                        <span
                            className="block w-fit max-w-full cursor-pointer truncate pr-1 text-base font-semibold"
                            // onClick={(event) => {
                            //     navigate(`/song/${song.id}`);
                            //     event.stopPropagation();
                            // }}
                        >
                            {$songAtom.name}
                        </span>
                    </div>
                    <div className="flex h-full w-full max-w-full min-w-0 flex-row items-center">
                        <div className="hidden flex-1 flex-row gap-2 truncate pr-2 md:flex">
                            <label className="text-md max-w-[50%] truncate">
                                {$songAtom.artists.map((artist, index) => (
                                    <span
                                        className="cursor-pointer md:hover:underline"
                                        key={index}
                                        onClick={(event) => {
                                            router.push(
                                                `/artist/${artist.publicId}`
                                            );
                                            event.stopPropagation();
                                        }}
                                    >
                                        {artist.name}
                                        {index < $songAtom.artists.length - 1
                                            ? ", "
                                            : ""}
                                    </span>
                                ))}
                            </label>
                            <span className="mx-1">•</span>

                            <span
                                className="text-md cursor-pointer truncate md:hover:underline"
                                onClick={(event) => {
                                    router.push(
                                        `/album/${$songAtom.album.publicId}`
                                    );
                                    event.stopPropagation();
                                }}
                            >
                                {$songAtom.album.name}
                            </span>
                        </div>

                        {/* Botones y tiempo (alineados a la derecha) */}
                        <div className="ml-auto flex w-fit items-center gap-x-2 md:gap-4">
                            {$songsInIndexedDB?.includes(
                                $songAtom.publicId
                            ) && (
                                <div className="min-h-6 min-w-6">
                                    <CheckCircle2 className="flex h-full w-full text-[#ec5588]" />
                                </div>
                            )}
                            <LikeButton songPublicId={$songAtom.publicId} />
                            {/* <EllipsisVertical className="text-gray-400 flex md:hidden md:hover:text-white md:hover:scale-105" /> */}

                            <label className="flex min-w-7 items-center justify-center text-sm text-white/80 select-none">
                                {hovered && window.innerWidth > 768 ? (
                                    <PopupMenu>
                                        <PopupMenuTrigger>
                                            <EllipsisVertical className="text-gray-400 md:hover:scale-105 md:hover:text-white" />
                                        </PopupMenuTrigger>
                                        <PopupMenuContent></PopupMenuContent>
                                    </PopupMenu>
                                ) : (
                                    getTime($songAtom.duration)
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </SongContextMenu>
    );
}
