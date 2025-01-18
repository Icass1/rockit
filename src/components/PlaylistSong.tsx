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
import LikeButton from "./LikeButton";
import {
    ListPlus,
    EllipsisVertical,
    CheckCircle2,
    Download,
    HardDriveDownload,
    PlayCircle,
    List,
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
import ContextMenuTrigger from "./ContextMenu/Trigger";
import ContextMenu from "./ContextMenu/ContextMenu";
import ContextMenuContent from "./ContextMenu/Content";
import ContextMenuOption from "./ContextMenu/Option";
import ContextMenuSplitter from "./ContextMenu/Splitter";
import { navigate } from "astro:transitions/client";
import { likedSongs } from "@/stores/likedList";

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

    const handleClick = () => {
        if (!song.path) {
            return;
        }

        if ($currentList?.type == undefined || $currentList.id == undefined) {
            return;
        }

        let songsToAdd = currentListSongs
            .get()
            .filter((song) => song?.path)
            .map((song, index) => {
                return {
                    song: song,
                    list: { type: $currentList.type, id: $currentList.id },
                    index: index,
                };
            });

        if (!window.navigator.onLine) {
            songsToAdd = songsToAdd.filter((song) =>
                $songsInIndexedDB.includes(song.song.id)
            );
        }

        if (randomQueue.get()) {
            const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

            const firstSong = songsToAdd.find(
                (dataSong) => dataSong.song.id == song.id
            );
            if (!firstSong) {
                console.error(
                    "First song not found in songsToAdd in AlbumSong"
                );
                return;
            }
            playWhenReady.set(true);
            currentSong.set(song);
            queueIndex.set(firstSong.index);
            queue.set(shuffled);
        } else {
            const firstSong = songsToAdd.find(
                (dataSong) => dataSong.song.id == song.id
            );
            if (!firstSong) {
                console.error(
                    "First song not found in songsToAdd in AlbumSong"
                );
                return;
            }
            playWhenReady.set(true);
            currentSong.set(song);
            queueIndex.set(firstSong.index);
            queue.set(songsToAdd);
        }
    };

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
        <ContextMenu>
            <ContextMenuTrigger>
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
                        $queue.find((song) => song.index == $queueIndex)?.song
                            .id == song.id
                            ? " text-[#ec5588]"
                            : "")
                    }
                    onClick={handleClick}
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
                                                navigate(
                                                    `/artist/${artist.id}`
                                                );
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
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption onClick={handleClick}>
                    <PlayCircle className="h-5 w-5" />
                    Play song
                </ContextMenuOption>
                <ContextMenuOption>
                    <ListStart className="h-5 w-5" />
                    Play next
                </ContextMenuOption>
                <ContextMenuOption>
                    <ListPlusIcon className="w-5 h-5" />
                    Add song to playlist
                </ContextMenuOption>

                <ContextMenuOption
                    onClick={() => {
                        if (likedSongs.get().includes(song.id)) {
                            fetch(`/api/like/${song.id}`, {
                                method: "DELETE",
                            }).then((response) => {
                                if (response.ok) {
                                    // Remove song to liked songs store
                                    likedSongs.set(
                                        likedSongs
                                            .get()
                                            .filter(
                                                (likedSong) =>
                                                    likedSong != song.id
                                            )
                                    );
                                } else {
                                    console.log("Error");
                                    // Tell user like request was unsuccessful
                                }
                            });
                        } else {
                            fetch(`/api/like/${song.id}`, {
                                method: "POST",
                            }).then((response) => {
                                if (response.ok) {
                                    // Add song to liked songs store
                                    likedSongs.set([
                                        ...likedSongs.get(),
                                        song.id,
                                    ]);
                                } else {
                                    console.log("Error");
                                    // Tell user like request was unsuccessful
                                }
                            });
                        }
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill={"transparent"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={
                            "lucide lucide-hand-metal text-white h-5 w-5"
                        }
                    >
                        <rect
                            x="6"
                            y="10"
                            width="11"
                            height="7"
                            strokeLinejoin="miter"
                            strokeWidth="0"
                        />
                        <path d="M18 12.5V10a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1.4"></path>
                        <path d="M14 11V9a2 2 0 1 0-4 0v2"></path>
                        <path d="M10 11V5a2 2 2 1 0-4 0v9"></path>
                        <path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5"></path>
                    </svg>
                    {$likedSongs.includes(song.id)
                        ? "Remove from liked"
                        : "Add to liked"}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        queue.set([
                            ...queue.get(),
                            {
                                song: song,
                                index:
                                    Math.max(
                                        ...queue
                                            .get()
                                            .map((queueSong) => queueSong.index)
                                    ) + 1,
                                list: currentList.get(),
                            },
                        ]);
                    }}
                >
                    <ListEnd className="h-5 w-5" />
                    Add to queue
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption>
                    <Share2 className="h-5 w-5" />
                    Share song
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        navigator.clipboard.writeText(
                            location.origin + `/song/${song.id}`
                        );
                    }}
                >
                    <Copy className="h-5 w-5" />
                    Copy song URL
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption className="hover:bg-red-700">
                    <ListX className="h-5 w-5" />
                    Remove from queue
                </ContextMenuOption>
                <ContextMenuOption className="hover:bg-red-700">
                    <ListX className="h-5 w-5" />
                    Remove from playlist
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption>
                    <Download className="h-5 w-5" />
                    Download MP3
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        saveSongToIndexedDB(song);
                    }}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    Download song to device
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption
                    onClick={() => {
                        navigate(`/artist/${song.artists[0].id}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    Go to artist
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        navigate(`/album/${song.albumId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    Go to album onClick
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}
