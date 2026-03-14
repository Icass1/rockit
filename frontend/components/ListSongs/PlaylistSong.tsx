"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { CheckCircle2, EllipsisVertical } from "lucide-react";
import { networkStatus } from "@/lib/stores/networkStatus";
import { getTime } from "@/lib/utils/getTime";
import LikeButton from "@/components/LikeButton";
import SongContextMenu from "@/components/ListSongs/SongContextMenu";
import "@/styles/Skeleton.css";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuTrigger,
} from "@/components/PopupMenu";

type PlaylistMediaItem = {
    item: {
        type: string;
        provider: string;
        publicId: string;
        url: string;
        name: string;
        artists: {
            provider: string;
            publicId: string;
            url: string;
            name: string;
            imageUrl: string;
        }[];
        audioSrc: string | null;
        videoSrc: string | null;
        imageUrl: string;
        duration?: number;
        duration_ms?: number;
        album?: {
            provider: string;
            publicId: string;
            url: string;
            name: string;
            imageUrl: string;
        };
        downloaded?: boolean;
    };
    addedAt?: string;
};

export default function PlaylistSong({ song }: { song: PlaylistMediaItem }) {
    const media = song.item;
    const [hovered, setHovered] = useState(false);

    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $currentList = useStore(rockIt.queueManager.currentListAtom);
    const $networkStatus = useStore(networkStatus);
    const $mediaInIndexedDB = useStore(
        rockIt.indexedDBManager.mediaInIndexedDBAtom
    );

    const router = useRouter();

    if (!$queue) return <div className="skeleton h-10 w-full rounded"></div>;

    return (
        <SongContextMenu
            song={media as unknown as import("@/dto").BaseSongWithAlbumResponse}
        >
            <div
                className={
                    "flex select-none flex-row items-center gap-2 rounded px-2 py-2 transition-colors md:select-text md:gap-4 " +
                    // If offline and the song is not saved to indexedDB or the song is not in the server database, disable that song
                    ((($networkStatus == "offline" &&
                        !$mediaInIndexedDB?.includes(media.publicId)) ||
                        !media.downloaded) &&
                        "pointer-events-none opacity-40") +
                    // If the song is playing and is from this playlist, change color, if the song has been added to the queue clicking the album, it won't show the color
                    ($queue.find(
                        (song) => song.queueMediaId == $currentQueueMediaId
                    )?.listPublicId == $currentList &&
                    $queue.find(
                        (song) => song.queueMediaId == $currentQueueMediaId
                    )?.media.publicId == media.publicId
                        ? " text-[#ec5588]"
                        : "")
                }
                onClick={() =>
                    rockIt.playlistManager.playPlaylist(
                        rockIt.currentListManager.currentListSongsAtom.get(),

                        "album",
                        media.album?.publicId ?? "",
                        media.publicId
                    )
                }
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {/* Imagen */}
                <div className="relative aspect-square h-10 w-auto rounded">
                    <Image
                        alt={media.name}
                        width={40}
                        height={40}
                        src={
                            media.imageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL
                        }
                        className="absolute bottom-0 left-0 right-0 top-0 rounded"
                    />
                </div>

                {/* Contenedor principal */}
                <div className="grid w-full grid-cols-[1fr_min-content] items-center md:grid-cols-[1fr_2fr]">
                    {/* Título (alineado a la izquierda) */}
                    <div className="w-full min-w-0 max-w-full">
                        <span
                            className="block w-fit max-w-full cursor-pointer truncate pr-1 text-base font-semibold"
                            // onClick={(event) => {
                            //     navigate(`/song/${song.id}`);
                            //     event.stopPropagation();
                            // }}
                        >
                            {media.name}
                        </span>
                    </div>
                    <div className="flex h-full w-full min-w-0 max-w-full flex-row items-center">
                        <div className="hidden flex-1 flex-row gap-2 truncate pr-2 md:flex">
                            <label className="text-md max-w-[50%] truncate">
                                {media.artists.map((artist, index) => (
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
                                        {index < media.artists.length - 1
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
                                        `/album/${media.album?.publicId}`
                                    );
                                    event.stopPropagation();
                                }}
                            >
                                {media.album?.name}
                            </span>
                        </div>

                        {/* Botones y tiempo (alineados a la derecha) */}
                        <div className="ml-auto flex w-fit items-center gap-x-2 md:gap-4">
                            {$mediaInIndexedDB?.includes(media.publicId) && (
                                <div className="min-h-6 min-w-6">
                                    <CheckCircle2 className="flex h-full w-full text-[#ec5588]" />
                                </div>
                            )}
                            <LikeButton mediaPublicId={media.publicId} />
                            {/* <EllipsisVertical className="text-gray-400 flex md:hidden md:hover:text-white md:hover:scale-105" /> */}

                            <label className="flex min-w-7 select-none items-center justify-center text-sm text-white/80">
                                {hovered && window.innerWidth > 768 ? (
                                    <PopupMenu>
                                        <PopupMenuTrigger>
                                            <EllipsisVertical className="text-gray-400 md:hover:scale-105 md:hover:text-white" />
                                        </PopupMenuTrigger>
                                        <PopupMenuContent></PopupMenuContent>
                                    </PopupMenu>
                                ) : (
                                    getTime(
                                        media.duration ?? media.duration_ms ?? 0
                                    )
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </SongContextMenu>
    );
}
