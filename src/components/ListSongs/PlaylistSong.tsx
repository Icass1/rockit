"use client";

import { queue, queueIndex, songsInIndexedDB } from "@/stores/audio";
import type { PlaylistDBSongWithAddedAt } from "@/db/playlist";
import { getTime } from "@/lib/getTime";
import LikeButton from "@/components/LikeButton";
import { EllipsisVertical, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { currentList, currentListSongs } from "@/stores/currentList";
import { useStore } from "@nanostores/react";
import { songHandleClick } from "./HandleClick";
import SongContextMenu from "@/components/ListSongs/SongContextMenu";
import { getImageUrl } from "@/lib/getImageUrl";
import { networkStatus } from "@/stores/networkStatus";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import Image from "@/components/Image";
import { useRouter } from "next/navigation";
import "@/styles/Skeleton.css";

export default function PlaylistSong({
    song,
}: {
    song: PlaylistDBSongWithAddedAt<
        | "name"
        | "albumId"
        | "duration"
        | "artists"
        | "path"
        | "albumName"
        | "image"
        | "id"
        | "images"
    >;
}) {
    const [hovered, setHovered] = useState(false);

    const $queue = useStore(queue);
    const $queueIndex = useStore(queueIndex);
    const $currentList = useStore(currentList);
    const $networkStatus = useStore(networkStatus);
    const $songsInIndexedDB = useStore(songsInIndexedDB);
    const $currentListSongs = useStore(currentListSongs);

    const router = useRouter();

    const [_song, setSong] =
        useState<
            PlaylistDBSongWithAddedAt<
                | "name"
                | "albumId"
                | "duration"
                | "artists"
                | "path"
                | "albumName"
                | "image"
                | "id"
                | "images"
            >
        >(song);

    useEffect(() => {
        console.warn("TODO");
        setSong((value) => value);
    }, []);
    
    if (!$queue) return <div className="skeleton h-10 w-full rounded"></div>;

    return (
        <SongContextMenu song={_song}>
            <div
                className={
                    "flex flex-row items-center gap-2 rounded px-2 py-[0.5rem] transition-colors select-none md:gap-4 md:select-text " +
                    // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                    ((($networkStatus == "offline" &&
                        !songsInIndexedDB.get()?.includes(_song.id)) ||
                        !_song.path) &&
                        "pointer-events-none opacity-40") +
                    // If the song is playing and is from this playlist, change color, if the song has been added to the queue clicking the album, it won't show the color
                    ($queue.find((song) => song.index == $queueIndex)?.list
                        ?.id == $currentList?.id &&
                    $queue.find((song) => song.index == $queueIndex)?.list
                        ?.type == $currentList?.type &&
                    $queue.find((song) => song.index == $queueIndex)?.song.id ==
                        _song.id
                        ? " text-[#ec5588]"
                        : "")
                }
                onClick={() => songHandleClick(song, $currentListSongs)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {/* Imagen */}
                <div className="relative aspect-square h-10 w-auto rounded">
                    <Image
                        alt={_song.name}
                        width={40}
                        height={40}
                        src={getImageUrl({
                            imageId: _song.image,
                            width: 40,
                            height: 40,
                            fallback: _song?.images[0]?.url,
                            placeHolder: "/song-placeholder.png",
                        })}
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
                            //     navigate(`/song/${_song.id}`);
                            //     event.stopPropagation();
                            // }}
                        >
                            {_song.name}
                        </span>
                    </div>
                    <div className="flex h-full w-full max-w-full min-w-0 flex-row items-center">
                        <div className="hidden flex-1 flex-row gap-2 truncate pr-2 md:flex">
                            <label className="text-md max-w-[50%] truncate">
                                {_song.artists.map((artist, index) => (
                                    <span
                                        className="cursor-pointer md:hover:underline"
                                        key={index}
                                        onClick={(event) => {
                                            router.push(`/artist/${artist.id}`);
                                            event.stopPropagation();
                                        }}
                                    >
                                        {artist.name}
                                        {index < _song.artists.length - 1
                                            ? ", "
                                            : ""}
                                    </span>
                                ))}
                            </label>
                            <span className="mx-1">•</span>

                            <span
                                className="text-md cursor-pointer truncate md:hover:underline"
                                onClick={(event) => {
                                    router.push(`/album/${_song.albumId}`);
                                    event.stopPropagation();
                                }}
                            >
                                {_song.albumName || "Ablum desconocido"}
                            </span>
                        </div>

                        {/* Botones y tiempo (alineados a la derecha) */}
                        <div className="ml-auto flex w-fit items-center gap-x-2 md:gap-4">
                            {$songsInIndexedDB?.includes(_song.id) && (
                                <div className="min-h-6 min-w-6">
                                    <CheckCircle2 className="flex h-full w-full text-[#ec5588]" />
                                </div>
                            )}
                            <LikeButton song={_song} />
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
                                    getTime(_song.duration)
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </SongContextMenu>
    );
}
