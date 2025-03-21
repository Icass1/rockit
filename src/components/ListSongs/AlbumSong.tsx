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
import { downloadedSongs, status } from "@/stores/downloads";
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
    const $status = useStore(status);

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

    if (!$queue) return <div></div>;

    const songStatus = $status.lists[song.albumId]?.songs[song.id];

    return (
        <SongContextMenu song={_song}>
            <div
                className={
                    "grid grid-cols-[min-content_1fr_min-content_min-content_40px] items-center gap-2 md:gap-4 transition-colors md:px-2 py-[0.5rem] md:py-[0.65rem] rounded select-none md:select-text " +
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
                <label className="text-md text-white/80 w-6 text-center">
                    {index + 1}
                </label>
                <div
                    className={
                        "text-base font-semibold w-full min-w-0 max-w-full truncate md:text-clip grid grid-cols-[1fr_max-content] items-center gap-1" +
                        ($queue.find((song) => song.index == $queueIndex)?.list
                            ?.id == $currentList?.id &&
                        $queue.find((song) => song.index == $queueIndex)?.list
                            ?.type == $currentList?.type &&
                        $queue.find((song) => song.index == $queueIndex)?.song
                            .id == song.id
                            ? " text-[#ec5588] "
                            : "")
                    }
                >
                    <label className="w-auto min-w-0 max-w-full truncate">
                        {_song.name}
                    </label>
                    {songStatus && songStatus.completed != 100 && (
                        <div
                            className={
                                "progress-bar h-2 w-32 rounded-full relative " +
                                (songStatus.message == "Error" && "bg-red-400")
                            }
                        >
                            <div
                                className={
                                    "absolute h-full rounded-full transition-all " +
                                    (songStatus.message == "Error"
                                        ? " bg-red-400 "
                                        : " from-[#ee1086] to-[#fb6467] bg-gradient-to-r ")
                                }
                                style={{
                                    width: `${songStatus.completed}%`,
                                }}
                            ></div>
                        </div>
                    )}
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
