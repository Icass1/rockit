import {
    currentSong,
    play,
    playWhenReady,
    queue,
    queueIndex,
    randomQueue,
    saveSongToIndexedDB,
    songsInIndexedDB,
} from "@/stores/audio";
import type { PlaylistDBSongWithAddedAt } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import LikeButton from "../LikeButton";
import {
    ListPlus,
    EllipsisVertical,
    CheckCircle2,
    Download,
    HardDriveDownload,
    PlayCircle,
    ListPlusIcon,
    Link,
    ListStart,
    ListEnd,
    Share2,
    Copy,
    ListX,
} from "lucide-react";
import { useState } from "react";
import { currentList, currentListSongs } from "@/stores/currentList";
import { useStore } from "@nanostores/react";
import ContextMenuTrigger from "../ContextMenu/Trigger";
import ContextMenu from "../ContextMenu/ContextMenu";
import ContextMenuContent from "../ContextMenu/Content";
import ContextMenuOption from "../ContextMenu/Option";
import ContextMenuSplitter from "../ContextMenu/Splitter";
import { navigate } from "astro:transitions/client";
import { likedSongs } from "@/stores/likedList";
import { songHandleClick } from "./HandleClick";
import SongContextMenu from "./SongContextMenu";

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
    const $songsInIndexedDB = useStore(songsInIndexedDB);
    const $likedSongs = useStore(likedSongs);

    const handleAddToList = (
        e: React.MouseEvent<SVGSVGElement, MouseEvent>
    ) => {
        e.stopPropagation();
        saveSongToIndexedDB(song);
    };
    const handleOpenOptions = (
        e: React.MouseEvent<SVGSVGElement, MouseEvent>
    ) => {
        e.stopPropagation();
    };

    return (
        <SongContextMenu song={song}>
            <div
                className={
                    "flex flex-row items-center gap-2 md:gap-4 transition-colors px-2 py-[0.5rem] rounded " +
                    // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                    (((!window.navigator.onLine &&
                        !songsInIndexedDB.get().includes(song.id)) ||
                        !song.path) &&
                        "opacity-40 pointer-events-none ") +
                    // If the song is playing and is from this playlist, change color, if the song has been added to the queue clicking the album, it won't show the color
                    ($queue.find((song) => song.index == $queueIndex)?.list
                        ?.id == $currentList?.id &&
                    $queue.find((song) => song.index == $queueIndex)?.list
                        ?.type == $currentList?.type &&
                    $queue.find((song) => song.index == $queueIndex)?.song.id ==
                        song.id
                        ? " text-[#ec5588]"
                        : "")
                }
                onClick={() => songHandleClick(song)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {/* Imagen */}
                <div className="h-10 w-auto aspect-square rounded relative">
                    <img
                        src={
                            (song?.images && song?.images[0]?.url) ||
                            "/song-placeholder.png"
                        }
                        className="rounded absolute top-0 bottom-0 left-0 right-0"
                    />
                </div>

                {/* Contenedor principal */}
                <div className="grid grid-cols-[1fr_min-content] md:grid-cols-[1fr_2fr] w-full items-center">
                    {/* Título (alineado a la izquierda) */}
                    <div className="max-w-full min-w-0 w-full">
                        <span
                            className="text-base font-semibold hover:underline block w-fit max-w-full truncate pr-1 cursor-pointer"
                            onClick={(event) => {
                                navigate(`/song/${song.id}`);
                                event.stopPropagation();
                            }}
                        >
                            {song.name}
                        </span>
                    </div>
                    <div className="w-full h-full max-w-full min-w-0 flex flex-row items-center">
                        <div className="hidden flex-1 md:flex flex-row gap-2 truncate pr-2">
                            <label className="text-md truncate max-w-[50%]">
                                {song.artists.map((artist, index) => (
                                    <span
                                        className="md:hover:underline cursor-pointer"
                                        key={index}
                                        onClick={(event) => {
                                            navigate(`/artist/${artist.id}`);
                                            event.stopPropagation();
                                        }}
                                    >
                                        {artist.name}
                                        {index < song.artists.length - 1
                                            ? ", "
                                            : ""}
                                    </span>
                                ))}
                            </label>
                            <span className="mx-1">•</span>

                            <span
                                className="md:hover:underline text-md truncate cursor-pointer"
                                onClick={(event) => {
                                    navigate(`/album/${song.albumId}`);
                                    event.stopPropagation();
                                }}
                            >
                                {song.albumName || "Ablum desconocido"}
                            </span>
                        </div>

                        {/* Botones y tiempo (alineados a la derecha) */}
                        <div className="flex items-center md:gap-4 ml-auto w-fit">
                            {$songsInIndexedDB.includes(song.id) && (
                                <CheckCircle2 className="hidden md:flex md:hover:text-white md:hover:scale-105 w-8 text-[#ec5588]" />
                            )}
                            <LikeButton song={song} />
                            <ListPlus
                                className="text-gray-400 hidden md:flex md:hover:text-white md:hover:scale-105 w-8"
                                onClick={handleAddToList}
                            />
                            <EllipsisVertical className="text-gray-400 flex md:hidden md:hover:text-white md:hover:scale-105 w-8" />
                            <label className="text-sm text-white/80 select-none min-w-7 flex justify-center items-center">
                                {hovered && window.innerWidth > 768 ? (
                                    <EllipsisVertical
                                        className="text-gray-400 md:hover:text-white md:hover:scale-105"
                                        onClick={handleOpenOptions}
                                    />
                                ) : (
                                    getTime(song.duration)
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </SongContextMenu>
    );
}
