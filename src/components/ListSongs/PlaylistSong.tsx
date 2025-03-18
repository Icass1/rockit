import { queue, queueIndex, songsInIndexedDB } from "@/stores/audio";
import type { PlaylistDBSongWithAddedAt } from "@/db/playlist";
import { getTime } from "@/lib/getTime";
import LikeButton from "../LikeButton";
import { ListPlus, EllipsisVertical, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { currentList, currentListSongs } from "@/stores/currentList";
import { useStore } from "@nanostores/react";
import { navigate } from "astro:transitions/client";
import { songHandleClick } from "./HandleClick";
import SongContextMenu from "./SongContextMenu";
import { downloadedSongs } from "@/stores/downloadedSongs";
import { getImageUrl } from "@/lib/getImageUrl";
import { networkStatus } from "@/stores/networkStatus";

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
    const $downloadedSongs = useStore(downloadedSongs);

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

    const handleAddToList = (
        e: React.MouseEvent<SVGSVGElement, MouseEvent>
    ) => {
        e.stopPropagation();
        console.warn("To do");
        // saveSongToIndexedDB(_song);
    };
    const handleOpenOptions = (
        e: React.MouseEvent<SVGSVGElement, MouseEvent>
    ) => {
        e.stopPropagation();
    };

    useEffect(() => {
        // console.log("useEffect $downloadedSongs", $downloadedSongs);
        // console.log("useEffect _song", _song);
        if ($downloadedSongs.includes(_song.id)) {
            // console.log(`/api/song/${_song.id}`);
            fetch(`/api/song/${_song.id}`)
                .then((response) => response.json())
                .then((data) => {
                    setSong(data);
                    // console.log(data, currentListSongs.get());

                    currentListSongs.set(
                        currentListSongs.get().map((song) => {
                            // console.log(song, data);
                            if (song.id == data.id) {
                                return data;
                            } else {
                                return song;
                            }
                        })
                    );
                });
        }
    }, [$downloadedSongs]);

    if (!$queue) return <div>Queue is not defined</div>;

    return (
        <SongContextMenu song={_song}>
            <div
                className={
                    "flex flex-row items-center gap-2 md:gap-4 transition-colors px-2 py-[0.5rem] rounded select-none md:select-text " +
                    // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                    ((($networkStatus == "offline" &&
                        !songsInIndexedDB.get()?.includes(_song.id)) ||
                        !_song.path) &&
                        "opacity-40 pointer-events-none ") +
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
                <div className="h-10 w-auto aspect-square rounded relative">
                    <img
                        src={getImageUrl({
                            imageId: _song.image,
                            width: 40,
                            height: 40,
                            fallback: _song?.images[0]?.url,
                            placeHolder: "/song-placeholder.png",
                        })}
                        className="rounded absolute top-0 bottom-0 left-0 right-0"
                    />
                </div>

                {/* Contenedor principal */}
                <div className="grid grid-cols-[1fr_min-content] md:grid-cols-[1fr_2fr] w-full items-center">
                    {/* Título (alineado a la izquierda) */}
                    <div className="max-w-full min-w-0 w-full">
                        <span
                            className="text-base font-semibold block w-fit max-w-full truncate pr-1 cursor-pointer"
                            // onClick={(event) => {
                            //     navigate(`/song/${_song.id}`);
                            //     event.stopPropagation();
                            // }}
                        >
                            {_song.name}
                        </span>
                    </div>
                    <div className="w-full h-full max-w-full min-w-0 flex flex-row items-center">
                        <div className="hidden flex-1 md:flex flex-row gap-2 truncate pr-2">
                            <label className="text-md truncate max-w-[50%]">
                                {_song.artists.map((artist, index) => (
                                    <span
                                        className="md:hover:underline cursor-pointer"
                                        key={index}
                                        onClick={(event) => {
                                            navigate(`/artist/${artist.id}`);
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
                                className="md:hover:underline text-md truncate cursor-pointer"
                                onClick={(event) => {
                                    navigate(`/album/${_song.albumId}`);
                                    event.stopPropagation();
                                }}
                            >
                                {_song.albumName || "Ablum desconocido"}
                            </span>
                        </div>

                        {/* Botones y tiempo (alineados a la derecha) */}
                        <div className="flex items-center gap-x-1 md:gap-4 ml-auto w-fit">
                            {$songsInIndexedDB?.includes(_song.id) && (
                                <div className="min-h-6 min-w-6">
                                    <CheckCircle2 className="flex h-full w-full text-[#ec5588]" />
                                </div>
                            )}
                            <LikeButton song={_song} />
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
