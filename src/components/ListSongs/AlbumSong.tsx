import { queue, queueIndex, songsInIndexedDB } from "@/stores/audio";
import { getTime } from "@/lib/getTime";
import LikeButton from "../LikeButton";
import { ListPlus, EllipsisVertical, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { currentList, currentListSongs } from "@/stores/currentList";
import { songHandleClick } from "./HandleClick";
import SongContextMenu from "./SongContextMenu";
import type { SongDB } from "@/db/song";
import { downloadedSongs } from "@/stores/downloadedSongs";
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

    const $downloadedSongs = useStore(downloadedSongs);

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
        if ($downloadedSongs.includes(_song.id)) {
            fetch(`/api/song/${_song.id}`)
                .then((response) => response.json())
                .then((data) => {
                    setSong(data);
                    currentListSongs.set(
                        currentListSongs.get().map((song) => {
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
                    "flex flex-row items-center gap-2 md:gap-4 transition-colors px-2 py-[0.5rem] md:py-[0.65rem] rounded select-none md:select-text " +
                    // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                    ((($networkStatus == "offline" &&
                        !songsInIndexedDB.get()?.includes(_song.id)) ||
                        !_song.path) &&
                        "opacity-40 pointer-events-none ") +
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
                        $queue.find((song) => song.index == $queueIndex)?.song
                            .id == song.id
                            ? " text-[#ec5588]"
                            : "")
                    }
                >
                    {_song.name}{" "}
                </label>
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
                            className="text-gray-400 md:hover:text-white md:hover:scale-105 h-5 w-5"
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
