"use client";

import { useStore } from "@nanostores/react";
import LikeButton from "@/components/LikeButton";
import {
    EllipsisVertical,
    PauseIcon,
    PlayIcon,
    Pause,
    Play,
} from "lucide-react";
import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";
import Link from "next/link";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import { Station } from "@/types/station";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";

function FooterLeftForSong({
    currentSong,
}: {
    currentSong: RockItSongWithAlbum;
}) {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $queue = useStore(rockIt.queueManager.queueAtom);

    if (!$queue) return null;

    return (
        <div className="grid w-full max-w-full min-w-0 grid-cols-[min-content_1fr_min-content] items-center gap-x-4 pr-2 md:w-1/3">
            {/* Album cover */}
            <div
                className="group relative h-9 w-9 cursor-pointer rounded-md md:h-16 md:w-16"
                onClick={() => rockIt.audioManager.togglePlayPauseOrSetSong()}
            >
                <Image
                    width={64}
                    height={64}
                    src={
                        currentSong.internalImageUrl ?? "/song-placeholder.png"
                    }
                    alt={`Cover of ${currentSong.name}`}
                    className="absolute h-9 w-9 rounded-md object-cover transition duration-300 select-none group-hover:brightness-50 md:h-16 md:w-16"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                    {$playing ? (
                        <Pause className="h-6 w-6 fill-current text-white md:h-8 md:w-8" />
                    ) : (
                        <Play className="h-6 w-6 fill-current text-white md:h-8 md:w-8" />
                    )}
                </div>
            </div>

            {/* Song info */}
            <div className="relative h-full w-full max-w-full min-w-0 overflow-hidden">
                <div className="relative top-1/2 flex -translate-y-1/2 flex-col">
                    <Link
                        href={`/song/${currentSong.publicId}`}
                        prefetch={false}
                        onClick={() => rockIt.playerUIManager.hide()}
                        className="w-full max-w-full min-w-0 truncate font-semibold md:hover:underline"
                    >
                        {currentSong.name || "Unknown song"}
                    </Link>
                    <div className="flex w-full flex-row gap-x-1 text-sm text-gray-400">
                        <div className="truncate">
                            {currentSong.artists?.map((artist, index) => (
                                <Link
                                    key={artist.publicId}
                                    href={`/artist/${artist.publicId}`}
                                    prefetch={false}
                                    onClick={() =>
                                        rockIt.playerUIManager.hide()
                                    }
                                    className="md:hover:underline"
                                >
                                    {artist.name}
                                    {index < currentSong.artists.length - 1
                                        ? ", "
                                        : ""}
                                </Link>
                            )) ?? <span>Unknown artist</span>}
                        </div>
                        <span className="hidden select-none md:block">•</span>
                        <Link
                            href={`/album/${currentSong.album.publicId}`}
                            prefetch={false}
                            onClick={() => rockIt.playerUIManager.hide()}
                            className="hidden truncate md:inline-block md:hover:underline"
                        >
                            {currentSong.album.name || "Unknown album"}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="hidden flex-row items-center gap-1 md:flex">
                <LikeButton songPublicId={currentSong.publicId} />
                <SongPopupMenu song={currentSong}>
                    <EllipsisVertical className="h-6 w-5 text-gray-400 md:hover:scale-105 md:hover:text-white" />
                </SongPopupMenu>
            </div>
        </div>
    );
}

function FooterLeftForStation({ currentStation }: { currentStation: Station }) {
    const $playing = useStore(rockIt.audioManager.playingAtom);

    return (
        <div className="flex w-full max-w-full min-w-0 items-center gap-x-4 md:w-1/3">
            {/* Station cover — hover con CSS group, sin useState */}
            <div className="group relative h-9 w-9 overflow-hidden rounded-md md:h-16 md:w-16">
                <Image
                    width={64}
                    height={64}
                    src={currentStation.favicon || "/song-placeholder.png"}
                    alt={currentStation.name}
                    className="absolute h-full w-full object-cover select-none"
                />
                <div className="absolute inset-0 hidden items-center justify-center bg-neutral-500/70 group-hover:flex">
                    {$playing ? (
                        <PauseIcon
                            className="h-6 w-6 cursor-pointer text-white"
                            onClick={() => rockIt.audioManager.pause()}
                        />
                    ) : (
                        <PlayIcon
                            className="h-6 w-6 cursor-pointer text-white"
                            onClick={() => rockIt.audioManager.play()}
                        />
                    )}
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-1 truncate font-semibold">
                    {currentStation.name}
                </span>
                <span className="text-sm text-gray-400">
                    {currentStation.country}
                </span>
            </div>

            <div className="hidden flex-row pr-4 md:flex">
                <EllipsisVertical className="h-6 w-5 text-gray-400 md:hover:scale-105 md:hover:text-white" />
            </div>
        </div>
    );
}

export default function FooterLeft() {
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);

    if ($currentSong) return <FooterLeftForSong currentSong={$currentSong} />;
    if ($currentStation)
        return <FooterLeftForStation currentStation={$currentStation} />;

    return (
        <div className="flex w-full max-w-full min-w-0 items-center gap-x-4 text-sm text-gray-400 md:w-1/3">
            Nothing playing
        </div>
    );
}
