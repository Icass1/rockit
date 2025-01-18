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
import type { SongDB } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import LikeButton from "./LikeButton";
import { ListPlus, EllipsisVertical, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { currentList, currentListSongs } from "@/stores/currentList";

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
        <div
            className={
                "flex flex-row items-center gap-2 md:gap-4 transition-colors px-2 py-[0.5rem] md:py-[0.65rem] rounded " +
                // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                (((!window.navigator.onLine &&
                    !songsInIndexedDB.get().includes(song.id)) ||
                    !song.path) &&
                    "opacity-40 pointer-events-none ") +
                ($queue.find((song) => song.index == $queueIndex)?.list?.id ==
                    $currentList?.id &&
                $queue.find((song) => song.index == $queueIndex)?.list?.type ==
                    $currentList?.type &&
                $queue.find((song) => song.index == $queueIndex)?.song.id ==
                    song.id
                    ? " text-[#ec5588]"
                    : "")
            }
            onClick={handleClick}
            onMouseEnter={() => {
                setHovered(true);
            }}
            onMouseLeave={() => {
                setHovered(false);
            }}
        >
            <label className="text-md text-white/80 w-5 text-center">
                {index + 1}
            </label>
            <label
                className={
                    "text-base font-semibold w-full truncate md:text-clip" +
                    ($queue.find((song) => song.index == $queueIndex)?.list
                        ?.id == $currentList?.id &&
                    $queue.find((song) => song.index == $queueIndex)?.list
                        ?.type == $currentList?.type &&
                    $queue.find((song) => song.index == $queueIndex)?.song.id ==
                        song.id
                        ? " text-[#ec5588]"
                        : "")
                }
            >
                {song.name}{" "}
            </label>
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
                        className="text-gray-400 md:hover:text-white md:hover:scale-105 h-5 w-5"
                        onClick={handleOpenOptions}
                    />
                ) : (
                    getTime(song.duration)
                )}
            </label>
        </div>
    );
}
